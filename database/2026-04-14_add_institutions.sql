-- KALATTY
-- Migration additive pour l'espace etablissement.
-- Cette migration ajoute les tables institutionnelles sans supprimer
-- les tables existantes ni ecraser les scripts deja en place.

begin;

create extension if not exists pgcrypto;

do $$
declare
  constraint_name text;
begin
  select c.conname
  into constraint_name
  from pg_constraint c
  join pg_class t on t.oid = c.conrelid
  join pg_namespace n on n.oid = t.relnamespace
  where n.nspname = 'public'
    and t.relname = 'profiles'
    and c.contype = 'c'
    and pg_get_constraintdef(c.oid) ilike '%role%student%'
  limit 1;

  if constraint_name is not null then
    execute format('alter table public.profiles drop constraint %I', constraint_name);
  end if;

  if not exists (
    select 1
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    where n.nspname = 'public'
      and t.relname = 'profiles'
      and c.conname = 'profiles_role_check'
  ) then
    alter table public.profiles
      add constraint profiles_role_check
      check (role in ('student', 'teacher', 'institution', 'admin'));
  end if;
end $$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.institutions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  owner_user_id uuid not null references public.profiles(id) on delete restrict,
  contact_email text,
  institution_type text,
  description text,
  country text default 'Cameroun',
  subscription_status text not null default 'trial'
    check (subscription_status in ('trial', 'active', 'past_due', 'cancelled')),
  plan_name text not null default 'starter',
  max_students integer not null default 100 check (max_students >= 1),
  max_rooms integer not null default 10 check (max_rooms >= 1),
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.institution_members (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('owner', 'admin', 'teacher', 'student')),
  joined_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (institution_id, user_id)
);

create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  name text not null,
  slug text,
  description text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (institution_id, name)
);

create table if not exists public.room_members (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('teacher', 'student', 'assistant')),
  joined_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (room_id, user_id)
);

create table if not exists public.institution_courses (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  assigned_by uuid references public.profiles(id) on delete set null,
  is_required boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (institution_id, course_id)
);

create table if not exists public.room_courses (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  assigned_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (room_id, course_id)
);

