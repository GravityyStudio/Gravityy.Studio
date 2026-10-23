-- crm_intake tests. ALWAYS ends in an exception, so every row it creates rolls back.
-- Result is in the error message: "CRM INTAKE TEST: N passed, 0 failed" means all good.
do $$
declare
  r1 jsonb; r2 jsonb; r3 jsonb; r4 jsonb;
  ws uuid := private.default_workspace_id();
  n integer;
  passed integer := 0;
  fails text := '';
begin
  -- business address: company + contact + lead + score + activity + consent + outbox + audit
  r1 := public.crm_intake('contact', 'Asha Rao', 'asha@acme-intake.test', null, 'acme-intake.test', null,
                          'We need a new website by March, budget 5 lakh.', 65, '[{"factor":"test","points":65}]', 'mql', null, 'test-agent');
  if (r1 ->> 'company_id') is not null and (r1 ->> 'contact_id') is not null and (r1 ->> 'lead_id') is not null then passed := passed + 1;
  else fails := fails || '[ids missing] '; end if;
  if (select workspace_id = ws and contact_id = (r1 ->> 'contact_id')::uuid and score = 65 and qualification = 'mql' and stage = 'new'
      from public.leads where id = (r1 ->> 'lead_id')::uuid) then passed := passed + 1; else fails := fails || '[lead row] '; end if;
  select count(*) into n from public.lead_scores where lead_id = (r1 ->> 'lead_id')::uuid;
  if n = 1 then passed := passed + 1; else fails := fails || '[score history] '; end if;
  select count(*) into n from public.lead_activities where lead_id = (r1 ->> 'lead_id')::uuid and kind = 'form_submission';
  if n = 1 then passed := passed + 1; else fails := fails || '[activity] '; end if;
  select count(*) into n from public.consent_records where contact_id = (r1 ->> 'contact_id')::uuid and purpose = 'enquiry' and basis = 'contract';
  if n = 1 then passed := passed + 1; else fails := fails || '[consent] '; end if;
  if (select payload ->> 'lead_id' = r1 ->> 'lead_id' and not (payload ? 'email') from public.outbox_events
      where aggregate_id = (r1 ->> 'lead_id')::uuid and topic = 'lead.created') then passed := passed + 1;
  else fails := fails || '[outbox event or PII in payload] '; end if;
  select count(*) into n from public.audit_log where entity = 'leads' and entity_id = r1 ->> 'lead_id' and workspace_id = ws;
  if n = 1 then passed := passed + 1; else fails := fails || '[audit] '; end if;

  -- same person again: contact + company deduplicated, a second lead recorded
  r2 := public.crm_intake('audit', '', 'asha@acme-intake.test', null, 'acme-intake.test', 'https://acme-intake.test',
                          'Free audit requested', 40, '[]', 'unqualified', null, null);
  if r2 ->> 'contact_id' = r1 ->> 'contact_id' and r2 ->> 'company_id' = r1 ->> 'company_id' and r2 ->> 'lead_id' <> r1 ->> 'lead_id'
  then passed := passed + 1; else fails := fails || '[dedupe] '; end if;
  if (select full_name = 'Asha Rao' from public.contacts where id = (r1 ->> 'contact_id')::uuid) then passed := passed + 1;
  else fails := fails || '[empty name overwrote contact name] '; end if;
  if (select website = 'https://acme-intake.test' from public.companies where id = (r1 ->> 'company_id')::uuid) then passed := passed + 1;
  else fails := fails || '[company website not filled] '; end if;

  -- free-mail address: no company
  r3 := public.crm_intake('contact', 'Ravi', 'ravi.intake@gmail.com', null, null, null, 'Hello', 10, '[]', 'unqualified', null, null);
  if (r3 ->> 'company_id') is null and (r3 -> 'suppressed')::boolean = false then passed := passed + 1; else fails := fails || '[free mail company] '; end if;

  -- suppressed address: still recorded, flagged everywhere
  insert into public.suppression_entries (workspace_id, kind, value_hash, reason)
  values (ws, 'email', public.suppression_hash('blocked.intake@example.com'), 'unsubscribed');
  r4 := public.crm_intake('contact', 'Blocked', 'blocked.intake@example.com', null, null, null, 'Hi', 10, '[]', 'unqualified', null, null);
  if (r4 -> 'suppressed')::boolean and (select (payload -> 'suppressed')::boolean from public.outbox_events where aggregate_id = (r4 ->> 'lead_id')::uuid)
  then passed := passed + 1; else fails := fails || '[suppression flag] '; end if;

  -- bad source rejected
  begin
    perform public.crm_intake('scrape', 'X', 'x@example.com', null, null, null, null, 0, '[]', 'unqualified', null, null);
    fails := fails || '[unknown source accepted] ';
  exception when raise_exception then passed := passed + 1; end;

  -- only the service role may call it
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  execute 'set local role anon';
  begin
    perform public.crm_intake('contact', 'X', 'x@example.com', null, null, null, null, 0, '[]', 'unqualified', null, null);
    fails := fails || '[anon can call crm_intake] ';
  exception when insufficient_privilege then passed := passed + 1; end;
  execute 'reset role';
  perform set_config('request.jwt.claims', '{"role":"authenticated"}', true);
  execute 'set local role authenticated';
  begin
    perform public.crm_intake('contact', 'X', 'x@example.com', null, null, null, null, 0, '[]', 'unqualified', null, null);
    fails := fails || '[signed-in user can call crm_intake] ';
  exception when insufficient_privilege then passed := passed + 1; end;
  execute 'reset role';

  raise exception 'CRM INTAKE TEST: % passed%', passed, case when fails = '' then ', 0 failed' else ', FAILED: ' || fails end;
end $$;
