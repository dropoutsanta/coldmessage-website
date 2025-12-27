'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import { 
  Mail, 
  Users, 
  TrendingUp, 
  ArrowUpRight, 
  Megaphone,
  Clock,
  CheckCircle2,
  MessageSquare,
  Loader2,
  Plus
} from 'lucide-react';

interface DashboardStats {
  totalLeads: number;
  emailsSent: number;
  emailsOpened: number;
  replies: number;
}

interface RecentCampaign {
  id: string;
  slug: string;
  company_name: string;
  status: string;
  leads_generated: number;
  leads_sent: number;
  leads_replied: number;
  created_at: string;
}

interface RecentReply {
  id: string;
  first_name: string;
  last_name: string;
  company: string;
  campaign_name: string;
  replied_at: string;
}

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    totalLeads: 0,
    emailsSent: 0,
    emailsOpened: 0,
    replies: 0,
  });
  const [recentCampaigns, setRecentCampaigns] = useState<RecentCampaign[]>([]);
  const [recentReplies, setRecentReplies] = useState<RecentReply[]>([]);

  useEffect(() => {
    const fetchDashboardData = async () => {
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

      // Get campaigns for this org
      const { data: campaigns } = await supabase
        .from('campaigns')
        .select('id, slug, company_name, status, created_at')
        .eq('organization_id', org.id)
        .order('created_at', { ascending: false })
        .limit(5);

      if (!campaigns || campaigns.length === 0) {
        setLoading(false);
        return;
      }

      const campaignIds = campaigns.map(c => c.id);
      const campaignNames = Object.fromEntries(campaigns.map(c => [c.id, c.company_name]));

      // Get aggregate stats for all leads
      const { count: totalLeads } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .in('campaign_id', campaignIds);

      const { count: emailsSent } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .in('campaign_id', campaignIds)
        .in('status', ['sent', 'opened', 'replied']);

      const { count: emailsOpened } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .in('campaign_id', campaignIds)
        .in('status', ['opened', 'replied']);

      const { count: replies } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .in('campaign_id', campaignIds)
        .eq('status', 'replied');

      setStats({
        totalLeads: totalLeads || 0,
        emailsSent: emailsSent || 0,
        emailsOpened: emailsOpened || 0,
        replies: replies || 0,
      });

      // Get campaign stats
      const campaignsWithStats = await Promise.all(
        campaigns.map(async (campaign) => {
          const { count: generated } = await supabase
            .from('leads')
            .select('*', { count: 'exact', head: true })
            .eq('campaign_id', campaign.id);

          const { count: sent } = await supabase
            .from('leads')
            .select('*', { count: 'exact', head: true })
            .eq('campaign_id', campaign.id)
            .in('status', ['sent', 'opened', 'replied']);

          const { count: replied } = await supabase
            .from('leads')
            .select('*', { count: 'exact', head: true })
            .eq('campaign_id', campaign.id)
            .eq('status', 'replied');

          return {
            ...campaign,
            leads_generated: generated || 0,
            leads_sent: sent || 0,
            leads_replied: replied || 0,
          };
        })
      );

      setRecentCampaigns(campaignsWithStats);

      // Get recent replies
      const { data: repliesData } = await supabase
        .from('leads')
        .select('id, first_name, last_name, company, campaign_id, replied_at')
        .in('campaign_id', campaignIds)
        .eq('status', 'replied')
        .order('replied_at', { ascending: false })
        .limit(5);

      if (repliesData) {
        setRecentReplies(
          repliesData.map(r => ({
            ...r,
            campaign_name: campaignNames[r.campaign_id] || 'Unknown',
          }))
        );
      }

      setLoading(false);
    };

    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen p-8 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-cyan-400 animate-spin mx-auto mb-4" />
          <p className="text-white/50">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const statCards = [
    { 
      name: 'Total Leads', 
      value: stats.totalLeads.toLocaleString(), 
      icon: Users,
    color: 'cyan'
  },
  { 
      name: 'Emails Sent', 
      value: stats.emailsSent.toLocaleString(), 
      icon: Mail,
      color: 'purple'
    },
    { 
      name: 'Opened', 
      value: stats.emailsOpened.toLocaleString(), 
    icon: TrendingUp,
      color: 'amber'
  },
  { 
    name: 'Replies', 
      value: stats.replies.toLocaleString(), 
    icon: MessageSquare,
      color: 'emerald'
    },
  ];

  // Empty state
  if (recentCampaigns.length === 0) {
    return (
      <div className="min-h-screen p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Dashboard</h1>
          <p className="text-white/50">Welcome! Let&apos;s get started with your first campaign.</p>
        </div>

        <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-12 text-center max-w-2xl mx-auto mt-16">
          <div className="w-20 h-20 bg-gradient-to-br from-cyan-500/20 to-sky-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <Megaphone className="w-10 h-10 text-cyan-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-3">Launch your first campaign</h2>
          <p className="text-white/50 mb-8 max-w-md mx-auto">
            Create a personalized cold email campaign and start reaching out to your ideal customers today.
          </p>
          <Link
            href="/app/campaigns/new"
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-cyan-500 to-sky-500 text-white font-semibold rounded-xl hover:opacity-90 transition-all shadow-lg shadow-cyan-500/20"
          >
            <Plus className="w-5 h-5" />
            Create Campaign
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Dashboard</h1>
        <p className="text-white/50">Welcome back! Here&apos;s what&apos;s happening with your campaigns.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((stat, i) => (
          <motion.div
            key={stat.name}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white/[0.03] border border-white/10 rounded-2xl p-6 hover:bg-white/[0.05] transition-colors"
          >
            <div className="flex items-start justify-between mb-4">
              <div className={`p-3 rounded-xl bg-${stat.color}-500/10`}>
                <stat.icon className={`w-5 h-5 text-${stat.color}-400`} />
              </div>
            </div>
            <p className="text-3xl font-bold text-white mb-1">{stat.value}</p>
            <p className="text-sm text-white/40">{stat.name}</p>
          </motion.div>
        ))}
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Campaigns */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white/[0.03] border border-white/10 rounded-2xl overflow-hidden"
        >
          <div className="p-6 border-b border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Megaphone className="w-5 h-5 text-cyan-400" />
              <h2 className="text-lg font-semibold text-white">Recent Campaigns</h2>
            </div>
            <Link href="/app/campaigns" className="text-sm text-cyan-400 hover:text-cyan-300 transition-colors">
              View all
            </Link>
          </div>
          <div className="divide-y divide-white/5">
            {recentCampaigns.map((campaign) => (
              <Link 
                key={campaign.id} 
                href={`/app/campaigns/${campaign.slug}`}
                className="block p-4 hover:bg-white/[0.02] transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <span className="font-medium text-white">{campaign.company_name}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      campaign.status === 'active' 
                        ? 'bg-emerald-500/10 text-emerald-400' 
                        : campaign.status === 'ready'
                        ? 'bg-cyan-500/10 text-cyan-400'
                        : campaign.status === 'generating'
                        ? 'bg-sky-500/10 text-sky-400'
                        : 'bg-white/10 text-white/50'
                    }`}>
                      {campaign.status === 'active' ? (
                        <span className="flex items-center gap-1">
                          <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                          Active
                        </span>
                      ) : campaign.status === 'ready' ? (
                        <span className="flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          Ready
                        </span>
                      ) : campaign.status === 'generating' ? (
                        <span className="flex items-center gap-1">
                          <Loader2 className="w-3 h-3 animate-spin" />
                          Generating
                        </span>
                      ) : (
                        campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1)
                      )}
                    </span>
                  </div>
                  <span className="text-xs text-white/30 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(campaign.created_at).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex items-center gap-6 text-sm text-white/40">
                  <span>{campaign.leads_generated} leads</span>
                  <span>{campaign.leads_sent} sent</span>
                  <span className="text-cyan-400">{campaign.leads_replied} replies</span>
                </div>
              </Link>
            ))}
          </div>
        </motion.div>

        {/* Recent Replies */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-white/[0.03] border border-white/10 rounded-2xl overflow-hidden"
        >
          <div className="p-6 border-b border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <MessageSquare className="w-5 h-5 text-violet-400" />
              <h2 className="text-lg font-semibold text-white">Recent Replies</h2>
              {recentReplies.length > 0 && (
              <span className="px-2 py-0.5 bg-cyan-500/20 text-cyan-400 text-xs font-bold rounded-full">
                  {recentReplies.length} new
              </span>
              )}
            </div>
            <Link href="/app/leads?filter=replied" className="text-sm text-cyan-400 hover:text-cyan-300 transition-colors">
              View all
            </Link>
          </div>
          
          {recentReplies.length === 0 ? (
            <div className="p-8 text-center">
              <MessageSquare className="w-10 h-10 text-white/20 mx-auto mb-3" />
              <p className="text-white/40">No replies yet</p>
              <p className="text-white/30 text-sm mt-1">Replies will appear here when leads respond</p>
            </div>
          ) : (
          <div className="divide-y divide-white/5">
            {recentReplies.map((reply) => (
              <div key={reply.id} className="p-4 hover:bg-white/[0.02] transition-colors cursor-pointer">
                <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-green-500 flex items-center justify-center text-white font-bold text-sm shrink-0">
                      {reply.first_name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                          <span className="font-medium text-white">{reply.first_name} {reply.last_name}</span>
                          <span className="w-2 h-2 bg-emerald-400 rounded-full" />
                        </div>
                        <span className="text-xs text-white/30">
                          {reply.replied_at ? new Date(reply.replied_at).toLocaleDateString() : 'Recently'}
                        </span>
                      </div>
                      <p className="text-sm text-white/40">{reply.company}</p>
                      <p className="text-sm text-white/50 mt-1">{reply.campaign_name}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
