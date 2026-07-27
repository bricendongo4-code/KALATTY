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

const benefits = [
  {
    title: "Apprenants",
    text: "Un tableau de bord personnel pour reprendre les cours, suivre les devoirs et garder le rythme.",
    href: "/register/student",
  },
  {
    title: "Formateurs",
    text: "Un studio clair pour publier les contenus, structurer les modules et suivre les retours.",
    href: "/register/teacher",
  },
  {
    title: "Établissements",
    text: "Une console campus pour inviter, organiser les salles, affecter les cours et piloter les devoirs.",
    href: "/register/institution",
  },
];

const highlights = [
  "Cours vidéo hébergés",
  "Classes avec invitations",
  "Devoirs et corrections",
  "Roles et permissions",
];

const heroStats = [
  { value: "3", label: "espaces connectes" },
  { value: "24/7", label: "accès aux cours" },
  { value: "1", label: "campus unifie" },
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
  "Interface responsive",
  "Backend NestJS",
  "Auth par role",
  "Catalogue dynamique",
];

const marketplaceActions = [
  { label: "Comparer les cours", href: "#catalogue" },
  { label: "Creer un compte", href: "/register" },
  { label: "Voir les tarifs", href: "/pricing" },
];

const benchmarkBadges = [
  "Recherche et categories",
  "Avis visibles",
  "Parcours campus",
  "Mobile-first",
];

const competitiveSignals = [
  {
    label: "Catalogue",
    title: "Cours comparables en un regard",
    href: "#catalogue",
    text: "Miniature, note, prix, avis, nombre de leçons et accès sécurisé sont visibles avant de choisir.",
  },
  {
    label: "Progression",
    title: "Reprise et suivi de parcours",
    href: "/login",
    text: "L'apprenant retrouve ses cours, sa progression, ses devoirs et ses notes personnelles depuis son espace.",
  },
  {
    label: "Campus",
    href: "/register/institution",
    title: "Un LMS pour les établissements",
    text: "Classes, comptes internes, planning, présences, devoirs PDF et cours affectés sans paiement individuel.",
  },
  {
    label: "Mobile",
    href: "/about",
    title: "Pensé pour le téléphone",
    text: "Les cours coulissent en rails, les actions restent accessibles et les cartes gardent une structure stable.",
  },
];

const launchPillars = [
  {
    title: "Learning marketplace",
    metric: "Cours publics",
    href: "#catalogue",
    text: "Une vitrine claire avec miniatures, prix, notes, avis et accès contrôlé avant paiement.",
  },
  {
    title: "Studio formateur",
    metric: "Creation guidee",
    href: "/register/teacher",
    text: "Un parcours de publication qui garde les brouillons, les vidéos, les modules et les revenus au même endroit.",
  },
  {
    title: "Campus établissement",
    metric: "Gestion complete",
    href: "/register/institution",
    text: "Classes, comptes internes, professeurs, devoirs, planning et suivi reunis dans une console d'administration.",
  },
];

const productProof = [
  { value: "Role-based", label: "chaque profil a son espace" },
  { value: "Mobile-first", label: "cours et dashboards lisibles sur téléphone" },
  { value: "Campus-ready", label: "mode établissement séparé du catalogue public" },
  { value: "Vidéo native", label: "contenus chargés dans Kalatty, pas par lien externe" },
];

