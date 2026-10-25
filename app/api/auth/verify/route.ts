import { NextResponse } from "next/server";
import { createAuthClient } from "@/lib/supabase/server";
import { clientIp, limiter, tooMany } from "@/lib/security/limiter";
import { attemptRules, keysFor, STRICT } from "@/lib/security/auth-limits";
import { asCode, asEmail, readJson } from "@/lib/security/validate";
import { tooManyMessage } from "@/lib/security/limiter-core";

export const runtime = "nodejs";

const WRONG = "Ce code ne marche pas : il est faux ou trop ancien. Vérifie-le, ou demande un nouveau code.";

// Code d'inscription reçu par email : même blocage progressif que la connexion (3 erreurs → 1 min, 5 min, 15 min).
export async function POST(req: Request) {
  const body = await readJson(req);
  const email = asEmail(body?.email);
  const code = asCode(body?.code);
  if (!email || !code) return NextResponse.json({ error: WRONG }, { status: 400 });

  const flood = await limiter.check(attemptRules(req, "verify"), STRICT);
  if (flood) return tooMany(flood);
  const keys = keysFor(req, "verify", email);
  const locked = await limiter.lock(keys, STRICT);
  if (locked) return tooMany(locked);

  const supabase = await createAuthClient(clientIp(req));
  const { error } = await supabase.auth.verifyOtp({ email, token: code, type: "signup" });

  if (error) {
    if (error.status === 429) return tooMany(60);
    const lock = await limiter.fail(keys, STRICT);
    if (lock) return tooMany(lock, `${WRONG} ${tooManyMessage(lock)}`);
    return NextResponse.json({ error: WRONG }, { status: 400 });
  }

  await limiter.ok(keys);
  return NextResponse.json({ ok: true });
}
