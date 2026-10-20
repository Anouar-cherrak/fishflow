import { updateSession } from "@/lib/supabase/middleware";
import { NextResponse, type NextRequest } from "next/server";
import { clientIp, fingerprint, limiter, tooMany } from "@/lib/security/limiter";

// Routes appelées par d'autres serveurs (Stripe, tâches automatiques, désinscription en un clic de Gmail) : pas de contrôle d'origine.
const MACHINE_ROUTES = ["/api/stripe/webhook", "/api/cron/", "/api/admin/", "/api/unsubscribe"];
const MUTATING = new Set(["POST", "PUT", "PATCH", "DELETE"]);

// Protection CSRF : une action qui modifie des données doit venir de FishFlow lui-même, pas d'une page piégée sur un autre site.
function crossSite(request: NextRequest): boolean {
  if (request.headers.get("sec-fetch-site") === "cross-site") return true;
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    return new URL(origin).host !== request.headers.get("host");
  } catch {
    return true;
  }
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/api/") && !MACHINE_ROUTES.some((p) => pathname.startsWith(p))) {
    if (MUTATING.has(request.method) && crossSite(request)) {
      return NextResponse.json({ error: "Demande refusée." }, { status: 403 });
    }
    // Limite générale, large, pour toutes les routes de l'API (chaque route a en plus ses propres limites plus strictes).
    const wait = await limiter.check([{ key: `api:${fingerprint("ip", clientIp(request))}`, limit: 120, windowSeconds: 60 }]);
    if (wait) return tooMany(wait, "Trop de demandes d'un coup. Attends un petit instant, puis réessaie.");
  }

  return await updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
