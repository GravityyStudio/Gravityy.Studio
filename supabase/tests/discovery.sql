-- Discovery tests. ALWAYS ends in an exception, so everything rolls back.
-- Result: "DISCOVERY TEST: N passed, 0 failed". Needs 1 platform admin and 1 other profile.
do $$
declare
  ws      uuid := private.default_workspace_id();
  ws_b    uuid;
  u_admin uuid := (select id from public.profiles where role = 'admin' order by created_at limit 1);
  u_mem   uuid := (select id from public.profiles where role <> 'admin' order by created_at limit 1);
  p1 uuid; p2 uuid; p3 uuid; p_old uuid; c_existing uuid;
  r jsonb; n integer;
  passed integer := 0;
  fails text := '';
begin
  if u_admin is null or u_mem is null then raise exception 'DISCOVERY TEST: needs 1 admin and 1 other profile'; end if;
  insert into public.workspaces (name, slug) values ('Discovery test B', 'discovery-test-b') returning id into ws_b;
  insert into public.workspace_members (workspace_id, user_id, role) values (ws, u_mem, 'member')
    on conflict (workspace_id, user_id) do update set role = 'member';
  insert into public.companies (workspace_id, name, domain) values (ws, 'Existing Co', 'existing-disc.test') returning id into c_existing;

  -- ---- member: create + dedupe + guards ----
  perform set_config('request.jwt.claims', json_build_object('sub', u_mem, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  insert into public.prospects (workspace_id, name, domain, website, industry, source, provider, created_by)
  values (ws, 'Acme Dental', 'acme-disc.test', 'https://acme-disc.test', 'Dental clinic', 'manual', 'manual', u_mem) returning id into p1;
  passed := passed + 1;
  begin
    insert into public.prospects (workspace_id, name, domain, source, created_by) values (ws, 'Acme again', 'acme-disc.test', 'manual', u_mem);
    fails := fails || '[duplicate domain allowed] ';
  exception when unique_violation then passed := passed + 1; end;
  insert into public.prospects (workspace_id, name, source, provider, provider_ref, created_by, expires_at)
  values (ws, 'Places Co', 'api', 'google_places', 'place-123', u_mem, now() + interval '30 days') returning id into p2;
  begin
    insert into public.prospects (workspace_id, name, source, provider, provider_ref, created_by) values (ws, 'Places Co 2', 'api', 'google_places', 'place-123', u_mem);
    fails := fails || '[duplicate provider_ref allowed] ';
  exception when unique_violation then passed := passed + 1; end;
  begin
    insert into public.prospects (workspace_id, name, source, review_status, created_by) values (ws, 'Pre-approved', 'manual', 'approved', u_mem);
    fails := fails || '[insert as approved allowed] ';
  exception when raise_exception then passed := passed + 1; end;
  begin
    update public.prospects set review_status = 'approved' where id = p1;
    fails := fails || '[member approved a prospect] ';
  exception when raise_exception then passed := passed + 1; end;
  begin
    update public.prospects set company_id = c_existing where id = p1;
    fails := fails || '[member linked prospect to CRM directly] ';
  exception when raise_exception then passed := passed + 1; end;
  begin
    perform public.prospect_add_to_crm(p1, '{"name":"Acme Dental","domain":"acme-disc.test"}', 'mql');
    fails := fails || '[member added to CRM] ';
  exception when insufficient_privilege then passed := passed + 1; end;
  begin
    insert into public.website_analyses (workspace_id, prospect_id, url, status) values (ws, p1, 'https://acme-disc.test', 'ok');
    fails := fails || '[member wrote an analysis] ';
  exception when insufficient_privilege then passed := passed + 1; end;
  begin
    insert into public.discovery_settings (workspace_id, scoring) values (ws, '{}');
    fails := fails || '[member wrote scoring settings] ';
  exception when insufficient_privilege then passed := passed + 1; end;
  begin
    insert into public.prospects (workspace_id, name, source, created_by) values (ws_b, 'Other workspace', 'manual', u_mem);
    fails := fails || '[member wrote to another workspace] ';
  exception when insufficient_privilege then passed := passed + 1; end;
  execute 'reset role';

  -- ---- anonymous: nothing ----
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  execute 'set local role anon';
  begin perform count(*) from public.prospects; fails := fails || '[anon reads prospects] ';
  exception when insufficient_privilege then passed := passed + 1; end;
  begin perform public.prospect_add_to_crm(p1, '{}', 'mql'); fails := fails || '[anon calls add_to_crm] ';
  exception when insufficient_privilege then passed := passed + 1; end;
  execute 'reset role';

  -- ---- admin: approve + add to CRM ----
  update public.prospects set domain = 'existing-disc.test' where id = p2;   -- p2 now matches an existing CRM company
  perform set_config('request.jwt.claims', json_build_object('sub', u_admin, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  update public.prospects set score = 72 where id = p1;
  r := public.prospect_add_to_crm(p1, '{"name":"Acme Dental","domain":"acme-disc.test","website":"https://acme-disc.test","industry":"Dental clinic"}', 'mql');
  if (r ->> 'already_added')::boolean = false and (r ->> 'lead_id') is not null then passed := passed + 1; else fails := fails || '[add_to_crm result] '; end if;
  if (select review_status = 'approved' and reviewed_by = u_admin and company_id = (r ->> 'company_id')::uuid from public.prospects where id = p1)
  then passed := passed + 1; else fails := fails || '[prospect not approved/linked] '; end if;
  if (select source = 'discovery' and score = 72 and qualification = 'mql' and company_id = (r ->> 'company_id')::uuid from public.leads where id = (r ->> 'lead_id')::uuid)
  then passed := passed + 1; else fails := fails || '[lead row] '; end if;
  if (select actor_id = u_admin from public.audit_log where entity = 'prospects' and entity_id = p1::text and action = 'add_to_crm')
  then passed := passed + 1; else fails := fails || '[audit actor] '; end if;
  execute 'reset role';
  if (select payload ->> 'type' = 'crm.updated' and (payload ->> 'version')::int = 1 and payload -> 'data' ->> 'prospect_id' = p1::text
      from public.outbox_events where aggregate_id = (r ->> 'lead_id')::uuid)
  then passed := passed + 1; else fails := fails || '[crm.updated event] '; end if;

  execute 'set local role authenticated';
  r := public.prospect_add_to_crm(p1, '{"name":"Acme Dental"}', 'mql');
  if (r ->> 'already_added')::boolean then passed := passed + 1; else fails := fails || '[second add not idempotent] '; end if;
  r := public.prospect_add_to_crm(p2, '{"name":"Places Co","domain":"existing-disc.test"}', 'unqualified');
  if (r ->> 'company_id')::uuid = c_existing then passed := passed + 1; else fails := fails || '[company not deduplicated by domain] '; end if;
  insert into public.prospects (workspace_id, name, source, created_by) values (ws, 'Rejected Co', 'manual', u_admin) returning id into p3;
  update public.prospects set review_status = 'rejected' where id = p3;
  begin
    perform public.prospect_add_to_crm(p3, '{"name":"Rejected Co"}', 'mql');
    fails := fails || '[rejected prospect added] ';
  exception when raise_exception then passed := passed + 1; end;
  insert into public.discovery_settings (workspace_id, scoring) values (ws, '{"version":1}')
    on conflict (workspace_id) do update set scoring = excluded.scoring;
  passed := passed + 1;
  execute 'reset role';

  -- ---- retention purge (trusted server) ----
  perform set_config('request.jwt.claims', '{}', true);
  insert into public.prospects (workspace_id, name, source, provider, provider_ref, expires_at)
  values (ws, 'Expired Co', 'api', 'google_places', 'place-old', now() - interval '1 day') returning id into p_old;
  r := public.crm_purge_expired();
  if not exists (select 1 from public.prospects where id = p_old) and exists (select 1 from public.prospects where id = p1)
     and (r ->> 'prospects')::int >= 1 then passed := passed + 1; else fails := fails || '[retention purge] '; end if;

  raise exception 'DISCOVERY TEST: % passed%', passed, case when fails = '' then ', 0 failed' else ', FAILED: ' || fails end;
end $$;
