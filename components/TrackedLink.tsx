"use client";

import Link from "next/link";
import { trackEvent } from "@/lib/tracking";
import type { ReactNode } from "react";

export function TrackedLink({
  href,
  event,
  params,
  className,
  children,
}: {
  href: string;
  event: string;
  params?: Record<string, unknown>;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link href={href} className={className} onClick={() => trackEvent(event, params)}>
      {children}
    </Link>
  );
}