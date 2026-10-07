"use client";

import { useEffect } from "react";
import { track } from "@/lib/track";

// Compte une visite de page (sans cookie, sans donnée personnelle).
export function TrackView({ name }: { name: "visit" | "pricing_view" }) {
  useEffect(() => {
    track(name);
  }, [name]);
  return null;
}
