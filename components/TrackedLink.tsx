"use client";

import Link from "next/link";
import { trackEvent } from "@/lib/tracking";
import type { ReactNode } from "react";

export function TrackedLink({
  href,
  event,
  params,
  className,
  tabIndex,
  children,
}: {
  href: string;
  event: string;
  params?: Record<string, unknown>;
  className?: string;
  tabIndex?: number;
  children: ReactNode;
}) {
  return (
    <Link href={href} className={className} tabIndex={tabIndex} onClick={() => trackEvent(event, params)}>
      {children}
    </Link>
  );
}