const marketCapabilities = [
  {
    title: "Catalogue prêt à vendre",
    text: "Des fiches de cours avec miniature, prix, note, nombre d'avis et accès bloqué tant que l'utilisateur n'est pas connecté.",
  },
  {
    title: "Campus autonome",
    href: "/register/institution",
    text: "Un établissement peut gérer ses propres comptes, classes, enseignants, emplois du temps, devoirs et présences.",
  },
  {
    title: "Expérience mobile prioritaire",
    text: "Les cours coulissent horizontalement, les menus sont compacts et les actions importantes restent faciles à atteindre.",
  },
  {
    title: "Socle prêt pour paiement",
    text: "La séparation entre cours publics, cours affectés à une classe et abonnements établissement prépare une monétisation claire.",
  },
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

const resolveMarketHref = (title: string, fallbackHref?: string) => {
  if (fallbackHref) return fallbackHref;
  const normalizedTitle = title.toLowerCase();
  if (normalizedTitle.includes("catalogue")) return "#catalogue";
  if (normalizedTitle.includes("campus")) return "/register/institution";
  if (normalizedTitle.includes("paiement") || normalizedTitle.includes("tarif")) {
    return "/pricing";
  }
  if (normalizedTitle.includes("mobile")) return "/about";
  return "/register";
};

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
        <span className={styles.coursePreviewBadge}>Apercu</span>
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
            <span className={styles.kicker}>Campus digital prêt à évoluer</span>
            <h1>
              Kalatty transforme les cours en véritable expérience
              d&apos;apprentissage.
            </h1>
            <p>
              Une application web pour apprendre, enseigner et administrer un
              établissement avec des parcours clairs, des contenus vidéo, des
              classes, des devoirs et un suivi par rôle.
            </p>

            <div className={styles.ctas}>
              <Link href="/register" className={styles.primaryCta}>
                Lancer Kalatty
              </Link>
              <Link href="/login" className={styles.secondaryCta}>
                Ouvrir mon espace
              </Link>
            </div>

            <div className={styles.benchmarkBadges} aria-label="Standards e-learning couverts">
              {benchmarkBadges.map((badge) => (
                <span key={badge}>{badge}</span>
              ))}
            </div>

            <div className={styles.heroStats} aria-label="Indicateurs Kalatty">
              {heroStats.map((stat) => (
                <div key={stat.label}>
                  <strong>{stat.value}</strong>
                  <span>{stat.label}</span>
                </div>
              ))}
            </div>

            <div className={styles.highlightList}>
              {highlights.map((item) => (
                <span key={item}>{item}</span>
              ))}
            </div>
          </div>

          <div className={styles.heroPanel} aria-label="Apercu du produit Kalatty">
            <div className={styles.productWindow}>
              <div className={styles.windowTop}>
                <span />
                <strong>Console Kalatty</strong>
                  <small>En ligne</small>
              </div>
              <div className={styles.windowBody}>
                <aside className={styles.windowNav} aria-label="Navigation de demonstration">
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
                      assiduite
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
          <span>Choisir rapidement</span>
          <strong>Apprendre, enseigner ou administrer un campus</strong>
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

      <section className={styles.productSection}>
        <div className={styles.sectionIntro}>
          <span>Experience produit</span>
          <h2>Trois parcours reliés dans une application cohérente.</h2>
          <p>
            Kalatty ne se limite pas à afficher des pages. Chaque rôle arrive
            dans son espace, avec les actions importantes au premier plan.
          </p>
        </div>

        <div className={styles.productGrid}>
          {productLinks.map((item) => (
            <Link key={item.title} href={item.href} className={styles.productCard}>
              <span>{item.label}</span>
              <h3>{item.title}</h3>
              <p>{item.text}</p>
              <b>Entrer dans ce parcours</b>
            </Link>
          ))}
        </div>

        <div className={styles.trustBar} aria-label="Socle technique et produit">
          {trustSignals.map((signal) => (
            <span key={signal}>{signal}</span>
          ))}
        </div>
      </section>

      <section className={styles.competitiveSection}>
        <div className={styles.sectionIntro}>
          <span>Standard marché</span>
          <h2>Les codes d'une vraie plateforme e-learning moderne.</h2>
          <p>
            Les références du marché rassurent vite : recherche claire, cartes
            comparables, avis visibles, progression, certificats potentiels et
            outils d'administration. Kalatty reprend ces repères en les adaptant
            au contexte des apprenants et établissements camerounais.
          </p>
        </div>
        <div className={styles.competitiveGrid}>
          {competitiveSignals.map((signal) => (
            <Link key={signal.title} href={signal.href} className={styles.competitiveCard}>
              <span>{signal.label}</span>
              <h3>{signal.title}</h3>
              <p>{signal.text}</p>
              <b>Ouvrir</b>
            </Link>
          ))}
        </div>
      </section>

      <section className={styles.launchSection}>
        <div className={styles.launchIntro}>
          <span>Vision lancement</span>
          <h2>Une plateforme qui doit rassurer des vrais utilisateurs.</h2>
          <p>
            Pour etre lancee, Kalatty doit donner confiance des les premieres
            secondes : parcours net, actions visibles, valeur immédiate et
            interface qui respire le sérieux.
          </p>
        </div>

        <div className={styles.launchGrid}>
          {launchPillars.map((pillar) => (
            <Link key={pillar.title} href={pillar.href} className={styles.launchCard}>
              <span>{pillar.metric}</span>
              <h3>{pillar.title}</h3>
              <p>{pillar.text}</p>
              <b>Continuer</b>
            </Link>
          ))}
        </div>

        <div className={styles.proofStrip} aria-label="Preuves produit Kalatty">
          {productProof.map((item) => (
            <div key={item.value}>
              <strong>{item.value}</strong>
              <span>{item.label}</span>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.marketSection}>
        <div className={styles.marketPanel}>
          <span className={styles.marketEyebrow}>Objectif marché</span>
          <h2>Kalatty doit donner confiance avant même l'inscription.</h2>
          <p>
            Un produit lançable doit être clair pour l'apprenant, crédible pour
            le formateur et rassurant pour l'administration d'un établissement.
            Cette base permet ensuite d'ajouter paiement, IA, application mobile
            et analytics sans casser l'expérience.
          </p>
        </div>
        <div className={styles.marketGrid}>
          {marketCapabilities.map((capability) => (
            <Link
              key={capability.title}
              href={resolveMarketHref(capability.title, capability.href)}
              className={styles.marketCard}
            >
              <span />
              <h3>{capability.title}</h3>
              <p>{capability.text}</p>
              <b>Explorer</b>
            </Link>
          ))}
        </div>
      </section>

      <section id="catalogue" className={styles.catalogShowcase}>
        <CourseRail
          eyebrow="Sélection Kalatty"
          title="Cours tendance"
          description="Les formations publiées qui attirent actuellement le plus l'attention."
          courses={featuredCourses}
        />
        <CourseRail
          eyebrow="Recommandes par les apprenants"
          title="Les cours les mieux notés"
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
            {(promos.length > 0 ? promos : [{ id: "promo-default", title: "Campagnes Kalatty", description: "Cet espace peut mettre en avant une offre établissement, un nouveau cours ou une campagne de rentrée." }]).map((promo) => (
              <Link
                key={promo.id}
                href={resolvePromoHref(promo.title, promo.href)}
                className={styles.promoCard}
              >
                <h3>{promo.title}</h3>
                <p>{promo.description}</p>
                <b>Voir l'action</b>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.benefitSection}>
        <div className={styles.sectionIntro}>
          <span>Pourquoi Kalatty</span>
          <h2>Une expérience complète, pas juste un dépôt de cours</h2>
          <p>
            La plateforme évolue autour de trois besoins : apprendre facilement,
            publier proprement et administrer des groupes avec précision.
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
