"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import Shell from "../Shell";
import { campusFetch, useCampusContext } from "../useEstablishment";
import { Icon } from "../ui";
import styles from "../student/student-pages.module.css";
import type { RoleSlug } from "../roles";

const DAYS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];
type ScheduleRole = Extract<RoleSlug, "teacher" | "pedagogy" | "admin">;
type Slot = { id: string; roomId: string; title: string; roomName: string; weekday: number; startsAt: string; endsAt: string | null; location: string };
type Room = { id: string; name: string };
type ScheduleForm = { roomId: string; title: string; weekday: number; startsAt: string; endsAt: string; location: string };

const emptyForm = (weekday: number): ScheduleForm => ({
  roomId: "",
  title: "",
  weekday,
  startsAt: "08:00",
  endsAt: "09:00",
  location: "",
});

export default function TeacherSchedulePage({ role = "teacher" }: { role?: ScheduleRole } = {}) {
  const { context, loading: contextLoading, error: contextError, mismatch } = useCampusContext(role);
  const [schedule, setSchedule] = useState<Slot[] | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [day, setDay] = useState(new Date().getDay() || 7);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ScheduleForm>(() => emptyForm(new Date().getDay() || 7));
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [scheduleResult, homeResult] = await Promise.all([
        campusFetch(role === "teacher" ? "/campus/teacher/schedule" : "/campus/staff/schedule"),
        campusFetch("/campus/home"),
      ]);
      const availableRooms = role === "teacher"
        ? (homeResult.data?.classes ?? []).map((room: { roomId: string; name: string }) => ({ id: room.roomId, name: room.name }))
        : (homeResult.data?.rooms ?? []).map((room: { id: string; name: string }) => ({ id: room.id, name: room.name }));
      setSchedule(scheduleResult.schedule ?? []);
      setRooms(availableRooms);
      setForm((current) => ({ ...current, roomId: current.roomId || availableRooms[0]?.id || "" }));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Planning indisponible.");
    }
  }, [role]);

  useEffect(() => {
    if (context) void load();
  }, [context, load]);

  const resetForm = (weekday = day) => {
    setEditingId(null);
    setForm({ ...emptyForm(weekday), roomId: rooms[0]?.id ?? "" });
  };

  const edit = (slot: Slot) => {
    setEditingId(slot.id);
    setDay(slot.weekday);
    setForm({
      roomId: slot.roomId,
      title: slot.title,
      weekday: slot.weekday,
      startsAt: slot.startsAt,
      endsAt: slot.endsAt ?? "",
      location: slot.location,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (!form.roomId) return;
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const payload = {
        title: form.title.trim(),
        weekday: form.weekday,
        starts_at: form.startsAt,
        ends_at: form.endsAt || null,
        location: form.location.trim() || null,
      };
      await campusFetch(
        editingId ? `/institutions/schedule/${editingId}` : `/institutions/rooms/${form.roomId}/schedule`,
        { method: editingId ? "PATCH" : "POST", body: JSON.stringify(payload) },
      );
      setNotice(editingId ? "Créneau modifié." : "Créneau publié.");
      resetForm(form.weekday);
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Enregistrement impossible.");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (slot: Slot) => {
    if (!window.confirm(`Supprimer le créneau « ${slot.title} » ?`)) return;
    setDeletingId(slot.id);
    setError(null);
    setNotice(null);
    try {
      await campusFetch(`/institutions/schedule/${slot.id}`, { method: "DELETE" });
      setNotice("Créneau supprimé de l’emploi du temps.");
      if (editingId === slot.id) resetForm(slot.weekday);
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Suppression impossible.");
    } finally {
      setDeletingId(null);
    }
  };

  if (mismatch) return <section className={styles.standalone}>Cette page ne correspond pas à votre rôle. <Link href={`/establishment/${mismatch.campusRole}`}>Ouvrir mon espace</Link></section>;
  const daily = schedule?.filter((item) => item.weekday === day) ?? [];

  return <Shell role={role} activeSlug="schedule" displayName={context?.displayName} institutionName={context?.institutionName} note={contextError ?? null}>
    <header className={styles.head}><div><small>ESPACE {role.toUpperCase()}</small><h1>{role === "teacher" ? "Planning de mes classes" : "Emplois du temps"}</h1><p>{role === "teacher" ? "Publiez et adaptez les créneaux des classes auxquelles vous êtes affecté." : "Publiez et modifiez les créneaux des classes de votre périmètre."}</p></div><Link href={`/establishment/${role}`} className={styles.back}>← Accueil</Link></header>
    {rooms.length ? <form className={`${styles.tile} ${styles.scheduleEditor}`} onSubmit={(event) => void save(event)}>
      <div className={styles.scheduleEditorHead}><div><small>PLANIFICATION</small><h2>{editingId ? "Modifier le créneau" : "Publier un créneau"}</h2></div>{editingId ? <button type="button" className={styles.secondaryButton} onClick={() => resetForm()}>Annuler</button> : null}</div>
      <div className={styles.scheduleFields}>
        <label>Classe<select value={form.roomId} disabled={Boolean(editingId)} onChange={(event) => setForm({ ...form, roomId: event.target.value })}>{rooms.map((room) => <option key={room.id} value={room.id}>{room.name}</option>)}</select></label>
        <label>Cours ou activité<input required maxLength={160} value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="Mathématiques, révision, TP…" /></label>
        <label>Jour<select value={form.weekday} onChange={(event) => setForm({ ...form, weekday: Number(event.target.value) })}>{DAYS.map((label, index) => <option key={label} value={index + 1}>{label}</option>)}</select></label>
        <label>Début<input required type="time" value={form.startsAt} onChange={(event) => setForm({ ...form, startsAt: event.target.value })} /></label>
        <label>Fin<input type="time" value={form.endsAt} onChange={(event) => setForm({ ...form, endsAt: event.target.value })} /></label>
        <label>Salle ou lien<input maxLength={160} value={form.location} onChange={(event) => setForm({ ...form, location: event.target.value })} placeholder="Salle 2 ou lien visio" /></label>
      </div>
      <button disabled={saving || !form.roomId} type="submit">{saving ? "Enregistrement…" : editingId ? "Enregistrer les modifications" : "Publier dans l’emploi du temps"}</button>
      {notice ? <p className={styles.feedback} role="status">{notice}</p> : null}
    </form> : !contextLoading ? <section className={styles.state}><Icon name="layers" /><h2>Aucune classe disponible</h2><p>Une classe doit d’abord être créée et affectée à votre périmètre.</p></section> : null}
    {error || contextError ? <div className={styles.state} role="alert"><p>{error ?? contextError}</p><button type="button" onClick={() => void load()}>Réessayer</button></div> : null}
    <nav className={styles.days} aria-label="Jours de la semaine">{DAYS.map((label, index) => <button type="button" key={label} className={day === index + 1 ? styles.selected : ""} onClick={() => setDay(index + 1)}>{label}</button>)}</nav>
    {contextLoading || !schedule && !error && !contextError ? <div className={styles.state}>Chargement du planning…</div> : daily.length ? <div className={styles.stack}>{daily.map((slot) => <article className={styles.card} key={slot.id}><time>{slot.startsAt} – {slot.endsAt ?? "—"}</time><div><h2>{slot.title}</h2><p>{slot.roomName}{slot.location ? ` · ${slot.location}` : ""}</p></div><div className={styles.scheduleActions}><button type="button" className={styles.editScheduleButton} onClick={() => edit(slot)}><Icon name="edit" /> Modifier</button><button type="button" className={styles.deleteScheduleButton} disabled={deletingId === slot.id} onClick={() => void remove(slot)}>{deletingId === slot.id ? "Suppression…" : "Supprimer"}</button></div></article>)}</div> : <section className={styles.state}><h2>Aucun créneau {DAYS[day - 1].toLowerCase()}</h2><p>Utilisez le formulaire pour publier le planning de la semaine.</p></section>}
  </Shell>;
}
