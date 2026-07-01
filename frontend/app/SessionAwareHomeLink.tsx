"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { MouseEvent, ReactNode } from "react";

type Props = {
  children: ReactNode;
  className?: string;
  ariaLabel?: string;
};

export default function SessionAwareHomeLink({
  children,
  className,
  ariaLabel,
}: Props) {
  const router = useRouter();

  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    const token = localStorage.getItem("kalatty_token");
    if (!token) return;

    event.preventDefault();
    router.push("/dashboard");
  };

  return (
    <Link
      href="/"
      className={className}
      aria-label={ariaLabel}
      onClick={handleClick}
    >
      {children}
    </Link>
  );
}
