"use client";

import Image from "next/image";
import Link from "next/link";
import type { CSSProperties } from "react";
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
    href?: string;
  }>;
  promos: Array<{
    id: string;
    title: string;
    description: string;
    href?: string;
  }>;
};

const heroStats = [
  { value: "À votre rythme", label: "reprenez exactement où vous vous êtes arrêté" },
  { value: "Suivi clair", label: "retrouvez cours, devoirs et progression" },
  { value: "Campus complet", label: "apprenez avec votre établissement" },
];

const productLinks = [
  {
    title: "Créer un campus",
    text: "Comptes, classes, professeurs et élèves gérés depuis une même interface.",
    href: "/register/institution",
    label: "Établissement",
  },
  {
    title: "Publier un cours",
    text: "Miniature, programme, leçons vidéo, prix et publication contrôlée.",
    href: "/register/teacher",
    label: "Formateur",
  },
  {
    title: "Reprendre un parcours",
    text: "Catalogue, progression, cours campus et devoirs accessibles rapidement.",
    href: "/register/student",
    label: "Étudiant",
  },
];

const mockSchedule = [
  { time: "08:30", title: "Maths Terminale", state: "En direct" },
  { time: "11:00", title: "Devoir anglais", state: "A rendre" },
  { time: "15:30", title: "Bureautique", state: "Video" },
];

const trustSignals = [
  "Conçu pour le mobile",
  "Progression enregistrée",
  "Accès adapté à chaque profil",
  "Cours et classes au même endroit",
];

const marketplaceActions = [
  { label: "Explorer les cours", href: "#catalogue" },
  { label: "Créer un compte", href: "/register" },
  { label: "Voir les tarifs", href: "/pricing" },
];

const fallbackGuides = [
  {
    id: "guide-1",
    title: "Trouver un cours",
    href: "#catalogue",
    description: "Parcours l'accueil, ouvre la fiche cours puis inscris-toi pour démarrer les vidéos et les avis.",
  },
  {
    id: "guide-2",
    title: "Suivre sa progression",
    href: "/login",
    description: "Le menu étudiant permet de reprendre tes cours, vérifier ta progression et rejoindre un établissement.",
  },
  {
    id: "guide-3",
    title: "Publier comme formateur",
    href: "/register/teacher",
    description: "Le studio enseignant permet d'ajouter miniature, modules, leçons vidéo et exercices sans lien externe.",
  },
];

const formatPrice = (priceFcfa: number) =>
  priceFcfa > 0
    ? `${new Intl.NumberFormat("fr-FR").format(priceFcfa)} FCFA`
    : "Gratuit";

const resolvePromoHref = (title: string, fallbackHref?: string) => {
  if (fallbackHref) return fallbackHref;
  const normalizedTitle = title.toLowerCase();
  if (normalizedTitle.includes("campus") || normalizedTitle.includes("etablissement")) {
    return "/register/institution";
  }
  if (normalizedTitle.includes("formateur") || normalizedTitle.includes("cours")) {
    return "/register/teacher";
  }
  return "/pricing";
};

