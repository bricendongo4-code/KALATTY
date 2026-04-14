-- KALATTY
-- Migration additive pour les liens d'invitation de salle.

begin;

create extension if not exists pgcrypto;

create table if not exists public.room_invites (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  room_id uuid not null references public.rooms(id) on delete cascade,
  token text not null unique,
  invite_role text not null check (invite_role in ('teacher', 'student', 'assistant')),
  created_by uuid references public.profiles(id) on delete set null,
  expires_at timestamptz,
  max_uses integer not null default 1 check (max_uses >= 1),
  used_count integer not null default 0 check (used_count >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists room_invites_room_id_idx
  on public.room_invites(room_id);

create index if not exists room_invites_institution_id_idx
  on public.room_invites(institution_id);

drop trigger if exists room_invites_set_updated_at on public.room_invites;
create trigger room_invites_set_updated_at
before update on public.room_invites
for each row execute function public.set_updated_at();

alter table public.room_invites enable row level security;

drop policy if exists "room_invites_select_staff_or_token_holder" on public.room_invites;
create policy "room_invites_select_staff_or_token_holder"
on public.room_invites
for select
to authenticated
using (
  exists (
    select 1
    from public.rooms r
    join public.institution_members im on im.institution_id = r.institution_id
    where r.id = room_invites.room_id
      and im.user_id = auth.uid()
      and im.role in ('owner', 'admin', 'teacher')
  )
);

drop policy if exists "room_invites_manage_staff" on public.room_invites;
create policy "room_invites_manage_staff"
on public.room_invites
for all
to authenticated
using (
  exists (
    select 1
    from public.rooms r
    join public.institution_members im on im.institution_id = r.institution_id
    where r.id = room_invites.room_id
      and im.user_id = auth.uid()
      and im.role in ('owner', 'admin', 'teacher')
  )
)
with check (
  exists (
    select 1
    from public.rooms r
    join public.institution_members im on im.institution_id = r.institution_id
    where r.id = room_invites.room_id
      and im.user_id = auth.uid()
      and im.role in ('owner', 'admin', 'teacher')
  )
);

commit;
