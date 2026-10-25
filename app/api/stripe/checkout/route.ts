import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { stripe } from "@/lib/stripe";
import { siteUrl } from "@/lib/site-url";
import { isProUser } from "@/lib/usage";
import { checkoutIdempotencyKey, hasRunningSubscription } from "@/lib/stripe-rules";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || !user.email) {
    return NextResponse.json({ error: "Connecte-toi d'abord." }, { status: 401 });
  }

  const alreadyPro = await isProUser(user.id);
  if (alreadyPro) {
    return NextResponse.json(
      { error: "Tu es déjà abonné à FishFlow Pro." },
      { status: 400 }
    );
  }

  // Client Stripe déjà connu : on le réutilise (un seul client par compte, abonnements tous visibles dans le portail),
  // et on refuse un deuxième abonnement si le premier tourne encore (le webhook n'est peut-être pas encore arrivé).
  const { data: profile } = await createAdminClient().from("profiles").select("stripe_customer_id").eq("id", user.id).maybeSingle();
  const customer = profile?.stripe_customer_id as string | undefined;
  if (customer) {
    const subs = await stripe.subscriptions.list({ customer, status: "all", limit: 20 });
    if (hasRunningSubscription(subs.data.map((s) => s.status))) {
      return NextResponse.json(
        { error: "Tu as déjà un abonnement Pro en cours. Il sera actif dans un instant ; tu peux le gérer dans Paramètres." },
        { status: 409 }
      );
    }
  }

  const origin = siteUrl(req);

  let session;
  try {
    session = await stripe.checkout.sessions.create(
      {
        mode: "subscription",
        payment_method_types: ["card"],
        line_items: [{ price: process.env.STRIPE_PRICE_ID!, quantity: 1 }],
        ...(customer ? { customer } : { customer_email: user.email }),
        client_reference_id: user.id,
        success_url: `${origin}/generer?checkout=success`,
        cancel_url: `${origin}/pricing?checkout=cancel`,
      },
      // Double clic ou deux onglets dans la même minute : la même page de paiement, pas deux.
      { idempotencyKey: checkoutIdempotencyKey(user.id) }
    );
  } catch (err) {
    console.error("Paiement : session Stripe refusée", err instanceof Error ? err.message : "inconnue");
    return NextResponse.json({ error: "Le paiement n'a pas pu s'ouvrir. Réessaie dans une minute." }, { status: 502 });
  }

  return NextResponse.json({ url: session.url });
}
