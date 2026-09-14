-- Notifications persistantes par utilisateur.
-- Migration non destructive: ajoute uniquement une nouvelle table et ses index.
-- Cette table est deja utilisee par backend/src/notifications/notifications.service.ts
-- mais n'existait pas encore en base, ce qui rendait la persistance des notifications
-- et le marquage "lu" silencieusement inoperants.

create table if not exists public.notifications (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null default 'system'::text,
  title text not null,
  message text not null,
  href text,
  read_at timestamp with time zone,
  created_at timestamp with time zone not null default timezone('utc'::text, now()),
  constraint notifications_pkey primary key (id)
);

create index if not exists notifications_user_id_idx
  on public.notifications(user_id, created_at desc);
