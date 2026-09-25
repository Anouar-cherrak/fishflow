import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { stripe } from "@/lib/stripe";

export const runtime = "nodejs";

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  const admin = createAdminClient();

  const { data: profile } = await admin
    .from("profiles")
    .select("stripe_customer_id, is_pro")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.is_pro && profile?.stripe_customer_id) {
    try {
      const subs = await stripe.subscriptions.list({ customer: profile.stripe_customer_id, status: "active" });
      for (const sub of subs.data) {
        await stripe.subscriptions.cancel(sub.id);
      }
    } catch (err) {
      console.error("Erreur annulation abonnement Stripe lors de la suppression du compte:", err);
    }
  }

  await admin.from("fiches").delete().eq("user_id", user.id);
  await admin.from("folders").delete().eq("user_id", user.id);
  await admin.from("usage").delete().eq("user_id", user.id);
  await admin.from("email_relances").delete().eq("user_id", user.id);
  await admin.from("profiles").delete().eq("id", user.id);

  const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);
  if (deleteError) {
    console.error("Erreur suppression compte auth:", deleteError);
    return NextResponse.json({ error: "Erreur pendant la suppression. Contacte le support." }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
