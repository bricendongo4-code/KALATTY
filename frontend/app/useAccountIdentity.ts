"use client";

import { useEffect, useState } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";
type Identity = { name: string; avatarUrl?: string };

export function useAccountIdentity(fallbackName: string) {
  const [identity, setIdentity] = useState<Identity>({ name: fallbackName });
  useEffect(() => {
    const apply = (profile: { fullname?: string; avatar_url?: string; avatarUrl?: string }) => setIdentity({ name: profile.fullname || fallbackName, avatarUrl: profile.avatar_url ?? profile.avatarUrl });
    let stored = null;
    try { stored = JSON.parse(localStorage.getItem("kalatty_user") ?? "null"); } catch { stored = null; }
    if (stored) apply(stored);
    const token = localStorage.getItem("kalatty_token");
    if (token) fetch(`${API_BASE}/dashboard`, { headers: { Authorization: `Bearer ${token}` } }).then(async (response) => response.ok ? response.json() : null).then((body) => { if (body?.profile) apply(body.profile); }).catch(() => undefined);
    const onUpdate = (event: Event) => apply((event as CustomEvent).detail ?? {});
    window.addEventListener("kalatty-profile-updated", onUpdate);
    return () => window.removeEventListener("kalatty-profile-updated", onUpdate);
  }, [fallbackName]);
  return identity;
}
