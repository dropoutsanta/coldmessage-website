import { createClient, SupabaseClient } from '@supabase/supabase-js';

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
}

