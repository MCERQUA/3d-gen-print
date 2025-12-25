import Stripe from "stripe";

// Server-side Stripe client - lazy initialized to avoid build errors
let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error("STRIPE_SECRET_KEY is not set");
    }
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      typescript: true,
    });
  }
  return _stripe;
}

// For backwards compatibility
export const stripe = {
  get checkout() { return getStripe().checkout; },
  get customers() { return getStripe().customers; },
  get paymentIntents() { return getStripe().paymentIntents; },
  get subscriptions() { return getStripe().subscriptions; },
  get webhooks() { return getStripe().webhooks; },
};

// Credit packages configuration
export const CREDIT_PACKAGES = [
  {
    id: "starter",
    name: "Starter Pack",
    credits: 50,
    price: 499, // $4.99 in cents
    priceDisplay: "$4.99",
    popular: false,
    description: "Perfect for trying out",
  },
  {
    id: "standard",
    name: "Standard Pack",
    credits: 150,
    price: 1299, // $12.99 in cents
    priceDisplay: "$12.99",
    popular: true,
    description: "Best value for regular use",
    savings: "Save 13%",
  },
  {
    id: "pro",
    name: "Pro Pack",
    credits: 400,
    price: 2999, // $29.99 in cents
    priceDisplay: "$29.99",
    popular: false,
    description: "For power users",
    savings: "Save 25%",
  },
  {
    id: "enterprise",
    name: "Enterprise Pack",
    credits: 1000,
    price: 6999, // $69.99 in cents
    priceDisplay: "$69.99",
    popular: false,
    description: "Maximum value",
    savings: "Save 30%",
  },
] as const;

export type CreditPackageId = (typeof CREDIT_PACKAGES)[number]["id"];

export function getCreditPackage(id: string) {
  return CREDIT_PACKAGES.find((pkg) => pkg.id === id);
}
