import { supabase, isDemoMode, CampaignData } from '@/lib/supabase';
import CampaignPage from './CampaignPage';

interface Props {
  params: Promise<{ slug: string }>;
}

// Demo data for testing without Supabase
const demoData: CampaignData = {
  id: 'demo-1',
  slug: 'demo',
  company_name: 'Acme Corp',
  loom_video_url: '',
  website_url: 'https://acme.com',
  website_screenshot_url: '',
  location: 'San Francisco',
  helps_with: 'startups scale their sales teams',
  great_at: 'hiring SDRs quickly',
  icp_attributes: [
    'Series A-B Startups',
    'SaaS Companies', 
    'VPs of Sales',
    'Founders who hate hiring'
  ],
  qualified_leads: [
    {
      id: '1',
      name: 'Joe Martinez',
      title: 'CEO',
      company: 'Digital Carwash',
      linkedin_url: 'https://linkedin.com/in/joemartinez',
      profile_picture_url: '',
      why_picked: 'Runs 12 carwash locations, recently posted about scaling challenges',
      email_subject: 'Quick question about scaling',
      email_body: 'Hi {{first_name}},\n\nI noticed {{company}} has been expanding rapidly — congrats on the 12 locations.\n\nWe help multi-location businesses like yours get 20+ new B2B clients per month through cold email.\n\nWould it make sense to chat this week?\n\nBest,\nBella'
    },
    {
      id: '2',
      name: 'Sarah Chen',
      title: 'Founder',
      company: 'TechStart Inc',
      linkedin_url: 'https://linkedin.com/in/sarahchen',
      profile_picture_url: '',
      why_picked: 'Series A startup, hiring 3 sales reps, likely needs pipeline',
      email_subject: 'Saw you are hiring SDRs',
      email_body: 'Hi {{first_name}},\n\nNoticed {{company}} is hiring SDRs — scaling the sales team?\n\nWe help startups fill their pipeline with qualified leads so your new reps have meetings from day one.\n\nWorth a quick call?\n\nBest,\nBella'
    },
    {
      id: '3',
      name: 'Mike Thompson',
      title: 'Owner',
      company: 'SalesPro Agency',
      linkedin_url: 'https://linkedin.com/in/mikethompson',
      profile_picture_url: '',
      why_picked: 'Agency owner, relies on referrals, perfect ICP for outbound',
      email_subject: 'Fellow agency owner here',
      email_body: 'Hi {{first_name}},\n\nI run a small agency too — know how unpredictable referrals can be.\n\nWe helped 3 agencies like {{company}} add $50K/mo in new revenue through cold email.\n\nOpen to seeing how?\n\nBest,\nBella'
    },
    {
      id: '4',
      name: 'Lisa Park',
      title: 'VP Sales',
      company: 'CloudSync',
      linkedin_url: 'https://linkedin.com/in/lisapark',
      profile_picture_url: '',
      why_picked: 'VP Sales at growing SaaS, posted about needing more pipeline',
      email_subject: 'Pipeline question',
      email_body: 'Hi {{first_name}},\n\nSaw your post about pipeline challenges at {{company}}.\n\nWe generate 50+ qualified meetings/month for SaaS companies through targeted cold email.\n\nWant to see some examples?\n\nBest,\nBella'
    },
    {
      id: '5',
      name: 'David Kim',
      title: 'CEO',
      company: 'GrowthLabs',
      linkedin_url: 'https://linkedin.com/in/davidkim',
      profile_picture_url: '',
      why_picked: 'Marketing agency, likely has clients who need lead gen',
      email_subject: 'Partnership idea',
      email_body: 'Hi {{first_name}},\n\nI help companies with cold email outreach — wondering if {{company}} ever gets clients asking for lead gen help?\n\nCould be a good partnership.\n\nWorth a quick chat?\n\nBest,\nBella'
    }
  ],
  target_geo: {
    region: 'us',
    states: ['CA', 'NY', 'TX', 'WA', 'MA'],
    cities: ['San Francisco', 'New York', 'Austin', 'Seattle', 'Boston']
  },
  price_tier_1: 100,
  price_tier_1_emails: 500,
  price_tier_2: 399,
  price_tier_2_emails: 2500,
  created_at: new Date().toISOString()
};

async function getCampaignData(slug: string): Promise<CampaignData | null> {
  // Special slug "new" always shows domain entry form
  if (slug === 'new') {
    return null;
  }

  // Demo mode - return demo data for known demo slugs, null otherwise
  if (isDemoMode) {
    // Only return demo data for specific demo slugs
    if (slug === 'demo' || slug === 'test') {
      return { ...demoData, slug, company_name: slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) };
    }
    // For other slugs in demo mode, return null to trigger domain entry
    return null;
  }

  if (!supabase) return null;

  const { data, error } = await supabase
    .from('campaigns')
    .select('*')
    .eq('slug', slug)
    .single();

  if (error || !data) {
    // Campaign not found - return null to show domain entry form
    return null;
  }

  return data as CampaignData;
}

export default async function Page({ params }: Props) {
  const { slug } = await params;
  const campaign = await getCampaignData(slug);

  // Pass campaign (can be null) and slug to CampaignPage
  // CampaignPage will handle showing domain entry if campaign is null
  return <CampaignPage campaign={campaign} slug={slug} />;
}
