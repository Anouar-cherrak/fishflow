import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

// Mesure du parcours, sans donnée personnelle : un nom d'événement, une origine (ex. « tiktok ») et, si la personne est connectée,
// son identifiant interne (jamais son e-mail). Pas d'adresse IP, pas de cookie.
const ALLOWED = new Set(["visit", "signup", "first_fiche", "pricing_view"]);
// Ces deux-là ne comptent qu'une fois par personne.
const ONCE = new Set(["signup", "first_fiche"]);

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { name?: unknown; source?: unknown };
    const name = typeof body.name === "string" ? body.name : "";
    if (!ALLOWED.has(name)) return new NextResponse(null, { status: 204 });

    const rawSource = typeof body.source === "string" ? body.source.toLowerCase() : "";
    const source = /^[a-z0-9_-]{1,24}$/.test(rawSource) ? rawSource : null;

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const admin = createAdminClient();

    if (ONCE.has(name)) {
      if (!user) return new NextResponse(null, { status: 204 });
      const { count } = await admin
        .from("events")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("name", name);
      if ((count ?? 0) > 0) return new NextResponse(null, { status: 204 });
    }

    await admin.from("events").insert({ name, source, user_id: user?.id ?? null });
  } catch {
    // La mesure ne doit jamais gêner personne.
  }
  return new NextResponse(null, { status: 204 });
}
