'use client';

import { motion } from 'framer-motion';
import { 
  Mail, 
  Users, 
  TrendingUp, 
  ArrowUpRight, 
  ArrowDownRight,
  Megaphone,
  Clock,
  CheckCircle2,
  MessageSquare
} from 'lucide-react';
import Link from 'next/link';

const stats = [
  { 
    name: 'Emails Sent', 
    value: '12,456', 
    change: '+12.5%', 
    up: true,
    icon: Mail,
    color: 'cyan'
  },
  { 
    name: 'Open Rate', 
    value: '68.2%', 
    change: '+4.3%', 
    up: true,
    icon: TrendingUp,
    color: 'emerald'
  },
  { 
    name: 'Replies', 
    value: '234', 
    change: '+18.2%', 
    up: true,
    icon: MessageSquare,
    color: 'violet'
  },
  { 
    name: 'Leads Generated', 
    value: '1,892', 
    change: '-2.4%', 
    up: false,
    icon: Users,
    color: 'amber'
  },
];

const recentCampaigns = [
  { 
    id: 1, 
    name: 'Q4 SaaS Outreach', 
    status: 'active', 
    sent: 2500, 
    opens: 1680, 
    replies: 45,
    date: '2 days ago'
  },
  { 
    id: 2, 
    name: 'Agency Partnership', 
    status: 'active', 
    sent: 1200, 
    opens: 890, 
    replies: 23,
    date: '5 days ago'
  },
  { 
    id: 3, 
    name: 'Series A Founders', 
    status: 'completed', 
    sent: 5000, 
    opens: 3200, 
    replies: 89,
    date: '1 week ago'
  },
];

const recentReplies = [
  {
    id: 1,
    name: 'Sarah Chen',
    company: 'TechStart Inc',
    preview: "Hi! This sounds interesting. Can we schedule a call for...",
    time: '2h ago',
    unread: true
  },
  {
    id: 2,
    name: 'Mike Thompson',
    company: 'SalesPro Agency',
    preview: "Thanks for reaching out. We're actually looking for exactly...",
    time: '4h ago',
    unread: true
  },
  {
    id: 3,
    name: 'Lisa Park',
    company: 'CloudSync',
    preview: "Interesting timing! We just started looking at cold email...",
    time: '1d ago',
    unread: false
  },
];

export default function DashboardPage() {
  return (
    <div className="min-h-screen p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Dashboard</h1>
        <p className="text-white/50">Welcome back! Here's what's happening with your campaigns.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat, i) => (
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
              <div className={`flex items-center gap-1 text-sm font-medium ${stat.up ? 'text-emerald-400' : 'text-red-400'}`}>
                {stat.up ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                {stat.change}
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
              <div key={campaign.id} className="p-4 hover:bg-white/[0.02] transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <span className="font-medium text-white">{campaign.name}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      campaign.status === 'active' 
                        ? 'bg-emerald-500/10 text-emerald-400' 
                        : 'bg-white/10 text-white/50'
                    }`}>
                      {campaign.status === 'active' ? (
                        <span className="flex items-center gap-1">
                          <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                          Active
                        </span>
                      ) : (
                        <span className="flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          Completed
                        </span>
                      )}
                    </span>
                  </div>
                  <span className="text-xs text-white/30 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {campaign.date}
                  </span>
                </div>
                <div className="flex items-center gap-6 text-sm text-white/40">
                  <span>{campaign.sent.toLocaleString()} sent</span>
                  <span>{campaign.opens.toLocaleString()} opens</span>
                  <span className="text-cyan-400">{campaign.replies} replies</span>
                </div>
              </div>
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
              <span className="px-2 py-0.5 bg-cyan-500/20 text-cyan-400 text-xs font-bold rounded-full">
                3 new
              </span>
            </div>
            <Link href="/app/inbox" className="text-sm text-cyan-400 hover:text-cyan-300 transition-colors">
              View inbox
            </Link>
          </div>
          <div className="divide-y divide-white/5">
            {recentReplies.map((reply) => (
              <div key={reply.id} className="p-4 hover:bg-white/[0.02] transition-colors cursor-pointer">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-400 to-sky-500 flex items-center justify-center text-white font-bold text-sm shrink-0">
                    {reply.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-white">{reply.name}</span>
                        {reply.unread && (
                          <span className="w-2 h-2 bg-cyan-400 rounded-full" />
                        )}
                      </div>
                      <span className="text-xs text-white/30">{reply.time}</span>
                    </div>
                    <p className="text-sm text-white/40 mb-1">{reply.company}</p>
                    <p className="text-sm text-white/60 truncate">{reply.preview}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}

