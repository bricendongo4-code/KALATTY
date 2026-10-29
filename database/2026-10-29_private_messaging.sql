-- Private institution messaging, isolated by institution and participants.
-- Apply only in an isolated staging database after review.
begin;
create table if not exists public.message_threads (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  created_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (id, institution_id)
);
create table if not exists public.message_participants (
  thread_id uuid not null references public.message_threads(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (thread_id, user_id)
);
create table if not exists public.private_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.message_threads(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(btrim(body)) between 1 and 4000),
  created_at timestamptz not null default now()
);
create index if not exists private_messages_thread_idx on public.private_messages(thread_id, created_at desc);
create index if not exists message_participants_user_idx on public.message_participants(user_id);
alter table public.message_threads enable row level security;
alter table public.message_participants enable row level security;
alter table public.private_messages enable row level security;
-- No direct client table policies. Only authenticated, membership-checked NestJS endpoints
-- using the server's privileged Supabase client may access these tables.
revoke all on public.message_threads, public.message_participants, public.private_messages from anon, authenticated;
commit;
