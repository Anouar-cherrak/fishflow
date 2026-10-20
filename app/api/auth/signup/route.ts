import { NextResponse } from "next/server";
import { createAuthClient } from "@/lib/supabase/server";
import { clientIp, limiter, tooMany } from "@/lib/security/limiter";
import { mailRules } from "@/lib/security/auth-limits";
import { asEmail, asString, passwordProblem, readJson } from "@/lib/security/validate";

export const runtime = "nodejs";

// Même réponse que le compte existe ou non : on ne révèle jamais si un email est déjà inscrit.
const SENT = "Un code vient de t'être envoyé par email. Si tu as déjà un compte avec cette adresse, connecte-toi plutôt.";
const BAD_EMAIL = "Cette adresse email n'est pas valide. Vérifie-la.";

export async function POST(req: Request) {
  const body = await readJson(req);
  const email = asEmail(body?.email);
  if (!email) return NextResponse.json({ error: BAD_EMAIL, field: "email" }, { status: 400 });
  const password = asString(body?.password, 200) ?? "";
  const problem = passwordProblem(password);
  if (problem) return NextResponse.json({ error: problem, field: "password" }, { status: 400 });

  const wait = await limiter.check(mailRules(req, "signup", email));
  if (wait) return tooMany(wait);

  const supabase = await createAuthClient(clientIp(req));
  const { error } = await supabase.auth.signUp({ email, password });

  if (error) {
    const m = error.message.toLowerCase();
    if (m.includes("already registered") || m.includes("already exists")) return NextResponse.json({ ok: true, message: SENT });
    if (error.status === 429 || m.includes("rate") || m.includes("too many")) return tooMany(60);
    if (m.includes("weak") || m.includes("pwned") || m.includes("leaked")) {
      return NextResponse.json(
        { error: "Ce mot de passe est trop facile à deviner (il circule sur Internet). Choisis-en un autre.", field: "password" },
        { status: 400 }
      );
    }
    if (m.includes("password")) return NextResponse.json({ error: passwordProblem("") ?? "Mot de passe refusé.", field: "password" }, { status: 400 });
    if (m.includes("email")) return NextResponse.json({ error: BAD_EMAIL, field: "email" }, { status: 400 });
    console.error("Inscription refusée :", error.status, error.code);
    return NextResponse.json({ error: "Le compte n'a pas pu être créé. Vérifie ton adresse email, puis réessaie." }, { status: 400 });
  }

  return NextResponse.json({ ok: true, message: SENT });
}
