import {
  EmailBisonCampaign,
  EmailBisonSequence,
  EmailBisonLead,
  EmailBisonCreateCampaignResponse,
  EmailBisonUploadLeadsResponse,
  EmailBisonApiResponse,
} from './types';

const EMAILBISON_API_URL = process.env.EMAILBISON_API_URL || 'https://dedi.emailbison.com';
const EMAILBISON_API_KEY = process.env.EMAILBISON_API_KEY;

if (!EMAILBISON_API_KEY) {
  console.warn('EMAILBISON_API_KEY is not set. EmailBison API calls will fail.');
}

class EmailBisonClient {
  private apiUrl: string;
  private apiKey: string | undefined;

  constructor() {
    this.apiUrl = EMAILBISON_API_URL;
    this.apiKey = EMAILBISON_API_KEY;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    if (!this.apiKey) {
      throw new Error('EMAILBISON_API_KEY is not configured');
    }

    const url = `${this.apiUrl}${endpoint}`;
    const headers = {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
      ...options.headers,
    };

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `EmailBison API error (${response.status}): ${errorText}`
      );
    }

    return response.json() as Promise<T>;
  }

  /**
   * Create a new campaign in EmailBison
   * Returns both numeric id (for API calls) and uuid (for reference)
   * 
   * API returns: { data: { id: 11, uuid: "abc-123", name: "...", ... } }
   * Subsequent API calls use the NUMERIC id, not the uuid!
   */
  async createCampaign(name: string): Promise<{ campaign_id: string; numeric_id: number; name: string }> {
    const response = await this.request<{ data: EmailBisonCreateCampaignResponse }>(
      '/api/campaigns',
      {
        method: 'POST',
        body: JSON.stringify({ name }),
      }
    );
    
    const campaignData = response.data;
    if (!campaignData?.id) {
      throw new Error(`EmailBison createCampaign did not return an id. Response: ${JSON.stringify(response)}`);
    }
    
    return {
      campaign_id: String(campaignData.id), // Use numeric ID as string for API calls
      numeric_id: campaignData.id,
      name: campaignData.name,
    };
  }

  /**
   * Get campaign details
   */
  async getCampaign(campaignId: string): Promise<EmailBisonCampaign> {
    return this.request<EmailBisonCampaign>(`/api/campaigns/${campaignId}`);
  }

  /**
   * Update campaign settings
   */
  async updateCampaignSettings(
    campaignId: string,
    settings: Record<string, unknown>
  ): Promise<EmailBisonApiResponse> {
    return this.request<EmailBisonApiResponse>(
      `/api/campaigns/${campaignId}/update`,
      {
        method: 'POST',
        body: JSON.stringify(settings),
      }
    );
  }

  /**
   * Add sequence steps to a campaign
   * Note: wait_in_days must be at least 1 (API requirement)
   */
  async addSequenceSteps(
    campaignId: string,
    sequence: EmailBisonSequence
  ): Promise<EmailBisonApiResponse> {
    // Ensure wait_in_days is at least 1 (API requirement)
    const fixedSequence = {
      ...sequence,
      sequence_steps: sequence.sequence_steps.map(step => ({
        ...step,
        wait_in_days: Math.max(1, step.wait_in_days),
      })),
    };
    
    return this.request<EmailBisonApiResponse>(
      `/api/campaigns/${campaignId}/sequence-steps`,
      {
        method: 'POST',
        body: JSON.stringify(fixedSequence),
      }
    );
  }

  /**
   * Create a single lead
   * Returns the created lead with its ID
   */
  async createLead(lead: EmailBisonLead): Promise<{ data: { id: number } }> {
    return this.request<{ data: { id: number } }>(
      '/api/leads',
      {
        method: 'POST',
        body: JSON.stringify(lead),
      }
    );
  }

  /**
   * Attach existing leads to a campaign by their IDs
   * This is the correct way to add leads to a campaign in EmailBison
   */
  async attachLeadsToCampaign(
    campaignId: string,
    leadIds: number[]
  ): Promise<EmailBisonApiResponse> {
    return this.request<EmailBisonApiResponse>(
      `/api/campaigns/${campaignId}/leads/attach-leads`,
      {
        method: 'POST',
        body: JSON.stringify({ lead_ids: leadIds }),
      }
    );
  }

  /**
   * Upload leads to a campaign (creates leads then attaches them)
   * This is a convenience method that combines createLead + attachLeadsToCampaign
   */
  async uploadLeads(
    campaignId: string,
    leads: EmailBisonLead[]
  ): Promise<EmailBisonUploadLeadsResponse> {
    const leadIds: number[] = [];
    
    // Create each lead individually
    for (const lead of leads) {
      try {
        const response = await this.createLead(lead);
        if (response.data?.id) {
          leadIds.push(response.data.id);
        }
      } catch (error) {
        console.error(`[EmailBison] Failed to create lead ${lead.email}:`, error);
        // Continue with other leads
      }
    }
    
    // Attach all created leads to the campaign
    if (leadIds.length > 0) {
      await this.attachLeadsToCampaign(campaignId, leadIds);
    }
    
    return {
      lead_ids: leadIds.map(String),
      uploaded: leadIds.length,
    };
  }

  /**
   * Resume/pause a campaign
   */
  async resumeCampaign(campaignId: string): Promise<EmailBisonApiResponse> {
    return this.request<EmailBisonApiResponse>(
      `/api/campaigns/${campaignId}/resume`,
      {
        method: 'PATCH',
      }
    );
  }

  /**
   * Pause a campaign
   */
  async pauseCampaign(campaignId: string): Promise<EmailBisonApiResponse> {
    return this.request<EmailBisonApiResponse>(
      `/api/campaigns/${campaignId}/pause`,
      {
        method: 'PATCH',
      }
    );
  }

  /**
   * Send a reply to a message
   * @param replyId - The ID of the reply/message to respond to
   * @param message - The reply message content
   * @param senderEmailId - The ID of the sender email account to use
   * @param toEmails - Array of recipient email addresses with names
   * @param contentType - 'html' or 'text' (default: 'html')
   */
  async sendReply(
    replyId: string,
    message: string,
    senderEmailId: number,
    toEmails: Array<{ name: string; email_address: string }>,
    contentType: 'html' | 'text' = 'html'
  ): Promise<EmailBisonApiResponse> {
    return this.request<EmailBisonApiResponse>(
      `/api/replies/${replyId}/reply`,
      {
        method: 'POST',
        body: JSON.stringify({
          message,
          sender_email_id: senderEmailId,
          to_emails: toEmails,
          content_type: contentType,
        }),
      }
    );
  }

  /**
   * Get replies for a specific lead
   */
  async getLeadReplies(leadId: string): Promise<EmailBisonApiResponse> {
    return this.request<EmailBisonApiResponse>(
      `/api/leads/${leadId}/replies`
    );
  }

  /**
   * Get all sender email accounts
   * Returns list of connected email accounts with their IDs
   */
  async getSenderEmails(): Promise<EmailBisonApiResponse> {
    return this.request<EmailBisonApiResponse>('/api/sender-emails');
  }

  /**
   * Get all replies/inbox messages
   * @param options - Optional filters (tracked, folder, campaign_id, etc)
   */
  async getReplies(options?: {
    tracked?: boolean;
    folder?: 'Inbox' | 'Bounced';
    campaign_id?: number;
    page?: number;
  }): Promise<EmailBisonApiResponse> {
    const params = new URLSearchParams();
    if (options?.tracked !== undefined) params.append('tracked', String(options.tracked));
    if (options?.folder) params.append('folder', options.folder);
    if (options?.campaign_id) params.append('campaign_id', String(options.campaign_id));
    if (options?.page) params.append('page', String(options.page));
    
    const queryString = params.toString();
    return this.request<EmailBisonApiResponse>(
      `/api/replies${queryString ? `?${queryString}` : ''}`
    );
  }

  /**
   * Get a single reply by ID
   */
  async getReply(replyId: string): Promise<EmailBisonApiResponse> {
    return this.request<EmailBisonApiResponse>(`/api/replies/${replyId}`);
  }

  /**
   * Get sent emails for a specific lead
   */
  async getLeadSentEmails(leadId: string): Promise<EmailBisonApiResponse> {
    return this.request<EmailBisonApiResponse>(
      `/api/leads/${leadId}/sent-emails`
    );
  }

  /**
   * Get a single lead by ID
   */
  async getLead(leadId: string): Promise<EmailBisonApiResponse> {
    return this.request<EmailBisonApiResponse>(`/api/leads/${leadId}`);
  }

  /**
   * List all campaigns
   */
  async listCampaigns(): Promise<EmailBisonApiResponse> {
    return this.request<EmailBisonApiResponse>('/api/campaigns');
  }
}

export const emailBisonClient = new EmailBisonClient();

