create table if not exists public.certificates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete restrict,
  verification_code text not null unique default upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 16)),
  issued_at timestamptz not null default now(),
  revoked_at timestamptz,
  unique(user_id, course_id)
);

create index if not exists certificates_user_issued_idx on public.certificates(user_id, issued_at desc);
alter table public.certificates enable row level security;

drop policy if exists "certificates_owner_select" on public.certificates;
create policy "certificates_owner_select" on public.certificates
  for select using (auth.uid() = user_id);
