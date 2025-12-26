import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { createAdminClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Support both old sessionId format and new paymentIntentId format
    const { sessionId, paymentIntentId, campaignSlug, email } = body;

    let customerEmail: string | null = null;
    let campaignId: string | null = null;
    let stripeId: string | null = null;

    if (paymentIntentId) {
      // New Payment Element flow
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
      
      if (paymentIntent.status !== 'succeeded') {
        return NextResponse.json(
          { error: 'Payment not completed' },
          { status: 400 }
        );
      }

      customerEmail = email || paymentIntent.receipt_email;
      campaignId = paymentIntent.metadata?.campaignId;
      stripeId = paymentIntentId;
    } else if (sessionId) {
      // Legacy Checkout Session flow
      const session = await stripe.checkout.sessions.retrieve(sessionId);

      if (session.payment_status !== 'paid') {
        return NextResponse.json(
          { error: 'Payment not completed' },
          { status: 400 }
        );
      }

      customerEmail = session.customer_details?.email ?? null;
      campaignId = session.metadata?.campaignId ?? null;
      stripeId = sessionId;
    } else {
      return NextResponse.json(
        { error: 'Missing payment identifier' },
        { status: 400 }
      );
    }

    if (!customerEmail) {
      return NextResponse.json(
        { error: 'No customer email found' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();
    const origin = request.headers.get('origin') || 'http://localhost:3000';

    // Check if user already exists
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(
      (u) => u.email === customerEmail
    );

    let userId: string;

    if (existingUser) {
      userId = existingUser.id;
      console.log(`[checkout/complete] User already exists: ${userId}`);
    } else {
      // Create new user with the email
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: customerEmail,
        email_confirm: true,
        user_metadata: {
          source: 'stripe_checkout',
          stripe_id: stripeId,
        },
      });

      if (createError) {
        console.error('[checkout/complete] Error creating user:', createError);
        return NextResponse.json(
          { error: 'Failed to create user account' },
          { status: 500 }
        );
      }

      userId = newUser.user.id;
      console.log(`[checkout/complete] Created new user: ${userId}`);
    }

    // Update campaign with user_id and mark as paid
    if (campaignId) {
      const { error: updateError } = await supabase
        .from('campaigns')
        .update({
          user_id: userId,
          status: 'paid',
          stripe_payment_id: stripeId,
          paid_at: new Date().toISOString(),
        })
        .eq('id', campaignId);

      if (updateError) {
        console.error('[checkout/complete] Error updating campaign:', updateError);
        // Don't fail the request - payment was successful
      }
    }

    // Generate magic link for auto-login
    const finalDestination = campaignSlug
      ? `/app/campaigns/${campaignSlug}`
      : '/app';
    const redirectTo = `${origin}/auth/callback?next=${encodeURIComponent(finalDestination)}`;

    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: customerEmail,
      options: {
        redirectTo,
      },
    });

    if (linkError) {
      console.error('[checkout/complete] Error generating magic link:', linkError);
      return NextResponse.json({
        success: true,
        email: customerEmail,
        userId,
        autoLoginUrl: null,
      });
    }

    const actionLink = linkData.properties?.action_link;
    console.log(`[checkout/complete] Generated auto-login link for ${customerEmail}`);

    return NextResponse.json({
      success: true,
      email: customerEmail,
      userId,
      autoLoginUrl: actionLink,
    });
  } catch (error) {
    console.error('[checkout/complete] Error:', error);
    return NextResponse.json(
      { error: 'Failed to complete checkout' },
      { status: 500 }
    );
  }
}
