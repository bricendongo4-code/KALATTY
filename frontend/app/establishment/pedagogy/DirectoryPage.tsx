"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import Shell from "../Shell";
import { campusFetch, useCampusContext } from "../useEstablishment";
import { Icon } from "../ui";
import styles from "../student/student-pages.module.css";

type Member = { id: string; role: string; profile?: { fullname?: string; email?: string } | null; classNames?: string[] };
export default function DirectoryPage({ section }: { section: "etudiants" | "enseignants" }) {
  const { context, loading, error: contextError, mismatch } = useCampusContext("pedagogy");
  const [members, setMembers] = useState<Member[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!context) return;
    campusFetch(`/institutions/${context.institutionId}`).then((result) => setMembers((result.members ?? []).filter((item: Member) => item.role === (section === "etudiants" ? "student" : "teacher"))))
      .catch((reason) => setError(reason instanceof Error ? reason.message : "Annuaire indisponible."));
  }, [context, section]);
  if (mismatch) return <section className={styles.standalone}>Cette page ne correspond pas à votre rôle. <Link href={`/establishment/${mismatch.campusRole}`}>Ouvrir mon espace</Link></section>;
  return <Shell role="pedagogy" activeSlug={section} displayName={context?.displayName} institutionName={context?.institutionName} note={contextError ?? null}>
    <header className={styles.head}><div><small>RESPONSABLE PÉDAGOGIQUE</small><h1>{section === "etudiants" ? "Étudiants" : "Enseignants"}</h1><p>Annuaire de votre établissement.</p></div><Link href="/establishment/pedagogy" className={styles.back}>← Accueil</Link></header>
    {loading || !members && !error ? <section className={styles.state}>Chargement…</section> : error ? <section className={styles.state} role="alert">{error}</section> : members?.length ? <div className={styles.grid}>{members.map((member) => <article className={styles.tile} key={member.id}><span className={styles.icon}><Icon name="user" /></span><h2>{member.profile?.fullname ?? "Membre"}</h2><p>{section === "enseignants" ? member.classNames?.length ? member.classNames.join(", ") : "Aucune classe affectée" : member.profile?.email ?? "Étudiant"}</p></article>)}</div> : <section className={styles.state}><h2>Aucun membre</h2></section>}
  </Shell>;
}
