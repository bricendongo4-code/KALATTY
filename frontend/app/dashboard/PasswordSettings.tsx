"use client";

import { useState } from "react";
import styles from "./dashboard.module.css";

type Props = {
  apiBaseUrl: string;
  compact?: boolean;
};

const initialForm = {
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
};

export default function PasswordSettings({ apiBaseUrl, compact = false }: Props) {
  const [form, setForm] = useState(initialForm);
  const [showPasswords, setShowPasswords] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);

  const updateField = (field: keyof typeof initialForm, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage("");
    setIsError(false);

    if (form.newPassword.length < 8) {
      setIsError(true);
      setMessage("Le nouveau mot de passe doit contenir au moins 8 caracteres.");
      return;
    }

    if (form.newPassword !== form.confirmPassword) {
      setIsError(true);
      setMessage("La confirmation ne correspond pas au nouveau mot de passe.");
      return;
    }

    const token = localStorage.getItem("kalatty_token");
    if (!token) {
      setIsError(true);
      setMessage("Session introuvable. Reconnecte-toi.");
      return;
    }

    setSaving(true);

    try {
      const response = await fetch(`${apiBaseUrl}/auth/change-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          currentPassword: form.currentPassword,
          newPassword: form.newPassword,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        setIsError(true);
        setMessage(
          typeof data.message === "string"
            ? data.message
            : "Impossible de modifier le mot de passe.",
        );
        return;
      }

      setForm(initialForm);
      setMessage("Mot de passe modifie avec succes.");
    } catch {
      setIsError(true);
      setMessage("La modification du mot de passe a echoue.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className={compact ? styles.securityPanelCompact : styles.card}>
      <div className={styles.sectionHeader}>
        <div>
          <p className={styles.sectionLabel}>Securite du compte</p>
          <h2>Modifier mon mot de passe</h2>
        </div>
        <span className={styles.sectionHint}>
          Utilise au moins 8 caracteres et evite un ancien mot de passe.
        </span>
      </div>

      <form className={styles.passwordForm} onSubmit={handleSubmit}>
        <label className={styles.formField}>
          <span>Mot de passe actuel</span>
          <input
            type={showPasswords ? "text" : "password"}
            autoComplete="current-password"
            value={form.currentPassword}
            onChange={(event) => updateField("currentPassword", event.target.value)}
            required
          />
        </label>

        <div className={styles.metaFields}>
          <label className={styles.formField}>
            <span>Nouveau mot de passe</span>
            <input
              type={showPasswords ? "text" : "password"}
              autoComplete="new-password"
              minLength={8}
              value={form.newPassword}
              onChange={(event) => updateField("newPassword", event.target.value)}
              required
            />
          </label>
          <label className={styles.formField}>
            <span>Confirmer le mot de passe</span>
            <input
              type={showPasswords ? "text" : "password"}
              autoComplete="new-password"
              minLength={8}
              value={form.confirmPassword}
              onChange={(event) => updateField("confirmPassword", event.target.value)}
              required
            />
          </label>
        </div>

        <label className={styles.passwordVisibility}>
          <input
            type="checkbox"
            checked={showPasswords}
            onChange={(event) => setShowPasswords(event.target.checked)}
          />
          <span>Afficher les mots de passe</span>
        </label>

        <button type="submit" className={styles.submitButton} disabled={saving}>
          {saving ? "Modification..." : "Modifier le mot de passe"}
        </button>
        {message ? (
          <p
            className={isError ? styles.errorMessage : styles.successMessage}
            role={isError ? "alert" : "status"}
          >
            {message}
          </p>
        ) : null}
      </form>
    </section>
  );
}
