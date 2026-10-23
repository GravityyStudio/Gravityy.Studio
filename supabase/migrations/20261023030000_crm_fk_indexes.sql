-- Cover the composite (x, workspace_id) foreign keys from the CRM migrations (Supabase advisor 0001).
-- Each new index also serves plain lookups by x, so the single-column ones it replaces are dropped.
create index consent_records_contact_ws_idx  on public.consent_records (contact_id, workspace_id);
create index contacts_company_ws_idx         on public.contacts (company_id, workspace_id);
create index email_events_contact_ws_idx     on public.email_events (contact_id, workspace_id);
create index email_events_draft_ws_idx       on public.email_events (draft_id, workspace_id);
create index lead_activities_lead_ws_idx     on public.lead_activities (lead_id, workspace_id);
create index lead_scores_lead_ws_idx         on public.lead_scores (lead_id, workspace_id);
create index leads_company_ws_idx            on public.leads (company_id, workspace_id);
create index leads_contact_ws_idx            on public.leads (contact_id, workspace_id);
create index opportunities_lead_ws_idx       on public.opportunities (lead_id, workspace_id);
create index outreach_drafts_contact_ws_idx  on public.outreach_drafts (contact_id, workspace_id);
create index outreach_drafts_lead_ws_idx     on public.outreach_drafts (lead_id, workspace_id);

drop index public.contacts_company_idx;
drop index public.email_events_contact_idx;
drop index public.email_events_draft_idx;
drop index public.leads_company_idx;
drop index public.leads_contact_idx;
drop index public.opportunities_lead_idx;
drop index public.outreach_drafts_contact_idx;
drop index public.outreach_drafts_lead_idx;
