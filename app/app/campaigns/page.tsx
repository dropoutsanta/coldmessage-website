'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { 
  Plus, 
  Search, 
  Filter,
  MoreHorizontal,
  Play,
  Pause,
  CheckCircle2,
  Clock,
  Mail,
  Users,
  TrendingUp,
  ArrowUpRight,
  Loader2
} from 'lucide-react';

interface Campaign {
  id: string;
  slug: string;
  company_name: string;
  status: 'draft' | 'paid' | 'generating' | 'ready' | 'active' | 'paused' | 'completed';
  leads_purchased: number;
  created_at: string;
  updated_at: string;
  // Computed from leads table
  leads_generated?: number;
  leads_sent?: number;
  leads_opened?: number;
  leads_replied?: number;
}

const statusConfig: Record<string, { label: string; icon: typeof Play; bg: string; text: string }> = {
  draft: { 
    label: 'Draft', 
    icon: Clock,
    bg: 'bg-white/5',
    text: 'text-white/40'
  },
  paid: { 
    label: 'Processing', 
    icon: Clock,
    bg: 'bg-amber-500/10',
    text: 'text-amber-400'
  },
  generating: { 
    label: 'Generating', 
    icon: Loader2,
    bg: 'bg-sky-500/10',
    text: 'text-sky-400'
  },
  ready: { 
    label: 'Ready', 
    icon: CheckCircle2,
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-400'
  },
  active: { 
    label: 'Active', 
    icon: Play,
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-400'
  },
  paused: { 
    label: 'Paused', 
    icon: Pause,
    bg: 'bg-amber-500/10',
    text: 'text-amber-400'
  },
  completed: { 
    label: 'Completed', 
    icon: CheckCircle2,
    bg: 'bg-white/10',
    text: 'text-white/50'
  },
};

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'ready' | 'generating' | 'completed'>('all');

  useEffect(() => {
    const fetchCampaigns = async () => {
      const supabase = createClient();
      
      // Get current user's organization
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      // Get organization
      const { data: org } = await supabase
        .from('organizations')
        .select('id')
        .eq('owner_id', user.id)
        .single();

      if (!org) {
        setLoading(false);
        return;
      }

      // Get campaigns for this organization
      const { data: campaignsData, error } = await supabase
        .from('campaigns')
        .select('id, slug, company_name, status, leads_purchased, created_at, updated_at')
        .eq('organization_id', org.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching campaigns:', error);
        setLoading(false);
        return;
      }

      // For each campaign, get lead counts by status
      const campaignsWithStats = await Promise.all(
        (campaignsData || []).map(async (campaign) => {
          // Get total leads
          const { count: totalLeads } = await supabase
            .from('leads')
            .select('*', { count: 'exact', head: true })
            .eq('campaign_id', campaign.id);

          // Get leads by status
          const { count: sentLeads } = await supabase
            .from('leads')
            .select('*', { count: 'exact', head: true })
            .eq('campaign_id', campaign.id)
            .in('status', ['sent', 'opened', 'replied']);

          const { count: openedLeads } = await supabase
            .from('leads')
            .select('*', { count: 'exact', head: true })
            .eq('campaign_id', campaign.id)
            .in('status', ['opened', 'replied']);

          const { count: repliedLeads } = await supabase
            .from('leads')
            .select('*', { count: 'exact', head: true })
            .eq('campaign_id', campaign.id)
            .eq('status', 'replied');

          return {
            ...campaign,
            leads_generated: totalLeads || 0,
            leads_sent: sentLeads || 0,
            leads_opened: openedLeads || 0,
            leads_replied: repliedLeads || 0,
          };
        })
      );

      setCampaigns(campaignsWithStats);
      setLoading(false);
    };

    fetchCampaigns();

    // Poll for updates every 10 seconds if any campaign is generating
    const interval = setInterval(() => {
      if (campaigns.some(c => c.status === 'generating')) {
        fetchCampaigns();
      }
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  const filteredCampaigns = campaigns.filter(c => {
    if (filter === 'all') return true;
    if (filter === 'active') return c.status === 'active' || c.status === 'ready';
    return c.status === filter;
  });

  if (loading) {
    return (
      <div className="min-h-screen p-8 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-cyan-400 animate-spin mx-auto mb-4" />
          <p className="text-white/50">Loading campaigns...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Campaigns</h1>
          <p className="text-white/50">Manage and monitor your outreach campaigns</p>
        </div>
        <Link
          href="/app/campaigns/new"
          className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-cyan-500 to-sky-500 text-white font-semibold rounded-xl hover:opacity-90 transition-all shadow-lg shadow-cyan-500/20"
        >
          <Plus className="w-5 h-5" />
          New Campaign
        </Link>
      </div>

      {/* Filters & Search */}
      <div className="flex items-center gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
          <input
            type="text"
            placeholder="Search campaigns..."
            className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/30 outline-none focus:border-cyan-500/50 transition-colors"
          />
        </div>

        <div className="flex gap-2 bg-white/5 p-1 rounded-xl">
          {(['all', 'active', 'generating', 'completed'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                filter === f
                  ? 'bg-white/10 text-white'
                  : 'text-white/40 hover:text-white/60'
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Empty State */}
      {filteredCampaigns.length === 0 && (
        <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-12 text-center">
          <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
            <Mail className="w-8 h-8 text-white/30" />
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">No campaigns yet</h3>
          <p className="text-white/50 mb-6 max-w-md mx-auto">
            Create your first cold email campaign to start reaching out to potential customers.
          </p>
          <Link
            href="/app/campaigns/new"
            className="inline-flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-cyan-500 to-sky-500 text-white font-semibold rounded-xl hover:opacity-90 transition-all"
          >
            <Plus className="w-5 h-5" />
            Create Campaign
          </Link>
        </div>
      )}

      {/* Campaigns Table */}
      {filteredCampaigns.length > 0 && (
      <div className="bg-white/[0.03] border border-white/10 rounded-2xl overflow-hidden">
        {/* Table Header */}
        <div className="grid grid-cols-[2fr,1fr,1fr,1fr,1fr,1fr,auto] gap-4 px-6 py-4 border-b border-white/10 text-sm font-medium text-white/40">
          <div>Campaign</div>
          <div>Status</div>
          <div>Progress</div>
          <div>Opens</div>
          <div>Replies</div>
          <div>Leads</div>
          <div></div>
        </div>

        {/* Table Body */}
        {filteredCampaigns.map((campaign, i) => {
            const status = statusConfig[campaign.status] || statusConfig.draft;
            const progress = campaign.leads_purchased > 0 
              ? Math.round(((campaign.leads_sent || 0) / campaign.leads_purchased) * 100)
              : 0;
            const openRate = (campaign.leads_sent || 0) > 0 
              ? ((campaign.leads_opened || 0) / (campaign.leads_sent || 1) * 100).toFixed(1)
              : '0';
            const replyRate = (campaign.leads_sent || 0) > 0 
              ? ((campaign.leads_replied || 0) / (campaign.leads_sent || 1) * 100).toFixed(1)
              : '0';

          return (
            <motion.div
              key={campaign.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="grid grid-cols-[2fr,1fr,1fr,1fr,1fr,1fr,auto] gap-4 px-6 py-5 border-b border-white/5 last:border-0 hover:bg-white/[0.02] transition-colors items-center"
            >
              {/* Campaign Name */}
              <div>
                  <Link href={`/app/campaigns/${campaign.slug}`} className="group">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-white group-hover:text-cyan-400 transition-colors">
                        {campaign.company_name}
                    </span>
                    <ArrowUpRight className="w-4 h-4 text-white/0 group-hover:text-cyan-400 transition-colors" />
                  </div>
                    <p className="text-sm text-white/40">
                      {new Date(campaign.created_at).toLocaleDateString()}
                    </p>
                </Link>
              </div>

              {/* Status */}
              <div>
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${status.bg} ${status.text}`}>
                    {campaign.status === 'generating' ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : campaign.status === 'active' ? (
                    <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                    ) : (
                      <status.icon className="w-3 h-3" />
                  )}
                  {status.label}
                </span>
              </div>

              {/* Progress */}
                <div>
                  {campaign.status === 'generating' ? (
                    <div>
                      <div className="flex items-center gap-3">
                        <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-sky-500 to-cyan-500 rounded-full transition-all animate-pulse"
                            style={{ width: `${Math.round((campaign.leads_generated || 0) / (campaign.leads_purchased || 1) * 100)}%` }}
                          />
                        </div>
                        <span className="text-sm text-white/60 w-12">
                          {Math.round((campaign.leads_generated || 0) / (campaign.leads_purchased || 1) * 100)}%
                        </span>
                      </div>
                      <p className="text-xs text-white/30 mt-1">
                        {campaign.leads_generated || 0} / {campaign.leads_purchased} leads
                      </p>
                    </div>
                  ) : (
              <div>
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-cyan-500 to-sky-500 rounded-full transition-all"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <span className="text-sm text-white/60 w-12">
                          {progress}%
                  </span>
                </div>
                <p className="text-xs text-white/30 mt-1">
                        {campaign.leads_sent || 0} / {campaign.leads_generated || 0} sent
                </p>
                    </div>
                  )}
              </div>

              {/* Opens */}
              <div>
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-white/30" />
                    <span className="text-white/70">{campaign.leads_opened || 0}</span>
                </div>
                <p className="text-xs text-white/30 mt-1">{openRate}% rate</p>
              </div>

              {/* Replies */}
              <div>
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-cyan-400" />
                    <span className="text-cyan-400 font-medium">{campaign.leads_replied || 0}</span>
                </div>
                <p className="text-xs text-white/30 mt-1">{replyRate}% rate</p>
              </div>

              {/* Leads */}
              <div>
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-white/30" />
                    <span className="text-white/70">{campaign.leads_generated || 0}</span>
                </div>
              </div>

              {/* Actions */}
              <div>
                <button className="p-2 text-white/40 hover:text-white/60 hover:bg-white/5 rounded-lg transition-colors">
                  <MoreHorizontal className="w-5 h-5" />
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>
      )}
    </div>
  );
}
