"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { RoleSlug } from "./roles";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

export type CampusContext = {
  userId: string;
  displayName: string;
  institutionId: string;
  institutionName: string;
  institutionRole: string;
  campusRole: RoleSlug;
};

type HomeState<T> = {
  loading: boolean;
  error: string | null;
  context: CampusContext | null;
  data: T | null;
  reload: () => void;
};

function authHeaders() {
  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("kalatty_token")
      : null;
  return token ? { Authorization: `Bearer ${token}` } : null;
}

/**
 * Charge /campus/home et redirige vers /login (pas de session) ou vers le
 * bon role (URL /campus/<role> qui ne correspond pas au role reel) si besoin.
 */
export function useCampusHome<T>(expectedRole: RoleSlug): HomeState<T> {
  const router = useRouter();
  const [state, setState] = useState<{
    loading: boolean;
    error: string | null;
    context: CampusContext | null;
    data: T | null;
  }>({
    loading: true,
    error: null,
    context: null,
    data: null,
  });
  const [tick, setTick] = useState(0);

  const load = useCallback(async () => {
    const headers = authHeaders();
    if (!headers) {
      router.replace("/login");
      return;
    }
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const res = await fetch(`${API_BASE}/campus/home`, { headers });
      if (res.status === 401) {
        router.replace("/login");
        return;
      }
      const body = await res.json();
      if (!res.ok) {
        setState({
          loading: false,
          error:
            body.message ?? "Impossible de charger l'Espace Etablissement.",
          context: null,
          data: null,
        });
        return;
      }
      if (body.context.campusRole !== expectedRole) {
        router.replace(`/campus/${body.context.campusRole}`);
        return;
      }
      setState({
        loading: false,
        error: null,
        context: body.context,
        data: body.data,
      });
    } catch {
      setState({
        loading: false,
        error: "Connexion au serveur impossible.",
        context: null,
        data: null,
      });
    }
  }, [expectedRole, router]);

  useEffect(() => {
    // Chargement initial (et rechargement via `reload`) : le fetch met a jour
    // l'etat une fois resolu, ce qui est le usage standard de cet effet.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load, tick]);

  return { ...state, reload: () => setTick((t) => t + 1) };
}

export async function campusFetch(path: string, init?: RequestInit) {
  const headers = authHeaders();
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      ...(headers ?? {}),
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...(init?.headers ?? {}),
    },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body.message ?? "La requete a echoue.");
  }
  return body;
}
