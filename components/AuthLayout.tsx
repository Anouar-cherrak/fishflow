import type { ReactNode } from "react";
import { AppShell } from "@/components/AppShell";

// Connexion, inscription, mot de passe : un seul formulaire, centré, sans rien autour (docs/design-simple.md).
export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <AppShell size="form" publicPage>
      <div className="w-full max-w-[420px] mx-auto sm:pt-6">{children}</div>
    </AppShell>
  );
}
