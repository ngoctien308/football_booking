import Stripe from "stripe";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

if (!stripeSecretKey) {
  console.warn(
    "[Stripe] Missing STRIPE_SECRET_KEY. Stripe payments will not work until this env variable is set."
  );
}

export const stripe =
  stripeSecretKey
    ? new Stripe(stripeSecretKey, {
        apiVersion: "2024-04-10",
      })
    : null;

