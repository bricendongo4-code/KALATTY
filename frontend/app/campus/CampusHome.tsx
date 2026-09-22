"use client";

import Link from "next/link";
import Shell from "./Shell";
import { ROLES } from "./roles";
import type { RoleSlug } from "./roles";
import { useCampusHome } from "./useCampusHome";
import {
  DirectionHome,
  PedagogyHome,
  StudentHome,
  TeacherHome,
  type DirectionHomeData,
  type PedagogyHomeData,
  type StudentHomeData,
  type TeacherHomeData,
} from "./views";
import styles from "./campus.module.css";

/** Accueil connecte a l'API pour un role donne : charge /campus/home puis
 * rend le bon tableau de bord avec les vraies donnees de l'utilisateur. */
export default function CampusHome({ role }: { role: RoleSlug }) {
  const { loading, error, context, data, mismatch } =
    useCampusHome<unknown>(role);

  if (mismatch) {
    return (
      <section
        className={`${styles.card} ${styles.soon}`}
        style={{ margin: 24 }}
      >
        <h2>Ce n&apos;est pas votre espace</h2>
        <p>
          Le compte connecté ({mismatch.displayName}) a le rôle{" "}
          <strong>{ROLES[mismatch.campusRole].name}</strong> dans{" "}
          {mismatch.institutionName}. Cette page affiche l&apos;espace{" "}
          <strong>{ROLES[role].name}</strong>, réservé aux comptes de ce rôle —
          ce n&apos;est donc pas une erreur, seulement le mauvais compte pour
          cette vue.
        </p>
        <Link href={`/campus/${mismatch.campusRole}`} className={styles.btn}>
          Aller à mon espace ({ROLES[mismatch.campusRole].name})
        </Link>
      </section>
    );
  }

  return (
    <Shell
      role={role}
      activeSlug=""
      displayName={context?.displayName}
      institutionName={context?.institutionName}
      note={
        error
          ? null
          : context
            ? `Connecte a ${context.institutionName}.`
            : "Chargement de vos donnees..."
      }
    >
      {loading ? (
        <section className={`${styles.card} ${styles.soon}`}>
          <h2>Chargement...</h2>
          <p>Recuperation de vos donnees en cours.</p>
        </section>
      ) : error ? (
        <section className={`${styles.card} ${styles.soon}`}>
          <h2>Impossible de charger l&apos;Espace Etablissement</h2>
          <p>{error}</p>
        </section>
      ) : !data ? null : role === "etudiant" ? (
        <StudentHome data={data as StudentHomeData} />
      ) : role === "professeur" ? (
        <TeacherHome data={data as TeacherHomeData} />
      ) : role === "pedagogie" ? (
        <PedagogyHome data={data as PedagogyHomeData} />
      ) : (
        <DirectionHome data={data as DirectionHomeData} />
      )}
    </Shell>
  );
}
