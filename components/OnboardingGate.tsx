"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { hasAuthCookie } from "@/lib/supabase/has-auth-cookie";

// Le tutoriel (animations + Supabase) n'est utile qu'aux personnes connectées :
// on ne le télécharge que s'il y a une session, pour alléger les pages publiques.
const Onboarding = dynamic(() => import("@/components/Onboarding").then((m) => m.Onboarding), { ssr: false });

export function OnboardingGate() {
  const pathname = usePathname();
  const [needed, setNeeded] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!needed && hasAuthCookie()) setNeeded(true);
  }, [pathname, needed]);
  return needed ? <Onboarding /> : null;
}
