import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { generateCampaign, getCampaignProgress } from '@/lib/services/campaignGenerator';
import { ICPSettings } from '@/lib/types';
import { domainToSlug } from '@/lib/utils/slugify';

interface GenerateRequest {
  domain: string;
  icpSettings?: ICPSettings;
  salesNavigatorUrl?: string;
  debug?: boolean;
}

/**
 * Find the next available slug for a domain.
 * If 'dynamicmockups' exists, returns 'dynamicmockups-2', then 'dynamicmockups-3', etc.
 */
async function getNextAvailableSlug(baseSlug: string): Promise<string> {
  if (!supabaseAdmin) {
    return baseSlug; // Demo mode - just use base slug
  }

  // Check if base slug exists
  const { data: baseExists } = await supabaseAdmin
    .from('campaigns')
    .select('slug')
    .eq('slug', baseSlug)
    .single();

  if (!baseExists) {
    return baseSlug; // Base slug is available
  }

  // Find all existing slugs that match the pattern: baseSlug or baseSlug-N
  const { data: existingSlugs } = await supabaseAdmin
    .from('campaigns')
    .select('slug')
    .or(`slug.eq.${baseSlug},slug.like.${baseSlug}-%`);

  if (!existingSlugs || existingSlugs.length === 0) {
    return baseSlug;
  }

  // Extract the highest number suffix
  let maxNumber = 1; // Base slug counts as "1"
  for (const row of existingSlugs) {
    if (row.slug === baseSlug) {
      continue; // Base slug, already counted as 1
    }
    const match = row.slug.match(new RegExp(`^${baseSlug}-(\\d+)$`));
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > maxNumber) {
        maxNumber = num;
      }
    }
  }

  return `${baseSlug}-${maxNumber + 1}`;
}

export async function POST(request: NextRequest) {
  try {
    const body: GenerateRequest = await request.json();
    const { domain, icpSettings, salesNavigatorUrl, debug = false } = body;

    if (!domain) {
      return NextResponse.json(
        { error: 'Domain is required' },
        { status: 400 }
      );
    }

    // Always generate unique incremental slug (dynamicmockups, dynamicmockups-2, etc.)
    // Progress is tracked by domain, so frontend can poll without knowing the final slug
    const baseSlug = domainToSlug(domain);
    const slug = await getNextAvailableSlug(baseSlug);

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
        qualified_leads: (campaignData.qualifiedLeads || []).map((lead) => ({
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

      // Insert new campaign to Supabase (slug is guaranteed unique)
      if (supabaseAdmin) {
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

      // Get next available slug for fallback too
      const fallbackSlug = await getNextAvailableSlug(slug);
      const fallbackCampaign = { ...campaignData, slug: fallbackSlug };

      const { data, error } = await supabaseAdmin
        .from('campaigns')
        .insert(fallbackCampaign)
        .select()
        .single();

      if (error) {
        return NextResponse.json({ error: 'Failed to create campaign' }, { status: 500 });
      }
      return NextResponse.json({ success: true, campaign: data, slug: fallbackSlug });
    }
  } catch (error) {
    console.error('Error in generate-campaign:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * GET endpoint to check campaign generation progress
 * Uses domain (not slug) because the unique slug is generated server-side
 */
export async function GET(request: NextRequest) {
  const domain = request.nextUrl.searchParams.get('domain');
  
  if (!domain) {
    return NextResponse.json({ error: 'Domain is required' }, { status: 400 });
  }

  const progress = getCampaignProgress(domain);
  
  if (!progress) {
    return NextResponse.json({
      success: false,
      error: 'No campaign generation in progress for this domain',
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
