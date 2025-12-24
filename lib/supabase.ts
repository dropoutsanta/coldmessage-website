import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { CompanyProfile } from './services/agents/companyProfiler';
import { ICPPersona } from './services/agents/icpBrainstormer';
import { PersonaEvaluation } from './services/agents/coldEmailRanker';
import { ICPSettings, LinkedInGeoLocation, LinkedInIndustry } from './types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Only create client if credentials exist
export const supabase: SupabaseClient | null = 
  supabaseUrl && supabaseAnonKey 
    ? createClient(supabaseUrl, supabaseAnonKey) 
    : null;

// Demo mode flag
export const isDemoMode = !supabase;

// Types for campaign data
export interface QualifiedLead {
  id: string;
  name: string;
  title: string;
  company: string;
  linkedin_url: string;
  profile_picture_url: string;
  why_picked: string;
  email_subject: string;
  email_body: string;
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

// Analysis data types
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
    companyProfiler?: {
      agent: string;
      title: string;
      startedAt: string;
      completedAt: string;
      durationMs: number;
      status: 'completed' | 'failed';
      prompt?: string;
      response?: string;
      output?: CompanyProfile;
    };
    icpBrainstormer?: {
      agent: string;
      title: string;
      startedAt: string;
      completedAt: string;
      durationMs: number;
      status: 'completed' | 'failed';
      prompt?: string;
      response?: string;
      output?: {
        personas: ICPPersona[];
        reasoning: string;
      };
    };
    coldEmailRanker?: {
      agent: string;
      title: string;
      startedAt: string;
      completedAt: string;
      durationMs: number;
      status: 'completed' | 'failed';
      prompt?: string;
      response?: string;
      output?: {
        evaluations: PersonaEvaluation[];
        selectedPersonaId: string;
        selectedPersonaName: string;
        selectionReasoning: string;
      };
    };
    linkedInFilterBuilder?: {
      agent: string;
      title: string;
      startedAt: string;
      completedAt: string;
      durationMs: number;
      status: 'completed' | 'failed';
      prompt?: string;
      response?: string;
      output?: {
        filters: ICPSettings;
        salesNavUrl: string;
      };
    };
    leadFinder?: {
      salesNavUrl: string;
      requestId: string;
      startedAt: string;
      completedAt?: string;
      durationMs?: number;
      leadsFound: number;
      status: 'pending' | 'completed' | 'timeout' | 'error';
    };
    emailWriter?: {
      startedAt: string;
      completedAt: string;
      durationMs: number;
      emailsGenerated: number;
      parallelBatchSize: number;
    };
  };
}

export interface CampaignData {
  id: string;
  slug: string;
  company_name: string;
  loom_video_url: string;
  website_url: string;
  website_screenshot_url: string;
  location: string;
  helps_with: string;
  great_at: string;
  icp_attributes: string[];
  qualified_leads: QualifiedLead[];
  target_geo: TargetGeo;
  price_tier_1: number;
  price_tier_1_emails: number;
  price_tier_2: number;
  price_tier_2_emails: number;
  created_at: string;
  // New fields for full data persistence (using snake_case to match database columns)
  domain?: string;
  updated_at?: string;
  sales_navigator_url?: string | null;
  company_profile?: CompanyProfile | null;
  icp_personas?: ICPPersona[] | null;
  persona_rankings?: PersonaRankings | null;
  linkedin_filters?: LinkedInFilters | null;
  pipeline_debug?: PipelineDebug | null;
}

