import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { generateEmailsForLeads, EmailWriterContext } from '@/lib/services/emailWriter';
import { LinkedInLead, CompanyInfo } from '@/lib/types';
import { CompanyProfile } from '@/lib/services/agents/companyProfiler';
import { ICPPersona } from '@/lib/services/agents/icpBrainstormer';

interface RegenerateRequest {
  slug: string;
}

/**
 * Regenerate just the email copy for an existing campaign.
 * Uses the same leads but re-runs the email writer with current prompts.
 */
export async function POST(request: NextRequest) {
  try {
    const body: RegenerateRequest = await request.json();
    const { slug } = body;

    if (!slug) {
      return NextResponse.json(
        { error: 'Slug is required' },
        { status: 400 }
      );
    }

    console.log(`[API] Regenerating emails for campaign: ${slug}`);

    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Database not configured' },
        { status: 500 }
      );
    }

    // Fetch existing campaign
    const { data: campaign, error: fetchError } = await supabaseAdmin
      .from('campaigns')
      .select('*')
      .eq('slug', slug)
      .single();

    if (fetchError || !campaign) {
      console.error('[API] Campaign not found:', fetchError);
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      );
    }

    // Extract existing leads from the campaign
    const existingLeads = campaign.qualified_leads || [];
    
    if (existingLeads.length === 0) {
      return NextResponse.json(
        { error: 'No leads found in campaign' },
        { status: 400 }
      );
    }

    // Convert qualified leads back to LinkedInLead format for the email writer
    const linkedInLeads: LinkedInLead[] = existingLeads.map((lead: {
      id: string;
      name: string;
      title: string;
      company: string;
      linkedin_url: string;
      profile_picture_url?: string;
      why_picked?: string;
      location?: string;
      about?: string;
    }) => ({
      about: lead.about || '',
      company: lead.company,
      company_id: '',
      first_name: lead.name.split(' ')[0],
      full_name: lead.name,
      job_title: lead.title,
      last_name: lead.name.split(' ').slice(1).join(' '),
      linkedin_url: lead.linkedin_url,
      location: lead.location || campaign.location || '',
      profile_id: lead.id,
      profile_picture: lead.profile_picture_url,
    }));

    // Build company info from campaign data
    const companyInfo: CompanyInfo = {
      name: campaign.company_name,
      domain: campaign.domain || '',
      description: campaign.helps_with || '',
      whatTheyDo: campaign.helps_with || '',
      valueProposition: campaign.great_at || '',
      targetCustomers: campaign.icp_attributes?.[0] || '',
      industry: campaign.icp_attributes?.[2] || '',
    };

    // Build email writer context from stored campaign data
    let emailWriterContext: EmailWriterContext | undefined;
    
    if (campaign.company_profile || campaign.icp_personas) {
      emailWriterContext = {};
      
      if (campaign.company_profile) {
        emailWriterContext.companyProfile = campaign.company_profile as CompanyProfile;
      }
      
      // Find selected persona from rankings
      if (campaign.icp_personas && campaign.persona_rankings) {
        const selectedId = campaign.persona_rankings.selectedPersonaId;
        const selectedPersona = (campaign.icp_personas as ICPPersona[]).find(
          (p: ICPPersona) => p.id === selectedId
        );
        if (selectedPersona) {
          emailWriterContext.selectedPersona = selectedPersona;
          emailWriterContext.selectionReasoning = campaign.persona_rankings.selectionReasoning;
        }
      }
    }

    console.log(`[API] Regenerating ${linkedInLeads.length} emails...`);
    const startTime = Date.now();

    // Generate new emails
    const qualifiedLeads = await generateEmailsForLeads(
      linkedInLeads,
      companyInfo,
      'Bella',
      linkedInLeads.length,
      emailWriterContext
    );

    const duration = Date.now() - startTime;
    console.log(`[API] Regenerated ${qualifiedLeads.length} emails in ${duration}ms`);

    // Transform to database format
    const updatedLeads = qualifiedLeads.map((lead) => ({
      id: lead.id,
      name: lead.name,
      title: lead.title,
      company: lead.company,
      linkedin_url: lead.linkedinUrl,
      profile_picture_url: lead.profilePictureUrl,
      why_picked: lead.whyPicked,
      email_subject: lead.emailSubject,
      email_body: lead.emailBody,
      location: lead.location,
      about: lead.about,
    }));

    // Update campaign in database
    const { data: updatedCampaign, error: updateError } = await supabaseAdmin
      .from('campaigns')
      .update({
        qualified_leads: updatedLeads,
        updated_at: new Date().toISOString(),
      })
      .eq('slug', slug)
      .select()
      .single();

    if (updateError) {
      console.error('[API] Failed to update campaign:', updateError);
      return NextResponse.json(
        { error: 'Failed to update campaign' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      campaign: updatedCampaign,
      emailsRegenerated: qualifiedLeads.length,
      durationMs: duration,
    });
  } catch (error) {
    console.error('Error in regenerate-emails:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

