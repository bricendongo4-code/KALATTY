-- Ajoute des champs pedagogiques optionnels aux cours: objectifs, prerequis, niveau.
-- Migration non destructive: n'ajoute que des colonnes nullables.

alter table public.courses
  add column if not exists objectives text,
  add column if not exists prerequisites text,
  add column if not exists level text;
