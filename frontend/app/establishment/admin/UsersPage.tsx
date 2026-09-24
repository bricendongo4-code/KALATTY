"use client";

import { useEffect, useState } from "react";
import styles from "../establishment.module.css";
import Shell from "../Shell";
import { useCampusContext, campusFetch } from "../useEstablishment";
import { Avatar, Badge, Card, Icon, Row } from "../ui";

type Member = {
  id: string;
  role: string;
  joinedAt: string;
  profile: { id: string; fullname: string; email: string; role: string; avatar_url?: string } | null;
  classNames?: string[];
};

type ManagedUser = {
  id: string;
  login_email: string;
  full_name: string;
  managed_role: string;
  status: string;
  must_reset_password: boolean;
  created_at: string;
  profiles?: { avatar_url?: string } | null;
};

const ROLE_LABEL: Record<string, string> = {
  owner: "Propriétaire",
  admin: "Administrateur",
  pedagogy: "Responsable pédagogique",
  teacher: "Professeur",
  student: "Étudiant",
};

const STATUS_KIND: Record<string, "ok" | "warn" | "bad"> = {
  active: "ok",
  invited: "warn",
  suspended: "bad",
};

export default function UsersPage({ section = "utilisateurs" }: { section?: "utilisateurs" | "inscriptions" } = {}) {
  const { loading, error, context, mismatch } = useCampusContext("admin");
  const [members, setMembers] = useState<Member[] | null>(null);
  const [managedUsers, setManagedUsers] = useState<ManagedUser[] | null>(null);
  const [loadingList, setLoadingList] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [fullname, setFullname] = useState("");
  const [role, setRole] = useState<"admin" | "teacher" | "student">("student");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [created, setCreated] = useState<{ loginEmail: string; temporaryPassword: string } | null>(null);

  const loadList = async (institutionId: string) => {
    setLoadingList(true);
    setListError(null);
    try {
      const details = await campusFetch(`/institutions/${institutionId}`);
      setMembers(details.members ?? []);
      setManagedUsers(details.managedUsers ?? []);
    } catch (e) {
      setListError(e instanceof Error ? e.message : "Impossible de charger les utilisateurs.");
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    if (context) void loadList(context.institutionId);
     
  }, [context]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!context) return;
    setSubmitting(true);
    setFormError(null);
    setCreated(null);
    try {
      const result = await campusFetch(`/institutions/${context.institutionId}/provision-user`, {
        method: "POST",
        body: JSON.stringify({ fullname, role: section === "inscriptions" ? "student" : role, email: email || undefined }),
      });
      setCreated({ loginEmail: result.loginEmail, temporaryPassword: result.temporaryPassword });
      setFullname("");
      setEmail("");
      await loadList(context.institutionId);
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Impossible de créer le compte.");
    } finally {
      setSubmitting(false);
    }
  };

  const resetPassword = async (managedUserId: string) => {
    if (!context) return;
    try {
      const result = await campusFetch(
        `/institutions/${context.institutionId}/managed-users/${managedUserId}/reset-password`,
        { method: "POST" },
      );
      window.alert(`Nouveau mot de passe temporaire : ${result.temporaryPassword}`);
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "Impossible de réinitialiser le mot de passe.");
    }
  };

  if (mismatch) {
    return (
      <section className={`${styles.card} ${styles.soon}`} style={{ margin: 24 }}>
        <h2>Ce n&apos;est pas votre espace</h2>
        <p>Cette page est réservée au personnel de direction de l&apos;établissement.</p>
      </section>
    );
  }

  return (
    <Shell
      role="admin"
      activeSlug={section}
      displayName={context?.displayName}
      institutionName={context?.institutionName}
      note={error ?? null}
    >
      {loading ? (
        <p>Chargement...</p>
      ) : (
        <>
          <div className={styles.pageHead}>
            <div>
              <h1 className={styles.headTitle}>{section === "inscriptions" ? "Comptes étudiants" : "Utilisateurs"}</h1>
              <p className={styles.headSub}>{section === "inscriptions" ? "Comptes étudiants créés dans l’établissement et état de leur activation." : "Personnel de l’établissement et comptes gérés (créés sans inscription autonome)."}</p>
            </div>
            <button type="button" className={styles.btn} onClick={() => setShowForm((s) => !s)}>
              <Icon name="userPlus" className={styles.navIcon} />
              Ajouter un compte
            </button>
          </div>

          {showForm ? (
            <div className={styles.formCard}>
              <form onSubmit={submit} className={styles.fieldRow}>
                <label className={styles.field}>
                  Nom complet
                  <input className={styles.input} value={fullname} onChange={(e) => setFullname(e.target.value)} required />
                </label>
                {section === "utilisateurs" ? <label className={styles.field}>
                  Rôle
                  <select className={styles.select} value={role} onChange={(e) => setRole(e.target.value as typeof role)}>
                    <option value="student">Étudiant</option>
                    <option value="teacher">Professeur</option>
                    <option value="admin">Administrateur</option>
                  </select>
                </label> : null}
                <label className={styles.field}>
                  E-mail personnel (optionnel)
                  <input className={styles.input} type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                </label>
                <button type="submit" className={styles.btn} disabled={submitting}>
                  {submitting ? "Création..." : "Créer le compte"}
                </button>
              </form>
              {formError ? <p className={styles.inlineError}>{formError}</p> : null}
              {created ? (
                <p className={styles.inlineOk}>
                  Compte créé : {created.loginEmail} — mot de passe temporaire <strong>{created.temporaryPassword}</strong> (à
                  transmettre à la personne concernée, il ne sera plus affiché).
                </p>
              ) : null}
            </div>
          ) : null}

          {listError ? <p className={styles.inlineError}>{listError}</p> : null}

          <div className={styles.grid2}>
            {section === "utilisateurs" ? <Card title="Personnel de l'établissement">
              {loadingList ? (
                <p>Chargement...</p>
              ) : !members || members.length === 0 ? (
                <p style={{ color: "var(--muted)", fontSize: 13 }}>Aucun membre pour l&apos;instant.</p>
              ) : (
                <ul className={styles.list}>
                  {members.map((m) => (
                    <Row
                      key={m.id}
                      lead={<Avatar name={m.profile?.fullname ?? "?"} src={m.profile?.avatar_url} />}
                      title={m.profile?.fullname ?? "Utilisateur"}
                      sub={m.profile?.email}
                      side={<Badge kind="info">{ROLE_LABEL[m.role] ?? m.role}</Badge>}
                    />
                  ))}
                </ul>
              )}
            </Card> : null}

            <Card title="Comptes gérés par l'établissement">
              {loadingList ? (
                <p>Chargement...</p>
              ) : !managedUsers || !managedUsers.some((m) => section !== "inscriptions" || m.managed_role === "student") ? (
                <p style={{ color: "var(--muted)", fontSize: 13 }}>Aucun compte géré pour l&apos;instant.</p>
              ) : (
                <ul className={styles.list}>
                  {managedUsers.filter((m) => section !== "inscriptions" || m.managed_role === "student").map((m) => (
                    <li key={m.id} className={styles.row}>
                      <Avatar name={m.full_name} src={m.profiles?.avatar_url} />
                      <span className={styles.rowMain}>
                        <strong>{m.full_name}</strong>
                        <small>
                          {m.login_email} • {ROLE_LABEL[m.managed_role] ?? m.managed_role}
                        </small>
                      </span>
                      <Badge kind={STATUS_KIND[m.status] ?? "info"}>{m.status}</Badge>
                      <button
                        type="button"
                        onClick={() => resetPassword(m.id)}
                        className={styles.quickBtn}
                        style={{ marginLeft: 8 }}
                      >
                        Réinitialiser
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        </>
      )}
    </Shell>
  );
}
