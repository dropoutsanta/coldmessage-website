// EmailBison API Types

export interface EmailBisonCampaign {
  id: number;
  uuid: string;
  name: string;
  status: 'draft' | 'active' | 'paused' | 'completed';
  sequence_id: number | null;
  total_leads: number;
  emails_sent: number;
  replied: number;
  bounced: number;
  opened: number;
  interested: number;
  created_at: string;
  updated_at: string;
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
  id: number;
  uuid: string;
  name: string;
  status?: string;
}

export interface EmailBisonUploadLeadsResponse {
  lead_ids: string[];
  uploaded: number;
}

export interface EmailBisonSenderEmail {
  id: number;
  name: string;
  email: string;
  status: 'Connected' | 'Disconnected';
  type: string;
  daily_limit: number;
  emails_sent_count: number;
  total_replied_count: number;
  created_at: string;
  updated_at: string;
}

export interface EmailBisonReply {
  id: number;
  uuid: string;
  folder: 'Inbox' | 'Bounced';
  subject: string;
  from_name: string;
  from_email_address: string;
  to: Array<{ name: string | null; address: string }>;
  lead_id: number | null;
  campaign_id: number | null;
  sender_email_id: number;
  type: 'Tracked Reply' | 'Untracked Reply' | 'Bounced';
  tracked_reply: boolean;
  interested: boolean;
  read: boolean;
  text_body: string;
  html_body: string;
  date_received: string;
  created_at: string;
  updated_at: string;
}

export interface EmailBisonSentEmail {
  id: number;
  campaign_id: number;
  email_subject: string;
  email_body: string;
  status: 'sent' | 'scheduled' | 'failed';
  sent_at: string;
  replies: number;
  opens: number;
  sender_email: EmailBisonSenderEmail;
}

export interface EmailBisonLeadCampaignData {
  campaign_id: number;
  status: 'in_sequence' | 'replied' | 'completed' | 'bounced';
  emails_sent: number;
  replies: number;
  opens: number;
  interested: boolean;
}

export interface EmailBisonLeadFull extends EmailBisonLead {
  id: number;
  status: 'unverified' | 'verified';
  lead_campaign_data: EmailBisonLeadCampaignData[];
  overall_stats: {
    emails_sent: number;
    opens: number;
    replies: number;
    unique_replies: number;
    unique_opens: number;
  };
  created_at: string;
  updated_at: string;
}

