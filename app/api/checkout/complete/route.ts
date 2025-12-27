import { NextRequest, NextResponse } from 'next/server';
import { stripe, PRICE_CONFIG } from '@/lib/stripe';
import { createAdminClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Support both old sessionId format and new paymentIntentId format
    const { sessionId, paymentIntentId, campaignSlug, email } = body;

    let customerEmail: string | null = null;
    let campaignId: string | null = null;
    let stripeId: string | null = null;
    let tier: 'tier1' | 'tier2' = 'tier1';
    let leadsPurchased: number = 500;

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
      tier = (paymentIntent.metadata?.tier as 'tier1' | 'tier2') || 'tier1';
      leadsPurchased = parseInt(paymentIntent.metadata?.emails || '500', 10);
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
      tier = (session.metadata?.tier as 'tier1' | 'tier2') || 'tier1';
      leadsPurchased = parseInt(session.metadata?.emails || '500', 10);
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
    // Get origin from the request URL itself
    const origin = request.nextUrl.origin;
    console.log('[checkout/complete] Detected origin:', origin);
    console.log('[checkout/complete] Request URL:', request.nextUrl.href);

    // 1. Check if user already exists
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

    // 2. Get or create organization for this user
    let organizationId: string;
    
    const { data: existingOrg } = await supabase
      .from('organizations')
      .select('id')
      .eq('owner_id', userId)
      .single();

    if (existingOrg) {
      organizationId = existingOrg.id;
      console.log(`[checkout/complete] Using existing organization: ${organizationId}`);
    } else {
      // Create new organization
      const { data: newOrg, error: orgError } = await supabase
        .from('organizations')
        .insert({
          owner_id: userId,
          name: customerEmail.split('@')[0], // Default name from email
        })
        .select('id')
        .single();

      if (orgError) {
        console.error('[checkout/complete] Error creating organization:', orgError);
        return NextResponse.json(
          { error: 'Failed to create organization' },
          { status: 500 }
        );
      }

      organizationId = newOrg.id;
      console.log(`[checkout/complete] Created new organization: ${organizationId}`);
    }

    // 3. Update campaign with organization, user, payment info, and set to generating
    if (campaignId) {
      const { error: updateError } = await supabase
        .from('campaigns')
        .update({
          user_id: userId,
          organization_id: organizationId,
          status: 'generating', // Trigger lead generation
          leads_purchased: leadsPurchased,
          stripe_session_id: stripeId,
          paid_at: new Date().toISOString(),
        })
        .eq('id', campaignId);

      if (updateError) {
        console.error('[checkout/complete] Error updating campaign:', updateError);
        // Don't fail the request - payment was successful
      } else {
        console.log(`[checkout/complete] Campaign ${campaignId} updated: status=generating, leads_purchased=${leadsPurchased}`);
        
        // 4. Trigger lead generation in background
        // Fire and forget - don't await
        triggerLeadGeneration(campaignId, leadsPurchased, origin).catch(err => {
          console.error('[checkout/complete] Failed to trigger lead generation:', err);
        });
      }
    }

    // 5. Generate magic link for auto-login
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
        organizationId,
        autoLoginUrl: null,
      });
    }

    const actionLink = linkData.properties?.action_link;
    console.log(`[checkout/complete] Generated auto-login link for ${customerEmail}`);

    return NextResponse.json({
      success: true,
      email: customerEmail,
      userId,
      organizationId,
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

/**
 * Trigger lead generation in background
 * This calls the generate-leads endpoint which will populate the leads table
 */
async function triggerLeadGeneration(campaignId: string, leadsCount: number, origin: string) {
  try {
    const response = await fetch(`${origin}/api/generate-leads`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ campaignId, leadsCount }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to trigger lead generation');
    }

    console.log(`[checkout/complete] Lead generation triggered for campaign ${campaignId}`);
  } catch (error) {
    console.error('[checkout/complete] Error triggering lead generation:', error);
    throw error;
  }
}
