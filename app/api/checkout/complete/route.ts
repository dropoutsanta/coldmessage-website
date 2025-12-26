import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { createAdminClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const { sessionId, campaignSlug } = await request.json();

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Missing session ID' },
        { status: 400 }
      );
    }

    // 1. Retrieve and verify the session from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status !== 'paid') {
      return NextResponse.json(
        { error: 'Payment not completed' },
        { status: 400 }
      );
    }

    const customerEmail = session.customer_details?.email;
    const campaignId = session.metadata?.campaignId;

    if (!customerEmail) {
      return NextResponse.json(
        { error: 'No customer email found' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();
    const origin = request.headers.get('origin') || 'http://localhost:3000';

    // 2. Check if user already exists
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(
      (u) => u.email === customerEmail
    );

    let userId: string;

    if (existingUser) {
      userId = existingUser.id;
      console.log(`[checkout/complete] User already exists: ${userId}`);
    } else {
      // 3. Create new user with the Stripe email
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: customerEmail,
        email_confirm: true,
        user_metadata: {
          source: 'stripe_checkout',
          stripe_session_id: sessionId,
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

    // 4. Update campaign with user_id and mark as paid
    if (campaignId) {
      const { error: updateError } = await supabase
        .from('campaigns')
        .update({
          user_id: userId,
          status: 'paid',
          stripe_session_id: sessionId,
          paid_at: new Date().toISOString(),
        })
        .eq('id', campaignId);

      if (updateError) {
        console.error('[checkout/complete] Error updating campaign:', updateError);
        // Don't fail the request - payment was successful
      }
    }

    // 5. Generate magic link for auto-login
    // Redirect to auth/callback which will handle the session setup
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
      // Return without auto-login link
      return NextResponse.json({
        success: true,
        email: customerEmail,
        userId,
        autoLoginUrl: null,
      });
    }

    // The action_link contains the magic link URL
    // We need to extract the token and build our own URL through auth/callback
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

