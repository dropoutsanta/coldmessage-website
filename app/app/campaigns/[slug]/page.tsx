'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { CampaignData } from '@/lib/types';
import {
  ArrowLeft,
  Play,
  Pause,
  Users,
  Mail,
  CheckCircle,
  Clock,
  TrendingUp,
  ExternalLink,
} from 'lucide-react';

export default function CampaignDetailPage() {
  const params = useParams();
  const slug = params.slug as string;
  const [campaign, setCampaign] = useState<CampaignData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCampaign = async () => {
      const supabase = createClient();
      
      const { data, error } = await supabase
        .from('campaigns')
        .select('*')
        .eq('slug', slug)
        .single();

      if (error) {
        console.error('Error fetching campaign:', error);
        setError('Campaign not found');
        setLoading(false);
        return;
      }

      setCampaign(data);
      setLoading(false);
    };

    fetchCampaign();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-white/20 border-t-cyan-400 rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !campaign) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-2">Campaign not found</h2>
          <p className="text-white/60 mb-6">The campaign you're looking for doesn't exist.</p>
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

  const stats = [
    {
      label: 'Total Leads',
      value: campaign.leads?.length || 0,
      icon: Users,
      color: 'text-cyan-400',
      bgColor: 'bg-cyan-400/10',
    },
    {
      label: 'Emails Sent',
      value: 0,
      icon: Mail,
      color: 'text-purple-400',
      bgColor: 'bg-purple-400/10',
    },
    {
      label: 'Replies',
      value: 0,
      icon: CheckCircle,
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-400/10',
    },
    {
      label: 'Reply Rate',
      value: '0%',
      icon: TrendingUp,
      color: 'text-amber-400',
      bgColor: 'bg-amber-400/10',
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
              {campaign.companyName} Campaign
            </h1>
            <p className="text-white/60">
              Created {new Date(campaign.createdAt || Date.now()).toLocaleDateString()}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span
              className={`px-3 py-1 rounded-full text-sm font-medium ${
                campaign.status === 'paid'
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : campaign.status === 'active'
                  ? 'bg-cyan-500/20 text-cyan-400'
                  : 'bg-white/10 text-white/60'
              }`}
            >
              {campaign.status === 'paid' ? 'Ready to Launch' : campaign.status || 'Draft'}
            </span>

            {campaign.status === 'paid' && (
              <button className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-500 to-sky-500 text-white font-semibold rounded-lg hover:opacity-90 transition-all shadow-lg shadow-cyan-500/20">
                <Play className="w-4 h-4" />
                Start Sending
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat) => (
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

      {/* Campaign Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* ICP Summary */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Target Profile</h3>
            {campaign.icpAnalysis && (
              <div className="space-y-4">
                <div>
                  <p className="text-white/50 text-sm mb-1">Primary ICP</p>
                  <p className="text-white">
                    {campaign.icpAnalysis.primaryIcp?.titles?.join(', ') || 'Not specified'}
                  </p>
                </div>
                <div>
                  <p className="text-white/50 text-sm mb-1">Company Size</p>
                  <p className="text-white">
                    {campaign.icpAnalysis.primaryIcp?.companySize || 'Any'}
                  </p>
                </div>
                <div>
                  <p className="text-white/50 text-sm mb-1">Industries</p>
                  <p className="text-white">
                    {campaign.icpAnalysis.primaryIcp?.industries?.join(', ') || 'Any'}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Leads Preview */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Leads</h3>
              <Link
                href={`/campaign/${slug}`}
                target="_blank"
                className="flex items-center gap-1 text-cyan-400 hover:text-cyan-300 text-sm"
              >
                View Full Preview
                <ExternalLink className="w-3 h-3" />
              </Link>
            </div>

            {campaign.leads && campaign.leads.length > 0 ? (
              <div className="space-y-3">
                {campaign.leads.slice(0, 5).map((lead, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-4 p-3 bg-white/5 rounded-lg"
                  >
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-400 to-sky-500 flex items-center justify-center text-white font-bold text-sm">
                      {lead.name?.charAt(0) || '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium truncate">{lead.name}</p>
                      <p className="text-white/50 text-sm truncate">
                        {lead.title} at {lead.company}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {lead.email ? (
                        <span className="px-2 py-1 bg-emerald-500/20 text-emerald-400 text-xs rounded-full">
                          Email verified
                        </span>
                      ) : (
                        <span className="px-2 py-1 bg-amber-500/20 text-amber-400 text-xs rounded-full">
                          Pending
                        </span>
                      )}
                    </div>
                  </div>
                ))}
                {campaign.leads.length > 5 && (
                  <p className="text-white/40 text-sm text-center pt-2">
                    +{campaign.leads.length - 5} more leads
                  </p>
                )}
              </div>
            ) : (
              <p className="text-white/50 text-center py-8">
                No leads found for this campaign.
              </p>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Campaign Info */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Campaign Info</h3>
            <div className="space-y-4">
              <div>
                <p className="text-white/50 text-sm mb-1">Company</p>
                <p className="text-white">{campaign.companyName}</p>
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
              {campaign.priceTier1 && (
                <div>
                  <p className="text-white/50 text-sm mb-1">Package</p>
                  <p className="text-white">
                    ${campaign.priceTier1} - {campaign.priceTier1Emails} emails
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Activity */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Recent Activity</h3>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                </div>
                <div>
                  <p className="text-white text-sm">Campaign created</p>
                  <p className="text-white/40 text-xs">
                    {new Date(campaign.createdAt || Date.now()).toLocaleString()}
                  </p>
                </div>
              </div>
              {campaign.status === 'paid' && (
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center flex-shrink-0">
                    <Clock className="w-4 h-4 text-cyan-400" />
                  </div>
                  <div>
                    <p className="text-white text-sm">Payment completed</p>
                    <p className="text-white/40 text-xs">Ready to launch</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

