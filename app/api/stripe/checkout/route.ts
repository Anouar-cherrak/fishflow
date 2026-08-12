import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe";
import { isProUser } from "@/lib/usage";

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

  const origin = req.headers.get("origin") || "http://localhost:3000";

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [{ price: process.env.STRIPE_PRICE_ID!, quantity: 1 }],
    customer_email: user.email,
    client_reference_id: user.id,
    success_url: `${origin}/generer?checkout=success`,
    cancel_url: `${origin}/pricing?checkout=cancel`,
  });

  return NextResponse.json({ url: session.url });
}