import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { findLeads } from '@/lib/services/leadFinder';
import { generateEmailForLead } from '@/lib/services/emailWriter';
import { CompanyProfile } from '@/lib/services/agents/companyProfiler';
import { ICPPersona } from '@/lib/services/agents/icpBrainstormer';

interface GenerateLeadsRequest {
  campaignId: string;
  leadsCount: number;
}

/**
 * Get the number of leads to generate.
 * Uses LEADS_COUNT_OVERRIDE env var for testing, otherwise uses the requested count.
 */
function getLeadsCount(requestedCount: number): number {
  const override = process.env.LEADS_COUNT_OVERRIDE;
  if (override) {
    const parsed = parseInt(override, 10);
    if (!isNaN(parsed) && parsed > 0) {
      console.log(`[generate-leads] Using LEADS_COUNT_OVERRIDE: ${parsed} (requested: ${requestedCount})`);
      return parsed;
    }
  }
  return requestedCount;
}

/**
 * POST /api/generate-leads
 * 
 * Generates leads for a paid campaign and inserts them into the leads table.
 * This is called after payment completion to populate the full 500 leads.
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const body: GenerateLeadsRequest = await request.json();
    const { campaignId, leadsCount: requestedLeadsCount } = body;

    if (!campaignId) {
      return NextResponse.json(
        { error: 'Campaign ID is required' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // 1. Get campaign details
    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .select('*')
      .eq('id', campaignId)
      .single();

    if (campaignError || !campaign) {
      console.error('[generate-leads] Campaign not found:', campaignError);
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      );
    }

    // Apply env override for testing (e.g., LEADS_COUNT_OVERRIDE=5)
    const leadsCount = getLeadsCount(requestedLeadsCount);

    console.log(`[generate-leads] Starting lead generation for campaign ${campaignId} (${leadsCount} leads)`);

    // 2. Extract ICP settings from campaign
    const icpSettings = campaign.linkedin_filters || {
      titles: campaign.icp_attributes?.[0]?.split(', ') || ['Founder', 'CEO'],
      companySize: campaign.icp_attributes?.[1] || '10-200 employees',
      industries: campaign.icp_attributes?.[2]?.split(', ') || ['SaaS', 'Technology'],
      locations: [campaign.location || 'United States'],
    };

    // 3. Find leads using the lead finder service
    let leads: Array<{
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
      profile_picture?: string;
    }> = [];

    try {
      const result = await findLeads(icpSettings, campaign.sales_navigator_url, leadsCount);
      leads = result.leads || [];
      console.log(`[generate-leads] Found ${leads.length} leads`);
    } catch (leadError) {
      console.error('[generate-leads] Error finding leads:', leadError);
      // Continue with empty leads - we'll update status to reflect the error
    }

    if (leads.length === 0) {
      // Update campaign status to indicate no leads found
      await supabase
        .from('campaigns')
        .update({ status: 'ready' }) // Still mark as ready, just with 0 leads
        .eq('id', campaignId);

      return NextResponse.json({
        success: true,
        message: 'No leads found for the given criteria',
        leadsGenerated: 0,
      });
    }

    // 4. Build company info for email generation
    const companyInfo = {
      name: campaign.company_name,
      domain: campaign.domain || '',
      description: campaign.company_profile?.tagline || '',
      whatTheyDo: campaign.helps_with || campaign.company_profile?.productOrService || '',
      valueProposition: campaign.great_at || campaign.company_profile?.competitiveAdvantage || '',
      targetCustomers: campaign.company_profile?.targetMarket || '',
      industry: campaign.company_profile?.industry || '',
    };

    // Email writer context for better personalization
    const emailContext = campaign.company_profile ? {
      companyProfile: campaign.company_profile as CompanyProfile,
      selectedPersona: campaign.icp_personas?.find(
        (p: ICPPersona) => p.id === campaign.persona_rankings?.selectedPersonaId
      ),
      selectionReasoning: campaign.persona_rankings?.selectionReasoning,
    } : undefined;

    // 5. Generate emails and insert leads in batches
    const BATCH_SIZE = 10; // Process 10 leads at a time for parallel email generation
    let totalInserted = 0;

    for (let i = 0; i < leads.length; i += BATCH_SIZE) {
      const batch = leads.slice(i, i + BATCH_SIZE);
      
      // Generate emails in parallel for this batch
      const leadsWithEmails = await Promise.all(
        batch.map(async (lead) => {
          try {
            const email = await generateEmailForLead(lead, companyInfo, 'Bella', emailContext);
            return {
              campaign_id: campaignId,
              first_name: lead.first_name,
              last_name: lead.last_name,
              email: null, // Email address not yet enriched
              title: lead.job_title,
              company: lead.company,
              linkedin_url: lead.linkedin_url,
              profile_picture_url: lead.profile_picture || null,
              location: lead.location,
              about: lead.about,
              why_picked: email.whyPicked,
              email_subject: email.emailSubject,
              email_body: email.emailBody,
              status: 'pending',
            };
          } catch (emailError) {
            console.error(`[generate-leads] Error generating email for ${lead.full_name}:`, emailError);
            // Return lead without personalized email - use a fallback
            return {
              campaign_id: campaignId,
              first_name: lead.first_name,
              last_name: lead.last_name,
              email: null,
              title: lead.job_title,
              company: lead.company,
              linkedin_url: lead.linkedin_url,
              profile_picture_url: lead.profile_picture || null,
              location: lead.location,
              about: lead.about,
              why_picked: `${lead.job_title} at ${lead.company}`,
              email_subject: `Quick question for ${lead.first_name}`,
              email_body: `Hi {{first_name}},\n\nI came across {{company}} and thought you might be interested in what we do at ${companyInfo.name}.\n\n${companyInfo.whatTheyDo}\n\nWould you be open to a quick chat?\n\nBest,\nBella`,
              status: 'pending',
            };
          }
        })
      );

      // Insert batch into leads table
      const { error: insertError } = await supabase
        .from('leads')
        .insert(leadsWithEmails);

      if (insertError) {
        console.error(`[generate-leads] Error inserting batch ${i / BATCH_SIZE + 1}:`, insertError);
      } else {
        totalInserted += leadsWithEmails.length;
        console.log(`[generate-leads] Inserted batch ${i / BATCH_SIZE + 1}: ${totalInserted}/${leads.length} leads`);
      }
    }

    // 6. Update campaign status to ready
    const { error: updateError } = await supabase
      .from('campaigns')
      .update({ status: 'ready' })
      .eq('id', campaignId);

    if (updateError) {
      console.error('[generate-leads] Error updating campaign status:', updateError);
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`[generate-leads] Completed: ${totalInserted} leads in ${elapsed}s`);

    return NextResponse.json({
      success: true,
      leadsGenerated: totalInserted,
      durationSeconds: parseFloat(elapsed),
    });
  } catch (error) {
    console.error('[generate-leads] Error:', error);
    return NextResponse.json(
      { error: 'Failed to generate leads' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/generate-leads?campaignId=xxx
 * 
 * Check lead generation progress for a campaign
 */
export async function GET(request: NextRequest) {
  const campaignId = request.nextUrl.searchParams.get('campaignId');

  if (!campaignId) {
    return NextResponse.json(
      { error: 'Campaign ID is required' },
      { status: 400 }
    );
  }

  const supabase = createAdminClient();

  // Get campaign with lead count
  const { data: campaign, error: campaignError } = await supabase
    .from('campaigns')
    .select('id, status, leads_purchased')
    .eq('id', campaignId)
    .single();

  if (campaignError || !campaign) {
    return NextResponse.json(
      { error: 'Campaign not found' },
      { status: 404 }
    );
  }

  // Count leads generated so far
  const { count: leadsGenerated } = await supabase
    .from('leads')
    .select('*', { count: 'exact', head: true })
    .eq('campaign_id', campaignId);

  const progress = campaign.leads_purchased > 0
    ? Math.round((leadsGenerated || 0) / campaign.leads_purchased * 100)
    : 0;

  return NextResponse.json({
    campaignId,
    status: campaign.status,
    leadsPurchased: campaign.leads_purchased,
    leadsGenerated: leadsGenerated || 0,
    progress,
  });
}

