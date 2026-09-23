-- Garantit un seul workflow de justification par absence/retard.
-- Un justificatif refuse est remis en attente sur la meme ligne afin de
-- conserver son historique de creation et d'eviter les demandes concurrentes.

create unique index if not exists absence_justifications_record_id_uidx
  on public.absence_justifications(record_id);

create index if not exists absence_justifications_student_status_idx
  on public.absence_justifications(student_id, status, updated_at desc);

alter table public.absence_justifications enable row level security;

drop policy if exists "absence_justifications_select_scoped"
  on public.absence_justifications;
create policy "absence_justifications_select_scoped"
on public.absence_justifications
for select
to authenticated
using (
  student_id = auth.uid()
  or exists (
    select 1
    from public.institution_members membership
    where membership.institution_id = absence_justifications.institution_id
      and membership.user_id = auth.uid()
      and membership.role in ('owner', 'admin', 'pedagogy')
  )
);

-- Les mutations passent exclusivement par le backend avec la service role.
-- Cela empeche un etudiant de s'auto-valider ou de modifier le verdict depuis
-- le client Supabase, meme s'il connait l'identifiant du justificatif.
