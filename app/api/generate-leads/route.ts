import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { findLeads, findLeadsWithEmails } from '@/lib/services/leadFinder';
import { shouldUseArk } from '@/lib/services/arkLeadFinder';
import { generateEmailForLead } from '@/lib/services/emailWriter';
import { CompanyProfile } from '@/lib/services/agents/companyProfiler';
import { ICPPersona } from '@/lib/services/agents/icpBrainstormer';
import { emailBisonClient } from '@/lib/services/emailbison';

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
    // If using AI Ark, use findLeadsWithEmails to get enriched emails via Icypeas
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
      email?: string;  // Enriched via Icypeas
    }> = [];

    try {
      const useArk = shouldUseArk();
      
      if (useArk) {
        // Use AI Ark + Icypeas enrichment
        console.log(`[generate-leads] Using AI Ark with email enrichment (target: ${leadsCount})`);
        const result = await findLeadsWithEmails(icpSettings, leadsCount);
        leads = result.leads || [];
        console.log(`[generate-leads] Found ${leads.length} leads with emails`);
      } else {
        // Use Apify (no email enrichment)
        const result = await findLeads(icpSettings, campaign.sales_navigator_url, leadsCount);
        leads = result.leads || [];
        console.log(`[generate-leads] Found ${leads.length} leads (no email enrichment)`);
      }
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
            const emailContent = await generateEmailForLead(lead, companyInfo, 'Bella', emailContext);
            return {
              campaign_id: campaignId,
              first_name: lead.first_name,
              last_name: lead.last_name,
              email: lead.email || null, // Use enriched email from Icypeas
              title: lead.job_title,
              company: lead.company,
              linkedin_url: lead.linkedin_url,
              profile_picture_url: lead.profile_picture || null,
              location: lead.location,
              about: lead.about,
              why_picked: emailContent.whyPicked,
              email_subject: emailContent.emailSubject,
              email_body: emailContent.emailBody,
              status: 'pending',
            };
          } catch (emailError) {
            console.error(`[generate-leads] Error generating email for ${lead.full_name}:`, emailError);
            // Return lead without personalized email - use a fallback
            return {
              campaign_id: campaignId,
              first_name: lead.first_name,
              last_name: lead.last_name,
              email: lead.email || null, // Use enriched email from Icypeas
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

    // 6. Create EmailBison campaign and upload leads
    let emailbisonCampaignId: string | null = null;
    const leadsWithEmailAddresses = leads.filter(l => l.email);
    
    if (leadsWithEmailAddresses.length > 0) {
      try {
        console.log(`[generate-leads] Creating EmailBison campaign for ${leadsWithEmailAddresses.length} leads with emails...`);
        
        // Create campaign in EmailBison
        const campaignName = `ColdMessage - ${campaign.company_name} - ${campaign.slug}`;
        const ebCampaign = await emailBisonClient.createCampaign(campaignName);
        emailbisonCampaignId = ebCampaign.campaign_id;
        
        console.log(`[generate-leads] EmailBison campaign created: ${emailbisonCampaignId}`);
        
        // Update campaign with EmailBison ID
        await supabase
          .from('campaigns')
          .update({
            emailbison_campaign_id: emailbisonCampaignId,
            emailbison_status: 'draft',
          })
          .eq('id', campaignId);
        
        // Add sequence step (use first lead's email template)
        const firstLead = leads[0];
        if (firstLead) {
          // Generate email for first lead to get template
          const emailContent = await generateEmailForLead(firstLead, companyInfo, 'Bella', emailContext);
          
          await emailBisonClient.addSequenceSteps(emailbisonCampaignId, {
            title: 'Initial Outreach',
            sequence_steps: [
              {
                email_subject: emailContent.emailSubject,
                email_body: emailContent.emailBody,
                wait_in_days: 0,
              },
            ],
          });
          console.log(`[generate-leads] Added sequence step to EmailBison campaign`);
        }
        
        // Fetch inserted leads with their IDs to map back
        const { data: insertedLeads } = await supabase
          .from('leads')
          .select('id, email, first_name, last_name, company, title, linkedin_url, why_picked, email_subject, email_body')
          .eq('campaign_id', campaignId)
          .not('email', 'is', null);
        
        if (insertedLeads && insertedLeads.length > 0) {
          // Upload leads to EmailBison
          const ebLeads = insertedLeads.map(lead => ({
            email: lead.email!,
            first_name: lead.first_name,
            last_name: lead.last_name,
            company: lead.company,
            title: lead.title,
            custom_fields: {
              email_subject: lead.email_subject || '',
              email_body: lead.email_body || '',
              linkedin_url: lead.linkedin_url || '',
              why_picked: lead.why_picked || '',
            },
          }));
          
          const uploadResponse = await emailBisonClient.uploadLeads(emailbisonCampaignId, ebLeads);
          console.log(`[generate-leads] Uploaded ${uploadResponse.uploaded || ebLeads.length} leads to EmailBison`);
          
          // Map EmailBison lead IDs back to our leads
          if (uploadResponse.lead_ids) {
            for (let i = 0; i < uploadResponse.lead_ids.length && i < insertedLeads.length; i++) {
              await supabase
                .from('leads')
                .update({ emailbison_lead_id: uploadResponse.lead_ids[i] })
                .eq('id', insertedLeads[i].id);
            }
          }
        }
        
        // Note: NOT resuming campaign - sender accounts need to be assigned first
        console.log(`[generate-leads] EmailBison campaign ready (pending sender assignment)`);
        
      } catch (ebError) {
        console.error('[generate-leads] Error creating EmailBison campaign:', ebError);
        // Don't fail the whole request - leads are already created
      }
    } else {
      console.log(`[generate-leads] No leads with email addresses - skipping EmailBison`);
    }

    // 7. Update campaign status to ready
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
      leadsWithEmails: leadsWithEmailAddresses.length,
      emailbisonCampaignId,
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

