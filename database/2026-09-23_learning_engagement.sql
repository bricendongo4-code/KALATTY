-- Engagement e-learning: reprise vidéo, notes privées, questions et favoris.
alter table public.progress
  add column if not exists position_seconds integer not null default 0,
  add column if not exists progress_pct numeric(5,2) not null default 0;

create unique index if not exists progress_user_lesson_unique
  on public.progress(user_id, lesson_id);

create table if not exists public.lesson_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  content text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, lesson_id)
);

create table if not exists public.course_questions (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  lesson_id uuid references public.lessons(id) on delete set null,
  author_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(trim(body)) between 3 and 2000),
  status text not null default 'open' check (status in ('open', 'answered', 'closed')),
  answer text,
  answered_by uuid references public.profiles(id) on delete set null,
  answered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.course_favorites (
  user_id uuid not null references public.profiles(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(user_id, course_id)
);

create index if not exists lesson_notes_user_idx on public.lesson_notes(user_id);
create index if not exists course_questions_course_idx on public.course_questions(course_id, created_at desc);
create index if not exists course_questions_author_idx on public.course_questions(author_id);

alter table public.lesson_notes enable row level security;
alter table public.course_questions enable row level security;
alter table public.course_favorites enable row level security;

drop policy if exists "lesson_notes_owner_all" on public.lesson_notes;
create policy "lesson_notes_owner_all" on public.lesson_notes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "course_favorites_owner_all" on public.course_favorites;
create policy "course_favorites_owner_all" on public.course_favorites
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "course_questions_participants_select" on public.course_questions;
create policy "course_questions_participants_select" on public.course_questions
  for select using (
    auth.uid() = author_id
    or exists (
      select 1 from public.courses c
      where c.id = course_questions.course_id and c.teacher_id = auth.uid()
    )
  );

drop policy if exists "course_questions_author_insert" on public.course_questions;
create policy "course_questions_author_insert" on public.course_questions
  for insert with check (auth.uid() = author_id);

drop policy if exists "course_questions_teacher_update" on public.course_questions;
create policy "course_questions_teacher_update" on public.course_questions
  for update using (
    exists (
      select 1 from public.courses c
      where c.id = course_questions.course_id and c.teacher_id = auth.uid()
    )
  );
