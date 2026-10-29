-- Private institution messaging, isolated by institution and participants.
-- Apply only in an isolated staging database after review.
begin;
create table if not exists public.message_threads (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  created_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  last_message_at timestamptz not null default now(),
  unique (id, institution_id)
);
create table if not exists public.message_participants (
  thread_id uuid not null references public.message_threads(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  last_read_at timestamptz,
  primary key (thread_id, user_id)
);
create table if not exists public.private_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.message_threads(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  constraint message_sender_is_participant foreign key (thread_id, sender_id)
    references public.message_participants(thread_id, user_id),
  body text not null default '' check (char_length(body) <= 4000),
  attachment_path text,
  attachment_name text,
  attachment_type text,
  attachment_size integer check (attachment_size between 1 and 10485760),
  deleted_at timestamptz,
  constraint message_has_content check (char_length(btrim(body)) > 0 or attachment_path is not null),
  created_at timestamptz not null default now()
);
-- Membership and participant constraints are enforced by the API and database.
create or replace function public.validate_private_message_participant()
returns trigger language plpgsql security definer set search_path = public as $
declare v_institution_id uuid;
begin
  select institution_id into v_institution_id from public.message_threads where id = new.thread_id;
  if v_institution_id is null or not exists (
    select 1 from public.institution_members
    where institution_id = v_institution_id and user_id = new.user_id
  ) and not exists (
    select 1 from public.institutions
    where id = v_institution_id and owner_user_id = new.user_id
  ) then
    raise exception 'Messaging participant must belong to the institution';
  end if;
  return new;
end;
$;
drop trigger if exists enforce_message_participant_membership on public.message_participants;
create trigger enforce_message_participant_membership
before insert or update of thread_id, user_id on public.message_participants
for each row execute function public.validate_private_message_participant();
create index if not exists message_threads_activity_idx
  on public.message_threads (institution_id, last_message_at desc);
create index if not exists private_messages_thread_idx on public.private_messages(thread_id, created_at desc);
create index if not exists message_participants_user_idx on public.message_participants(user_id);
alter table public.message_threads enable row level security;
alter table public.message_participants enable row level security;
alter table public.private_messages enable row level security;
-- No direct client table policies. Only authenticated, membership-checked NestJS endpoints
-- using the server's privileged Supabase client may access these tables.
revoke all on public.message_threads, public.message_participants, public.private_messages from anon, authenticated;
insert into storage.buckets (id, name, public, file_size_limit) values ('private-messaging', 'private-messaging', false, 10485760) on conflict (id) do update set public = false, file_size_limit = 10485760;
-- No direct client storage access. NestJS checks membership and signs downloads.
commit;
