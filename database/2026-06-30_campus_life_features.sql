-- Vie scolaire Kalatty: emploi du temps, presence/absence, controle d'acces.
-- Migration non destructive: ajoute uniquement de nouvelles tables et index.

create table if not exists public.room_schedule_items (
  id uuid not null default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  institution_id uuid not null references public.institutions(id) on delete cascade,
  title text not null,
  weekday integer not null check (weekday between 1 and 7),
  starts_at time without time zone not null,
  ends_at time without time zone,
  location text,
  notes text,
  created_by uuid references public.profiles(id),
  created_at timestamp with time zone not null default timezone('utc'::text, now()),
  updated_at timestamp with time zone not null default timezone('utc'::text, now()),
  constraint room_schedule_items_pkey primary key (id)
);

create index if not exists room_schedule_items_room_id_idx
  on public.room_schedule_items(room_id);

create index if not exists room_schedule_items_institution_id_idx
  on public.room_schedule_items(institution_id);

create table if not exists public.room_attendance_sessions (
  id uuid not null default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  institution_id uuid not null references public.institutions(id) on delete cascade,
  title text not null,
  session_date date not null,
  created_by uuid references public.profiles(id),
  created_at timestamp with time zone not null default timezone('utc'::text, now()),
  updated_at timestamp with time zone not null default timezone('utc'::text, now()),
  constraint room_attendance_sessions_pkey primary key (id)
);

create index if not exists room_attendance_sessions_room_id_idx
  on public.room_attendance_sessions(room_id, session_date desc);

create table if not exists public.room_attendance_records (
  id uuid not null default gen_random_uuid(),
  session_id uuid not null references public.room_attendance_sessions(id) on delete cascade,
  room_id uuid not null references public.rooms(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'present'::text
    check (status = any (array['present'::text, 'absent'::text, 'late'::text, 'excused'::text])),
  note text,
  marked_by uuid references public.profiles(id),
  created_at timestamp with time zone not null default timezone('utc'::text, now()),
  updated_at timestamp with time zone not null default timezone('utc'::text, now()),
  constraint room_attendance_records_pkey primary key (id),
  constraint room_attendance_records_unique_student unique (session_id, student_id)
);

create index if not exists room_attendance_records_room_id_idx
  on public.room_attendance_records(room_id);

create index if not exists room_attendance_records_student_id_idx
  on public.room_attendance_records(student_id);

create table if not exists public.room_member_controls (
  id uuid not null default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'active'::text
    check (status = any (array['active'::text, 'blocked'::text])),
  reason text,
  updated_by uuid references public.profiles(id),
  created_at timestamp with time zone not null default timezone('utc'::text, now()),
  updated_at timestamp with time zone not null default timezone('utc'::text, now()),
  constraint room_member_controls_pkey primary key (id),
  constraint room_member_controls_room_user_unique unique (room_id, user_id)
);

create index if not exists room_member_controls_room_id_idx
  on public.room_member_controls(room_id);

create table if not exists public.assignment_files (
  id uuid not null default gen_random_uuid(),
  assignment_id uuid not null references public.assignments(id) on delete cascade,
  room_id uuid not null references public.rooms(id) on delete cascade,
  name text not null,
  file_path text not null,
  file_type text not null default 'document'::text,
  uploaded_by uuid references public.profiles(id),
  created_at timestamp with time zone not null default timezone('utc'::text, now()),
  constraint assignment_files_pkey primary key (id)
);

create index if not exists assignment_files_assignment_id_idx
  on public.assignment_files(assignment_id);

create index if not exists assignment_files_room_id_idx
  on public.assignment_files(room_id);

insert into storage.buckets (id, name, public)
values ('assignment-files', 'assignment-files', false)
on conflict (id) do nothing;
