create table if not exists public.course_activity_submissions (
  id uuid primary key default gen_random_uuid(),
  exercise_id uuid not null references public.exercises(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  answer text not null,
  status text not null default 'submitted' check (status in ('submitted', 'reviewed', 'returned')),
  score numeric(5,2),
  feedback text,
  submitted_at timestamptz not null default now(),
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  updated_at timestamptz not null default now(),
  unique(exercise_id, user_id)
);

create index if not exists course_activity_submissions_user_idx
  on public.course_activity_submissions(user_id, submitted_at desc);
create index if not exists course_activity_submissions_exercise_idx
  on public.course_activity_submissions(exercise_id, status);

alter table public.course_activity_submissions enable row level security;

drop policy if exists "activity_submissions_owner_select" on public.course_activity_submissions;
create policy "activity_submissions_owner_select" on public.course_activity_submissions
  for select using (
    auth.uid() = user_id
    or exists (
      select 1 from public.exercises e
      join public.courses c on c.id = e.course_id
      where e.id = course_activity_submissions.exercise_id
        and c.teacher_id = auth.uid()
    )
  );

drop policy if exists "activity_submissions_owner_insert" on public.course_activity_submissions;
create policy "activity_submissions_owner_insert" on public.course_activity_submissions
  for insert with check (auth.uid() = user_id);

drop policy if exists "activity_submissions_owner_update" on public.course_activity_submissions;
create policy "activity_submissions_owner_update" on public.course_activity_submissions
  for update using (
    auth.uid() = user_id
    or exists (
      select 1 from public.exercises e
      join public.courses c on c.id = e.course_id
      where e.id = course_activity_submissions.exercise_id
        and c.teacher_id = auth.uid()
    )
  );
