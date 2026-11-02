"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

/** Owner access is verified by the backend; never trust local profile roles. */
export default function OwnerControlCenterLink({ className, onNavigate }: {
  className?: string;
  onNavigate?: () => void;
}) {
  const [authorized, setAuthorized] = useState(false);
  useEffect(() => {
    const token = localStorage.getItem("kalatty_token");
    if (!token) return;
    const controller = new AbortController();
    fetch(`${API_BASE}/ai-control-center/catalog`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
      signal: controller.signal,
    }).then(response => {
      if (response.ok && !controller.signal.aborted) setAuthorized(true);
    }).catch(() => {});
    return () => controller.abort();
  }, []);
  if (!authorized) return null;
  return <Link href="/ai-control-center" className={className} onClick={onNavigate}>
    Control Center · Agents IA
  </Link>;
}
