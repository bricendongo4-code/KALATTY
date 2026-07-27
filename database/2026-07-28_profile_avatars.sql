-- Ajoute l'option photo de profil sans ecraser les donnees existantes.

alter table public.profiles
  add column if not exists avatar_url text;

insert into storage.buckets (id, name, public)
values ('profile-avatars', 'profile-avatars', true)
on conflict (id) do update
set public = excluded.public;
