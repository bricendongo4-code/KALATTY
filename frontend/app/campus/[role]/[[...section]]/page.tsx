import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import styles from "../../campus.module.css";
import { ROLES, isRoleSlug } from "../../roles";
import Shell from "../../Shell";
import { Icon } from "../../ui";
import CampusHome from "../../CampusHome";
import DirectionUsersPage from "../../direction/UsersPage";
import DirectionFormationsPage from "../../direction/FormationsPage";
import StudentAssignmentsPage from "../../etudiant/AssignmentsPage";
import TeacherClassesPage from "../../professeur/ClassesPage";
import PedagogyClassesPage from "../../pedagogie/ClassesPage";

type Params = Promise<{ role: string; section?: string[] }>;

const BUILT_SECTIONS: Partial<Record<string, () => React.JSX.Element>> = {
  "direction/utilisateurs": DirectionUsersPage,
  "direction/formations-classes": DirectionFormationsPage,
  "etudiant/travaux": StudentAssignmentsPage,
  "professeur/classes": TeacherClassesPage,
  "pedagogie/classes": PedagogyClassesPage,
};

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { role } = await params;
  if (!isRoleSlug(role)) return { title: "Espace Établissement - Kalatty" };
  return { title: `${ROLES[role].topTitle} - Kalatty` };
}

export default async function CampusRolePage({ params }: { params: Params }) {
  const { role, section } = await params;
  if (!isRoleSlug(role)) notFound();

  const cfg = ROLES[role];
  const slug = section?.[0] ?? "";
  const item = [...cfg.nav, ...cfg.foot].find((n) => n.slug === slug);
  if (!item) notFound();

  if (slug === "") {
    return <CampusHome role={role} />;
  }

  const Built = BUILT_SECTIONS[`${role}/${slug}`];
  if (Built) {
    return <Built />;
  }

  return (
    <Shell role={role} activeSlug={slug}>
      <section className={`${styles.card} ${styles.soon}`}>
        <Icon name={item.icon} className={styles.navIcon} />
        <h2>{item.label}</h2>
        <p>
          Cet écran fait partie du plan de l&apos;Espace Établissement mais
          n&apos;est pas encore construit. L&apos;accueil de chaque rôle est
          disponible ; les sections détaillées arrivent par étapes, en
          commençant par celles qui portent la chaîne « séance, appel, devoir,
          note ».
        </p>
        <Link href={`/campus/${role}`} className={styles.btn}>
          Retour à l&apos;accueil
        </Link>
      </section>
    </Shell>
  );
}
