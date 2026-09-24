import type { Metadata, Viewport } from "next";
import Image from "next/image";
import Link from "next/link";
import "bootstrap/dist/css/bootstrap.min.css";
import "./globals.css";
import NavigationBackButton from "./NavigationBackButton";
import SessionAwareHomeLink from "./SessionAwareHomeLink";
import SiteChrome from "./SiteChrome";

export const metadata: Metadata = {
  title: "Kalatty",
  description:
    "Kalatty, plateforme d'apprentissage pour étudiants, enseignants et établissements.",
  icons: {
    icon: "/icon.png",
    shortcut: "/icon.png",
    apple: "/icon.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#005b63",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const currentYear = new Date().getFullYear();

  return (
    <html lang="fr">
      <body>
        <NavigationBackButton />
        {children}
        <SiteChrome>
        <footer className="siteFooter">
          <div className="siteFooterGlow" aria-hidden="true" />
          <div className="siteFooterInner">
            <section
              className="siteFooterBrand"
              aria-label="Présentation Kalatty"
            >
              <SessionAwareHomeLink
                className="siteFooterLogoLink"
                ariaLabel="Retour à l'accueil Kalatty"
              >
                <Image
                  src="/kalatty-logo.png"
                  alt="Logo Kalatty"
                  width={76}
                  height={76}
                  className="siteFooterLogo"
                />
                <span>
                  <strong>Kalatty</strong>
                  <small>Apprendre, enseigner, piloter.</small>
                </span>
              </SessionAwareHomeLink>
              <p>
                La plateforme e-learning qui connecte les apprenants, les
                formateurs indépendants et les établissements dans un espace
                clair, accessible et organisé.
              </p>
              <div
                className="siteFooterBadges"
                aria-label="Engagements Kalatty"
              >
                <span>Cours vidéo</span>
                <span>Classes en ligne</span>
                <span>Suivi progression</span>
              </div>
            </section>

            <nav
              className="siteFooterLinks siteFooterDropdowns"
              aria-label="Navigation secondaire"
            >
              <details open>
                <summary>Plateforme</summary>
                <div className="siteFooterDropdownPanel">
                  <Link href="/">Accueil</Link>
                  <Link href="/about">À propos</Link>
                  <Link href="/pricing">Tarifs</Link>
                  <Link href="/contact">Contact</Link>
                  <Link href="/dashboard">Tableau de bord</Link>
                </div>
              </details>
              <details>
                <summary>Établissements</summary>
                <div className="siteFooterDropdownPanel">
                  <Link href="/register/institution">Créer un campus</Link>
                  <Link href="/dashboard">Classes et comptes</Link>
                  <Link href="/dashboard">Devoirs et corrections</Link>
                  <Link href="/pricing">Plans et abonnement</Link>
                </div>
              </details>
              <details>
                <summary>Confiance</summary>
                <div className="siteFooterDropdownPanel">
                  <span>Vidéos hébergées sur Kalatty</span>
                  <span>Accès par rôle utilisateur</span>
                  <span>Progression enregistrée</span>
                  <span>Support local Cameroun</span>
                </div>
              </details>
            </nav>

            <section className="siteFooterCta" aria-label="Invitation Kalatty">
              <span className="siteFooterCtaLabel">Pour les établissements</span>
              <h2>Prolongez la vie de votre établissement en ligne.</h2>
              <p>
                Réunissez vos classes, vos enseignants, vos emplois du temps,
                vos devoirs et le suivi de vos apprenants dans un campus dédié.
              </p>
              <Link
                href="/register/institution"
                className="siteFooterCtaButton"
              >
                Lancer un espace établissement
              </Link>
            </section>
          </div>
          <div className="siteFooterBottom">
            <span>© {currentYear} Kalatty. Tous droits réservés.</span>
            <span>Apprentissage, cours et campus en ligne.</span>
          </div>
        </footer>
        </SiteChrome>
      </body>
    </html>
  );
}
