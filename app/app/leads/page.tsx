'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';
import { 
  Search, 
  Filter,
  Download,
  MoreHorizontal,
  ExternalLink,
  Mail,
  Building2,
  MapPin,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  Send
} from 'lucide-react';

interface Lead {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  title: string;
  company: string;
  location: string | null;
  linkedin_url: string | null;
  status: 'pending' | 'sent' | 'opened' | 'replied' | 'bounced';
  campaign_id: string;
  campaign_name?: string;
  created_at: string;
}

const statusConfig = {
  pending: { 
    label: 'Pending', 
    icon: Clock,
    bg: 'bg-white/5',
    text: 'text-white/40'
  },
  sent: { 
    label: 'Sent', 
    icon: Send,
    bg: 'bg-sky-500/10',
    text: 'text-sky-400'
  },
  opened: { 
    label: 'Opened', 
    icon: Mail,
    bg: 'bg-amber-500/10',
    text: 'text-amber-400'
  },
  replied: { 
    label: 'Replied', 
    icon: CheckCircle2,
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-400'
  },
  bounced: { 
    label: 'Bounced', 
    icon: XCircle,
    bg: 'bg-red-500/10',
    text: 'text-red-400'
  },
};

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'sent' | 'opened' | 'replied' | 'bounced'>('all');
  const [selectedLeads, setSelectedLeads] = useState<string[]>([]);
  const [statusCounts, setStatusCounts] = useState({
    pending: 0,
    sent: 0,
    opened: 0,
    replied: 0,
    bounced: 0,
  });

  useEffect(() => {
    const fetchLeads = async () => {
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
        .select('id, company_name')
        .eq('organization_id', org.id);

      if (!campaigns || campaigns.length === 0) {
        setLoading(false);
        return;
      }

      const campaignIds = campaigns.map(c => c.id);
      const campaignNames = Object.fromEntries(campaigns.map(c => [c.id, c.company_name]));

      // Get leads for these campaigns
      const { data: leadsData, error } = await supabase
        .from('leads')
        .select('*')
        .in('campaign_id', campaignIds)
        .order('created_at', { ascending: false })
        .limit(100); // Paginate for performance

      if (error) {
        console.error('Error fetching leads:', error);
        setLoading(false);
        return;
      }

      // Add campaign names to leads
      const leadsWithCampaigns = (leadsData || []).map(lead => ({
        ...lead,
        campaign_name: campaignNames[lead.campaign_id] || 'Unknown',
      }));

      setLeads(leadsWithCampaigns);

      // Calculate status counts
      const counts = {
        pending: 0,
        sent: 0,
        opened: 0,
        replied: 0,
        bounced: 0,
      };
      leadsWithCampaigns.forEach(lead => {
        if (lead.status in counts) {
          counts[lead.status as keyof typeof counts]++;
        }
      });
      setStatusCounts(counts);

      setLoading(false);
    };

    fetchLeads();
  }, []);

  const filteredLeads = leads.filter(l => 
    filter === 'all' || l.status === filter
  );

  const toggleSelectAll = () => {
    if (selectedLeads.length === filteredLeads.length) {
      setSelectedLeads([]);
    } else {
      setSelectedLeads(filteredLeads.map(l => l.id));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedLeads(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen p-8 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-cyan-400 animate-spin mx-auto mb-4" />
          <p className="text-white/50">Loading leads...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Leads</h1>
          <p className="text-white/50">
            {leads.length.toLocaleString()} total leads across all campaigns
          </p>
        </div>
        <button className="flex items-center gap-2 px-5 py-3 bg-white/5 border border-white/10 text-white font-medium rounded-xl hover:bg-white/10 transition-colors">
          <Download className="w-5 h-5" />
          Export CSV
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-5 gap-4 mb-8">
        {Object.entries(statusConfig).map(([key, config]) => {
          const count = statusCounts[key as keyof typeof statusCounts] || 0;
          return (
            <div 
              key={key}
              className={`bg-white/[0.03] border border-white/10 rounded-xl p-4 cursor-pointer hover:bg-white/[0.05] transition-colors ${filter === key ? 'ring-2 ring-cyan-500/50' : ''}`}
              onClick={() => setFilter(key as typeof filter)}
            >
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${config.bg}`}>
                  <config.icon className={`w-4 h-4 ${config.text}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{count}</p>
                  <p className="text-sm text-white/40">{config.label}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Filters & Search */}
      <div className="flex items-center gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
          <input
            type="text"
            placeholder="Search leads by name, email, or company..."
            className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/30 outline-none focus:border-cyan-500/50 transition-colors"
          />
        </div>

        <div className="flex gap-2 bg-white/5 p-1 rounded-xl">
          {(['all', 'pending', 'sent', 'opened', 'replied', 'bounced'] as const).map((f) => (
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

      {/* Selected Actions */}
      {selectedLeads.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 p-3 bg-cyan-500/10 border border-cyan-500/20 rounded-xl flex items-center justify-between"
        >
          <span className="text-sm text-cyan-400">
            {selectedLeads.length} lead{selectedLeads.length > 1 ? 's' : ''} selected
          </span>
          <div className="flex items-center gap-2">
            <button className="px-3 py-1.5 text-sm text-white/70 hover:text-white transition-colors">
              Export
            </button>
            <button 
              onClick={() => setSelectedLeads([])}
              className="px-3 py-1.5 text-sm text-white/40 hover:text-white/60 transition-colors"
            >
              Clear
            </button>
          </div>
        </motion.div>
      )}

      {/* Empty State */}
      {filteredLeads.length === 0 && (
        <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-12 text-center">
          <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
            <Mail className="w-8 h-8 text-white/30" />
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">No leads yet</h3>
          <p className="text-white/50 max-w-md mx-auto">
            Leads will appear here once you purchase a campaign and we generate personalized outreach for you.
          </p>
        </div>
      )}

      {/* Leads Table */}
      {filteredLeads.length > 0 && (
      <div className="bg-white/[0.03] border border-white/10 rounded-2xl overflow-hidden">
        {/* Table Header */}
        <div className="grid grid-cols-[auto,2fr,1.5fr,1fr,1fr,1fr,auto] gap-4 px-6 py-4 border-b border-white/10 text-sm font-medium text-white/40">
          <div>
            <input
              type="checkbox"
              checked={selectedLeads.length === filteredLeads.length && filteredLeads.length > 0}
              onChange={toggleSelectAll}
              className="w-4 h-4 rounded border-white/20 bg-white/5 text-cyan-500 focus:ring-0 focus:ring-offset-0"
            />
          </div>
          <div>Contact</div>
          <div>Company</div>
          <div>Status</div>
          <div>Campaign</div>
          <div>Added</div>
          <div></div>
        </div>

        {/* Table Body */}
        {filteredLeads.map((lead, i) => {
          const status = statusConfig[lead.status];

          return (
            <motion.div
              key={lead.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.02 }}
              className="grid grid-cols-[auto,2fr,1.5fr,1fr,1fr,1fr,auto] gap-4 px-6 py-4 border-b border-white/5 last:border-0 hover:bg-white/[0.02] transition-colors items-center"
            >
              {/* Checkbox */}
              <div>
                <input
                  type="checkbox"
                  checked={selectedLeads.includes(lead.id)}
                  onChange={() => toggleSelect(lead.id)}
                  className="w-4 h-4 rounded border-white/20 bg-white/5 text-cyan-500 focus:ring-0 focus:ring-offset-0"
                />
              </div>

              {/* Contact */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-400 to-sky-500 flex items-center justify-center text-white font-bold text-sm shrink-0">
                    {lead.first_name.charAt(0)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                      <span className="font-medium text-white">{lead.first_name} {lead.last_name}</span>
                      {lead.linkedin_url && (
                    <a 
                          href={lead.linkedin_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-white/30 hover:text-cyan-400 transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                      )}
                  </div>
                    <p className="text-sm text-white/40">{lead.title}</p>
                </div>
              </div>

              {/* Company */}
              <div>
                <div className="flex items-center gap-2 text-white/70">
                  <Building2 className="w-4 h-4 text-white/30" />
                  {lead.company}
                </div>
                  {lead.location && (
                <div className="flex items-center gap-2 text-sm text-white/40 mt-0.5">
                  <MapPin className="w-3 h-3" />
                  {lead.location}
                </div>
                  )}
              </div>

              {/* Status */}
              <div>
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${status.bg} ${status.text}`}>
                  <status.icon className="w-3 h-3" />
                  {status.label}
                </span>
              </div>

              {/* Campaign */}
              <div>
                  <span className="text-sm text-white/50">{lead.campaign_name}</span>
              </div>

              {/* Added */}
              <div>
                  <span className="text-sm text-white/40">
                    {new Date(lead.created_at).toLocaleDateString()}
                  </span>
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
