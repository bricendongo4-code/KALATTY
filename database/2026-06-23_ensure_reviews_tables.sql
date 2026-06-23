create table if not exists public.course_reviews (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  rating integer not null check (rating between 1 and 5),
  comment text,
  created_at timestamp with time zone not null default timezone('utc'::text, now()),
  updated_at timestamp with time zone not null default timezone('utc'::text, now()),
  constraint course_reviews_unique_student unique (course_id, student_id)
);

create table if not exists public.teacher_reviews (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.profiles(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  course_id uuid references public.courses(id) on delete set null,
  rating integer not null check (rating between 1 and 5),
  comment text,
  created_at timestamp with time zone not null default timezone('utc'::text, now()),
  updated_at timestamp with time zone not null default timezone('utc'::text, now()),
  constraint teacher_reviews_unique_student unique (teacher_id, student_id, course_id)
);

create index if not exists idx_course_reviews_course_id
  on public.course_reviews(course_id);

create index if not exists idx_teacher_reviews_teacher_id
  on public.teacher_reviews(teacher_id);
