// Prouve qu'un faux événement Stripe (« donne-moi Pro ») est refusé par la vérification utilisée dans
// app/api/stripe/webhook/route.ts : signature fausse, contenu modifié, ou événement rejoué plus de 5 minutes après.
// Lancer : npm run test:stripe   (aucun appel à Stripe : tout est calculé en local avec un faux secret)
import { test } from "node:test";
import assert from "node:assert/strict";
import Stripe from "stripe";

const stripe = new Stripe("sk_test_faux");
const SECRET = "whsec_test_faux_secret";
const payload = JSON.stringify({
  id: "evt_test",
  object: "event",
  type: "checkout.session.completed",
  data: { object: { client_reference_id: "00000000-0000-0000-0000-000000000000", payment_status: "paid", mode: "subscription" } },
});

const sign = (body, secret = SECRET, timestamp) => stripe.webhooks.generateTestHeaderString({ payload: body, secret, timestamp });

test("un événement correctement signé est accepté", () => {
  const event = stripe.webhooks.constructEvent(payload, sign(payload), SECRET);
  assert.equal(event.id, "evt_test");
});

test("une signature faite avec un autre secret est refusée", () => {
  assert.throws(() => stripe.webhooks.constructEvent(payload, sign(payload, "whsec_pirate"), SECRET));
});

test("un contenu modifié après signature (ex. un autre compte) est refusé", () => {
  const header = sign(payload);
  const tampered = payload.replace("00000000-0000-0000-0000-000000000000", "11111111-1111-1111-1111-111111111111");
  assert.throws(() => stripe.webhooks.constructEvent(tampered, header, SECRET));
});

test("un vieil événement rejoué (plus de 5 minutes) est refusé", () => {
  const old = Math.floor(Date.now() / 1000) - 10 * 60;
  assert.throws(() => stripe.webhooks.constructEvent(payload, sign(payload, SECRET, old), SECRET));
});

test("sans en-tête de signature, rien n'est accepté", () => {
  assert.throws(() => stripe.webhooks.constructEvent(payload, "", SECRET));
});
