"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

const SESSION_KEYS = ["kalatty_token", "kalatty_user", "kalatty_role"];

export const clearKalattySession = () => {
  if (typeof window === "undefined") return;
  SESSION_KEYS.forEach((key) => {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  });
};

export const logoutKalatty = () => {
  if (typeof window === "undefined") return;
  clearKalattySession();
  window.location.replace("/login");
};

const isHistoryRestore = (event?: PageTransitionEvent) => {
  if (event?.persisted) return true;

  const navigationEntry = performance.getEntriesByType("navigation")[0] as
    | PerformanceNavigationTiming
    | undefined;

  return navigationEntry?.type === "back_forward";
};

export const useProtectedHistoryGuard = () => {
  const router = useRouter();

  useEffect(() => {
    const handlePageShow = (event: PageTransitionEvent) => {
      if (!isHistoryRestore(event)) return;
      // A history restore is not a logout. Only an absent session requires login.
      if (!localStorage.getItem("kalatty_token")) {
        router.replace("/login?reason=session-expired");
      }
    };

    window.addEventListener("pageshow", handlePageShow);
    return () => window.removeEventListener("pageshow", handlePageShow);
  }, [router]);
};

export const useAuthEntryHistoryGuard = () => {
  useEffect(() => {
    const handlePageShow = (event: PageTransitionEvent) => {
      if (!isHistoryRestore(event)) return;
      if (localStorage.getItem("kalatty_token")) window.location.replace("/dashboard");
    };

    window.addEventListener("pageshow", handlePageShow);
    return () => window.removeEventListener("pageshow", handlePageShow);
  }, []);
};
