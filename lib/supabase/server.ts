import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Ignoré : appelé depuis un Server Component, pas grave
          }
        },
      },
    }
  );
}

// Client pour la connexion, l'inscription et les codes, appelés depuis le serveur (routes /api/auth/…).
// Supabase limite aussi les essais par adresse IP : vu du serveur, tout le monde aurait l'adresse de Vercel.
// Avec une clé secrète « sb_secret_… » (variable SUPABASE_SECRET_KEY) et l'option « IP Address Forwarding » activée
// dans Supabase, on lui transmet la vraie adresse de la personne. Sans elle, on utilise la clé publique comme avant.
export async function createAuthClient(ip: string) {
  const cookieStore = await cookies();
  const secret = process.env.SUPABASE_SECRET_KEY;
  const forward = !!secret && secret.startsWith("sb_secret_") && ip !== "local";
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    forward ? secret! : process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: forward ? { headers: { "sb-forwarded-for": ip } } : undefined,
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        },
      },
    }
  );
}
