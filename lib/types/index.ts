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

// Import types for analysis data
import { CompanyProfile } from '../services/agents/companyProfiler';
import { ICPPersona } from '../services/agents/icpBrainstormer';
import { PersonaEvaluation } from '../services/agents/coldEmailRanker';

export interface PersonaRankings {
  evaluations: PersonaEvaluation[];
  selectedPersonaId: string;
  selectedPersonaName: string;
  selectionReasoning: string;
}

export interface LinkedInFilters {
  titles: string[];
  industries: Array<LinkedInIndustry | string>;
  locations: Array<LinkedInGeoLocation | string>;
  companySize: string;
  keywords?: string[];
}

export interface PipelineDebug {
  pipelineId: string;
  startedAt: string;
  completedAt: string;
  totalDurationMs: number;
  steps: {
    companyProfiler?: unknown;
    icpBrainstormer?: unknown;
    coldEmailRanker?: unknown;
    linkedInFilterBuilder?: unknown;
    leadFinder?: unknown;
    emailWriter?: unknown;
  };
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
  // New fields for full data persistence (camelCase to match existing pattern)
  domain?: string;
  updatedAt?: string;
  status?: 'draft' | 'pending' | 'active' | 'paid' | 'completed' | 'generating';
  salesNavigatorUrl?: string | null;
  companyProfile?: CompanyProfile | null;
  icpPersonas?: ICPPersona[] | null;
  icpAnalysis?: {
    primaryIcp?: {
      titles?: string[];
      companySize?: string;
      industries?: string[];
    };
  } | null;
  personaRankings?: PersonaRankings | null;
  linkedinFilters?: LinkedInFilters | null;
  pipelineDebug?: PipelineDebug | null;
  loom_video_url?: string | null;
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
// NOTE: The Sales Navigator scraper returns the position that MATCHED the search query,
// which may be a secondary position (e.g., side gig, board role) rather than the person's 
// primary job. When someone has multiple current positions, we get whichever matched.
// See: https://apify.com/freshdata/linkedin-sales-navigator-scraper
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
  
  // Additional fields that may be returned by the scraper
  // (capture these to help identify primary vs secondary positions)
  profile_picture?: string;
  headline?: string;         // LinkedIn headline - often shows primary position
  industry?: string;
  connections?: number;
  
  // Some scrapers return the full current position details
  current_company?: string;  // May differ from 'company' if position was matched by search
  current_title?: string;    // May differ from 'job_title'
  
  // Position-related fields (if the scraper returns multiple positions)
  positions?: Array<{
    title: string;
    company: string;
    company_id?: string;
    is_current?: boolean;
    start_date?: string;
    end_date?: string;
  }>;
  
  // Enrichment fields
  email?: string;  // Enriched via Icypeas
  company_domain?: string;  // Company domain for email enrichment (e.g., "acme.com")
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

