import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { emailBisonClient } from '@/lib/services/emailbison';

export async function POST(request: NextRequest) {
  try {
    const { campaignId } = await request.json();

    if (!campaignId) {
      return NextResponse.json(
        { error: 'campaignId is required' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // 1. Fetch campaign and leads from Supabase
    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .select('*')
      .eq('id', campaignId)
      .single();

    if (campaignError || !campaign) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      );
    }

    // Check if already launched
    if (campaign.emailbison_campaign_id) {
      return NextResponse.json(
        { error: 'Campaign already launched to EmailBison' },
        { status: 400 }
      );
    }

    // Fetch all leads for this campaign
    const { data: leads, error: leadsError } = await supabase
      .from('leads')
      .select('*')
      .eq('campaign_id', campaignId)
      .order('created_at', { ascending: true });

    if (leadsError) {
      return NextResponse.json(
        { error: 'Failed to fetch leads' },
        { status: 500 }
      );
    }

    if (!leads || leads.length === 0) {
      return NextResponse.json(
        { error: 'No leads found for this campaign' },
        { status: 400 }
      );
    }

    // 2. Create campaign in EmailBison
    const campaignName = `ColdMessage - ${campaign.company_name} - ${campaign.slug}`;
    const emailBisonCampaign = await emailBisonClient.createCampaign(campaignName);

    // 3. Store emailbison_campaign_id in Supabase
    await supabase
      .from('campaigns')
      .update({
        emailbison_campaign_id: emailBisonCampaign.campaign_id,
        emailbison_status: 'draft',
      })
      .eq('id', campaignId);

    // 4. Add sequence steps using template variables
    // Each lead's personalized email is stored in custom_fields (email_subject, email_body)
    await emailBisonClient.addSequenceSteps(
      emailBisonCampaign.campaign_id,
      {
        title: 'Initial Outreach',
        sequence_steps: [
          {
            email_subject: '{{custom.email_subject}}',
            email_body: '{{custom.email_body}}',
            wait_in_days: 0, // Send immediately
          },
        ],
      }
    );

    // 5. Upload leads to EmailBison
    // Filter out leads without emails (they need to be enriched first)
    const leadsWithEmails = leads.filter(lead => lead.email);
    
    if (leadsWithEmails.length === 0) {
      return NextResponse.json(
        { error: 'No leads with email addresses found. Please wait for email enrichment.' },
        { status: 400 }
      );
    }

    // Transform leads to EmailBison format
    const emailBisonLeads = leadsWithEmails.map((lead) => ({
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

    // Upload in batches if needed (EmailBison might have limits)
    const batchSize = 100;
    const leadIdMap: Record<string, string> = {}; // Maps EmailBison lead ID to our lead ID

    for (let i = 0; i < emailBisonLeads.length; i += batchSize) {
      const batch = emailBisonLeads.slice(i, i + batchSize);
      const uploadResponse = await emailBisonClient.uploadLeads(
        emailBisonCampaign.campaign_id,
        batch
      );

      // Map EmailBison lead IDs back to our leads
      // This assumes EmailBison returns lead_ids in the same order
      if (uploadResponse.lead_ids) {
        batch.forEach((_, index) => {
          const ourLead = leadsWithEmails[i + index];
          const emailBisonLeadId = uploadResponse.lead_ids[index];
          if (ourLead && emailBisonLeadId) {
            leadIdMap[emailBisonLeadId] = ourLead.id;
          }
        });
      }
    }

    // 6. Update leads with emailbison_lead_id
    // Note: This assumes EmailBison returns lead_ids in order
    // You may need to match by email if the order isn't guaranteed
    for (const [emailBisonLeadId, ourLeadId] of Object.entries(leadIdMap)) {
      await supabase
        .from('leads')
        .update({ emailbison_lead_id: emailBisonLeadId })
        .eq('id', ourLeadId);
    }

    // Alternative: Match by email if lead_ids aren't in order
    // This is a fallback approach - try to match leads by email
    const { data: updatedLeads } = await supabase
      .from('leads')
      .select('id, email, emailbison_lead_id')
      .eq('campaign_id', campaignId);

    // If some leads don't have emailbison_lead_id, try to match by email
    // (This would require fetching leads from EmailBison API, which we'll skip for now)

    // 7. Resume campaign to start sending
    await emailBisonClient.resumeCampaign(emailBisonCampaign.campaign_id);

    // 8. Update campaign status
    await supabase
      .from('campaigns')
      .update({
        status: 'active',
        emailbison_status: 'active',
      })
      .eq('id', campaignId);

    return NextResponse.json({
      success: true,
      emailbison_campaign_id: emailBisonCampaign.campaign_id,
      leads_uploaded: leadsWithEmails.length,
      total_leads: leads.length,
    });
  } catch (error) {
    console.error('Error launching campaign to EmailBison:', error);
    return NextResponse.json(
      {
        error: 'Failed to launch campaign',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

