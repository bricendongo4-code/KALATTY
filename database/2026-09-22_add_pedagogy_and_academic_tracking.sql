-- KALATTY
-- Espace Etablissement v2 : role Responsable pedagogique, formations, matieres,
-- seances (mode classe), evaluations enrichies, justificatifs d'absence,
-- documents officiels et annonces.
-- Migration additive et non destructive : aucune table ni colonne existante n'est supprimee.

begin;

-- ---------------------------------------------------------------------------
-- 1. Nouveau role d'etablissement : pedagogy (Responsable pedagogique)
-- ---------------------------------------------------------------------------
do $$
declare
  c record;
begin
  for c in
    select conname from pg_constraint
    where conrelid = 'public.institution_members'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%role%'
  loop
    execute format('alter table public.institution_members drop constraint %I', c.conname);
  end loop;
end $$;

alter table public.institution_members
  add constraint institution_members_role_check
  check (role in ('owner', 'admin', 'teacher', 'student', 'pedagogy'));

-- Les invitations peuvent desormais rattacher directement a l'etablissement
-- (admin, pedagogy) sans salle precise, en plus des invitations de salle existantes.
alter table public.room_invites alter column room_id drop not null;

do $$
declare
  c record;
begin
  for c in
    select conname from pg_constraint
    where conrelid = 'public.room_invites'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%invite_role%'
  loop
    execute format('alter table public.room_invites drop constraint %I', c.conname);
  end loop;
end $$;

alter table public.room_invites
  add constraint room_invites_invite_role_check
  check (invite_role in ('teacher', 'student', 'assistant', 'admin', 'pedagogy'));

alter table public.room_invites
  add column if not exists institution_wide boolean not null default false;

comment on column public.room_invites.institution_wide is
  'true pour un lien d''invitation admin/pedagogy sans salle precise (room_id nul).';

drop policy if exists "room_invites_select_staff_or_token_holder" on public.room_invites;
create policy "room_invites_select_staff_or_token_holder"
on public.room_invites
for select
to authenticated
using (
  exists (
    select 1 from public.institution_members im
    where im.institution_id = room_invites.institution_id
      and im.user_id = auth.uid()
      and im.role in ('owner', 'admin')
  )
  or (
    room_invites.room_id is not null
    and exists (
      select 1
      from public.rooms r
      join public.institution_members im on im.institution_id = r.institution_id
      where r.id = room_invites.room_id
        and im.user_id = auth.uid()
        and im.role in ('owner', 'admin', 'teacher')
    )
  )
);

drop policy if exists "room_invites_manage_staff" on public.room_invites;
create policy "room_invites_manage_staff"
on public.room_invites
for all
to authenticated
using (
  exists (
    select 1 from public.institution_members im
    where im.institution_id = room_invites.institution_id
      and im.user_id = auth.uid()
      and im.role in ('owner', 'admin')
  )
  or (
    room_invites.room_id is not null
    and exists (
      select 1
      from public.rooms r
      join public.institution_members im on im.institution_id = r.institution_id
      where r.id = room_invites.room_id
        and im.user_id = auth.uid()
        and im.role in ('owner', 'admin', 'teacher')
    )
  )
)
with check (
  exists (
    select 1 from public.institution_members im
    where im.institution_id = room_invites.institution_id
      and im.user_id = auth.uid()
      and im.role in ('owner', 'admin')
  )
  or (
    room_invites.room_id is not null
    and exists (
      select 1
      from public.rooms r
      join public.institution_members im on im.institution_id = r.institution_id
      where r.id = room_invites.room_id
        and im.user_id = auth.uid()
        and im.role in ('owner', 'admin', 'teacher')
    )
  )
);

