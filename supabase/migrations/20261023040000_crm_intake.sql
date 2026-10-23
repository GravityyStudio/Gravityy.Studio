-- Inbound lead capture as one atomic step: company + contact (deduplicated), lead, score history,
-- timeline activity, enquiry consent, outbox event for n8n and an audit entry. Server-only (service role).
-- Validation, normalisation and scoring happen in lib/crm (Zod + rules); this function owns consistency.
create or replace function public.crm_intake(
  p_source        text,     -- 'contact' | 'audit'
  p_name          text,
  p_email         text,     -- lower-cased by the caller
  p_company_name  text,
  p_domain        text,     -- business domain, null for free-mail addresses
  p_website       text,
  p_message       text,
  p_score         integer,
  p_factors       jsonb,
  p_qualification text,
  p_ip_hash       text,
  p_user_agent    text
)
returns jsonb
language plpgsql security definer
set search_path = ''
as $$
declare
  ws           uuid := private.default_workspace_id();
  v_company    uuid;
  v_contact    uuid;
  v_lead       uuid;
  v_suppressed boolean;
begin
  if p_source not in ('contact', 'audit') then
    raise exception 'crm_intake: unknown source %', p_source;
  end if;

  -- Inbound enquiries are always recorded (the person asked to be contacted); suppression only flags them
  -- so later outreach steps skip the address.
  v_suppressed := exists (
    select 1 from public.suppression_entries s
    where s.workspace_id = ws
      and ((s.kind = 'email' and s.value_hash = public.suppression_hash(p_email))
        or (s.kind = 'domain' and p_domain is not null and s.value_hash = public.suppression_hash(p_domain)))
  );

  if p_domain is not null then
    insert into public.companies (workspace_id, name, domain, website)
    values (ws, coalesce(nullif(trim(p_company_name), ''), p_domain), p_domain, p_website)
    on conflict (workspace_id, domain) where domain is not null
      do update set website = coalesce(public.companies.website, excluded.website)
    returning id into v_company;
  end if;

  insert into public.contacts (workspace_id, company_id, full_name, email)
  values (ws, v_company, coalesce(trim(p_name), ''), p_email)
  on conflict (workspace_id, email) where email is not null
    do update set
      full_name  = case when public.contacts.full_name = '' then excluded.full_name else public.contacts.full_name end,
      company_id = coalesce(public.contacts.company_id, excluded.company_id)
  returning id into v_contact;

  -- Legacy columns (name/email/company/notes) stay filled so the existing admin kanban keeps working.
  insert into public.leads (workspace_id, name, email, company, notes, source, contact_id, company_id, score, qualification, last_activity_at)
  values (ws, coalesce(nullif(trim(p_name), ''), p_email), p_email, coalesce(nullif(trim(p_company_name), ''), p_domain, p_website),
          p_message, p_source, v_contact, v_company, p_score, p_qualification, now())
  returning id into v_lead;

  insert into public.lead_scores (workspace_id, lead_id, score, factors, model)
  values (ws, v_lead, p_score, p_factors, 'rules-v1');

  insert into public.lead_activities (workspace_id, lead_id, kind, body, meta)
  values (ws, v_lead, 'form_submission', p_message,
          jsonb_build_object('form', p_source, 'website', p_website, 'suppressed', v_suppressed));

  -- Basis 'contract': steps taken at the person's request before a contract. Not marketing consent.
  insert into public.consent_records (workspace_id, contact_id, purpose, basis, status, source, ip_hash, user_agent)
  values (ws, v_contact, 'enquiry', 'contract', 'granted', 'site:' || p_source || '-form', p_ip_hash, left(p_user_agent, 300));

  -- Minimal payload (no PII): n8n reads details through the API with its own credentials.
  insert into public.outbox_events (workspace_id, topic, aggregate_id, payload)
  values (ws, 'lead.created', v_lead, jsonb_build_object(
    'lead_id', v_lead, 'source', p_source, 'score', p_score, 'qualification', p_qualification, 'suppressed', v_suppressed));

  insert into public.audit_log (action, entity, entity_id, meta, workspace_id)
  values ('create', 'leads', v_lead::text, jsonb_build_object('source', p_source, 'via', 'crm_intake', 'score', p_score), ws);

  return jsonb_build_object('lead_id', v_lead, 'contact_id', v_contact, 'company_id', v_company, 'suppressed', v_suppressed);
end $$;

revoke all on function public.crm_intake(text, text, text, text, text, text, text, integer, jsonb, text, text, text) from public, anon, authenticated;
grant execute on function public.crm_intake(text, text, text, text, text, text, text, integer, jsonb, text, text, text) to service_role;
