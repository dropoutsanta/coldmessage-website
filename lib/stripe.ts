import Stripe from 'stripe';

// Lazy initialization to avoid build-time errors
let stripeInstance: Stripe | null = null;

export function getStripe(): Stripe {
  if (!stripeInstance) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY is not set');
    }
    stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-12-15.clover',
      typescript: true,
    });
  }
  return stripeInstance;
}

// For backwards compatibility - will throw at runtime if accessed without STRIPE_SECRET_KEY
export const stripe = new Proxy({} as Stripe, {
  get(_, prop) {
    return getStripe()[prop as keyof Stripe];
  },
});

// Price configuration
export const PRICE_CONFIG = {
  tier1: {
    emails: 500,
    priceInCents: 99900, // $999
  },
  tier2: {
    emails: 1000,
    priceInCents: 189900, // $1,899
  },
} as const;

export function getPriceForTier(tier: 'tier1' | 'tier2') {
  return PRICE_CONFIG[tier];
}

