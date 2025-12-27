import { createAdminClient } from '@/lib/supabase/server';
import { EmailBisonWebhookPayload } from './types';

/**
 * Handle EmailBison webhook events
 */
export async function handleEmailBisonWebhook(payload: EmailBisonWebhookPayload) {
  const supabase = createAdminClient();
  const { event, data } = payload;

  // Find campaign by emailbison_campaign_id
  let campaignId: string | null = null;
  if (data.campaign_id) {
    const { data: campaign } = await supabase
      .from('campaigns')
      .select('id')
      .eq('emailbison_campaign_id', data.campaign_id)
      .single();
    campaignId = campaign?.id || null;
  }

  // Find lead by emailbison_lead_id or email
  let leadId: string | null = null;
  if (data.lead_id || data.contact_id || data.email) {
    const query = supabase.from('leads').select('id');
    
    if (data.lead_id) {
      query.eq('emailbison_lead_id', data.lead_id);
    } else if (data.contact_id) {
      query.eq('emailbison_lead_id', data.contact_id);
    } else if (data.email) {
      query.eq('email', data.email);
    }

    if (campaignId) {
      query.eq('campaign_id', campaignId);
    }

    const { data: lead } = await query.single();
    leadId = lead?.id || null;
  }

  // Insert event into audit trail
  await supabase.from('email_events').insert({
    campaign_id: campaignId,
    lead_id: leadId,
    event_type: event,
    emailbison_event_id: payload.id,
    payload: payload as unknown as Record<string, unknown>,
    occurred_at: payload.occurred_at ? new Date(payload.occurred_at) : new Date(),
  });

  // Handle specific events
  switch (event) {
    case 'email_sent':
      if (leadId) {
        await supabase
          .from('leads')
          .update({
            status: 'sent',
            sent_at: new Date(),
          })
          .eq('id', leadId);
      }
      break;

    case 'contact_first_emailed':
      if (leadId) {
        await supabase
          .from('leads')
          .update({
            status: 'sent',
            sent_at: new Date(),
          })
          .eq('id', leadId);
      }
      break;

    case 'email_opened':
      if (leadId) {
        // Get current opens_count and increment
        const { data: lead } = await supabase
          .from('leads')
          .select('opens_count')
          .eq('id', leadId)
          .single();

        const currentOpens = lead?.opens_count || 0;

        await supabase
          .from('leads')
          .update({
            status: 'opened',
            opened_at: data.opened_at ? new Date(data.opened_at) : new Date(),
            opens_count: currentOpens + 1,
          })
          .eq('id', leadId);
      }
      break;

    case 'contact_replied':
      if (leadId && campaignId) {
        // Update lead status
        await supabase
          .from('leads')
          .update({
            status: 'replied',
            replied_at: data.replied_at ? new Date(data.replied_at) : new Date(),
          })
          .eq('id', leadId);

        // Insert inbox message
        await supabase.from('inbox_messages').insert({
          campaign_id: campaignId,
          lead_id: leadId,
          emailbison_thread_id: data.thread_id,
          emailbison_message_id: data.message_id,
          direction: 'inbound',
          subject: data.subject,
          body: data.body,
          body_html: data.body_html,
          from_email: data.from_email,
          to_email: data.to_email,
          is_interested: data.is_interested || false,
          received_at: data.replied_at ? new Date(data.replied_at) : new Date(),
        });
      }
      break;

    case 'contact_interested':
      if (leadId) {
        await supabase
          .from('leads')
          .update({
            is_interested: true,
          })
          .eq('id', leadId);

        // Also update the inbox message if it exists
        if (data.thread_id) {
          await supabase
            .from('inbox_messages')
            .update({ is_interested: true })
            .eq('emailbison_thread_id', data.thread_id);
        }
      }
      break;

    case 'email_bounced':
      if (leadId) {
        await supabase
          .from('leads')
          .update({
            status: 'bounced',
            bounced_at: data.bounced_at ? new Date(data.bounced_at) : new Date(),
          })
          .eq('id', leadId);
      }
      break;

    case 'contact_unsubscribed':
      if (leadId) {
        await supabase
          .from('leads')
          .update({
            unsubscribed_at: data.unsubscribed_at
              ? new Date(data.unsubscribed_at)
              : new Date(),
          })
          .eq('id', leadId);
      }
      break;

    case 'manual_email_sent':
      if (leadId && campaignId) {
        await supabase.from('inbox_messages').insert({
          campaign_id: campaignId,
          lead_id: leadId,
          emailbison_thread_id: data.thread_id,
          emailbison_message_id: data.message_id,
          direction: 'outbound',
          subject: data.subject,
          body: data.body,
          body_html: data.body_html,
          from_email: data.from_email,
          to_email: data.to_email,
          received_at: new Date(),
        });
      }
      break;

    default:
      // Unknown event - just log it in email_events
      console.log(`Unhandled EmailBison event: ${event}`);
  }
}

