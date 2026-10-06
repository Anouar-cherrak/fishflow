import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Pages et routes qui n'ont pas besoin de la session : on évite l'appel à Supabase
// (un aller-retour réseau) avant de les afficher.
const SKIP_EXACT = new Set([
  "/",
  "/cgu",
  "/confidentialite",
  "/mentions-legales",
  "/sw.js",
  "/manifest.webmanifest",
]);
const SKIP_PREFIXES = ["/api/stripe/webhook", "/api/cron", "/api/admin", "/api/unsubscribe"];

export async function updateSession(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (SKIP_EXACT.has(pathname) || SKIP_PREFIXES.some((p) => pathname.startsWith(p))) {
    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  await supabase.auth.getUser();

  return supabaseResponse;
}