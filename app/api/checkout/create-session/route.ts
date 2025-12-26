import { NextRequest, NextResponse } from 'next/server';
import { stripe, getPriceForTier } from '@/lib/stripe';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { campaignSlug, campaignId, tier, campaignName } = body;

    if (!campaignSlug || !tier) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const priceConfig = getPriceForTier(tier as 'tier1' | 'tier2');
    
    // Get origin from request headers (works in single-repo app)
    const origin = request.headers.get('origin') || 'http://localhost:3000';

    // Create Stripe Checkout Session for embedded checkout (minimal UI)
    const session = await stripe.checkout.sessions.create({
      ui_mode: 'embedded',
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: campaignName || 'Cold Outreach Campaign',
              description: `${priceConfig.emails} personalized cold emails`,
            },
            unit_amount: priceConfig.priceInCents,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      return_url: `${origin}/campaign/${campaignSlug}?session_id={CHECKOUT_SESSION_ID}`,
      // Minimal checkout options
      billing_address_collection: 'auto', // Only collect when required by payment method
      phone_number_collection: { enabled: false },
      // Disable shipping (not needed for digital product)
      shipping_address_collection: undefined,
      metadata: {
        campaignSlug,
        campaignId: campaignId || '',
        tier,
        emails: priceConfig.emails.toString(),
      },
    });

    return NextResponse.json({ 
      clientSecret: session.client_secret,
      sessionId: session.id,
    });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}

