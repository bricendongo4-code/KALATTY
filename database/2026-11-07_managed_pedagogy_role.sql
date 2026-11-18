-- À appliquer avant la version qui propose le rôle dans le formulaire.
-- Ce rôle existe déjà dans institution_members. Aucun droit n'est modifié.
begin;

alter table public.institution_managed_users
  drop constraint institution_managed_users_managed_role_check,
  add constraint institution_managed_users_managed_role_check
    check (managed_role in ('admin', 'pedagogy', 'teacher', 'student'));

commit;
