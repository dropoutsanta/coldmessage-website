import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { generateCampaign, getCampaignProgress } from '@/lib/services/campaignGenerator';
import { ICPSettings } from '@/lib/types';
import { domainToSlug } from '@/lib/utils/slugify';

interface GenerateRequest {
  domain: string;
  slug?: string; // Optional - will be generated from domain if not provided
  icpSettings?: ICPSettings;
  salesNavigatorUrl?: string;
  debug?: boolean;
}

export async function POST(request: NextRequest) {
  try {
    const body: GenerateRequest = await request.json();
    const { domain, slug: providedSlug, icpSettings, salesNavigatorUrl, debug = false } = body;

    if (!domain) {
      return NextResponse.json(
        { error: 'Domain is required' },
        { status: 400 }
      );
    }

    // Generate slug from domain
    const slug = providedSlug || domainToSlug(domain);

    console.log(`[API] Starting campaign generation for ${domain} (slug: ${slug})${debug ? ' [DEBUG MODE]' : ''}`);

    try {
      // Generate campaign using local services
      const result = await generateCampaign({ domain, slug, icpSettings, salesNavigatorUrl, captureDebug: debug });
      const { campaign: campaignData, debugData } = result;

      // Transform to database format (snake_case for Supabase)
      const campaign = {
        id: campaignData.id,
        slug: campaignData.slug,
        domain: campaignData.domain || domain,
        company_name: campaignData.companyName,
        website_url: campaignData.websiteUrl,
        loom_video_url: '',
        website_screenshot_url: '',
        location: campaignData.location,
        helps_with: campaignData.helpsWith,
        great_at: campaignData.greatAt,
        icp_attributes: campaignData.icpAttributes,
        qualified_leads: campaignData.qualifiedLeads.map((lead) => ({
          id: lead.id,
          name: lead.name,
          title: lead.title,
          company: lead.company,
          linkedin_url: lead.linkedinUrl,
          profile_picture_url: lead.profilePictureUrl,
          why_picked: lead.whyPicked,
          email_subject: lead.emailSubject,
          email_body: lead.emailBody,
        })),
        target_geo: campaignData.targetGeo,
        price_tier_1: campaignData.priceTier1,
        price_tier_1_emails: campaignData.priceTier1Emails,
        price_tier_2: campaignData.priceTier2,
        price_tier_2_emails: campaignData.priceTier2Emails,
        created_at: campaignData.createdAt,
        updated_at: campaignData.updatedAt || new Date().toISOString(),
        sales_navigator_url: campaignData.salesNavigatorUrl || null,
        company_profile: campaignData.companyProfile || null,
        icp_personas: campaignData.icpPersonas || null,
        persona_rankings: campaignData.personaRankings || null,
        linkedin_filters: campaignData.linkedinFilters || null,
        pipeline_debug: campaignData.pipelineDebug || null,
      };

      // Upsert to Supabase (insert or update based on slug)
      if (supabaseAdmin) {
        const { data: existing } = await supabaseAdmin
          .from('campaigns')
          .select('id')
          .eq('slug', slug)
          .single();

        if (existing) {
          const { data, error } = await supabaseAdmin
            .from('campaigns')
            .update(campaign)
            .eq('slug', slug)
            .select()
            .single();

          if (error) {
            console.error('[API] Failed to update campaign:', error);
            return NextResponse.json({ error: 'Failed to update campaign' }, { status: 500 });
          }
          return NextResponse.json({ success: true, campaign: data, slug, debugData });
        } else {
          const { data, error } = await supabaseAdmin
            .from('campaigns')
            .insert(campaign)
            .select()
            .single();

          if (error) {
            console.error('[API] Failed to create campaign:', error);
            return NextResponse.json({ error: 'Failed to create campaign' }, { status: 500 });
          }
          return NextResponse.json({ success: true, campaign: data, slug, debugData });
        }
      }

      // Demo mode - return without saving
      return NextResponse.json({ success: true, campaign, slug, debugData });
    } catch (generationError) {
      console.error('Campaign generation failed:', generationError);
      
      // Fallback to demo mode if generation fails
      const companyName = extractCompanyName(domain);
      const qualifiedLeads = generateMockLeads(companyName, icpSettings);

      const defaultIcp = {
        titles: ['Founders', 'CEOs', 'VPs of Sales'],
        companySize: '10-200 employees',
        industries: ['SaaS', 'Tech', 'Agencies'],
        locations: ['United States']
      };

      const finalIcp = icpSettings || defaultIcp;

      const campaignData = {
        slug,
        domain,
        company_name: companyName,
        website_url: domain.startsWith('http') ? domain : `https://${domain}`,
        loom_video_url: '',
        website_screenshot_url: '',
        location: Array.isArray(finalIcp.locations) && finalIcp.locations.length > 0
          ? (typeof finalIcp.locations[0] === 'object' && 'text' in finalIcp.locations[0]
            ? finalIcp.locations[0].text
            : String(finalIcp.locations[0]))
          : 'United States',
        helps_with: 'grow their business with qualified leads',
        great_at: 'connecting with ideal customers',
        icp_attributes: [
          finalIcp.titles.join(', '),
          finalIcp.companySize,
          Array.isArray(finalIcp.industries)
            ? finalIcp.industries.map(i => typeof i === 'object' && 'text' in i ? i.text : String(i)).join(', ')
            : ''
        ],
        qualified_leads: qualifiedLeads,
        target_geo: {
          region: 'us' as const,
          states: ['CA', 'NY', 'TX', 'WA', 'MA'],
          cities: []
        },
        price_tier_1: 100,
        price_tier_1_emails: 500,
        price_tier_2: 399,
        price_tier_2_emails: 2500,
        updated_at: new Date().toISOString(),
      };

      if (!supabaseAdmin) {
        return NextResponse.json({
          success: true,
          campaign: {
            id: 'demo-generated',
            ...campaignData,
            created_at: new Date().toISOString()
          },
          slug
        });
      }

      const { data: existing } = await supabaseAdmin
        .from('campaigns')
        .select('id')
        .eq('slug', slug)
        .single();

      if (existing) {
        const { data, error } = await supabaseAdmin
          .from('campaigns')
          .update(campaignData)
          .eq('slug', slug)
          .select()
          .single();

        if (error) {
          return NextResponse.json({ error: 'Failed to update campaign' }, { status: 500 });
        }
        return NextResponse.json({ success: true, campaign: data, slug });
      } else {
        const { data, error } = await supabaseAdmin
          .from('campaigns')
          .insert(campaignData)
          .select()
          .single();

        if (error) {
          return NextResponse.json({ error: 'Failed to create campaign' }, { status: 500 });
        }
        return NextResponse.json({ success: true, campaign: data, slug });
      }
    }
  } catch (error) {
    console.error('Error in generate-campaign:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * GET endpoint to check campaign generation progress
 */
export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get('slug');
  
  if (!slug) {
    return NextResponse.json({ error: 'Slug is required' }, { status: 400 });
  }

  const progress = getCampaignProgress(slug);
  
  if (!progress) {
    return NextResponse.json({
      success: false,
      error: 'No campaign generation in progress for this slug',
    }, { status: 404 });
  }

  return NextResponse.json({
    success: true,
    ...progress,
  });
}

function extractCompanyName(domain: string): string {
  let cleanDomain = domain.replace(/^https?:\/\//, '');
  cleanDomain = cleanDomain.replace(/^www\./, '');
  const parts = cleanDomain.split('.');
  const name = parts[0] || 'Company';
  return name.charAt(0).toUpperCase() + name.slice(1);
}

function generateMockLeads(companyName: string, icpSettings?: ICPSettings) {
  const defaultTitles = ['CEO', 'Founder', 'VP of Sales', 'Head of Growth', 'COO'];
  const titles = icpSettings?.titles && icpSettings.titles.length > 0 
    ? icpSettings.titles 
    : defaultTitles;
  const firstNames = ['James', 'Sarah', 'Michael', 'Emily', 'David'];
  const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones'];
  const companies = ['TechFlow', 'ScaleUp Inc', 'GrowthLabs', 'CloudBase', 'DataSync'];
  
  return firstNames.map((firstName, i) => ({
    id: `lead-${i + 1}`,
    name: `${firstName} ${lastNames[i]}`,
    title: titles[i % titles.length],
    company: companies[i],
    linkedin_url: `https://linkedin.com/in/${firstName.toLowerCase()}${lastNames[i].toLowerCase()}`,
    profile_picture_url: '',
    why_picked: `${titles[i % titles.length]} at ${companies[i]}, recently posted about scaling challenges.`,
    email_subject: `Quick question about ${companies[i]}`,
    email_body: `Hi {{first_name}},\n\nI noticed {{company}} has been growing fast lately — congrats on the momentum.\n\nWe help companies like yours get 20+ qualified meetings per month through targeted cold email outreach.\n\nWould it make sense to chat this week?\n\nBest,\nBella`
  }));
}
