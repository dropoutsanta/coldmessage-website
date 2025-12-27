import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { emailBisonClient } from '@/lib/services/emailbison';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ messageId: string }> }
) {
  try {
    const supabase = await createClient();
    const { messageId } = await params;
    const { body: replyBody, senderEmailId } = await request.json();

    if (!replyBody || !replyBody.trim()) {
      return NextResponse.json(
        { error: 'Reply body is required' },
        { status: 400 }
      );
    }

    // Get the original message
    const { data: message, error: messageError } = await supabase
      .from('inbox_messages')
      .select('*, leads(*), campaigns(*)')
      .eq('id', messageId)
      .single();

    if (messageError || !message) {
      return NextResponse.json(
        { error: 'Message not found' },
        { status: 404 }
      );
    }

    // EmailBison uses reply_id (the message ID) not thread_id
    const replyId = message.emailbison_reply_id || message.emailbison_thread_id;
    if (!replyId) {
      return NextResponse.json(
        { error: 'Reply ID not found - cannot send reply' },
        { status: 400 }
      );
    }

    // Get sender email ID - either from request or campaign settings
    // TODO: Store sender_email_id on campaign when it's configured in EmailBison
    const senderEmailIdToUse = senderEmailId || message.campaigns?.emailbison_sender_email_id;
    if (!senderEmailIdToUse) {
      return NextResponse.json(
        { error: 'Sender email ID not configured - please set up sender in EmailBison' },
        { status: 400 }
      );
    }

    // Build recipient info from the original message
    const toEmails = [{
      name: message.leads?.first_name 
        ? `${message.leads.first_name} ${message.leads.last_name || ''}`.trim()
        : 'Recipient',
      email_address: message.from_email,
    }];

    // Send reply via EmailBison API
    await emailBisonClient.sendReply(
      replyId,
      replyBody,
      senderEmailIdToUse,
      toEmails,
      'html'
    );

    // Insert outbound message into inbox_messages
    const { data: outboundMessage, error: insertError } = await supabase
      .from('inbox_messages')
      .insert({
        campaign_id: message.campaign_id,
        lead_id: message.lead_id,
        emailbison_thread_id: message.emailbison_thread_id,
        direction: 'outbound',
        subject: message.subject?.startsWith('Re:') ? message.subject : `Re: ${message.subject || ''}`,
        body: replyBody,
        from_email: null, // Will be set by EmailBison
        to_email: message.from_email,
        received_at: new Date(),
        is_read: true,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting outbound message:', insertError);
      // Don't fail - the reply was sent via EmailBison
    }

    return NextResponse.json({
      success: true,
      message: outboundMessage,
    });
  } catch (error) {
    console.error('Error sending reply:', error);
    return NextResponse.json(
      {
        error: 'Failed to send reply',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

