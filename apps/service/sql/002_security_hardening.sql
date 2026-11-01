-- 2.1.0 Supabase security/performance hardening (follow-up to 001).
-- Keep RLS deny-by-default without policies: all data access goes via
-- a server-authorized service_role, not browser Data API clients.
-- Pin function search_path to avoid role/session-dependent object resolution.
alter function public.precify_create_org(text,uuid) set search_path = '';
alter function public.precify_consume_oauth_state(text) set search_path = '';
alter function public.precify_import_order_batch(uuid,jsonb) set search_path = '';
alter function public.precify_import_campaign_batch(uuid,jsonb) set search_path = '';
alter function public.precify_erase_operational_data(uuid) set search_path = '';
-- Helps tenant deletion/expiration cleanup involving OAuth state rows.
create index if not exists idx_precify_oauth_states_org on public.precify_oauth_states(org_id);
