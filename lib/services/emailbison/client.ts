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
   */
  async createCampaign(name: string): Promise<EmailBisonCreateCampaignResponse> {
    const response = await this.request<EmailBisonCreateCampaignResponse>(
      '/api/campaigns',
      {
        method: 'POST',
        body: JSON.stringify({ name }),
      }
    );
    return response;
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
   */
  async addSequenceSteps(
    campaignId: string,
    sequence: EmailBisonSequence
  ): Promise<EmailBisonApiResponse> {
    return this.request<EmailBisonApiResponse>(
      `/api/campaigns/${campaignId}/sequence-steps`,
      {
        method: 'POST',
        body: JSON.stringify(sequence),
      }
    );
  }

  /**
   * Upload leads to a campaign
   */
  async uploadLeads(
    campaignId: string,
    leads: EmailBisonLead[]
  ): Promise<EmailBisonUploadLeadsResponse> {
    // EmailBison might accept leads as an array or require a specific format
    // Adjust based on actual API documentation
    const response = await this.request<EmailBisonUploadLeadsResponse>(
      `/api/campaigns/${campaignId}/leads`,
      {
        method: 'POST',
        body: JSON.stringify({ leads }),
      }
    );
    return response;
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
   * Send a reply to a thread
   */
  async sendReply(
    threadId: string,
    body: string
  ): Promise<EmailBisonApiResponse> {
    return this.request<EmailBisonApiResponse>(
      `/api/threads/${threadId}/reply`,
      {
        method: 'POST',
        body: JSON.stringify({ body }),
      }
    );
  }
}

export const emailBisonClient = new EmailBisonClient();

