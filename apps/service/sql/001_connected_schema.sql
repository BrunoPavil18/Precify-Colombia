-- Precify Financy 2.1.0 connected-mode schema for a PostgreSQL/Supabase project.
-- Run explicitly in the target database. Nothing here runs on app startup.
-- No Vezura or existing local-browser data is touched.
create extension if not exists pgcrypto;
create table if not exists public.precify_organizations(
 id uuid primary key default gen_random_uuid(),name text not null check(length(name) between 1 and 120),
 created_by uuid not null,created_at timestamptz not null default now()
);
create table if not exists public.precify_memberships(
 org_id uuid not null references public.precify_organizations(id) on delete cascade,
 user_id uuid not null,role text not null check(role in ('owner','admin','analyst','viewer')),
 created_at timestamptz not null default now(),primary key(org_id,user_id)
);
create index if not exists idx_precify_memberships_user on public.precify_memberships(user_id);
create table if not exists public.precify_order_events(
 org_id uuid not null references public.precify_organizations(id) on delete cascade,
 event_id text not null check(length(event_id) between 1 and 128),
 order_id text not null check(length(order_id) between 1 and 128),
 payload jsonb not null,created_at timestamptz not null default now(),
 primary key(org_id,event_id)
);
create index if not exists idx_precify_orders_by_id on public.precify_order_events(org_id,order_id);
create table if not exists public.precify_campaigns(
 org_id uuid not null references public.precify_organizations(id) on delete cascade,
 id text not null,payload jsonb not null,updated_at timestamptz not null default now(),
 primary key(org_id,id)
);
create table if not exists public.precify_prices(
 org_id uuid not null references public.precify_organizations(id) on delete cascade,
 id uuid not null default gen_random_uuid(),payload jsonb not null,
 created_at timestamptz not null default now(),primary key(org_id,id)
);
create table if not exists public.precify_api_keys(
 org_id uuid not null references public.precify_organizations(id) on delete cascade,
 id uuid not null default gen_random_uuid(),
 secret_hash text not null unique,scope text not null check(scope in ('read','write')),
 created_by uuid not null,created_at timestamptz not null default now(),revoked_at timestamptz,
 primary key(org_id,id)
);
create table if not exists public.precify_webhooks(
 org_id uuid not null references public.precify_organizations(id) on delete cascade,
 id uuid not null default gen_random_uuid(),secret_enc text not null,
 created_by uuid not null,created_at timestamptz not null default now(),revoked_at timestamptz,
 primary key(org_id,id)
);
create table if not exists public.precify_oauth_states(
 nonce_hash text primary key,org_id uuid not null references public.precify_organizations(id) on delete cascade,
 user_id uuid not null,expires_at timestamptz not null,created_at timestamptz not null default now()
);
create table if not exists public.precify_meta_connections(
 org_id uuid not null references public.precify_organizations(id) on delete cascade,
 user_id uuid not null,token_enc text not null,expires_at timestamptz,
 connected_at timestamptz not null default now(),primary key(org_id,user_id)
);
create table if not exists public.precify_meta_accounts(
 org_id uuid not null references public.precify_organizations(id) on delete cascade,
 user_id uuid not null,account_id text not null,account_name text not null,
 currency text not null,created_at timestamptz not null default now(),
 primary key(org_id,user_id,account_id)
);
create table if not exists public.precify_audit(
 org_id uuid not null references public.precify_organizations(id) on delete cascade,
 id uuid not null default gen_random_uuid(),actor text not null,action text not null,
 event_at timestamptz not null default now(),details jsonb not null default '{}'::jsonb,
 primary key(org_id,id)
);
-- API service uses a server-side service-role key and enforces membership before
-- every query. No direct table grants for public/anon/authenticated clients.
alter table public.precify_organizations enable row level security;
alter table public.precify_memberships enable row level security;
alter table public.precify_order_events enable row level security;
alter table public.precify_campaigns enable row level security;
alter table public.precify_prices enable row level security;
alter table public.precify_api_keys enable row level security;
alter table public.precify_webhooks enable row level security;
alter table public.precify_oauth_states enable row level security;
alter table public.precify_meta_connections enable row level security;
alter table public.precify_meta_accounts enable row level security;
alter table public.precify_audit enable row level security;
revoke all on public.precify_organizations,public.precify_memberships,public.precify_order_events,
 public.precify_campaigns,public.precify_prices,public.precify_api_keys,public.precify_webhooks,
 public.precify_oauth_states,public.precify_meta_connections,public.precify_meta_accounts,
 public.precify_audit from anon,authenticated;
create or replace function public.precify_create_org(p_name text,p_user uuid)
returns uuid language plpgsql security invoker as $$
declare v_id uuid;
begin
 if length(trim(p_name)) not between 1 and 120 then raise exception 'Invalid org name'; end if;
 insert into public.precify_organizations(name,created_by)
 values (trim(p_name),p_user) returning id into v_id;
 insert into public.precify_memberships(org_id,user_id,role)values(v_id,p_user,'owner');
 return v_id;
