"use client";

import { usePathname } from "next/navigation";

/** Masque le décor du site public (pied de page) dans les espaces applicatifs plein écran. */
export default function SiteChrome({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  if (
    pathname?.startsWith("/establishment") ||
    pathname?.startsWith("/learn") ||
    pathname?.startsWith("/creator")
  ) {
    return null;
  }
  return <>{children}</>;
}
