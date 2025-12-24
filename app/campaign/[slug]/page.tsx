import { supabase, isDemoMode, transformSupabaseCampaign, SupabaseCampaignRow } from '@/lib/supabase';
import { CampaignData } from '@/lib/types';
import CampaignPage from './CampaignPage';

interface Props {
  params: Promise<{ slug: string }>;
}

// Demo data for testing without Supabase
const demoData: CampaignData = {
  id: 'demo-1',
  slug: 'demo',
  companyName: 'Acme Corp',
  websiteUrl: 'https://acme.com',
  location: 'San Francisco',
  helpsWith: 'startups scale their sales teams',
  greatAt: 'hiring SDRs quickly',
  icpAttributes: [
    'Series A-B Startups',
    'SaaS Companies', 
    'VPs of Sales',
    'Founders who hate hiring'
  ],
  qualifiedLeads: [
    {
      id: '1',
      name: 'Joe Martinez',
      firstName: 'Joe',
      lastName: 'Martinez',
      title: 'CEO',
      company: 'Digital Carwash',
      linkedinUrl: 'https://linkedin.com/in/joemartinez',
      profilePictureUrl: '',
      location: '',
      about: '',
      whyPicked: 'Runs 12 carwash locations, recently posted about scaling challenges',
      emailSubject: 'Quick question about scaling',
      emailBody: 'Hi {{first_name}},\n\nI noticed {{company}} has been expanding rapidly — congrats on the 12 locations.\n\nWe help multi-location businesses like yours get 20+ new B2B clients per month through cold email.\n\nWould it make sense to chat this week?\n\nBest,\nBella'
    },
    {
      id: '2',
      name: 'Sarah Chen',
      firstName: 'Sarah',
      lastName: 'Chen',
      title: 'Founder',
      company: 'TechStart Inc',
      linkedinUrl: 'https://linkedin.com/in/sarahchen',
      profilePictureUrl: '',
      location: '',
      about: '',
      whyPicked: 'Series A startup, hiring 3 sales reps, likely needs pipeline',
      emailSubject: 'Saw you are hiring SDRs',
      emailBody: 'Hi {{first_name}},\n\nNoticed {{company}} is hiring SDRs — scaling the sales team?\n\nWe help startups fill their pipeline with qualified leads so your new reps have meetings from day one.\n\nWorth a quick call?\n\nBest,\nBella'
    },
    {
      id: '3',
      name: 'Mike Thompson',
      firstName: 'Mike',
      lastName: 'Thompson',
      title: 'Owner',
      company: 'SalesPro Agency',
      linkedinUrl: 'https://linkedin.com/in/mikethompson',
      profilePictureUrl: '',
      location: '',
      about: '',
      whyPicked: 'Agency owner, relies on referrals, perfect ICP for outbound',
      emailSubject: 'Fellow agency owner here',
      emailBody: 'Hi {{first_name}},\n\nI run a small agency too — know how unpredictable referrals can be.\n\nWe helped 3 agencies like {{company}} add $50K/mo in new revenue through cold email.\n\nOpen to seeing how?\n\nBest,\nBella'
    },
    {
      id: '4',
      name: 'Lisa Park',
      firstName: 'Lisa',
      lastName: 'Park',
      title: 'VP Sales',
      company: 'CloudSync',
      linkedinUrl: 'https://linkedin.com/in/lisapark',
      profilePictureUrl: '',
      location: '',
      about: '',
      whyPicked: 'VP Sales at growing SaaS, posted about needing more pipeline',
      emailSubject: 'Pipeline question',
      emailBody: 'Hi {{first_name}},\n\nSaw your post about pipeline challenges at {{company}}.\n\nWe generate 50+ qualified meetings/month for SaaS companies through targeted cold email.\n\nWant to see some examples?\n\nBest,\nBella'
    },
    {
      id: '5',
      name: 'David Kim',
      firstName: 'David',
      lastName: 'Kim',
      title: 'CEO',
      company: 'GrowthLabs',
      linkedinUrl: 'https://linkedin.com/in/davidkim',
      profilePictureUrl: '',
      location: '',
      about: '',
      whyPicked: 'Marketing agency, likely has clients who need lead gen',
      emailSubject: 'Partnership idea',
      emailBody: 'Hi {{first_name}},\n\nI help companies with cold email outreach — wondering if {{company}} ever gets clients asking for lead gen help?\n\nCould be a good partnership.\n\nWorth a quick chat?\n\nBest,\nBella'
    }
  ],
  targetGeo: {
    region: 'us',
    states: ['CA', 'NY', 'TX', 'WA', 'MA'],
    cities: ['San Francisco', 'New York', 'Austin', 'Seattle', 'Boston']
  },
  priceTier1: 100,
  priceTier1Emails: 500,
  priceTier2: 399,
  priceTier2Emails: 2500,
  createdAt: new Date().toISOString()
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
      return { ...demoData, slug, companyName: slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) };
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

  // Transform from Supabase format (snake_case) to CampaignData (camelCase)
  return transformSupabaseCampaign(data as SupabaseCampaignRow);
}

export default async function Page({ params }: Props) {
  const { slug } = await params;
  const campaign = await getCampaignData(slug);

  // Pass campaign (can be null) and slug to CampaignPage
  // CampaignPage will handle showing domain entry if campaign is null
  return <CampaignPage campaign={campaign} slug={slug} />;
}
