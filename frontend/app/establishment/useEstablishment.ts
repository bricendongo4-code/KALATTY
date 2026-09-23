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
  /** Present quand le compte connecte a un role d'etablissement different de
   * celui de la page visitee : on n'affiche jamais les donnees d'un autre
   * role, mais on l'explique plutot que de rediriger silencieusement. */
  mismatch: CampusContext | null;
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
export function useEstablishmentHome<T>(expectedRole: RoleSlug): HomeState<T> {
  const router = useRouter();
  const [state, setState] = useState<{
    loading: boolean;
    error: string | null;
    context: CampusContext | null;
    data: T | null;
    mismatch: CampusContext | null;
  }>({
    loading: true,
    error: null,
    context: null,
    data: null,
    mismatch: null,
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
          mismatch: null,
        });
        return;
      }
      if (body.context.campusRole !== expectedRole) {
        setState({
          loading: false,
          error: null,
          context: null,
          data: null,
          mismatch: body.context,
        });
        return;
      }
      setState({
        loading: false,
        error: null,
        context: body.context,
        data: body.data,
        mismatch: null,
      });
    } catch {
      setState({
        loading: false,
        error: "Connexion au serveur impossible.",
        context: null,
        data: null,
        mismatch: null,
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

/**
 * Version legere de useEstablishmentHome pour les pages qui n'ont besoin que du
 * contexte (institutionId, displayName...) et gerent elles-memes leurs
 * propres donnees, sans charger l'agregat complet de l'accueil.
 */
export function useCampusContext(expectedRole: RoleSlug) {
  const router = useRouter();
  const [state, setState] = useState<{
    loading: boolean;
    error: string | null;
    context: CampusContext | null;
    mismatch: CampusContext | null;
  }>({ loading: true, error: null, context: null, mismatch: null });

  const load = useCallback(async () => {
    const headers = authHeaders();
    if (!headers) {
      router.replace("/login");
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/campus/context`, { headers });
      if (res.status === 401) {
        router.replace("/login");
        return;
      }
      const body = await res.json();
      if (!res.ok) {
        setState({
          loading: false,
          error: body.message ?? "Impossible de charger l'Espace Etablissement.",
          context: null,
          mismatch: null,
        });
        return;
      }
      if (body.campusRole !== expectedRole) {
        setState({ loading: false, error: null, context: null, mismatch: body });
        return;
      }
      setState({ loading: false, error: null, context: body, mismatch: null });
    } catch {
      setState({
        loading: false,
        error: "Connexion au serveur impossible.",
        context: null,
        mismatch: null,
      });
    }
  }, [expectedRole, router]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  return state;
}

export async function campusFetch(path: string, init?: RequestInit) {
  const headers = authHeaders();
  const isFormData = typeof FormData !== "undefined" && init?.body instanceof FormData;
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      ...(headers ?? {}),
      ...(init?.body && !isFormData ? { "Content-Type": "application/json" } : {}),
      ...(init?.headers ?? {}),
    },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body.message ?? "La requete a echoue.");
  }
  return body;
}

/** Envoi multipart (fichier) : pas de Content-Type manuel, le navigateur pose la boundary. */
export async function campusUpload(path: string, file: File) {
  const headers = authHeaders();
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { ...(headers ?? {}) },
    body: form,
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body.message ?? "L'envoi du fichier a echoue.");
  }
  return body;
}
