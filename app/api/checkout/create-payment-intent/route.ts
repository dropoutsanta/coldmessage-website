import { NextRequest, NextResponse } from 'next/server';
import { stripe, getPriceForTier } from '@/lib/stripe';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { campaignSlug, campaignId, tier, campaignName, customerEmail } = body;

    if (!campaignSlug || !tier) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const priceConfig = getPriceForTier(tier as 'tier1' | 'tier2');

    // Create a PaymentIntent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: priceConfig.priceInCents,
      currency: 'usd',
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: {
        campaignSlug,
        campaignId: campaignId || '',
        tier,
        emails: priceConfig.emails.toString(),
        campaignName: campaignName || '',
      },
      receipt_email: customerEmail || undefined,
      description: `${campaignName || 'Cold Outreach Campaign'} - ${priceConfig.emails} emails`,
    });

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    });
  } catch (error) {
    console.error('Error creating payment intent:', error);
    return NextResponse.json(
      { error: 'Failed to create payment intent' },
      { status: 500 }
    );
  }
}

