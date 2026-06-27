create table if not exists public.institution_managed_users (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  login_email text not null,
  full_name text not null,
  managed_role text not null check (managed_role = any (array['admin'::text, 'teacher'::text, 'student'::text])),
  source text not null default 'manual' check (source = any (array['manual'::text, 'csv'::text, 'api'::text])),
  status text not null default 'active' check (status = any (array['active'::text, 'invited'::text, 'suspended'::text])),
  must_reset_password boolean not null default true,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now()),
  unique (institution_id, user_id),
  unique (login_email)
);

create index if not exists institution_managed_users_institution_idx
  on public.institution_managed_users (institution_id);

create index if not exists institution_managed_users_role_idx
  on public.institution_managed_users (managed_role);
