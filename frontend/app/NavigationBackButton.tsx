"use client";

import { usePathname, useRouter } from "next/navigation";

export default function NavigationBackButton() {
  const pathname = usePathname();
  const router = useRouter();

  if (pathname === "/") {
    return null;
  }

  const handleBack = () => {
    if (window.history.length > 1) {
      router.back();
      return;
    }

    const hasSession = Boolean(localStorage.getItem("kalatty_token"));
    router.push(hasSession ? "/dashboard" : "/");
  };

  return (
    <button
      type="button"
      className="globalBackButton"
      onClick={handleBack}
      aria-label="Retour a la page precedente"
    >
      <span aria-hidden="true">←</span>
      Retour
    </button>
  );
}