function CourseShowcaseCard({ course }: { course: DiscoveryCourse }) {
  const actionLabel =
    course.priceFcfa > 0
      ? "Se connecter pour acheter"
      : "Se connecter pour commencer";
  const description =
    course.shortDescription ||
    course.description ||
    "Découvre le programme complet de ce cours Kalatty.";
  const isBestRated = Number(course.courseRatingAverage ?? 0) >= 4.5;
  const hasSocialProof = Number(course.totalReviews ?? 0) >= 10;

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
          {course.lessonsCount} leçon{course.lessonsCount > 1 ? "s" : ""}
        </span>
        <span className={styles.coursePreviewBadge}>Aperçu</span>
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
        <div className={styles.courseSignalRow}>
          <span>{isBestRated ? "Très bien noté" : "Cours publié"}</span>
          <span>{hasSocialProof ? "Populaire" : "Nouveau"}</span>
        </div>
        <strong className={styles.coursePrice}>{formatPrice(course.priceFcfa)}</strong>
        <span className={styles.courseCardCta}>{actionLabel}</span>
      </div>

      <div className={styles.courseHoverPanel} aria-hidden="true">
        <span className={styles.courseHoverTag}>À propos du cours</span>
        <h3>{course.title}</h3>
        <p>{description}</p>
        <ul>
          <li>{course.lessonsCount} leçons dans le programme</li>
          <li>
            Formateur : {course.teacherName}
            {course.teacherExpertise ? `, ${course.teacherExpertise}` : ""}
          </li>
          <li>Note des apprenants : {course.courseRatingAverage.toFixed(1)}/5</li>
          <li>Accès après connexion, paiement ou affectation campus</li>
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
        <div className={styles.courseRailAside}>
          {courses.length > 0 ? (
            <span className={styles.courseRailCount}>{courses.length} cours</span>
          ) : null}
        {courses.length > 1 ? (
          <div className={styles.courseRailControls} aria-label={`Navigation ${title}`}>
            <button
              type="button"
              aria-label={`Voir les cours précédents dans ${title}`}
              onClick={() => scrollRail(-1)}
            >
              <span aria-hidden="true">‹</span>
            </button>
            <button
              type="button"
              aria-label={`Voir les cours suivants dans ${title}`}
              onClick={() => scrollRail(1)}
            >
              <span aria-hidden="true">›</span>
            </button>
          </div>
        ) : null}
        </div>
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
            Les miniatures, les prix et les notes apparaîtront automatiquement
            dès qu&apos;un formateur publiera son cours.
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
        const res = await fetch(`${apiBaseUrl}/courses/discover`, {
          cache: "no-store",
        });
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
              <span className={styles.brandTag}>Plateforme éducative</span>
              <strong className={styles.brandName}>Kalatty</strong>
            </div>
          </Link>

          <nav className={styles.nav} aria-label="Navigation principale">
            <a href="#catalogue" className={styles.navLink}>
              Cours
            </a>
            <Link href="/pricing" className={styles.navLink}>
              Tarifs
            </Link>
            <Link href="/about" className={styles.navLink}>
              À propos
            </Link>
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
            <span className={styles.kicker}>Apprendre. Enseigner. Faire réussir.</span>
            <h1>
              L&apos;éducation en ligne, pensée pour avancer ensemble.
            </h1>
            <p>
              Découvrez des cours, progressez à votre rythme ou retrouvez toute
              la vie de votre établissement dans un espace simple et organisé.
            </p>

            <div className={styles.ctas}>
              <a href="#catalogue" className={styles.primaryCta}>
                Découvrir les cours
              </a>
              <Link href="/login" className={styles.secondaryCta}>
                Se connecter
              </Link>
            </div>

            <div className={styles.heroStats} aria-label="Indicateurs Kalatty">
              {heroStats.map((stat) => (
                <div key={stat.label}>
                  <strong>{stat.value}</strong>
                  <span>{stat.label}</span>
                </div>
              ))}
            </div>

          </div>

          <div className={styles.heroPanel} aria-label="Aperçu d'un espace établissement Kalatty">
            <div className={styles.productWindow}>
              <div className={styles.windowTop}>
                <span />
                <strong>Console Kalatty</strong>
                  <small>En ligne</small>
              </div>
              <div className={styles.windowBody}>
                <aside className={styles.windowNav} aria-label="Navigation de démonstration">
                  <span className={styles.navActive}>Accueil</span>
                  <span>Cours</span>
                  <span>Classes</span>
                  <span>Devoirs</span>
                </aside>
                <div className={styles.windowMain}>
                  <div className={styles.windowHeader}>
                    <span>Campus Deido</span>
                    <strong>128 apprenants actifs</strong>
                  </div>
                  <div className={styles.progressStrip}>
                    <span
                      style={
                        { "--value": "76%" } as CSSProperties & {
                          "--value": string;
                        }
                      }
                    />
                  </div>
                  <div className={styles.scheduleList}>
                    {mockSchedule.map((item) => (
                      <div key={`${item.time}-${item.title}`}>
                        <time>{item.time}</time>
                        <strong>{item.title}</strong>
                        <span>{item.state}</span>
                      </div>
                    ))}
                  </div>
                  <div className={styles.windowMetrics}>
                    <span>
                      <strong>18</strong>
                      cours
                    </span>
                    <span>
                      <strong>42</strong>
                      devoirs
                    </span>
                    <span>
                      <strong>91%</strong>
                      assiduité
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.marketCommandBar} aria-label="Actions principales Kalatty">
        <div>
          <span>Bienvenue sur Kalatty</span>
          <strong>Quel espace souhaitez-vous rejoindre ?</strong>
        </div>
        <nav aria-label="Actions rapides de la page d'accueil">
          {marketplaceActions.map((action) =>
            action.href.startsWith("#") ? (
              <a key={action.label} href={action.href}>
                {action.label}
              </a>
            ) : (
              <Link key={action.label} href={action.href}>
                {action.label}
              </Link>
            ),
          )}
        </nav>
      </section>

      <section id="catalogue" className={styles.catalogShowcase}>
        <CourseRail
          eyebrow="Sélection Kalatty"
          title="Cours à découvrir"
          description="Comparez les programmes, les formateurs et les avis avant de faire votre choix."
          courses={featuredCourses}
        />
        <CourseRail
          eyebrow="Recommandés par les apprenants"
          title="Les cours les mieux notés"
          description="Retrouvez les formations qui ont le plus convaincu la communauté Kalatty."
          courses={topRatedCourses}
        />
      </section>

      <section className={styles.productSection}>
        <div className={styles.sectionIntro}>
          <span>Votre espace Kalatty</span>
          <h2>Une expérience adaptée à votre façon d&apos;apprendre ou d&apos;enseigner.</h2>
          <p>
            Choisissez votre profil pour accéder directement aux outils et aux
            informations qui vous concernent.
          </p>
        </div>

        <div className={styles.productGrid}>
          {productLinks.map((item) => (
            <Link key={item.title} href={item.href} className={styles.productCard}>
              <span>{item.label}</span>
              <h3>{item.title}</h3>
              <p>{item.text}</p>
              <b>Découvrir cet espace</b>
            </Link>
          ))}
        </div>

        <div className={styles.trustBar} aria-label="Avantages de Kalatty">
          {trustSignals.map((signal) => (
            <span key={signal}>{signal}</span>
          ))}
        </div>
      </section>

      <section className={styles.promoSection}>
        <div className={styles.promoColumn}>
          <div className={styles.sectionIntro}>
            <span>À la une</span>
            <h2>Actualités et opportunités Kalatty</h2>
          </div>
          <div className={styles.promoList}>
            {(promos.length > 0 ? promos : [{ id: "promo-default", title: "Votre établissement sur Kalatty", description: "Réunissez vos classes, vos enseignants, vos emplois du temps et le suivi des apprenants dans un même campus en ligne.", href: "/register/institution" }]).map((promo) => (
              <Link
                key={promo.id}
                href={resolvePromoHref(promo.title, promo.href)}
                className={styles.promoCard}
              >
                <h3>{promo.title}</h3>
                <p>{promo.description}</p>
                <b>Voir l&apos;action</b>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.guidesSection}>
        <div className={styles.sectionIntro}>
          <span>Guides rapides</span>
          <h2>Bien utiliser l&apos;application</h2>
        </div>
        <div className={styles.guidesGrid}>
          {guides.map((guide) => (
            <Link key={guide.id} href={guide.href ?? "/login"} className={styles.guideCard}>
              <h3>{guide.title}</h3>
              <p>{guide.description}</p>
              <b>Y aller</b>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
