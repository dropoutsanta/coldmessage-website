'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import {
  ArrowLeft,
  Users,
  Mail,
  CheckCircle,
  Clock,
  TrendingUp,
  ExternalLink,
  Loader2,
  Send,
  Eye,
  MessageSquare,
  XCircle,
} from 'lucide-react';

interface Campaign {
  id: string;
  slug: string;
  company_name: string;
  domain: string;
  status: string;
  leads_purchased: number;
  created_at: string;
  paid_at: string | null;
  icp_attributes: string[] | null;
  company_profile: Record<string, unknown> | null;
}

interface Lead {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  title: string;
  company: string;
  linkedin_url: string | null;
  profile_picture_url: string | null;
  location: string | null;
  why_picked: string | null;
  email_subject: string | null;
  email_body: string | null;
  status: 'pending' | 'sent' | 'opened' | 'replied' | 'bounced';
  created_at: string;
}

const statusConfig = {
  pending: { label: 'Pending', icon: Clock, color: 'text-white/40', bg: 'bg-white/5' },
  sent: { label: 'Sent', icon: Send, color: 'text-sky-400', bg: 'bg-sky-500/10' },
  opened: { label: 'Opened', icon: Eye, color: 'text-amber-400', bg: 'bg-amber-500/10' },
  replied: { label: 'Replied', icon: MessageSquare, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  bounced: { label: 'Bounced', icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/10' },
};

export default function CampaignDetailPage() {
  const params = useParams();
  const slug = params.slug as string;
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [stats, setStats] = useState({
    total: 0,
    sent: 0,
    opened: 0,
    replied: 0,
  });

  useEffect(() => {
    const fetchCampaign = async () => {
      const supabase = createClient();
      
      // Fetch campaign
      const { data: campaignData, error: campaignError } = await supabase
        .from('campaigns')
        .select('*')
        .eq('slug', slug)
        .single();

      if (campaignError || !campaignData) {
        console.error('Error fetching campaign:', campaignError);
        setError('Campaign not found');
        setLoading(false);
        return;
      }

      setCampaign(campaignData);

      // Fetch leads for this campaign
      const { data: leadsData, error: leadsError } = await supabase
        .from('leads')
        .select('*')
        .eq('campaign_id', campaignData.id)
        .order('created_at', { ascending: false });

      if (leadsError) {
        console.error('Error fetching leads:', leadsError);
      } else {
        setLeads(leadsData || []);
        
        // Calculate stats
        const total = leadsData?.length || 0;
        const sent = leadsData?.filter(l => ['sent', 'opened', 'replied'].includes(l.status)).length || 0;
        const opened = leadsData?.filter(l => ['opened', 'replied'].includes(l.status)).length || 0;
        const replied = leadsData?.filter(l => l.status === 'replied').length || 0;
        
        setStats({ total, sent, opened, replied });
        
        // Select first lead by default
        if (leadsData && leadsData.length > 0) {
          setSelectedLead(leadsData[0]);
        }
      }

      setLoading(false);
    };

    fetchCampaign();

    // Poll for updates if campaign is generating
    const interval = setInterval(() => {
      if (campaign?.status === 'generating') {
        fetchCampaign();
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [slug, campaign?.status]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-cyan-400 animate-spin mx-auto mb-4" />
          <p className="text-white/60">Loading campaign...</p>
        </div>
      </div>
    );
  }

  if (error || !campaign) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-2">Campaign not found</h2>
          <p className="text-white/60 mb-6">The campaign you&apos;re looking for doesn&apos;t exist.</p>
          <Link
            href="/app/campaigns"
            className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Campaigns
          </Link>
        </div>
      </div>
    );
  }

  const statCards = [
    {
      label: 'Total Leads',
      value: stats.total,
      icon: Users,
      color: 'text-cyan-400',
      bgColor: 'bg-cyan-400/10',
    },
    {
      label: 'Emails Sent',
      value: stats.sent,
      icon: Mail,
      color: 'text-purple-400',
      bgColor: 'bg-purple-400/10',
    },
    {
      label: 'Opened',
      value: stats.opened,
      icon: Eye,
      color: 'text-amber-400',
      bgColor: 'bg-amber-400/10',
    },
    {
      label: 'Replies',
      value: stats.replied,
      icon: TrendingUp,
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-400/10',
    },
  ];

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/app/campaigns"
          className="inline-flex items-center gap-2 text-white/50 hover:text-white/80 transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Campaigns
        </Link>

        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">
              {campaign.company_name} Campaign
            </h1>
            <p className="text-white/60">
              Created {new Date(campaign.created_at).toLocaleDateString()}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span
              className={`px-3 py-1 rounded-full text-sm font-medium ${
                campaign.status === 'ready'
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : campaign.status === 'generating'
                  ? 'bg-sky-500/20 text-sky-400'
                  : campaign.status === 'active'
                  ? 'bg-cyan-500/20 text-cyan-400'
                  : 'bg-white/10 text-white/60'
              }`}
            >
              {campaign.status === 'generating' && (
                <Loader2 className="w-3 h-3 inline mr-1 animate-spin" />
              )}
              {campaign.status === 'generating' ? 'Generating Leads...' :
               campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1)}
            </span>

          </div>
        </div>
      </div>

      {/* Generating Progress */}
      {campaign.status === 'generating' && (
        <div className="bg-sky-500/10 border border-sky-500/20 rounded-xl p-6 mb-8">
          <div className="flex items-center gap-4">
            <Loader2 className="w-8 h-8 text-sky-400 animate-spin" />
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-white mb-1">Generating your leads...</h3>
              <p className="text-white/60 text-sm mb-3">
                We&apos;re finding and personalizing emails for {campaign.leads_purchased} leads. This may take a few minutes.
              </p>
              <div className="flex items-center gap-3">
                <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-sky-500 to-cyan-500 rounded-full transition-all"
                    style={{ width: `${Math.round((stats.total / campaign.leads_purchased) * 100)}%` }}
                  />
                </div>
                <span className="text-sm text-white/60 w-20">
                  {stats.total} / {campaign.leads_purchased}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map((stat) => (
          <div
            key={stat.label}
            className="bg-white/5 border border-white/10 rounded-xl p-6"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </div>
              <span className="text-white/60 text-sm">{stat.label}</span>
            </div>
            <p className="text-3xl font-bold text-white">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Two Column Layout: Leads List + Email Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Leads List */}
        <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-white/10 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white">Leads</h3>
            <span className="text-sm text-white/40">{leads.length} total</span>
          </div>

          {leads.length === 0 ? (
            <div className="p-8 text-center">
              {campaign.status === 'generating' ? (
                <>
                  <Loader2 className="w-8 h-8 text-cyan-400 animate-spin mx-auto mb-3" />
                  <p className="text-white/50">Generating leads...</p>
                </>
              ) : (
                <p className="text-white/50">No leads found for this campaign.</p>
              )}
            </div>
          ) : (
            <div className="max-h-[600px] overflow-y-auto divide-y divide-white/5">
              {leads.map((lead) => {
                const status = statusConfig[lead.status];
                return (
                  <div
                    key={lead.id}
                    onClick={() => setSelectedLead(lead)}
                    className={`p-4 cursor-pointer transition-colors ${
                      selectedLead?.id === lead.id
                        ? 'bg-white/10 border-l-2 border-l-cyan-500'
                        : 'hover:bg-white/5 border-l-2 border-l-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {lead.profile_picture_url ? (
                        <img
                          src={lead.profile_picture_url}
                          alt={`${lead.first_name} ${lead.last_name}`}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-400 to-sky-500 flex items-center justify-center text-white font-bold text-sm">
                          {lead.first_name.charAt(0)}
                    </div>
                      )}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-white font-medium truncate">
                            {lead.first_name} {lead.last_name}
                          </p>
                          {lead.linkedin_url && (
                            <a
                              href={lead.linkedin_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="text-white/30 hover:text-cyan-400"
                            >
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                      <p className="text-white/50 text-sm truncate">
                        {lead.title} at {lead.company}
                      </p>
                    </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${status.bg} ${status.color}`}>
                        {status.label}
                        </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Email Preview */}
        <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-white/10">
            <h3 className="text-lg font-semibold text-white">Email Preview</h3>
          </div>

          {selectedLead ? (
            <div className="p-6">
              {/* Email Header */}
              <div className="mb-6 space-y-3">
                <div className="flex items-center gap-3 text-sm">
                  <span className="text-white/40 w-12">To:</span>
                  <span className="text-white">
                    {selectedLead.first_name} {selectedLead.last_name}
                    {selectedLead.email && (
                      <span className="text-white/40 ml-2">&lt;{selectedLead.email}&gt;</span>
                    )}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <span className="text-white/40 w-12">Subject:</span>
                  <span className="text-white font-medium">{selectedLead.email_subject || 'No subject'}</span>
                </div>
              </div>

              {/* Email Body */}
              <div className="bg-white/5 rounded-lg p-4">
                <pre className="text-white/80 text-sm whitespace-pre-wrap font-sans leading-relaxed">
                  {(selectedLead.email_body || 'No email content')
                    .replace(/\{\{first_name\}\}/g, selectedLead.first_name)
                    .replace(/\{\{company\}\}/g, selectedLead.company)}
                </pre>
              </div>

              {/* Why Picked */}
              {selectedLead.why_picked && (
                <div className="mt-6 p-4 bg-cyan-500/10 border border-cyan-500/20 rounded-lg">
                  <p className="text-xs text-cyan-400 font-semibold uppercase tracking-wider mb-1">
                    Why this lead
                  </p>
                  <p className="text-white/70 text-sm">{selectedLead.why_picked}</p>
                </div>
                )}
              </div>
            ) : (
            <div className="p-8 text-center">
              <p className="text-white/50">Select a lead to preview their email</p>
            </div>
            )}
          </div>
        </div>

      {/* Campaign Info Sidebar */}
      <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white/5 border border-white/10 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Campaign Info</h3>
            <div className="space-y-4">
              <div>
                <p className="text-white/50 text-sm mb-1">Company</p>
              <p className="text-white">{campaign.company_name}</p>
              </div>
              <div>
                <p className="text-white/50 text-sm mb-1">Domain</p>
                <a
                  href={`https://${campaign.domain}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-cyan-400 hover:text-cyan-300"
                >
                  {campaign.domain}
                </a>
              </div>
                <div>
              <p className="text-white/50 text-sm mb-1">Leads Purchased</p>
              <p className="text-white">{campaign.leads_purchased}</p>
            </div>
          </div>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Target Profile</h3>
          <div className="space-y-3">
            {campaign.icp_attributes?.map((attr, i) => (
              <div key={i} className="px-3 py-2 bg-white/5 rounded-lg text-sm text-white/70">
                {attr}
              </div>
            ))}
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Activity</h3>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                </div>
                <div>
                  <p className="text-white text-sm">Campaign created</p>
                  <p className="text-white/40 text-xs">
                  {new Date(campaign.created_at).toLocaleString()}
                </p>
              </div>
            </div>
            {campaign.paid_at && (
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center flex-shrink-0">
                  <CheckCircle className="w-4 h-4 text-cyan-400" />
                </div>
                <div>
                  <p className="text-white text-sm">Payment completed</p>
                  <p className="text-white/40 text-xs">
                    {new Date(campaign.paid_at).toLocaleString()}
                  </p>
                </div>
              </div>
            )}
            {campaign.status === 'ready' && (
                <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div>
                  <p className="text-white text-sm">Leads generated</p>
                    <p className="text-white/40 text-xs">Campaign active</p>
                  </div>
                </div>
              )}
          </div>
        </div>
      </div>
    </div>
  );
}
