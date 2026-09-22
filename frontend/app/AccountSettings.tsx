"use client";

import { ChangeEvent, FormEvent, useCallback, useEffect, useState } from "react";
import { Icon } from "./campus/ui";
import styles from "./account-settings.module.css";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";
type Profile = { email?: string; fullname?: string; level?: string; school_name?: string; expertise?: string; bio?: string; avatar_url?: string; avatarUrl?: string };

export default function AccountSettings() {
  const [profile, setProfile] = useState<Profile>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [passwords, setPasswords] = useState({ current: "", next: "", confirmation: "" });
  const [showPasswords, setShowPasswords] = useState(false);

  const token = () => localStorage.getItem("kalatty_token") ?? "";
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/dashboard`, { headers: { Authorization: `Bearer ${token()}` } });
      const body = await response.json();
      if (!response.ok) throw new Error(body.message ?? "Profil inaccessible.");
      setProfile(body.profile ?? {});
    } catch (reason) { setMessage(reason instanceof Error ? reason.message : "Profil inaccessible."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const notifyProfile = (next: Profile) => {
    const existing = JSON.parse(localStorage.getItem("kalatty_user") ?? "null") ?? {};
    localStorage.setItem("kalatty_user", JSON.stringify({ ...existing, ...next }));
    window.dispatchEvent(new CustomEvent("kalatty-profile-updated", { detail: next }));
  };

  const saveProfile = async (event: FormEvent) => {
    event.preventDefault(); setSaving(true); setMessage(null);
    try {
      const response = await fetch(`${API_BASE}/dashboard/profile`, { method: "PATCH", headers: { Authorization: `Bearer ${token()}`, "Content-Type": "application/json" }, body: JSON.stringify({ fullname: profile.fullname, level: profile.level, school_name: profile.school_name, expertise: profile.expertise, bio: profile.bio }) });
      const body = await response.json(); if (!response.ok) throw new Error(body.message ?? "Modification impossible.");
      setProfile(body); notifyProfile(body); setMessage("Profil enregistré avec succès.");
    } catch (reason) { setMessage(reason instanceof Error ? reason.message : "Modification impossible."); }
    finally { setSaving(false); }
  };

  const uploadAvatar = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]; if (!file) return;
    setSaving(true); setMessage(null);
    try {
      const data = new FormData(); data.append("file", file);
      const response = await fetch(`${API_BASE}/dashboard/profile/avatar`, { method: "POST", headers: { Authorization: `Bearer ${token()}` }, body: data });
      const body = await response.json(); if (!response.ok) throw new Error(body.message ?? "Import impossible.");
      setProfile(body); notifyProfile(body); setMessage("Photo de profil mise à jour.");
    } catch (reason) { setMessage(reason instanceof Error ? reason.message : "Import impossible."); }
    finally { setSaving(false); event.target.value = ""; }
  };

  const changePassword = async (event: FormEvent) => {
    event.preventDefault(); setMessage(null);
    if (passwords.next.length < 8) return setMessage("Le nouveau mot de passe doit contenir au moins 8 caractères.");
    if (passwords.next !== passwords.confirmation) return setMessage("La confirmation ne correspond pas au nouveau mot de passe.");
    setSaving(true);
    try {
      const response = await fetch(`${API_BASE}/auth/change-password`, { method: "POST", headers: { Authorization: `Bearer ${token()}`, "Content-Type": "application/json" }, body: JSON.stringify({ currentPassword: passwords.current, newPassword: passwords.next }) });
      const body = await response.json(); if (!response.ok) throw new Error(body.message ?? "Modification impossible.");
      setPasswords({ current: "", next: "", confirmation: "" }); setMessage(body.message ?? "Mot de passe modifié avec succès.");
    } catch (reason) { setMessage(reason instanceof Error ? reason.message : "Modification impossible."); }
    finally { setSaving(false); }
  };

  const avatar = profile.avatar_url ?? profile.avatarUrl;
  if (loading) return <section className={styles.loading}><span /><p>Chargement de votre profil…</p></section>;
  return <div className={styles.grid}>
    {message ? <p className={styles.message}>{message}</p> : null}
    <section className={styles.card}><header><div><h2>Photo de profil</h2><p>Cette photo apparaît dans vos différents espaces Kalatty.</p></div></header><div className={styles.avatarRow}><span className={styles.avatar} style={avatar ? { backgroundImage: `url(${avatar})` } : undefined}>{avatar ? "" : (profile.fullname ?? "K").split(" ").map((part) => part[0]).slice(0,2).join("")}</span><label className={styles.upload}>{saving ? "Traitement…" : "Choisir une photo"}<input type="file" accept="image/*" disabled={saving} onChange={uploadAvatar} /></label><small>JPG, PNG ou WEBP · 5 Mo maximum.</small></div></section>
    <form className={styles.card} onSubmit={saveProfile}><header><div><h2>Informations personnelles</h2><p>Les données déjà enregistrées dans votre profil.</p></div></header><div className={styles.formGrid}><label>Nom complet<input value={profile.fullname ?? ""} onChange={(e) => setProfile((p) => ({ ...p, fullname: e.target.value }))} required /></label><label>Adresse e-mail<input value={profile.email ?? ""} disabled /></label><label>Niveau<input value={profile.level ?? ""} onChange={(e) => setProfile((p) => ({ ...p, level: e.target.value }))} /></label><label>Établissement<input value={profile.school_name ?? ""} onChange={(e) => setProfile((p) => ({ ...p, school_name: e.target.value }))} /></label><label className={styles.wide}>Expertise<input value={profile.expertise ?? ""} onChange={(e) => setProfile((p) => ({ ...p, expertise: e.target.value }))} /></label><label className={styles.wide}>Présentation<textarea rows={4} value={profile.bio ?? ""} onChange={(e) => setProfile((p) => ({ ...p, bio: e.target.value }))} /></label></div><button className={styles.primary} disabled={saving}>{saving ? "Enregistrement…" : "Enregistrer le profil"}</button></form>
    <form className={styles.card} onSubmit={changePassword}><header><div><h2>Sécurité du compte</h2><p>Utilisez votre mot de passe actuel pour en définir un nouveau.</p></div><button type="button" className={styles.showButton} onClick={() => setShowPasswords((value) => !value)}><Icon name={showPasswords ? "eyeOff" : "eye"} /> {showPasswords ? "Masquer" : "Afficher"}</button></header><div className={styles.formGrid}><label className={styles.wide}>Mot de passe actuel<input type={showPasswords ? "text" : "password"} autoComplete="current-password" value={passwords.current} onChange={(e) => setPasswords((p) => ({ ...p, current: e.target.value }))} required /></label><label>Nouveau mot de passe<input type={showPasswords ? "text" : "password"} autoComplete="new-password" value={passwords.next} onChange={(e) => setPasswords((p) => ({ ...p, next: e.target.value }))} minLength={8} required /></label><label>Confirmer le mot de passe<input type={showPasswords ? "text" : "password"} autoComplete="new-password" value={passwords.confirmation} onChange={(e) => setPasswords((p) => ({ ...p, confirmation: e.target.value }))} minLength={8} required /></label></div><button className={styles.primary} disabled={saving}>{saving ? "Modification…" : "Modifier le mot de passe"}</button></form>
  </div>;
}
