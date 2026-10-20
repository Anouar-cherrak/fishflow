import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import type Stripe from "stripe";

export const runtime = "nodejs";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// Statuts Stripe qui donnent droit à Pro. « past_due » = paiement en échec que Stripe réessaie encore (quelques jours) :
// on garde Pro pendant ces essais ; ensuite Stripe passe l'abonnement en « unpaid » ou « canceled » et Pro s'arrête.
const PRO_STATUSES = new Set<Stripe.Subscription.Status>(["active", "trialing", "past_due"]);

type Admin = ReturnType<typeof createAdminClient>;

const customerId = (c: string | { id: string } | null | undefined) => (typeof c === "string" ? c : c?.id ?? null);

// L'état d'un abonnement est TOUJOURS relu chez Stripe (pas pris dans l'événement) : un événement ancien, rejoué
// ou arrivé dans le désordre ne peut pas redonner Pro à tort.
async function syncSubscription(admin: Admin, subscriptionId: string) {
  const sub = await stripe.subscriptions.retrieve(subscriptionId);
  const customer = customerId(sub.customer);
  if (!customer) return;
  // La personne a peut-être plusieurs abonnements (rare) : Pro si au moins un est valable.
  const all = await stripe.subscriptions.list({ customer, status: "all", limit: 20 });
  const pro = all.data.some((s) => PRO_STATUSES.has(s.status));
  await admin.from("profiles").update({ is_pro: pro }).eq("stripe_customer_id", customer);
}

async function handle(admin: Admin, event: Stripe.Event) {
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.client_reference_id;
      const customer = customerId(session.customer);
      // Pro seulement si le paiement est vraiment fait, et pour un compte FishFlow valide (identifiant posé par notre serveur).
      if (!userId || !UUID.test(userId) || !customer || session.mode !== "subscription") return;
      if (session.payment_status !== "paid" && session.payment_status !== "no_payment_required") return;
      await admin.from("profiles").update({ stripe_customer_id: customer }).eq("id", userId);
      const subscriptionId = customerId(session.subscription);
      if (subscriptionId) await syncSubscription(admin, subscriptionId);
      else await admin.from("profiles").update({ is_pro: true }).eq("id", userId);
      return;
    }
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted":
    case "customer.subscription.paused":
    case "customer.subscription.resumed": {
      const sub = event.data.object as Stripe.Subscription;
      await syncSubscription(admin, sub.id);
      return;
    }
    case "charge.refunded":
    case "charge.dispute.created": {
      // Remboursement complet ou contestation de paiement : Pro s'arrête et l'abonnement est annulé (plus de prélèvement).
      const charge = event.data.object as Stripe.Charge | Stripe.Dispute;
      const fullRefund = event.type === "charge.dispute.created" || (charge as Stripe.Charge).refunded === true;
      const chargeObj = event.type === "charge.dispute.created" ? await stripe.charges.retrieve(customerId((charge as Stripe.Dispute).charge)!) : (charge as Stripe.Charge);
      const customer = customerId(chargeObj.customer);
      if (!fullRefund || !customer) return;
      const subs = await stripe.subscriptions.list({ customer, status: "all", limit: 20 });
      for (const s of subs.data) {
        if (s.status !== "canceled" && s.status !== "incomplete_expired") await stripe.subscriptions.cancel(s.id);
      }
      await admin.from("profiles").update({ is_pro: false }).eq("stripe_customer_id", customer);
      return;
    }
  }
}

export async function POST(req: Request) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature || !secret) {
    return NextResponse.json({ error: "Signature manquante" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    // Vérifie la signature ET l'heure de l'événement (plus de 5 minutes = refusé) : on ne peut ni le falsifier ni le rejouer plus tard.
    event = stripe.webhooks.constructEvent(body, signature, secret);
  } catch (err) {
    console.error("Signature webhook invalide:", (err as Error)?.message);
    return NextResponse.json({ error: "Signature invalide" }, { status: 400 });
  }

  const admin = createAdminClient();

  // Chaque événement n'est traité qu'une fois (Stripe peut renvoyer le même plusieurs fois).
  const { error: dup } = await admin.from("stripe_events").insert({ id: event.id, type: event.type });
  if (dup?.code === "23505") return NextResponse.json({ received: true, duplicate: true });
  if (dup) console.error("Registre des événements Stripe indisponible (script supabase/securite-2026-10.sql ?) :", dup.message);

  try {
    await handle(admin, event);
  } catch (err) {
    console.error("Webhook Stripe : traitement échoué", event.type, (err as Error)?.message);
    // On efface la trace pour que Stripe puisse renvoyer l'événement et qu'il soit traité la fois suivante.
    if (!dup) await admin.from("stripe_events").delete().eq("id", event.id);
    return NextResponse.json({ error: "Traitement échoué" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
