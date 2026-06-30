"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { buildLoginUrl } from "./authRedirect";
import styles from "./page.module.css";

type DiscoveryCourse = {
  id: string;
  title: string;
  description: string;
  shortDescription: string;
  priceFcfa: number;
  thumbnailUrl: string;
  teacherName: string;
  teacherExpertise: string;
  courseRatingAverage: number;
  teacherRatingAverage: number;
  totalReviews: number;
  lessonsCount: number;
};

type HomeDiscovery = {
  featuredCourses: DiscoveryCourse[];
  topRatedCourses: DiscoveryCourse[];
  guides: Array<{
    id: string;
    title: string;
    description: string;
  }>;
  promos: Array<{
    id: string;
    title: string;
    description: string;
  }>;
};

const benefits = [
  {
    title: "Apprenants",
    text: "Une page d'accueil catalogue, un suivi de progression et un acces plus simple aux cours et exercices.",
    href: "/register/student",
  },
  {
    title: "Formateurs",
    text: "Un vrai studio de creation pour publier des cours, telecharger des videos et organiser le programme.",
    href: "/register/teacher",
  },
  {
    title: "Etablissements",
    text: "Des salles, des liens d'invitation, des devoirs et un pilotage proche d'un espace Teams educatif.",
    href: "/register/institution",
  },
];

const highlights = [
  "Videos chargees directement sur la plateforme",
  "Salles de classe avec invitations par lien",
  "Recherche pour etudiants, enseignants et etablissements",
  "Approche mobile-ready pour la suite Flutter",
];

const fallbackGuides = [
  {
    id: "guide-1",
    title: "Trouver un cours",
    description: "Parcours l'accueil, ouvre la fiche cours puis inscris-toi pour demarrer les videos et les avis.",
  },
  {
    id: "guide-2",
    title: "Suivre sa progression",
    description: "Le menu etudiant permet de reprendre tes cours, verifier ta progression et rejoindre un etablissement.",
  },
  {
    id: "guide-3",
    title: "Publier comme formateur",
    description: "Le studio enseignant permet d'ajouter miniature, modules, lecons video et exercices sans lien externe.",
  },
];

const formatPrice = (priceFcfa: number) =>
  priceFcfa > 0
    ? `${new Intl.NumberFormat("fr-FR").format(priceFcfa)} FCFA`
    : "Gratuit";

function CourseShowcaseCard({ course }: { course: DiscoveryCourse }) {
  const actionLabel =
    course.priceFcfa > 0
      ? "Se connecter pour acheter"
      : "Se connecter pour commencer";
  const description =
    course.shortDescription ||
    course.description ||
    "Decouvre le programme complet de ce cours Kalatty.";

  return (
    <Link
      href={buildLoginUrl(`/courses/${course.id}`)}
      className={styles.courseShowcaseCard}
      aria-label={`${course.title}, ${formatPrice(course.priceFcfa)}. ${actionLabel}`}
    >
      <div className={styles.courseThumbnail}>
        {course.thumbnailUrl ? (
          <Image
            src={course.thumbnailUrl}
            alt={`Miniature du cours ${course.title}`}
            fill
            sizes="(max-width: 640px) 76vw, (max-width: 1100px) 38vw, 18rem"
          />
        ) : (
          <div className={styles.courseThumbnailFallback}>
            <Image
              src="/kalatty-logo.png"
              alt=""
              width={88}
              height={88}
            />
            <span>Cours Kalatty</span>
          </div>
        )}
        <span className={styles.courseImageBadge}>
          {course.lessonsCount} lecon{course.lessonsCount > 1 ? "s" : ""}
        </span>
      </div>

      <div className={styles.courseCardBody}>
        <h3>{course.title}</h3>
        <p className={styles.courseTeacher}>{course.teacherName}</p>
        <div className={styles.courseRatingLine}>
          <strong>{course.courseRatingAverage.toFixed(1)}</strong>
          <span aria-label={`Note ${course.courseRatingAverage.toFixed(1)} sur 5`}>
            /5
          </span>
          <small>
            {course.totalReviews} avis
          </small>
        </div>
        <strong className={styles.coursePrice}>{formatPrice(course.priceFcfa)}</strong>
        <span className={styles.courseCardCta}>{actionLabel}</span>
      </div>

      <div className={styles.courseHoverPanel} aria-hidden="true">
        <span className={styles.courseHoverTag}>A propos du cours</span>
        <h3>{course.title}</h3>
        <p>{description}</p>
        <ul>
          <li>{course.lessonsCount} lecons dans le programme</li>
          <li>
            Formateur : {course.teacherName}
            {course.teacherExpertise ? `, ${course.teacherExpertise}` : ""}
          </li>
          <li>Note des apprenants : {course.courseRatingAverage.toFixed(1)}/5</li>
        </ul>
        <strong>{formatPrice(course.priceFcfa)}</strong>
        <span className={styles.courseHoverAction}>{actionLabel}</span>
      </div>
    </Link>
  );
}

