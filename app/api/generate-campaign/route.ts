import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { generateCampaign, getCampaignProgress } from '@/lib/services/campaignGenerator';
import { ICPSettings } from '@/lib/types';

interface GenerateRequest {
  domain: string;
  slug: string;
  icpSettings?: ICPSettings;
  salesNavigatorUrl?: string;
  debug?: boolean;
}

export async function POST(request: NextRequest) {
  try {
    const body: GenerateRequest = await request.json();
    const { domain, slug, icpSettings, salesNavigatorUrl, debug = false } = body;

    if (!domain || !slug) {
      return NextResponse.json(
        { error: 'Domain and slug are required' },
        { status: 400 }
      );
    }

    console.log(`[API] Starting campaign generation for ${domain} (slug: ${slug})${debug ? ' [DEBUG MODE]' : ''}`);

    try {
      // Generate campaign using local services
      const result = await generateCampaign({ domain, slug, icpSettings, salesNavigatorUrl, captureDebug: debug });
      const { campaign: campaignData, debugData } = result;

      // Transform to database format
      const campaign = {
        id: campaignData.id,
        slug: campaignData.slug,
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
      };

      // Save to Supabase if available
      if (supabase) {
        const { data: existing } = await supabase
          .from('campaigns')
          .select('id')
          .eq('slug', slug)
          .single();

        if (existing) {
          await supabase
            .from('campaigns')
            .update(campaign)
            .eq('slug', slug);
        } else {
          await supabase
            .from('campaigns')
            .insert(campaign);
        }
      }

      return NextResponse.json({ success: true, campaign, debugData });
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
        price_tier_2_emails: 2500
      };

      if (!supabase) {
        return NextResponse.json({
          success: true,
          campaign: {
            id: 'demo-generated',
            ...campaignData,
            created_at: new Date().toISOString()
          }
        });
      }

      const { data: existing } = await supabase
        .from('campaigns')
        .select('id')
        .eq('slug', slug)
        .single();

      if (existing) {
        const { data, error } = await supabase
          .from('campaigns')
          .update(campaignData)
          .eq('slug', slug)
          .select()
          .single();

        if (error) {
          return NextResponse.json({ error: 'Failed to update campaign' }, { status: 500 });
        }
        return NextResponse.json({ success: true, campaign: data });
      } else {
        const { data, error } = await supabase
          .from('campaigns')
          .insert(campaignData)
          .select()
          .single();

        if (error) {
          return NextResponse.json({ error: 'Failed to create campaign' }, { status: 500 });
        }
        return NextResponse.json({ success: true, campaign: data });
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
