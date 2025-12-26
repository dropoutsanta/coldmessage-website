'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
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
  Clock
} from 'lucide-react';

interface Lead {
  id: string;
  name: string;
  email: string;
  title: string;
  company: string;
  location: string;
  linkedinUrl: string;
  status: 'contacted' | 'replied' | 'bounced' | 'pending';
  campaign: string;
  addedAt: string;
}

const leads: Lead[] = [
  {
    id: '1',
    name: 'Sarah Chen',
    email: 'sarah@techstart.io',
    title: 'CEO',
    company: 'TechStart Inc',
    location: 'San Francisco, CA',
    linkedinUrl: 'https://linkedin.com/in/sarahchen',
    status: 'replied',
    campaign: 'Q4 SaaS Outreach',
    addedAt: '2 days ago'
  },
  {
    id: '2',
    name: 'Mike Thompson',
    email: 'mike@salespro.com',
    title: 'Founder',
    company: 'SalesPro Agency',
    location: 'New York, NY',
    linkedinUrl: 'https://linkedin.com/in/mikethompson',
    status: 'replied',
    campaign: 'Agency Partnership',
    addedAt: '3 days ago'
  },
  {
    id: '3',
    name: 'Lisa Park',
    email: 'lisa.park@cloudsync.io',
    title: 'VP Sales',
    company: 'CloudSync',
    location: 'Austin, TX',
    linkedinUrl: 'https://linkedin.com/in/lisapark',
    status: 'contacted',
    campaign: 'Q4 SaaS Outreach',
    addedAt: '4 days ago'
  },
  {
    id: '4',
    name: 'David Kim',
    email: 'david@growthlabs.co',
    title: 'CEO',
    company: 'GrowthLabs',
    location: 'Seattle, WA',
    linkedinUrl: 'https://linkedin.com/in/davidkim',
    status: 'replied',
    campaign: 'Agency Partnership',
    addedAt: '5 days ago'
  },
  {
    id: '5',
    name: 'Emma Wilson',
    email: 'emma@innovate.tech',
    title: 'Head of Growth',
    company: 'Innovate Tech',
    location: 'Boston, MA',
    linkedinUrl: 'https://linkedin.com/in/emmawilson',
    status: 'contacted',
    campaign: 'Series A Founders',
    addedAt: '1 week ago'
  },
  {
    id: '6',
    name: 'James Rodriguez',
    email: 'james@scalefast.io',
    title: 'CRO',
    company: 'ScaleFast',
    location: 'Miami, FL',
    linkedinUrl: 'https://linkedin.com/in/jamesrodriguez',
    status: 'bounced',
    campaign: 'Q4 SaaS Outreach',
    addedAt: '1 week ago'
  },
  {
    id: '7',
    name: 'Amanda Foster',
    email: 'amanda@nextstep.com',
    title: 'VP Marketing',
    company: 'NextStep',
    location: 'Denver, CO',
    linkedinUrl: 'https://linkedin.com/in/amandafoster',
    status: 'pending',
    campaign: 'Series A Founders',
    addedAt: '2 weeks ago'
  },
];

const statusConfig = {
  contacted: { 
    label: 'Contacted', 
    icon: Mail,
    bg: 'bg-sky-500/10',
    text: 'text-sky-400'
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
  pending: { 
    label: 'Pending', 
    icon: Clock,
    bg: 'bg-white/5',
    text: 'text-white/40'
  },
};

export default function LeadsPage() {
  const [filter, setFilter] = useState<'all' | 'contacted' | 'replied' | 'bounced' | 'pending'>('all');
  const [selectedLeads, setSelectedLeads] = useState<string[]>([]);

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
      <div className="grid grid-cols-4 gap-4 mb-8">
        {Object.entries(statusConfig).map(([key, config]) => {
          const count = leads.filter(l => l.status === key).length;
          return (
            <div 
              key={key}
              className="bg-white/[0.03] border border-white/10 rounded-xl p-4 cursor-pointer hover:bg-white/[0.05] transition-colors"
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
          {(['all', 'contacted', 'replied', 'bounced', 'pending'] as const).map((f) => (
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
              Add to campaign
            </button>
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

      {/* Leads Table */}
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
              transition={{ delay: i * 0.03 }}
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
                  {lead.name.charAt(0)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-white">{lead.name}</span>
                    <a 
                      href={lead.linkedinUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-white/30 hover:text-cyan-400 transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                  <p className="text-sm text-white/40">{lead.email}</p>
                </div>
              </div>

              {/* Company */}
              <div>
                <div className="flex items-center gap-2 text-white/70">
                  <Building2 className="w-4 h-4 text-white/30" />
                  {lead.company}
                </div>
                <div className="flex items-center gap-2 text-sm text-white/40 mt-0.5">
                  <MapPin className="w-3 h-3" />
                  {lead.location}
                </div>
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
                <span className="text-sm text-white/50">{lead.campaign}</span>
              </div>

              {/* Added */}
              <div>
                <span className="text-sm text-white/40">{lead.addedAt}</span>
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

