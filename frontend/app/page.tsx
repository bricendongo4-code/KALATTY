"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
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
  },
  {
    title: "Formateurs",
    text: "Un vrai studio de creation pour publier des cours, telecharger des videos et organiser le programme.",
  },
  {
    title: "Etablissements",
    text: "Des salles, des liens d'invitation, des devoirs et un pilotage proche d'un espace Teams educatif.",
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
            <div className={styles.heroCard}>
              <span>Studio formateur</span>
              <strong>Creation de cours guidee</strong>
              <p>
                Landing page, programme, upload video et verification avant
                publication.
              </p>
            </div>
            <div className={styles.heroCardAccent}>
              <span>Campus digital</span>
              <strong>Salles, profs et etudiants relies</strong>
              <p>
                Invitations par lien, devoirs par salle et organisation des
                groupes en un seul endroit.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.discoverySection}>
        <div className={styles.sectionIntro}>
          <span>Vitrine Kalatty</span>
          <h2>Navigation commune pour decouvrir, comparer et commencer</h2>
          <p>
            Cette page sert d&apos;entree principale avant les espaces individuels.
            On y retrouve les meilleurs cours, les recommandations et des guides
            rapides d&apos;utilisation.
          </p>
        </div>

        <div className={styles.discoveryGrid}>
          {featuredCourses.length > 0 ? (
            featuredCourses.map((course) => (
              <article key={course.id} className={styles.discoveryCard}>
                <span className={styles.discoveryTag}>Cours publie</span>
                <h3>{course.title}</h3>
                <p>{course.shortDescription || course.description}</p>
                <div className={styles.discoveryMeta}>
                  <span>{course.teacherName}</span>
                  <span>{course.lessonsCount} lecons</span>
                  <span>{course.courseRatingAverage.toFixed(1)}/5</span>
                </div>
                <div className={styles.discoveryFooter}>
                  <strong>{course.priceFcfa} FCFA</strong>
                  <Link href={`/courses/${course.id}`} className={styles.discoveryLink}>
                    Voir et commencer
                  </Link>
                </div>
              </article>
            ))
          ) : (
            <article className={styles.discoveryCardWide}>
              <span className={styles.discoveryTag}>Catalogue</span>
              <h3>Les cours publies apparaissent ici</h3>
              <p>
                La vitrine affichera automatiquement les cours publies par les
                formateurs avec leurs notes, le nombre de lecons et un acces
                direct vers la fiche detail.
              </p>
            </article>
          )}
        </div>
      </section>

      <section className={styles.rankSection}>
        <div className={styles.rankColumn}>
          <div className={styles.sectionIntro}>
            <span>Les mieux notes</span>
            <h2>Top cours de la plateforme</h2>
          </div>
          <div className={styles.rankList}>
            {topRatedCourses.length > 0 ? (
              topRatedCourses.map((course, index) => (
                <article key={course.id} className={styles.rankCard}>
                  <strong>#{index + 1}</strong>
                  <div>
                    <h3>{course.title}</h3>
                    <p>
                      {course.teacherName} | {course.courseRatingAverage.toFixed(1)}/5 |{" "}
                      {course.totalReviews} avis
                    </p>
                  </div>
                </article>
              ))
            ) : (
              <article className={styles.rankCard}>
                <strong>#1</strong>
                <div>
                  <h3>Le classement apparaitra ici</h3>
                  <p>Des qu&apos;il y aura des notes, les meilleurs cours remonteront automatiquement.</p>
                </div>
              </article>
            )}
          </div>
        </div>

        <div className={styles.rankColumn}>
          <div className={styles.sectionIntro}>
            <span>Promotions</span>
            <h2>Encarts et annonces</h2>
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
            <article key={benefit.title} className={styles.benefitCard}>
              <span>{benefit.title}</span>
              <h3>{benefit.title}</h3>
              <p>{benefit.text}</p>
            </article>
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
