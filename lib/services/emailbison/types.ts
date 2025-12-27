// EmailBison API Types

export interface EmailBisonCampaign {
  id: string;
  name: string;
  status?: string;
  created_at?: string;
}

export interface EmailBisonSequenceStep {
  email_subject: string;
  email_body: string;
  wait_in_days: number;
}

export interface EmailBisonSequence {
  title: string;
  sequence_steps: EmailBisonSequenceStep[];
}

export interface EmailBisonLead {
  id?: string;
  email: string;
  first_name: string;
  last_name: string;
  company?: string;
  title?: string;
  custom_fields?: Record<string, string>;
}

export interface EmailBisonWebhookPayload {
  event: string;
  data: {
    campaign_id?: string;
    contact_id?: string;
    lead_id?: string;
    email?: string;
    first_name?: string;
    last_name?: string;
    subject?: string;
    body?: string;
    body_html?: string;
    from_email?: string;
    to_email?: string;
    thread_id?: string;
    message_id?: string;
    opened_at?: string;
    replied_at?: string;
    bounced_at?: string;
    unsubscribed_at?: string;
    is_interested?: boolean;
    [key: string]: unknown;
  };
  occurred_at?: string;
  id?: string;
}

export interface EmailBisonApiResponse<T = unknown> {
  success?: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface EmailBisonCreateCampaignResponse {
  campaign_id: string;
  name: string;
}

export interface EmailBisonUploadLeadsResponse {
  lead_ids: string[];
  uploaded: number;
}