function CourseRail({
  eyebrow,
  title,
  description,
  courses,
}: {
  eyebrow: string;
  title: string;
  description: string;
  courses: DiscoveryCourse[];
}) {
  const railRef = useRef<HTMLDivElement | null>(null);
  const scrollRail = (direction: -1 | 1) => {
    const rail = railRef.current;
    if (!rail) return;
    rail.scrollBy({
      left: direction * Math.max(280, rail.clientWidth * 0.78),
      behavior: "smooth",
    });
  };

  return (
    <section className={styles.courseRailSection}>
      <div className={styles.courseRailHeader}>
        <div>
          <span>{eyebrow}</span>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
        {courses.length > 1 ? (
          <div className={styles.courseRailControls} aria-label={`Navigation ${title}`}>
            <button
              type="button"
              aria-label={`Voir les cours precedents dans ${title}`}
              onClick={() => scrollRail(-1)}
            >
              <span aria-hidden="true">←</span>
            </button>
            <button
              type="button"
              aria-label={`Voir les cours suivants dans ${title}`}
              onClick={() => scrollRail(1)}
            >
              <span aria-hidden="true">→</span>
            </button>
          </div>
        ) : null}
      </div>

      {courses.length > 0 ? (
        <div ref={railRef} className={styles.courseRail}>
          {courses.map((course) => (
            <CourseShowcaseCard key={course.id} course={course} />
          ))}
        </div>
      ) : (
        <article className={styles.catalogEmptyState}>
          <span>Catalogue Kalatty</span>
          <h3>Les prochains cours arrivent ici</h3>
          <p>
            Les miniatures, les prix et les notes apparaitront automatiquement
            des qu&apos;un formateur publiera son cours.
          </p>
        </article>
      )}
    </section>
  );
}

