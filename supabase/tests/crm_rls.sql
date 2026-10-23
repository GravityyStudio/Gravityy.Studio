-- CRM RLS + guard tests. Safe on any database: ALWAYS ends in an exception, so the whole transaction
-- (test workspace, rows, memberships) rolls back. Read the result in the error message:
--   "CRM RLS TEST: N passed, 0 failed"  → all good
--   "CRM RLS TEST: N passed, FAILED: …"  → the listed checks broke
-- Needs one platform admin and two other profiles. Run with the Supabase SQL editor, MCP execute_sql, or psql.
do $$
declare
  ws_a    uuid := private.default_workspace_id();
  ws_b    uuid;
  u_admin uuid := (select id from public.profiles where role = 'admin' order by created_at limit 1);
  u_mem   uuid := (select id from public.profiles where role <> 'admin' order by created_at limit 1);
  u_view  uuid := (select id from public.profiles where role <> 'admin' order by created_at offset 1 limit 1);
  co_a uuid; co_b uuid; ct_a uuid; ld_a uuid; dr uuid; dr2 uuid;
  n integer;
  ok boolean;
  passed integer := 0;
  fails text := '';
begin
  if u_admin is null or u_mem is null or u_view is null then
    raise exception 'CRM RLS TEST: needs 1 admin and 2 other profiles';
  end if;

  -- ---- fixtures (as table owner) ----
  insert into public.workspaces (name, slug) values ('RLS test B', 'rls-test-b') returning id into ws_b;
  insert into public.workspace_members (workspace_id, user_id, role) values (ws_a, u_mem, 'member'), (ws_b, u_view, 'viewer')
    on conflict (workspace_id, user_id) do update set role = excluded.role;
  insert into public.companies (workspace_id, name, domain) values (ws_a, 'Acme A', 'acme-a.test') returning id into co_a;
  insert into public.companies (workspace_id, name, domain) values (ws_b, 'Beta B', 'beta-b.test') returning id into co_b;
  insert into public.contacts (workspace_id, company_id, full_name, email) values (ws_a, co_a, 'Ann', 'ann@acme-a.test') returning id into ct_a;
  insert into public.leads (name, contact_id, company_id, source) values ('Lead A', ct_a, co_a, 'contact') returning id into ld_a;

  -- 1. legacy inserts (no workspace_id) land in the default workspace
  if (select workspace_id from public.leads where id = ld_a) = ws_a then passed := passed + 1; else fails := fails || '[legacy lead default workspace] '; end if;
  -- 2. composite keys block cross-workspace references
  begin
    insert into public.contacts (workspace_id, company_id, full_name) values (ws_a, co_b, 'X');
    fails := fails || '[cross-workspace contact->company allowed] ';
  exception when foreign_key_violation then passed := passed + 1; end;

  -- ---- anonymous ----
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  execute 'set local role anon';
  begin perform count(*) from public.companies; fails := fails || '[anon reads companies] ';
  exception when insufficient_privilege then passed := passed + 1; end;
  begin perform count(*) from public.leads; fails := fails || '[anon reads leads] ';
  exception when insufficient_privilege then passed := passed + 1; end;
  begin perform public.rate_limit_hit('t', 1, 60); fails := fails || '[anon calls rate_limit_hit] ';
  exception when insufficient_privilege then passed := passed + 1; end;
  execute 'reset role';

  -- ---- member of A ----
  perform set_config('request.jwt.claims', json_build_object('sub', u_mem, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  select count(*) into n from public.companies;
  if n = 1 then passed := passed + 1; else fails := fails || format('[member sees %s companies, want 1] ', n); end if;
  select count(*) into n from public.leads where id = ld_a;
  if n = 1 then passed := passed + 1; else fails := fails || '[member cannot see own-workspace lead] '; end if;
  begin insert into public.companies (workspace_id, name) values (ws_b, 'Nope'); fails := fails || '[member writes other workspace] ';
  exception when insufficient_privilege then passed := passed + 1; end;
  delete from public.companies where id = co_a; get diagnostics n = row_count;
  if n = 0 then passed := passed + 1; else fails := fails || '[member deleted a company] '; end if;
  update public.workspace_members set role = 'owner' where workspace_id = ws_a and user_id = u_mem; get diagnostics n = row_count;
  if n = 0 then passed := passed + 1; else fails := fails || '[member promoted self] '; end if;
  begin insert into public.lead_scores (workspace_id, lead_id, score) values (ws_a, ld_a, 50); fails := fails || '[member writes lead_scores] ';
  exception when insufficient_privilege then passed := passed + 1; end;
  begin insert into public.consent_records (workspace_id, contact_id, purpose, basis, status, source)
    values (ws_a, ct_a, 'marketing', 'consent', 'granted', 'test'); fails := fails || '[member writes consent_records] ';
  exception when insufficient_privilege then passed := passed + 1; end;
  begin perform public.crm_purge_expired(); fails := fails || '[member runs retention purge] ';
  exception when insufficient_privilege then passed := passed + 1; end;
  insert into public.outreach_drafts (workspace_id, contact_id, subject, body, created_by)
    values (ws_a, ct_a, 'Hello', 'Body', u_mem) returning id into dr;
  passed := passed + 1;
  begin update public.outreach_drafts set status = 'approved' where id = dr; fails := fails || '[member approved outreach] ';
  exception when raise_exception then passed := passed + 1; end;
  begin update public.outreach_drafts set status = 'sent' where id = dr; fails := fails || '[member marked outreach sent] ';
  exception when raise_exception then passed := passed + 1; end;
  execute 'reset role';

  -- ---- viewer of B ----
  perform set_config('request.jwt.claims', json_build_object('sub', u_view, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  select count(*) into n from public.companies;
  if n = 1 then passed := passed + 1; else fails := fails || format('[viewer sees %s companies, want 1] ', n); end if;
  select count(*) into n from public.leads;
  if n = 0 then passed := passed + 1; else fails := fails || '[viewer of B sees A leads] '; end if;
  begin insert into public.companies (workspace_id, name) values (ws_b, 'Nope'); fails := fails || '[viewer wrote a company] ';
  exception when insufficient_privilege then passed := passed + 1; end;
  execute 'reset role';

  -- ---- platform admin: approval flow ----
  perform set_config('request.jwt.claims', json_build_object('sub', u_admin, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  update public.outreach_drafts set status = 'approved' where id = dr;
  if (select approved_by from public.outreach_drafts where id = dr) = u_admin then passed := passed + 1; else fails := fails || '[approval not recorded] '; end if;
  update public.outreach_drafts set body = 'Changed after approval' where id = dr;
  if (select status = 'pending_approval' and approved_by is null from public.outreach_drafts where id = dr) then passed := passed + 1;
  else fails := fails || '[edit after approval kept approval] '; end if;
  update public.outreach_drafts set status = 'approved' where id = dr;
  begin update public.outreach_drafts set status = 'sent' where id = dr; fails := fails || '[API user marked sent] ';
  exception when raise_exception then passed := passed + 1; end;
  execute 'reset role';

  -- ---- trusted server (no JWT): send only after approval ----
  perform set_config('request.jwt.claims', '{}', true);
  update public.outreach_drafts set status = 'sent', provider_message_id = 'test-1' where id = dr;
  if (select status = 'sent' and sent_at is not null from public.outreach_drafts where id = dr) then passed := passed + 1;
  else fails := fails || '[approved draft not sendable by server] '; end if;
  insert into public.outreach_drafts (workspace_id, contact_id, subject, body) values (ws_a, ct_a, 'Unapproved', 'Body') returning id into dr2;
  begin update public.outreach_drafts set status = 'sent' where id = dr2; fails := fails || '[unapproved draft sent] ';
  exception when raise_exception then passed := passed + 1; end;
  begin update public.outreach_drafts set status = 'approved' where id = dr2; fails := fails || '[server approved without a person] ';
  exception when raise_exception then passed := passed + 1; end;
  -- rate limit: max 2 per window
  ok := public.rate_limit_hit('rls-test-bucket', 2, 60) and public.rate_limit_hit('rls-test-bucket', 2, 60) and not public.rate_limit_hit('rls-test-bucket', 2, 60);
  if ok then passed := passed + 1; else fails := fails || '[rate limit] '; end if;
  -- suppression hash is sha256(lower(trim(value)))
  if public.suppression_hash(' Ann@Acme-A.test ') = encode(extensions.digest('ann@acme-a.test', 'sha256'), 'hex') then passed := passed + 1;
  else fails := fails || '[suppression hash] '; end if;

  raise exception 'CRM RLS TEST: % passed%', passed, case when fails = '' then ', 0 failed' else ', FAILED: ' || fails end;
end $$;
