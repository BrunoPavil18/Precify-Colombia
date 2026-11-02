-- Precify Financy 2.1.0 — live PostgreSQL smoke test.
-- Run on a dedicated TEST project only; all synthetic changes are rolled back.
-- Full application HTTP authentication and true two-session concurrency are out of scope.
begin;
do $precify_smoke$
declare
  a uuid; b uuid; user_a uuid:=gen_random_uuid(); user_b uuid:=gen_random_uuid();
  n integer; conflicting boolean:=false; campaign jsonb; nonce text:='test-'||gen_random_uuid();
begin
  a:=public.precify_create_org('SMOKE tenant A',user_a);
  b:=public.precify_create_org('SMOKE tenant B',user_b);
  if (select count(*) from public.precify_memberships where org_id in (a,b) and role='owner')<>2 then
    raise exception 'Owners not created';
  end if;
  n:=public.precify_import_order_batch(a,'[{"id":"event1","orderId":"order1","status":"created"},{"id":"event2","orderId":"order1","status":"paid"}]'::jsonb);
  if n<>2 then raise exception 'Import order batch failed';end if;
  n:=public.precify_import_order_batch(a,'[{"id":"event1","orderId":"order1","status":"created"}]'::jsonb);
  if (select count(*) from public.precify_order_events where org_id=a)<>2 then
    raise exception 'Replay not idempotent';end if;
  begin
    n:=public.precify_import_order_batch(a,'[{"id":"event3","orderId":"order2"},{"id":"event1","orderId":"order1","status":"changed"}]'::jsonb);
  exception when others then conflicting:=true;end;
  if not conflicting or (select count(*) from public.precify_order_events where org_id=a)<>2 then
    raise exception 'Conflicting order import did not roll back';end if;
  n:=public.precify_import_campaign_batch(a,'[{"id":"c1","source":"meta","currency":"COP","spend":"100"}]'::jsonb);
  n:=public.precify_import_campaign_batch(a,'[{"id":"c1","source":"meta","currency":"COP","spend":"200"}]'::jsonb);
  select payload into campaign from public.precify_campaigns where org_id=a and id='c1';
  if campaign->>'spend'<>'200' then raise exception 'Campaign update failed';end if;
  conflicting:=false;
  begin
    n:=public.precify_import_campaign_batch(a,'[{"id":"c2","source":"csv","currency":"COP"},{"id":"c1","source":"csv","currency":"COP"}]'::jsonb);
  exception when others then conflicting:=true;end;
  if not conflicting or (select count(*) from public.precify_campaigns where org_id=a)<>1 then
    raise exception 'Conflicting campaign import not atomic';end if;
  n:=public.precify_import_order_batch(b,'[{"id":"b1","orderId":"order-b"}]'::jsonb);
  n:=public.precify_import_campaign_batch(b,'[{"id":"cb","source":"csv","currency":"USD"}]'::jsonb);
  insert into public.precify_oauth_states(nonce_hash,org_id,user_id,expires_at)
  values(nonce,a,user_a,now()+interval '5 minutes');
  if (select count(*) from public.precify_consume_oauth_state(nonce))<>1 then
    raise exception 'OAuth nonce first consumption failed';end if;
  if (select count(*) from public.precify_consume_oauth_state(nonce))<>0 then
    raise exception 'OAuth nonce reused';end if;
  perform public.precify_erase_operational_data(a);
  if exists(select 1 from public.precify_order_events where org_id=a)
     or exists(select 1 from public.precify_campaigns where org_id=a)
     or (select count(*) from public.precify_memberships where org_id=a)<>1
     or (select count(*) from public.precify_audit where org_id=a and action='data.erase')<>1 then
    raise exception 'Erasure not isolated or did not preserve org/audit';end if;
  if (select count(*) from public.precify_order_events where org_id=b)<>1 or
     (select count(*) from public.precify_campaigns where org_id=b)<>1 then
    raise exception 'Cross-tenant deletion';end if;
end $precify_smoke$;
rollback;

-- Run independently to prove RPC permissions work with the actual service_role.
begin;
set local role service_role;
do $service_role_smoke$
declare v_org uuid; imported integer;
begin
 v_org:=public.precify_create_org('SMOKE service role',gen_random_uuid());
 imported:=public.precify_import_order_batch(v_org,'[{"id":"one","orderId":"qa"}]'::jsonb);
 if imported<>1 then raise exception 'Service role order insert failed';end if;
 imported:=public.precify_import_campaign_batch(v_org,'[{"id":"first","source":"csv","currency":"COP"}]'::jsonb);
 if imported<>1 then raise exception 'Service role campaign insert failed';end if;
 perform public.precify_erase_operational_data(v_org);
 if exists(select 1 from public.precify_order_events where org_id=v_org) then
  raise exception 'Service role erase failed';end if;
end $service_role_smoke$;
rollback;
