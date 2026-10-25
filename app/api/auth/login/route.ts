import { NextResponse } from "next/server";
import { createAuthClient } from "@/lib/supabase/server";
import { clientIp, limiter, tooMany } from "@/lib/security/limiter";
import { attemptRules, keysFor, STRICT } from "@/lib/security/auth-limits";
import { asEmail, asString, readJson } from "@/lib/security/validate";
import { tooManyMessage } from "@/lib/security/limiter-core";

export const runtime = "nodejs";

const WRONG = "Email ou mot de passe incorrect. Vérifie les deux, ou utilise « Mot de passe oublié ? ».";

// Connexion par le serveur : après 3 erreurs pour ce compte depuis cette adresse, 10 pour ce compte depuis n'importe où,
// ou 10 pour une même adresse IP : blocage de 1 minute, puis 5, puis 15. Les essais pendant un blocage ne sont même pas envoyés à Supabase.
export async function POST(req: Request) {
  const body = await readJson(req);
  const email = asEmail(body?.email);
  const password = asString(body?.password, 200);
  if (!email || !password) return NextResponse.json({ error: WRONG }, { status: 400 });

  const flood = await limiter.check(attemptRules(req, "login"), STRICT);
  if (flood) return tooMany(flood);
  const keys = keysFor(req, "login", email);
  const locked = await limiter.lock(keys, STRICT);
  if (locked) return tooMany(locked);

  const supabase = await createAuthClient(clientIp(req));
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    if (error.status === 429) return tooMany(60);
    if (error.message.toLowerCase().includes("not confirmed")) {
      return NextResponse.json(
        { error: "Ton email n'est pas encore confirmé. Refais l'inscription avec le même email pour recevoir un nouveau code (pense aux spams)." },
        { status: 400 }
      );
    }
    const lock = await limiter.fail(keys, STRICT);
    if (lock) return tooMany(lock, `${WRONG} ${tooManyMessage(lock)}`);
    return NextResponse.json({ error: WRONG }, { status: 400 });
  }

  // Réussi : on oublie les erreurs du compte (pas celles de l'adresse IP, pour qu'un compte valide ne serve pas à les effacer).
  await limiter.ok(keys);
  return NextResponse.json({ ok: true });
}