export default function Home() {
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";
  const [discovery, setDiscovery] = useState<HomeDiscovery | null>(null);

  useEffect(() => {
    const loadDiscovery = async () => {
      try {
        const res = await fetch(`${apiBaseUrl}/courses/discover`);
        const data = await res.json();

        if (!res.ok) {
          return;
        }

        setDiscovery(data as HomeDiscovery);
      } catch {
        setDiscovery(null);
      }
    };

    void loadDiscovery();
  }, [apiBaseUrl]);

  const featuredCourses = discovery?.featuredCourses ?? [];
  const topRatedCourses = discovery?.topRatedCourses ?? [];
  const guides = discovery?.guides ?? fallbackGuides;
  const promos = discovery?.promos ?? [];

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <header className={styles.topbar}>
          <Link href="/" className={styles.brand}>
            <Image
              src="/kalatty-logo.png"
              alt="Logo Kalatty"
              width={88}
              height={88}
              className={styles.brandLogo}
              priority
            />
            <div>
              <span className={styles.brandTag}>Plateforme educative</span>
              <strong className={styles.brandName}>Kalatty</strong>
            </div>
          </Link>

          <nav className={styles.nav} aria-label="Navigation principale">
            <Link href="/login" className={styles.navLink}>
              Connexion
            </Link>
            <Link href="/register" className={styles.navButton}>
              Commencer
            </Link>
          </nav>
        </header>

        <div className={styles.heroGrid}>
          <div className={styles.heroCopy}>
            <span className={styles.kicker}>Apprendre, enseigner, administrer</span>
            <h1>
              Une plateforme Kalatty pensee pour les etudiants, les enseignants
              et les etablissements.
            </h1>
            <p>
              Kalatty centralise les cours, les videos, les salles, les
              exercices et le suivi pedagogique dans une interface moderne et
              plus proche des usages reels.
            </p>

            <div className={styles.ctas}>
              <Link href="/register" className={styles.primaryCta}>
                Creer un compte
              </Link>
              <Link href="/login" className={styles.secondaryCta}>
                Se connecter
              </Link>
            </div>

            <div className={styles.highlightList}>
              {highlights.map((item) => (
                <span key={item}>{item}</span>
              ))}
            </div>
          </div>

          <div className={styles.heroPanel}>
            <Link href="/register/teacher" className={styles.heroCard}>
              <span>Studio formateur</span>
              <strong>Creation de cours guidee</strong>
              <p>
                Landing page, programme, upload video et verification avant
                publication.
              </p>
              <b>Creer mon espace formateur</b>
            </Link>
            <Link href="/register/institution" className={styles.heroCardAccent}>
              <span>Campus digital</span>
              <strong>Salles, profs et etudiants relies</strong>
              <p>
                Invitations par lien, devoirs par salle et organisation des
                groupes en un seul endroit.
              </p>
              <b>Configurer un etablissement</b>
            </Link>
          </div>
        </div>
      </section>

      <section className={styles.catalogShowcase}>
        <CourseRail
          eyebrow="Selection Kalatty"
          title="Cours tendance"
          description="Les formations publiees qui attirent actuellement le plus l'attention."
          courses={featuredCourses}
        />
        <CourseRail
          eyebrow="Recommandes par les apprenants"
          title="Les cours les mieux notes"
          description="Compare les avis, les formateurs et les programmes avant de choisir."
          courses={topRatedCourses}
        />
      </section>

      <section className={styles.promoSection}>
        <div className={styles.promoColumn}>
          <div className={styles.sectionIntro}>
            <span>Promotions</span>
            <h2>Actualites et opportunites Kalatty</h2>
          </div>
          <div className={styles.promoList}>
            {(promos.length > 0 ? promos : [{ id: "promo-default", title: "Campagnes Kalatty", description: "Cet espace peut mettre en avant une offre etablissement, un nouveau cours ou une campagne de rentree." }]).map((promo) => (
              <article key={promo.id} className={styles.promoCard}>
                <h3>{promo.title}</h3>
                <p>{promo.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.benefitSection}>
        <div className={styles.sectionIntro}>
          <span>Pourquoi Kalatty</span>
          <h2>Une experience complete, pas juste un depot de cours</h2>
          <p>
            La plateforme evolue autour de trois besoins: apprendre facilement,
            publier proprement et administrer des groupes avec precision.
          </p>
        </div>

        <div className={styles.benefitGrid}>
          {benefits.map((benefit) => (
            <Link key={benefit.title} href={benefit.href} className={styles.benefitCard}>
              <span>{benefit.title}</span>
              <h3>{benefit.title}</h3>
              <p>{benefit.text}</p>
              <b>Decouvrir cet espace</b>
            </Link>
          ))}
        </div>
      </section>

      <section className={styles.guidesSection}>
        <div className={styles.sectionIntro}>
          <span>Guides rapides</span>
          <h2>Bien utiliser l&apos;application</h2>
        </div>
        <div className={styles.guidesGrid}>
          {guides.map((guide) => (
            <article key={guide.id} className={styles.guideCard}>
              <h3>{guide.title}</h3>
              <p>{guide.description}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
