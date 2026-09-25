create table if not exists public.privacy_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  request_type text not null check (request_type in ('deletion', 'rectification')),
  status text not null default 'pending' check (status in ('pending', 'processing', 'completed', 'rejected')),
  requested_at timestamptz not null default now(),
  processed_at timestamptz,
  resolution_note text
);

create index if not exists privacy_requests_user_id_idx on public.privacy_requests(user_id, requested_at desc);
alter table public.privacy_requests enable row level security;

drop policy if exists "privacy_requests_select_own" on public.privacy_requests;
create policy "privacy_requests_select_own" on public.privacy_requests
  for select using (auth.uid() = user_id);

drop policy if exists "privacy_requests_insert_own" on public.privacy_requests;
create policy "privacy_requests_insert_own" on public.privacy_requests
  for insert with check (auth.uid() = user_id);
