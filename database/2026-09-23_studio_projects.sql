begin;

create table if not exists public.studio_projects (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.profiles(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  lesson_id uuid references public.lessons(id) on delete set null,
  title text not null,
  status text not null default 'draft' check (status in ('draft', 'ready', 'published', 'archived')),
  script text not null default '',
  transcript text not null default '',
  scenes jsonb not null default '[]'::jsonb,
  video_path text,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists studio_projects_teacher_updated_idx
  on public.studio_projects (teacher_id, updated_at desc);
create index if not exists studio_projects_course_idx
  on public.studio_projects (course_id);

create table if not exists public.studio_ai_generations (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.studio_projects(id) on delete cascade,
  teacher_id uuid not null references public.profiles(id) on delete cascade,
  action text not null check (action in ('outline', 'script', 'quiz')),
  prompt text not null,
  result jsonb not null,
  model text not null,
  created_at timestamptz not null default now()
);

create index if not exists studio_ai_generations_project_idx
  on public.studio_ai_generations (project_id, created_at desc);

alter table public.studio_projects enable row level security;
alter table public.studio_ai_generations enable row level security;

drop policy if exists studio_projects_teacher_all on public.studio_projects;
create policy studio_projects_teacher_all on public.studio_projects
  for all using (teacher_id = auth.uid()) with check (teacher_id = auth.uid());

drop policy if exists studio_ai_teacher_select on public.studio_ai_generations;
create policy studio_ai_teacher_select on public.studio_ai_generations
  for select using (teacher_id = auth.uid());

drop policy if exists studio_ai_teacher_insert on public.studio_ai_generations;
create policy studio_ai_teacher_insert on public.studio_ai_generations
  for insert with check (teacher_id = auth.uid());

commit;