end $$;
revoke all on function public.precify_create_org(text,uuid) from public,anon,authenticated;
grant execute on function public.precify_create_org(text,uuid) to service_role;

-- Atomically claim one OAuth state exactly once (prevents callback replay races).
create or replace function public.precify_consume_oauth_state(p_nonce_hash text)
returns table(org_id uuid,user_id uuid) language sql security invoker as $$
 delete from public.precify_oauth_states
 where nonce_hash=p_nonce_hash and expires_at>now()
 returning precify_oauth_states.org_id,precify_oauth_states.user_id;
$$;
revoke all on function public.precify_consume_oauth_state(text) from public,anon,authenticated;
grant execute on function public.precify_consume_oauth_state(text) to service_role;

-- A batch must either insert consistently or fail without partial writes.
-- The service validates each payload first and ensures the caller owns org permissions.
-- A transaction-scoped org advisory lock serializes concurrent webhook/API replays.
create or replace function public.precify_import_order_batch(p_org uuid,p_events jsonb)
returns integer language plpgsql security invoker as $$
declare v_event jsonb; v_id text; v_order text; v_existing jsonb; v_count integer:=0;
begin
 if jsonb_typeof(p_events) <> 'array' or jsonb_array_length(p_events)>10000
 then raise exception 'Invalid event batch'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_org::text, 2100));
 for v_event in select value from jsonb_array_elements(p_events) loop
  v_id:=v_event->>'id';v_order:=v_event->>'orderId';
  if v_id is null or length(v_id) not between 1 and 128 or
     v_order is null or length(v_order) not between 1 and 128
  then raise exception 'Invalid event identity'; end if;
  select payload into v_existing from public.precify_order_events
  where org_id=p_org and event_id=v_id for update;
  if found then
   if v_existing<>v_event then raise exception 'Conflicting event ID %',v_id; end if;
  else
   insert into public.precify_order_events(org_id,event_id,order_id,payload)
   values(p_org,v_id,v_order,v_event);
  end if;
  v_count:=v_count+1;
 end loop;
 return v_count;
end $$;
revoke all on function public.precify_import_order_batch(uuid,jsonb) from public,anon,authenticated;
grant execute on function public.precify_import_order_batch(uuid,jsonb) to service_role;

-- All mutations below run as one PostgreSQL transaction per RPC call.
-- The org-scoped advisory lock is shared with precify_import_order_batch,
-- preventing an in-flight COD import from racing against erasure.
-- The service verifies owner permissions before invoking this restricted RPC.
create or replace function public.precify_erase_operational_data(p_org uuid)
returns void language plpgsql security invoker as $$
begin
 perform pg_advisory_xact_lock(hashtextextended(p_org::text, 2100));
 delete from public.precify_order_events where org_id=p_org;
 delete from public.precify_campaigns where org_id=p_org;
 delete from public.precify_prices where org_id=p_org;
 delete from public.precify_meta_accounts where org_id=p_org;
 delete from public.precify_meta_connections where org_id=p_org;
 delete from public.precify_oauth_states where org_id=p_org;
 delete from public.precify_webhooks where org_id=p_org;
 delete from public.precify_api_keys where org_id=p_org;
 -- Keep organization/memberships and a minimal audit trail of deletion.
 insert into public.precify_audit(org_id,actor,action,details)
 values(p_org,'system','data.erase','{"scope":"connected-operational-data"}'::jsonb);
end $$;
revoke all on function public.precify_erase_operational_data(uuid) from public,anon,authenticated;
grant execute on function public.precify_erase_operational_data(uuid) to service_role;

-- Durable campaign imports share the erasure/import transaction lock.
-- Updated insights may replace existing observations, but a reused ID must
-- not silently switch its source or operating currency.
create or replace function public.precify_import_campaign_batch(p_org uuid,p_campaigns jsonb)
returns integer language plpgsql security invoker as $$
declare v_campaign jsonb;v_id text;v_previous jsonb;v_count integer:=0;
begin
 if jsonb_typeof(p_campaigns)<>'array' or jsonb_array_length(p_campaigns)>10000
 then raise exception 'Invalid campaign batch'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_org::text, 2100));
 for v_campaign in select value from jsonb_array_elements(p_campaigns) loop
  v_id:=v_campaign->>'id';
  if v_id is null or length(v_id) not between 1 and 128 then
   raise exception 'Invalid campaign identity';end if;
  select payload into v_previous from public.precify_campaigns
   where org_id=p_org and id=v_id for update;
  if found and (v_previous->>'source' is distinct from v_campaign->>'source' or
                v_previous->>'currency' is distinct from v_campaign->>'currency') then
   raise exception 'Campaign source/currency conflict';
  end if;
  insert into public.precify_campaigns(org_id,id,payload,updated_at)
   values(p_org,v_id,v_campaign,now())
   on conflict (org_id,id) do update
    set payload=excluded.payload,updated_at=excluded.updated_at;
  v_count:=v_count+1;
 end loop;
 return v_count;
end $$;
revoke all on function public.precify_import_campaign_batch(uuid,jsonb) from public,anon,authenticated;
grant execute on function public.precify_import_campaign_batch(uuid,jsonb) to service_role;
