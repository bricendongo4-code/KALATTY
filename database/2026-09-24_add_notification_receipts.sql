-- Memorise la lecture des notifications calculees a partir de l'activite.
-- Contrairement aux notifications stockees, leurs identifiants sont fonctionnels
-- (course-..., assignment-...) et ne peuvent pas etre ecrits dans une colonne UUID.

create table if not exists public.notification_receipts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  notification_key text not null,
  read_at timestamp with time zone not null default timezone('utc'::text, now()),
  constraint notification_receipts_user_key_unique unique (user_id, notification_key)
);

create index if not exists notification_receipts_user_id_idx
  on public.notification_receipts(user_id, read_at desc);

alter table public.notification_receipts enable row level security;

drop policy if exists "Users can read their notification receipts"
  on public.notification_receipts;
create policy "Users can read their notification receipts"
  on public.notification_receipts for select
  using (auth.uid() = user_id);

drop policy if exists "Users can create their notification receipts"
  on public.notification_receipts;
create policy "Users can create their notification receipts"
  on public.notification_receipts for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their notification receipts"
  on public.notification_receipts;
create policy "Users can update their notification receipts"
  on public.notification_receipts for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
