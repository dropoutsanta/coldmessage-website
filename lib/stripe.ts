import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not set');
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-12-15.clover',
  typescript: true,
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