-- ---------------------------------------------------------------------------
-- 2. Formations (regroupent plusieurs classes/promotions = rooms)
-- ---------------------------------------------------------------------------
create table if not exists public.formations (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  name text not null,
  level text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists formations_institution_id_idx
  on public.formations(institution_id);

drop trigger if exists formations_set_updated_at on public.formations;
create trigger formations_set_updated_at
before update on public.formations
for each row execute function public.set_updated_at();

alter table public.rooms
  add column if not exists formation_id uuid references public.formations(id) on delete set null;

create index if not exists rooms_formation_id_idx
  on public.rooms(formation_id);

-- Perimetre du responsable pedagogique : formations dont il a la charge.
-- Une ligne absente pour un utilisateur "pedagogy" signifie "etablissement entier"
-- (perimetre par defaut), conformement au principe retenu pour la V1.
create table if not exists public.institution_pedagogy_scopes (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  formation_id uuid not null references public.formations(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  unique (user_id, formation_id)
);

create index if not exists institution_pedagogy_scopes_user_id_idx
  on public.institution_pedagogy_scopes(user_id);

-- ---------------------------------------------------------------------------
-- 3. Matieres (distinctes des cours e-learning, mais reliables a un cours)
-- ---------------------------------------------------------------------------
create table if not exists public.subjects (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  name text not null,
  course_id uuid references public.courses(id) on delete set null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists subjects_institution_id_idx
  on public.subjects(institution_id);

comment on column public.subjects.course_id is
  'Passerelle Etablissement <-> E-learning : cours Kalatty lie a cette matiere (optionnel).';

drop trigger if exists subjects_set_updated_at on public.subjects;
create trigger subjects_set_updated_at
before update on public.subjects
for each row execute function public.set_updated_at();

-- Affectation d'une matiere a une classe, avec le professeur qui l'enseigne.
create table if not exists public.room_subjects (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  subject_id uuid not null references public.subjects(id) on delete cascade,
  teacher_id uuid references public.profiles(id) on delete set null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (room_id, subject_id)
);

create index if not exists room_subjects_room_id_idx
  on public.room_subjects(room_id);

create index if not exists room_subjects_teacher_id_idx
  on public.room_subjects(teacher_id);

drop trigger if exists room_subjects_set_updated_at on public.room_subjects;
create trigger room_subjects_set_updated_at
before update on public.room_subjects
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 4. Seances (mode Classe) : instance datee d'un creneau, avec cahier de texte
-- ---------------------------------------------------------------------------
-- room_attendance_sessions porte deja la salle et la date : on l'etend plutot
-- que de dupliquer une table "sessions" parallele.
alter table public.room_attendance_sessions
  add column if not exists room_subject_id uuid references public.room_subjects(id) on delete set null,
  add column if not exists schedule_item_id uuid references public.room_schedule_items(id) on delete set null,
  add column if not exists teacher_id uuid references public.profiles(id) on delete set null,
  add column if not exists status text not null default 'scheduled'
    check (status in ('scheduled', 'live', 'done', 'cancelled')),
  add column if not exists started_at timestamptz,
  add column if not exists ended_at timestamptz,
  add column if not exists content_done text,
  add column if not exists homework text;

comment on table public.room_attendance_sessions is
  'Seance de classe (ex-registre de presence) : porte aussi le cahier de texte et son etat (Mode Classe).';

create index if not exists room_attendance_sessions_room_subject_idx
  on public.room_attendance_sessions(room_subject_id);

create index if not exists room_attendance_sessions_teacher_idx
  on public.room_attendance_sessions(teacher_id);

-- ---------------------------------------------------------------------------
-- 5. Evaluations enrichies (type, coefficient, competences, publication)
-- ---------------------------------------------------------------------------
alter table public.assignments
  add column if not exists room_subject_id uuid references public.room_subjects(id) on delete set null,
  add column if not exists eval_type text not null default 'devoir'
    check (eval_type in ('devoir', 'quiz', 'examen', 'oral', 'projet')),
  add column if not exists coefficient numeric(5, 2) not null default 1,
  add column if not exists competencies text[] not null default '{}';

alter table public.assignment_submissions
  add column if not exists published boolean not null default false,
  add column if not exists published_at timestamptz;

comment on column public.assignment_submissions.published is
  'Une note/correction n''est visible de l''etudiant que lorsque published = true (regle de publication de l''etablissement).';

-- ---------------------------------------------------------------------------
-- 6. Justificatifs d'absence
-- ---------------------------------------------------------------------------
create table if not exists public.absence_justifications (
  id uuid primary key default gen_random_uuid(),
  record_id uuid not null references public.room_attendance_records(id) on delete cascade,
  institution_id uuid not null references public.institutions(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  reason text not null,
  file_path text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  review_note text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists absence_justifications_institution_idx
  on public.absence_justifications(institution_id, status);

create index if not exists absence_justifications_student_idx
  on public.absence_justifications(student_id);

drop trigger if exists absence_justifications_set_updated_at on public.absence_justifications;
create trigger absence_justifications_set_updated_at
before update on public.absence_justifications
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 7. Documents officiels et annonces
-- ---------------------------------------------------------------------------
create table if not exists public.institution_documents (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  title text not null,
  category text not null default 'general',
  file_path text not null,
  uploaded_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists institution_documents_institution_idx
  on public.institution_documents(institution_id);

create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  room_id uuid references public.rooms(id) on delete cascade,
  author_id uuid references public.profiles(id) on delete set null,
  title text not null,
  body text not null,
  audience text not null default 'all' check (audience in ('all', 'teachers', 'students', 'room')),
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists announcements_institution_idx
  on public.announcements(institution_id, created_at desc);

insert into storage.buckets (id, name, public)
values ('institution-documents', 'institution-documents', false)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('absence-justifications', 'absence-justifications', false)
on conflict (id) do nothing;

commit;
