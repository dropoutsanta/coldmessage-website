export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      campaigns: {
        Row: {
          company_name: string
          company_profile: Json | null
          created_at: string | null
          domain: string | null
          great_at: string | null
          helps_with: string | null
          icp_attributes: string[] | null
          icp_personas: Json | null
          id: string
          leads_purchased: number | null
          linkedin_filters: Json | null
          location: string | null
          loom_video_url: string | null
          organization_id: string | null
          paid_at: string | null
          persona_rankings: Json | null
          pipeline_debug: Json | null
          price_tier_1: number | null
          price_tier_1_emails: number | null
          price_tier_2: number | null
          price_tier_2_emails: number | null
          qualified_leads: Json | null
          sales_navigator_url: string | null
          slug: string
          status: string | null
          stripe_session_id: string | null
          target_geo: Json | null
          updated_at: string | null
          user_id: string | null
          website_screenshot_url: string | null
          website_url: string | null
        }
        Insert: {
          company_name: string
          company_profile?: Json | null
          created_at?: string | null
          domain?: string | null
          great_at?: string | null
          helps_with?: string | null
          icp_attributes?: string[] | null
          icp_personas?: Json | null
          id?: string
          leads_purchased?: number | null
          linkedin_filters?: Json | null
          location?: string | null
          loom_video_url?: string | null
          organization_id?: string | null
          paid_at?: string | null
          persona_rankings?: Json | null
          pipeline_debug?: Json | null
          price_tier_1?: number | null
          price_tier_1_emails?: number | null
          price_tier_2?: number | null
          price_tier_2_emails?: number | null
          qualified_leads?: Json | null
          sales_navigator_url?: string | null
          slug: string
          status?: string | null
          stripe_session_id?: string | null
          target_geo?: Json | null
          updated_at?: string | null
          user_id?: string | null
          website_screenshot_url?: string | null
          website_url?: string | null
        }
        Update: {
          company_name?: string
          company_profile?: Json | null
          created_at?: string | null
          domain?: string | null
          great_at?: string | null
          helps_with?: string | null
          icp_attributes?: string[] | null
          icp_personas?: Json | null
          id?: string
          leads_purchased?: number | null
          linkedin_filters?: Json | null
          location?: string | null
          loom_video_url?: string | null
          organization_id?: string | null
          paid_at?: string | null
          persona_rankings?: Json | null
          pipeline_debug?: Json | null
          price_tier_1?: number | null
          price_tier_1_emails?: number | null
          price_tier_2?: number | null
          price_tier_2_emails?: number | null
          qualified_leads?: Json | null
          sales_navigator_url?: string | null
          slug?: string
          status?: string | null
          stripe_session_id?: string | null
          target_geo?: Json | null
          updated_at?: string | null
          user_id?: string | null
          website_screenshot_url?: string | null
          website_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          about: string | null
          campaign_id: string
          company: string
          created_at: string | null
          email: string | null
          email_body: string | null
          email_subject: string | null
          first_name: string
          id: string
          last_name: string
          linkedin_url: string | null
          location: string | null
          opened_at: string | null
          profile_picture_url: string | null
          replied_at: string | null
          sent_at: string | null
          status: string | null
          title: string
          why_picked: string | null
        }
        Insert: {
          about?: string | null
          campaign_id: string
          company: string
          created_at?: string | null
          email?: string | null
          email_body?: string | null
          email_subject?: string | null
          first_name: string
          id?: string
          last_name: string
          linkedin_url?: string | null
          location?: string | null
          opened_at?: string | null
          profile_picture_url?: string | null
          replied_at?: string | null
          sent_at?: string | null
          status?: string | null
          title: string
          why_picked?: string | null
        }
        Update: {
          about?: string | null
          campaign_id?: string
          company?: string
          created_at?: string | null
          email?: string | null
          email_body?: string | null
          email_subject?: string | null
          first_name?: string
          id?: string
          last_name?: string
          linkedin_url?: string | null
          location?: string | null
          opened_at?: string | null
          profile_picture_url?: string | null
          replied_at?: string | null
          sent_at?: string | null
          status?: string | null
          title?: string
          why_picked?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string | null
          id: string
          name: string | null
          owner_id: string
          stripe_customer_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name?: string | null
          owner_id: string
          stripe_customer_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string | null
          owner_id?: string
          stripe_customer_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// Helper types for easier use
export type Campaign = Database['public']['Tables']['campaigns']['Row']
export type CampaignInsert = Database['public']['Tables']['campaigns']['Insert']
export type CampaignUpdate = Database['public']['Tables']['campaigns']['Update']

export type Lead = Database['public']['Tables']['leads']['Row']
export type LeadInsert = Database['public']['Tables']['leads']['Insert']
export type LeadUpdate = Database['public']['Tables']['leads']['Update']

export type Organization = Database['public']['Tables']['organizations']['Row']
export type OrganizationInsert = Database['public']['Tables']['organizations']['Insert']
export type OrganizationUpdate = Database['public']['Tables']['organizations']['Update']

