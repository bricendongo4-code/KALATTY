import type { Metadata, Viewport } from "next";
import Image from "next/image";
import Link from "next/link";
import "bootstrap/dist/css/bootstrap.min.css";
import "./globals.css";
import NavigationBackButton from "./NavigationBackButton";

export const metadata: Metadata = {
  title: "Kalatty",
  description:
    "Kalatty, plateforme d'apprentissage pour etudiants, enseignants et etablissements.",
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
        <footer className="siteFooter">
          <div className="siteFooterGlow" aria-hidden="true" />
          <div className="siteFooterInner">
            <section
              className="siteFooterBrand"
              aria-label="Presentation Kalatty"
            >
              <Link
                href="/"
                className="siteFooterLogoLink"
                aria-label="Retour a l'accueil Kalatty"
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
              </Link>
              <p>
                La plateforme e-learning qui connecte les apprenants, les
                formateurs independants et les etablissements dans un espace
                clair, suivi et evolutif.
              </p>
              <div
                className="siteFooterBadges"
                aria-label="Engagements Kalatty"
              >
                <span>Cours video</span>
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
                  <Link href="/about">A propos</Link>
                  <Link href="/pricing">Tarifs</Link>
                  <Link href="/contact">Contact</Link>
                  <Link href="/dashboard">Tableau de bord</Link>
                </div>
              </details>
              <details>
                <summary>Etablissements</summary>
                <div className="siteFooterDropdownPanel">
                  <Link href="/register/institution">Creer un campus</Link>
                  <Link href="/dashboard">Classes et comptes</Link>
                  <Link href="/dashboard">Devoirs et corrections</Link>
                  <Link href="/pricing">Plans et abonnement</Link>
                </div>
              </details>
              <details>
                <summary>Confiance</summary>
                <div className="siteFooterDropdownPanel">
                  <span>Videos hebergees sur Kalatty</span>
                  <span>Acces par role utilisateur</span>
                  <span>Paiement en preparation</span>
                  <span>Support local Cameroun</span>
                </div>
              </details>
            </nav>

            <section className="siteFooterCta" aria-label="Invitation Kalatty">
              <span className="siteFooterCtaLabel">Prochaine etape</span>
              <h2>Construire une experience mobile et IA solide.</h2>
              <p>
                Kalatty peut devenir un vrai assistant d&apos;apprentissage avec
                des recommandations, des resumes et un accompagnement par
                profil.
              </p>
              <Link
                href="/register/institution"
                className="siteFooterCtaButton"
              >
                Lancer un espace etablissement
              </Link>
            </section>
          </div>
          <div className="siteFooterBottom">
            <span>© {currentYear} Kalatty. Tous droits reserves.</span>
            <span>
              Prototype avance pour apprentissage, cours et campus en ligne.
            </span>
          </div>
        </footer>
      </body>
    </html>
  );
}
