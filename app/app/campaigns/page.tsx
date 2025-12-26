'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
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
  ArrowUpRight
} from 'lucide-react';

interface Campaign {
  id: string;
  name: string;
  status: 'active' | 'paused' | 'completed' | 'draft';
  sent: number;
  total: number;
  opens: number;
  replies: number;
  leads: number;
  createdAt: string;
  lastActivity: string;
}

const campaigns: Campaign[] = [
  {
    id: '1',
    name: 'Q4 SaaS Outreach',
    status: 'active',
    sent: 2500,
    total: 5000,
    opens: 1680,
    replies: 45,
    leads: 156,
    createdAt: '2024-12-20',
    lastActivity: '2 hours ago'
  },
  {
    id: '2',
    name: 'Agency Partnership',
    status: 'active',
    sent: 1200,
    total: 2500,
    opens: 890,
    replies: 23,
    leads: 89,
    createdAt: '2024-12-18',
    lastActivity: '5 hours ago'
  },
  {
    id: '3',
    name: 'Series A Founders',
    status: 'completed',
    sent: 5000,
    total: 5000,
    opens: 3200,
    replies: 89,
    leads: 234,
    createdAt: '2024-12-10',
    lastActivity: '3 days ago'
  },
  {
    id: '4',
    name: 'E-commerce Decision Makers',
    status: 'paused',
    sent: 800,
    total: 3000,
    opens: 520,
    replies: 12,
    leads: 45,
    createdAt: '2024-12-15',
    lastActivity: '1 week ago'
  },
  {
    id: '5',
    name: 'FinTech Executives',
    status: 'draft',
    sent: 0,
    total: 2000,
    opens: 0,
    replies: 0,
    leads: 120,
    createdAt: '2024-12-22',
    lastActivity: 'Not started'
  },
];

const statusConfig = {
  active: { 
    label: 'Active', 
    color: 'emerald',
    icon: Play,
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-400'
  },
  paused: { 
    label: 'Paused', 
    color: 'amber',
    icon: Pause,
    bg: 'bg-amber-500/10',
    text: 'text-amber-400'
  },
  completed: { 
    label: 'Completed', 
    color: 'white',
    icon: CheckCircle2,
    bg: 'bg-white/10',
    text: 'text-white/50'
  },
  draft: { 
    label: 'Draft', 
    color: 'white',
    icon: Clock,
    bg: 'bg-white/5',
    text: 'text-white/40'
  },
};

export default function CampaignsPage() {
  const [filter, setFilter] = useState<'all' | 'active' | 'paused' | 'completed' | 'draft'>('all');

  const filteredCampaigns = campaigns.filter(c => 
    filter === 'all' || c.status === filter
  );

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
          {(['all', 'active', 'paused', 'completed', 'draft'] as const).map((f) => (
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

        <button className="flex items-center gap-2 px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white/60 hover:text-white transition-colors">
          <Filter className="w-4 h-4" />
          Filters
        </button>
      </div>

      {/* Campaigns Table */}
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
          const status = statusConfig[campaign.status];
          const progress = campaign.total > 0 ? (campaign.sent / campaign.total) * 100 : 0;
          const openRate = campaign.sent > 0 ? ((campaign.opens / campaign.sent) * 100).toFixed(1) : '0';
          const replyRate = campaign.sent > 0 ? ((campaign.replies / campaign.sent) * 100).toFixed(1) : '0';

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
                <Link href={`/app/campaigns/${campaign.id}`} className="group">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-white group-hover:text-cyan-400 transition-colors">
                      {campaign.name}
                    </span>
                    <ArrowUpRight className="w-4 h-4 text-white/0 group-hover:text-cyan-400 transition-colors" />
                  </div>
                  <p className="text-sm text-white/40">{campaign.lastActivity}</p>
                </Link>
              </div>

              {/* Status */}
              <div>
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${status.bg} ${status.text}`}>
                  {campaign.status === 'active' && (
                    <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                  )}
                  {campaign.status !== 'active' && <status.icon className="w-3 h-3" />}
                  {status.label}
                </span>
              </div>

              {/* Progress */}
              <div>
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-cyan-500 to-sky-500 rounded-full transition-all"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <span className="text-sm text-white/60 w-12">
                    {progress.toFixed(0)}%
                  </span>
                </div>
                <p className="text-xs text-white/30 mt-1">
                  {campaign.sent.toLocaleString()} / {campaign.total.toLocaleString()}
                </p>
              </div>

              {/* Opens */}
              <div>
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-white/30" />
                  <span className="text-white/70">{campaign.opens.toLocaleString()}</span>
                </div>
                <p className="text-xs text-white/30 mt-1">{openRate}% rate</p>
              </div>

              {/* Replies */}
              <div>
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-cyan-400" />
                  <span className="text-cyan-400 font-medium">{campaign.replies}</span>
                </div>
                <p className="text-xs text-white/30 mt-1">{replyRate}% rate</p>
              </div>

              {/* Leads */}
              <div>
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-white/30" />
                  <span className="text-white/70">{campaign.qualifiedLeads?.length || 0}</span>
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
    </div>
  );
}

