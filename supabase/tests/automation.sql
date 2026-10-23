-- Automation tests (outbox delivery, draft versions, eligibility, send gating, follow-ups).
-- ALWAYS ends in an exception, so everything rolls back. Result: "AUTOMATION TEST: N passed, 0 failed".
do $$
declare
  ws      uuid := private.default_workspace_id();
  u_admin uuid := (select id from public.profiles where role = 'admin' order by created_at limit 1);
  u_mem   uuid := (select id from public.profiles where role <> 'admin' order by created_at limit 1);
  c1 uuid; c2 uuid; c3 uuid; c4 uuid;
  d1 uuid; d2 uuid; d3 uuid; d4 uuid; d5 uuid;
  s1 uuid; s2 uuid; s4 uuid;
  ev uuid;
  r jsonb; t text; n integer;
  passed integer := 0;
  fails text := '';
begin
  if u_admin is null or u_mem is null then raise exception 'AUTOMATION TEST: needs 1 admin and 1 other profile'; end if;
  insert into public.workspace_members (workspace_id, user_id, role) values (ws, u_mem, 'member')
    on conflict (workspace_id, user_id) do update set role = 'member';

  -- ---------- outbox: claim lease, backoff, dead letter, requeue ----------
  perform set_config('request.jwt.claims', '{}', true);
  update public.outbox_events set next_attempt_at = now() + interval '1 day' where status in ('pending', 'failed', 'processing');  -- isolate from real rows
  insert into public.outbox_events (workspace_id, topic, payload) values (ws, 'test.event', '{}') returning id into ev;
  select count(*) into n from public.outbox_claim(10, 60) where id = ev;
  if n = 1 and (select status = 'processing' and attempts = 1 from public.outbox_events where id = ev) then passed := passed + 1; else fails := fails || '[claim] '; end if;
  select count(*) into n from public.outbox_claim(10, 60) where id = ev;
  if n = 0 then passed := passed + 1; else fails := fails || '[lease not respected] '; end if;
  t := public.outbox_complete(ev, false, 'n8n 502');
  if t = 'failed' and (select next_attempt_at > now() and last_error = 'n8n 502' from public.outbox_events where id = ev) then passed := passed + 1; else fails := fails || '[backoff] '; end if;
  update public.outbox_events set attempts = 8 where id = ev;
  t := public.outbox_complete(ev, false, 'still down');
  if t = 'dead' then passed := passed + 1; else fails := fails || '[dead letter] '; end if;

  perform set_config('request.jwt.claims', json_build_object('sub', u_mem, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  begin perform public.outbox_requeue(ev); fails := fails || '[member requeued] ';
  exception when insufficient_privilege then passed := passed + 1; end;
  begin perform public.outbox_claim(1, 60); fails := fails || '[member claimed outbox] ';
  exception when insufficient_privilege then passed := passed + 1; end;
  execute 'reset role';
  perform set_config('request.jwt.claims', json_build_object('sub', u_admin, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  t := public.outbox_requeue(ev);
  execute 'reset role';
  if t = 'pending' and (select attempts = 0 from public.outbox_events where id = ev) then passed := passed + 1; else fails := fails || '[requeue] '; end if;
  perform set_config('request.jwt.claims', '{}', true);
  perform public.outbox_claim(10, 60);
  if public.outbox_complete(ev, true, null) = 'delivered' and public.outbox_complete(ev, true, null) = 'delivered' then passed := passed + 1; else fails := fails || '[complete idempotent] '; end if;

  -- ---------- fixtures: contacts with/without consent, one suppressed ----------
  insert into public.contacts (workspace_id, full_name, email) values (ws, 'Test One', 'one@auto-test.test') returning id into c1;
  insert into public.contacts (workspace_id, full_name, email) values (ws, 'Test Two', 'two@auto-test.test') returning id into c2;
  insert into public.contacts (workspace_id, full_name, email) values (ws, 'Test Three', 'three@auto-test.test') returning id into c3;
  insert into public.contacts (workspace_id, full_name, email) values (ws, 'Test Four', 'four@auto-test.test') returning id into c4;
  insert into public.consent_records (workspace_id, contact_id, purpose, basis, status, source)
  select ws, c, 'outreach', 'consent', 'granted', 'test' from unnest(array[c1, c2, c3, c4]) c;
  insert into public.suppression_entries (workspace_id, kind, value_hash, reason) values (ws, 'email', public.suppression_hash('three@auto-test.test'), 'manual');

  r := public.contact_outreach_eligibility(c1, 'reply');
  if not (r ->> 'eligible')::boolean and r -> 'reasons' ? 'No enquiry from this contact in the last 90 days' then passed := passed + 1; else fails := fails || '[reply needs enquiry] '; end if;
  r := public.contact_outreach_eligibility(c3, 'outreach');
  if not (r ->> 'eligible')::boolean and r -> 'reasons' ? 'On the suppression list' then passed := passed + 1; else fails := fails || '[suppression] '; end if;

  -- ---------- drafts: versions + approval pinning ----------
  perform set_config('request.jwt.claims', json_build_object('sub', u_admin, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  insert into public.outreach_drafts (workspace_id, contact_id, subject, body, status, created_by) values (ws, c1, 'Hello', 'v1', 'pending_approval', u_admin) returning id into d1;
  update public.outreach_drafts set body = 'v2' where id = d1;
  update public.outreach_drafts set status = 'approved' where id = d1;
  if (select version = 2 and approved_version = 2 from public.outreach_drafts where id = d1) then passed := passed + 1; else fails := fails || '[version/approved_version] '; end if;
  insert into public.outreach_drafts (workspace_id, contact_id, subject, body, status, created_by) values (ws, c2, 'Hi', 'b', 'pending_approval', u_admin) returning id into d2;
  update public.outreach_drafts set status = 'approved' where id = d2;
  insert into public.outreach_drafts (workspace_id, contact_id, subject, body, status, created_by) values (ws, c3, 'Hi', 'b', 'pending_approval', u_admin) returning id into d3;
  update public.outreach_drafts set status = 'approved' where id = d3;
  insert into public.outreach_drafts (workspace_id, contact_id, subject, body, status, created_by) values (ws, c4, 'Hi', 'b', 'pending_approval', u_admin) returning id into d4;
  insert into public.outreach_drafts (workspace_id, contact_id, subject, body, status, created_by) values (ws, c1, 'Again', 'b', 'pending_approval', u_admin) returning id into d5;

  -- request send: unapproved, suppressed, duplicate
  begin perform public.outreach_request_send(d4); fails := fails || '[unapproved draft queued] ';
  exception when raise_exception then passed := passed + 1; end;
  begin perform public.outreach_request_send(d3); fails := fails || '[suppressed contact queued] ';
  exception when raise_exception then passed := passed + 1; end;
  s1 := (public.outreach_request_send(d1) ->> 'send_id')::uuid;
  begin perform public.outreach_request_send(d1); fails := fails || '[same version queued twice] ';
  exception when raise_exception then passed := passed + 1; end;
  s2 := (public.outreach_request_send(d2) ->> 'send_id')::uuid;
  update public.outreach_drafts set body = 'edited after the send was requested' where id = d2;
  update public.outreach_drafts set status = 'approved' where id = d4;
  s4 := (public.outreach_request_send(d4) ->> 'send_id')::uuid;
  execute 'reset role';
  if (select payload -> 'data' ->> 'send_id' = s1::text and payload ->> 'type' = 'outreach.send_requested' from public.outbox_events where aggregate_id = s1)
  then passed := passed + 1; else fails := fails || '[send_requested event] '; end if;

  perform set_config('request.jwt.claims', json_build_object('sub', u_mem, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  begin perform public.outreach_request_send(d1); fails := fails || '[member requested a send] ';
  exception when insufficient_privilege then passed := passed + 1; end;
  begin perform public.outreach_claim_send(s1, 50); fails := fails || '[member claimed a send] ';
  exception when insufficient_privilege then passed := passed + 1; end;
  execute 'reset role';
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  execute 'set local role anon';
  begin perform public.outreach_request_send(d1); fails := fails || '[anon requested a send] ';
  exception when insufficient_privilege then passed := passed + 1; end;
  execute 'reset role';

  -- ---------- sending service: claim + record ----------
  perform set_config('request.jwt.claims', '{}', true);
  r := public.outreach_claim_send(s1, 50);
  if (r ->> 'ok')::boolean and r ->> 'to' = 'one@auto-test.test' and r ->> 'body' = 'v2' then passed := passed + 1; else fails := fails || '[claim content] '; end if;
  r := public.outreach_claim_send(s1, 50);
  if r ->> 'reason' = 'not_queued' then passed := passed + 1; else fails := fails || '[double claim] '; end if;
  begin perform public.outreach_record_send(s1, 'sent', null, null); fails := fails || '[sent without message id] ';
  exception when raise_exception then passed := passed + 1; end;
  r := public.outreach_record_send(s1, 'sent', 'gmail-msg-1', null);
  if (select status = 'sent' and provider_message_id = 'gmail-msg-1' from public.outreach_drafts where id = d1)
     and exists (select 1 from public.email_events where draft_id = d1 and event = 'sent' and provider_message_id = 'gmail-msg-1')
  then passed := passed + 1; else fails := fails || '[record sent] '; end if;
  r := public.outreach_record_send(s1, 'sent', 'gmail-msg-1', null);
  if (r ->> 'repeat')::boolean then passed := passed + 1; else fails := fails || '[record not idempotent] '; end if;
  r := public.outreach_claim_send(s2, 50);
  if r ->> 'reason' = 'draft_changed' and (select status = 'cancelled' from public.outreach_sends where id = s2) then passed := passed + 1; else fails := fails || '[changed draft sent] '; end if;
  r := public.outreach_claim_send(s4, 1);
  if r ->> 'reason' = 'daily_limit' then passed := passed + 1; else fails := fails || '[daily limit] '; end if;

  -- cool-down: c1 was contacted just now
  perform set_config('request.jwt.claims', json_build_object('sub', u_admin, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  update public.outreach_drafts set status = 'approved' where id = d5;
  begin perform public.outreach_request_send(d5); fails := fails || '[cool-down ignored] ';
  exception when raise_exception then passed := passed + 1; end;
  execute 'reset role';

  -- ---------- follow-ups ----------
  perform set_config('request.jwt.claims', '{}', true);
  update public.outreach_drafts set sent_at = now() - interval '8 days' where id = d1;
  select count(*) into n from public.outreach_followups_due(7, 100) where draft_id = d1;
  if n = 1 then passed := passed + 1; else fails := fails || '[follow-up due] '; end if;
  insert into public.outreach_drafts (workspace_id, contact_id, subject, body, status, followup_of) values (ws, c1, 'Re: Hello', 'nudge', 'pending_approval', d1);
  select count(*) into n from public.outreach_followups_due(7, 100) where draft_id = d1;
  if n = 0 then passed := passed + 1; else fails := fails || '[follow-up drafted twice] '; end if;
  begin
    insert into public.outreach_drafts (workspace_id, contact_id, subject, body, status, followup_of) values (ws, c1, 'Re: Hello', 'again', 'pending_approval', d1);
    fails := fails || '[duplicate follow-up] ';
  exception when unique_violation then passed := passed + 1; end;

  raise exception 'AUTOMATION TEST: % passed%', passed, case when fails = '' then ', 0 failed' else ', FAILED: ' || fails end;
end $$;
