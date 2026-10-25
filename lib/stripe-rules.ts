// Règles du paiement qui ne dépendent pas de Stripe lui-même (testées dans tests/stripe.test.mjs).

// Un abonnement dans l'un de ces états compte encore (payé, en essai, ou en attente de paiement) :
// on n'en ouvre pas un deuxième, sinon la personne paierait deux fois.
const STILL_RUNNING = new Set(["active", "trialing", "past_due", "unpaid", "incomplete", "paused"]);

export function hasRunningSubscription(statuses: string[]): boolean {
  return statuses.some((s) => STILL_RUNNING.has(s));
}

// Même demande de paiement dans la même minute (double clic, deux onglets) : Stripe renvoie la même page de paiement.
export function checkoutIdempotencyKey(userId: string, now = Date.now()): string {
  return `checkout-${userId}-${Math.floor(now / 60000)}`;
}
