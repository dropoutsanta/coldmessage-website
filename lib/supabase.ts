import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { CampaignData, QualifiedLead, TargetGeo } from './types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Client-side Supabase client (uses anon key, respects RLS)
export const supabase: SupabaseClient | null = 
  supabaseUrl && supabaseAnonKey 
    ? createClient(supabaseUrl, supabaseAnonKey) 
    : null;

// Server-side Supabase client (uses service role key, bypasses RLS)
// Use this for API routes that need to insert/update without user auth
export const supabaseAdmin: SupabaseClient | null = 
  supabaseUrl && supabaseServiceRoleKey 
    ? createClient(supabaseUrl, supabaseServiceRoleKey) 
    : null;

// Demo mode flag
export const isDemoMode = !supabase && !supabaseAdmin;

/**
 * Type for data as it comes from Supabase (snake_case matching database columns)
 */
export interface SupabaseCampaignRow {
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
  qualified_leads: Array<{
    id: string;
    name: string;
    title: string;
    company: string;
    linkedin_url: string;
    profile_picture_url: string;
    why_picked: string;
    email_subject: string;
    email_body: string;
  }>;
  target_geo: TargetGeo;
  price_tier_1: number;
  price_tier_1_emails: number;
  price_tier_2: number;
  price_tier_2_emails: number;
  created_at: string;
  domain?: string;
  updated_at?: string;
  sales_navigator_url?: string | null;
  company_profile?: unknown;
  icp_personas?: unknown;
  persona_rankings?: unknown;
  linkedin_filters?: unknown;
  pipeline_debug?: unknown;
}

/**
 * Transform Supabase row (snake_case) to CampaignData (camelCase)
 */
export function transformSupabaseCampaign(row: SupabaseCampaignRow): CampaignData {
  return {
    id: row.id,
    slug: row.slug,
    companyName: row.company_name,
    websiteUrl: row.website_url,
    location: row.location,
    helpsWith: row.helps_with,
    greatAt: row.great_at,
    icpAttributes: row.icp_attributes,
    qualifiedLeads: (row.qualified_leads || []).map(lead => ({
      id: lead.id,
      name: lead.name,
      firstName: lead.name.split(' ')[0] || '',
      lastName: lead.name.split(' ').slice(1).join(' ') || '',
      title: lead.title,
      company: lead.company,
      linkedinUrl: lead.linkedin_url,
      profilePictureUrl: lead.profile_picture_url,
      location: '',
      about: '',
      whyPicked: lead.why_picked,
      emailSubject: lead.email_subject,
      emailBody: lead.email_body,
    })),
    targetGeo: row.target_geo,
    priceTier1: row.price_tier_1,
    priceTier1Emails: row.price_tier_1_emails,
    priceTier2: row.price_tier_2,
    priceTier2Emails: row.price_tier_2_emails,
    createdAt: row.created_at,
    domain: row.domain,
    updatedAt: row.updated_at,
    salesNavigatorUrl: row.sales_navigator_url || null,
    companyProfile: row.company_profile as any,
    icpPersonas: row.icp_personas as any,
    personaRankings: row.persona_rankings as any,
    linkedinFilters: row.linkedin_filters as any,
    pipelineDebug: row.pipeline_debug as any,
  };
}

// Re-export types for convenience (frontend can use these)
export type { CampaignData, QualifiedLead, TargetGeo };

