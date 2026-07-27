-- =====================================================================
--  Portal — public "Request to join" submissions
--  Safe to run multiple times.
-- =====================================================================
create table if not exists public.join_requests (
  id         uuid primary key default gen_random_uuid(),
  full_name  text,
  email      text not null,
  message    text,
  status     text not null default 'new' check (status in ('new','handled','dismissed')),
  created_at timestamptz not null default now()
);
alter table public.join_requests enable row level security;

-- Anyone (logged out visitors = the anon role) may submit a request.
drop policy if exists "join insert public" on public.join_requests;
create policy "join insert public" on public.join_requests
  for insert to anon, authenticated with check (true);

-- Only admins can read / update / delete requests.
drop policy if exists "join admin manage" on public.join_requests;
create policy "join admin manage" on public.join_requests
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
-- =====================================================================