create table if not exists public.assignments (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  course_id uuid references public.courses(id) on delete set null,
  lesson_id uuid references public.lessons(id) on delete set null,
  created_by uuid references public.profiles(id) on delete set null,
  title text not null,
  instructions text,
  due_at timestamptz,
  max_score numeric(10,2),
  status text not null default 'published'
    check (status in ('draft', 'published', 'closed')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.assignment_submissions (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.assignments(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  content text,
  file_path text,
  status text not null default 'submitted'
    check (status in ('draft', 'submitted', 'reviewed', 'returned')),
  submitted_at timestamptz,
  reviewed_at timestamptz,
  reviewed_by uuid references public.profiles(id) on delete set null,
  score numeric(10,2),
  feedback text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (assignment_id, student_id)
);

create index if not exists institutions_owner_user_id_idx
  on public.institutions(owner_user_id);

create index if not exists institution_members_institution_id_idx
  on public.institution_members(institution_id);

create index if not exists institution_members_user_id_idx
  on public.institution_members(user_id);

create index if not exists rooms_institution_id_idx
  on public.rooms(institution_id);

create index if not exists room_members_room_id_idx
  on public.room_members(room_id);

create index if not exists room_members_user_id_idx
  on public.room_members(user_id);

create index if not exists institution_courses_institution_id_idx
  on public.institution_courses(institution_id);

create index if not exists institution_courses_course_id_idx
  on public.institution_courses(course_id);

create index if not exists room_courses_room_id_idx
  on public.room_courses(room_id);

create index if not exists assignments_room_id_idx
  on public.assignments(room_id);

create index if not exists assignments_course_id_idx
  on public.assignments(course_id);

create index if not exists assignment_submissions_assignment_id_idx
  on public.assignment_submissions(assignment_id);

create index if not exists assignment_submissions_student_id_idx
  on public.assignment_submissions(student_id);

drop trigger if exists institutions_set_updated_at on public.institutions;
create trigger institutions_set_updated_at
before update on public.institutions
for each row execute function public.set_updated_at();

drop trigger if exists institution_members_set_updated_at on public.institution_members;
create trigger institution_members_set_updated_at
before update on public.institution_members
for each row execute function public.set_updated_at();

drop trigger if exists rooms_set_updated_at on public.rooms;
create trigger rooms_set_updated_at
before update on public.rooms
for each row execute function public.set_updated_at();

drop trigger if exists room_members_set_updated_at on public.room_members;
create trigger room_members_set_updated_at
before update on public.room_members
for each row execute function public.set_updated_at();

drop trigger if exists institution_courses_set_updated_at on public.institution_courses;
create trigger institution_courses_set_updated_at
before update on public.institution_courses
for each row execute function public.set_updated_at();

drop trigger if exists room_courses_set_updated_at on public.room_courses;
create trigger room_courses_set_updated_at
before update on public.room_courses
for each row execute function public.set_updated_at();

drop trigger if exists assignments_set_updated_at on public.assignments;
create trigger assignments_set_updated_at
before update on public.assignments
for each row execute function public.set_updated_at();

drop trigger if exists assignment_submissions_set_updated_at on public.assignment_submissions;
create trigger assignment_submissions_set_updated_at
before update on public.assignment_submissions
for each row execute function public.set_updated_at();

alter table public.institutions enable row level security;
alter table public.institution_members enable row level security;
alter table public.rooms enable row level security;
alter table public.room_members enable row level security;
alter table public.institution_courses enable row level security;
alter table public.room_courses enable row level security;
alter table public.assignments enable row level security;
alter table public.assignment_submissions enable row level security;

drop policy if exists "institutions_select_members" on public.institutions;
create policy "institutions_select_members"
on public.institutions
for select
to authenticated
using (
  owner_user_id = auth.uid()
  or exists (
    select 1
    from public.institution_members im
    where im.institution_id = institutions.id
      and im.user_id = auth.uid()
  )
);

drop policy if exists "institutions_manage_admins" on public.institutions;
create policy "institutions_manage_admins"
on public.institutions
for all
to authenticated
using (
  owner_user_id = auth.uid()
  or exists (
    select 1
    from public.institution_members im
    where im.institution_id = institutions.id
      and im.user_id = auth.uid()
      and im.role in ('owner', 'admin')
  )
)
with check (
  owner_user_id = auth.uid()
  or exists (
    select 1
    from public.institution_members im
    where im.institution_id = institutions.id
      and im.user_id = auth.uid()
      and im.role in ('owner', 'admin')
  )
);

drop policy if exists "institution_members_select_visible" on public.institution_members;
create policy "institution_members_select_visible"
on public.institution_members
for select
to authenticated
using (
  user_id = auth.uid()
  or exists (
    select 1
    from public.institution_members self
    where self.institution_id = institution_members.institution_id
      and self.user_id = auth.uid()
      and self.role in ('owner', 'admin', 'teacher')
  )
);

drop policy if exists "institution_members_manage_admins" on public.institution_members;
create policy "institution_members_manage_admins"
on public.institution_members
for all
to authenticated
using (
  exists (
    select 1
    from public.institution_members self
    where self.institution_id = institution_members.institution_id
      and self.user_id = auth.uid()
      and self.role in ('owner', 'admin')
  )
)
with check (
  exists (
    select 1
    from public.institution_members self
    where self.institution_id = institution_members.institution_id
      and self.user_id = auth.uid()
      and self.role in ('owner', 'admin')
  )
);

drop policy if exists "rooms_select_members" on public.rooms;
create policy "rooms_select_members"
on public.rooms
for select
to authenticated
using (
  exists (
    select 1
    from public.institution_members im
    where im.institution_id = rooms.institution_id
      and im.user_id = auth.uid()
  )
);

drop policy if exists "rooms_manage_admins" on public.rooms;
create policy "rooms_manage_admins"
on public.rooms
for all
to authenticated
using (
  exists (
    select 1
    from public.institution_members im
    where im.institution_id = rooms.institution_id
      and im.user_id = auth.uid()
      and im.role in ('owner', 'admin', 'teacher')
  )
)
with check (
  exists (
    select 1
    from public.institution_members im
    where im.institution_id = rooms.institution_id
      and im.user_id = auth.uid()
      and im.role in ('owner', 'admin', 'teacher')
  )
);

drop policy if exists "room_members_select_visible" on public.room_members;
create policy "room_members_select_visible"
on public.room_members
for select
to authenticated
using (
  user_id = auth.uid()
  or exists (
    select 1
    from public.room_members rm
    where rm.room_id = room_members.room_id
      and rm.user_id = auth.uid()
      and rm.role in ('teacher', 'assistant')
  )
  or exists (
    select 1
    from public.rooms r
    join public.institution_members im on im.institution_id = r.institution_id
    where r.id = room_members.room_id
      and im.user_id = auth.uid()
      and im.role in ('owner', 'admin')
  )
);

drop policy if exists "room_members_manage_staff" on public.room_members;
create policy "room_members_manage_staff"
on public.room_members
for all
to authenticated
using (
  exists (
    select 1
    from public.rooms r
    join public.institution_members im on im.institution_id = r.institution_id
    where r.id = room_members.room_id
      and im.user_id = auth.uid()
      and im.role in ('owner', 'admin', 'teacher')
  )
)
with check (
  exists (
    select 1
    from public.rooms r
    join public.institution_members im on im.institution_id = r.institution_id
    where r.id = room_members.room_id
      and im.user_id = auth.uid()
      and im.role in ('owner', 'admin', 'teacher')
  )
);

drop policy if exists "institution_courses_select_members" on public.institution_courses;
create policy "institution_courses_select_members"
on public.institution_courses
for select
to authenticated
using (
  exists (
    select 1
    from public.institution_members im
    where im.institution_id = institution_courses.institution_id
      and im.user_id = auth.uid()
  )
);

drop policy if exists "institution_courses_manage_staff" on public.institution_courses;
create policy "institution_courses_manage_staff"
on public.institution_courses
for all
to authenticated
using (
  exists (
    select 1
    from public.institution_members im
    where im.institution_id = institution_courses.institution_id
      and im.user_id = auth.uid()
      and im.role in ('owner', 'admin', 'teacher')
  )
)
with check (
  exists (
    select 1
    from public.institution_members im
    where im.institution_id = institution_courses.institution_id
      and im.user_id = auth.uid()
      and im.role in ('owner', 'admin', 'teacher')
  )
);

drop policy if exists "room_courses_select_members" on public.room_courses;
create policy "room_courses_select_members"
on public.room_courses
for select
to authenticated
using (
  exists (
    select 1
    from public.room_members rm
    where rm.room_id = room_courses.room_id
      and rm.user_id = auth.uid()
  )
  or exists (
    select 1
    from public.rooms r
    join public.institution_members im on im.institution_id = r.institution_id
    where r.id = room_courses.room_id
      and im.user_id = auth.uid()
      and im.role in ('owner', 'admin', 'teacher')
  )
);

drop policy if exists "room_courses_manage_staff" on public.room_courses;
create policy "room_courses_manage_staff"
on public.room_courses
for all
to authenticated
using (
  exists (
    select 1
    from public.rooms r
    join public.institution_members im on im.institution_id = r.institution_id
    where r.id = room_courses.room_id
      and im.user_id = auth.uid()
      and im.role in ('owner', 'admin', 'teacher')
  )
)
with check (
  exists (
    select 1
    from public.rooms r
    join public.institution_members im on im.institution_id = r.institution_id
    where r.id = room_courses.room_id
      and im.user_id = auth.uid()
      and im.role in ('owner', 'admin', 'teacher')
  )
);

drop policy if exists "assignments_select_room_members" on public.assignments;
create policy "assignments_select_room_members"
on public.assignments
for select
to authenticated
using (
  exists (
    select 1
    from public.room_members rm
    where rm.room_id = assignments.room_id
      and rm.user_id = auth.uid()
  )
  or exists (
    select 1
    from public.rooms r
    join public.institution_members im on im.institution_id = r.institution_id
    where r.id = assignments.room_id
      and im.user_id = auth.uid()
      and im.role in ('owner', 'admin')
  )
);

drop policy if exists "assignments_manage_staff" on public.assignments;
create policy "assignments_manage_staff"
on public.assignments
for all
to authenticated
using (
  exists (
    select 1
    from public.room_members rm
    where rm.room_id = assignments.room_id
      and rm.user_id = auth.uid()
      and rm.role in ('teacher', 'assistant')
  )
  or exists (
    select 1
    from public.rooms r
    join public.institution_members im on im.institution_id = r.institution_id
    where r.id = assignments.room_id
      and im.user_id = auth.uid()
      and im.role in ('owner', 'admin')
  )
)
with check (
  exists (
    select 1
    from public.room_members rm
    where rm.room_id = assignments.room_id
      and rm.user_id = auth.uid()
      and rm.role in ('teacher', 'assistant')
  )
  or exists (
    select 1
    from public.rooms r
    join public.institution_members im on im.institution_id = r.institution_id
    where r.id = assignments.room_id
      and im.user_id = auth.uid()
      and im.role in ('owner', 'admin')
  )
);

drop policy if exists "assignment_submissions_select_relevant" on public.assignment_submissions;
create policy "assignment_submissions_select_relevant"
on public.assignment_submissions
for select
to authenticated
using (
  student_id = auth.uid()
  or exists (
    select 1
    from public.assignments a
    join public.room_members rm on rm.room_id = a.room_id
    where a.id = assignment_submissions.assignment_id
      and rm.user_id = auth.uid()
      and rm.role in ('teacher', 'assistant')
  )
  or exists (
    select 1
    from public.assignments a
    join public.rooms r on r.id = a.room_id
    join public.institution_members im on im.institution_id = r.institution_id
    where a.id = assignment_submissions.assignment_id
      and im.user_id = auth.uid()
      and im.role in ('owner', 'admin')
  )
);

drop policy if exists "assignment_submissions_insert_student" on public.assignment_submissions;
create policy "assignment_submissions_insert_student"
on public.assignment_submissions
for insert
to authenticated
with check (
  student_id = auth.uid()
  and exists (
    select 1
    from public.assignments a
    join public.room_members rm on rm.room_id = a.room_id
    where a.id = assignment_submissions.assignment_id
      and rm.user_id = auth.uid()
      and rm.role = 'student'
  )
);

drop policy if exists "assignment_submissions_update_owner_or_staff" on public.assignment_submissions;
create policy "assignment_submissions_update_owner_or_staff"
on public.assignment_submissions
for update
to authenticated
using (
  student_id = auth.uid()
  or exists (
    select 1
    from public.assignments a
    join public.room_members rm on rm.room_id = a.room_id
    where a.id = assignment_submissions.assignment_id
      and rm.user_id = auth.uid()
      and rm.role in ('teacher', 'assistant')
  )
)
with check (
  student_id = auth.uid()
  or exists (
    select 1
    from public.assignments a
    join public.room_members rm on rm.room_id = a.room_id
    where a.id = assignment_submissions.assignment_id
      and rm.user_id = auth.uid()
      and rm.role in ('teacher', 'assistant')
  )
);

insert into public.institution_members (institution_id, user_id, role)
select i.id, i.owner_user_id, 'owner'
from public.institutions i
where not exists (
  select 1
  from public.institution_members im
  where im.institution_id = i.id
    and im.user_id = i.owner_user_id
);

commit;
