import { NextRequest, NextResponse } from 'next/server';
import { handleEmailBisonWebhook } from '@/lib/services/emailbison/webhooks';
import { EmailBisonWebhookPayload } from '@/lib/services/emailbison/types';

export async function POST(request: NextRequest) {
  try {
    const payload: EmailBisonWebhookPayload = await request.json();

    console.log('[EmailBison Webhook] Received event:', payload.event);

    // Handle the webhook
    await handleEmailBisonWebhook(payload);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error processing EmailBison webhook:', error);
    return NextResponse.json(
      { error: 'Failed to process webhook' },
      { status: 500 }
    );
  }
}

// Allow GET for webhook verification (if EmailBison requires it)
export async function GET() {
  return NextResponse.json({ status: 'ok' });
}

