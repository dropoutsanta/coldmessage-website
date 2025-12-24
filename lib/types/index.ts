// Campaign and Lead Types

export interface QualifiedLead {
  id: string;
  name: string;
  firstName: string;
  lastName: string;
  title: string;
  company: string;
  linkedinUrl: string;
  profilePictureUrl: string;
  location: string;
  about: string;
  whyPicked: string;
  emailSubject: string;
  emailBody: string;
}

export interface LinkedInGeoLocation {
  id: string;      // LinkedIn geo URN ID (e.g., "103644278")
  text: string;    // Display name (e.g., "United States")
}

export interface LinkedInIndustry {
  id: string;      // LinkedIn industry ID (e.g., "4")
  text: string;    // Display name (e.g., "Software Development")
}

export interface ICPSettings {
  titles: string[];
  companySize: string;
  industries: string[] | LinkedInIndustry[];  // Support both formats for backwards compatibility
  locations: string[] | LinkedInGeoLocation[]; // Support both formats for backwards compatibility
}

export interface CompanyInfo {
  name: string;
  domain: string;
  description: string;
  whatTheyDo: string;
  valueProposition: string;
  targetCustomers: string;
  industry: string;
}

export interface CampaignData {
  id: string;
  slug: string;
  companyName: string;
  websiteUrl: string;
  location: string;
  helpsWith: string;
  greatAt: string;
  icpAttributes: string[];
  qualifiedLeads: QualifiedLead[];
  targetGeo: TargetGeo;
  priceTier1: number;
  priceTier1Emails: number;
  priceTier2: number;
  priceTier2Emails: number;
  createdAt: string;
}

export type TargetGeo = 
  | {
      region: 'us';
      states?: string[];
      cities?: string[];
    }
  | {
      region: 'world';
      countries?: string[];
    };

// Apify LinkedIn Scraper Types
export interface LinkedInLead {
  about: string;
  company: string;
  company_id: string;
  first_name: string;
  full_name: string;
  job_title: string;
  last_name: string;
  linkedin_url: string;
  location: string;
  profile_id: string;
}

export interface ApifySearchResult {
  request_id?: string;
  status?: 'processing' | 'pending' | 'done';
  message?: string;
  data?: LinkedInLead[];
  total_count?: number;
}

// Firecrawl Types
export interface FirecrawlResponse {
  success: boolean;
  data?: {
    markdown?: string;
    content?: string;
    metadata?: {
      title?: string;
      description?: string;
      ogTitle?: string;
      ogDescription?: string;
    };
  };
  error?: string;
}

// Generation Request
export interface GenerateCampaignRequest {
  domain: string;
  slug: string;
  icpSettings?: ICPSettings;
  salesNavigatorUrl?: string;
}

export interface GenerateCampaignResponse {
  success: boolean;
  campaign?: CampaignData;
  error?: string;
  status?: 'processing' | 'analyzing' | 'finding_leads' | 'writing_emails' | 'complete';
}

