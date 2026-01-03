import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { domainToSlug } from '@/lib/utils/slugify';

interface InitRequest {
  domain: string;
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

/**
 * POST /api/campaigns/init
 * Creates a placeholder campaign immediately and starts generation in the background.
 * Returns the slug so frontend can redirect immediately.
 */
export async function POST(request: NextRequest) {
  try {
    const body: InitRequest = await request.json();
    const { domain, debug = false } = body;

    if (!domain) {
      return NextResponse.json(
        { error: 'Domain is required' },
        { status: 400 }
      );
    }

    // Clean the domain
    const cleanDomain = domain.toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];

    // Generate unique slug
    const baseSlug = domainToSlug(cleanDomain);
    const slug = await getNextAvailableSlug(baseSlug);
    const campaignId = crypto.randomUUID();

    console.log(`[API/init] Creating placeholder campaign for ${cleanDomain} (slug: ${slug})`);

    // Create placeholder campaign in Supabase with status 'generating'
    if (supabaseAdmin) {
      const placeholderCampaign = {
        id: campaignId,
        slug,
        domain: cleanDomain,
        company_name: extractCompanyName(cleanDomain),
        website_url: cleanDomain.startsWith('http') ? cleanDomain : `https://${cleanDomain}`,
        loom_video_url: '',
        website_screenshot_url: '',
        location: '',
        helps_with: '',
        great_at: '',
        icp_attributes: [],
        qualified_leads: [],
        target_geo: { region: 'us' as const, states: [], cities: [] },
        price_tier_1: 100,
        price_tier_1_emails: 500,
        price_tier_2: 399,
        price_tier_2_emails: 2500,
        status: 'generating',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabaseAdmin
        .from('campaigns')
        .insert(placeholderCampaign);

      if (error) {
        console.error('[API/init] Failed to create placeholder campaign:', error);
        return NextResponse.json({ error: 'Failed to create campaign' }, { status: 500 });
      }
    }

    // NOTE: Background generation removed - CampaignPage will trigger SSE streaming
    // The campaign will be updated via the /api/generate-campaign/stream endpoint

    // Return immediately with the slug
    return NextResponse.json({
      success: true,
      slug,
      campaignId,
      domain: cleanDomain,
    });
  } catch (error) {
    console.error('[API/init] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function extractCompanyName(domain: string): string {
  let cleanDomain = domain.replace(/^https?:\/\//, '');
  cleanDomain = cleanDomain.replace(/^www\./, '');
  const parts = cleanDomain.split('.');
  const name = parts[0] || 'Company';
  return name.charAt(0).toUpperCase() + name.slice(1);
}

