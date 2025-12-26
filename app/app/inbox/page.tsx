'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Search, 
  Star, 
  Archive, 
  Trash2, 
  MoreHorizontal,
  ChevronDown,
  Reply,
  Forward,
  Clock
} from 'lucide-react';

interface Email {
  id: number;
  name: string;
  company: string;
  email: string;
  subject: string;
  preview: string;
  body: string;
  time: string;
  unread: boolean;
  starred: boolean;
  campaign: string;
}

const emails: Email[] = [
  {
    id: 1,
    name: 'Sarah Chen',
    company: 'TechStart Inc',
    email: 'sarah@techstart.io',
    subject: 'Re: Quick question about scaling',
    preview: "Hi! This sounds interesting. Can we schedule a call for next week?",
    body: "Hi!\n\nThis sounds really interesting. We've been struggling with exactly this problem.\n\nCan we schedule a call for next week? I'm free Tuesday or Thursday afternoon.\n\nBest,\nSarah",
    time: '2h ago',
    unread: true,
    starred: false,
    campaign: 'Q4 SaaS Outreach'
  },
  {
    id: 2,
    name: 'Mike Thompson',
    company: 'SalesPro Agency',
    email: 'mike@salespro.com',
    subject: 'Re: Fellow agency owner here',
    preview: "Thanks for reaching out. We're actually looking for exactly this kind of solution...",
    body: "Thanks for reaching out!\n\nWe're actually looking for exactly this kind of solution. Our referrals have dried up lately and we need a more predictable way to generate leads.\n\nCould you send over some case studies?\n\nMike",
    time: '4h ago',
    unread: true,
    starred: true,
    campaign: 'Agency Partnership'
  },
  {
    id: 3,
    name: 'Lisa Park',
    company: 'CloudSync',
    email: 'lisa.park@cloudsync.io',
    subject: 'Re: Pipeline question',
    preview: "Interesting timing! We just started looking at cold email solutions...",
    body: "Interesting timing!\n\nWe just started looking at cold email solutions last week. Your timing is impeccable.\n\nWhat kind of results have you seen for B2B SaaS companies like us?\n\nLisa",
    time: '1d ago',
    unread: false,
    starred: false,
    campaign: 'Q4 SaaS Outreach'
  },
  {
    id: 4,
    name: 'David Kim',
    company: 'GrowthLabs',
    email: 'david@growthlabs.co',
    subject: 'Re: Partnership idea',
    preview: "Yes, we get asked about lead gen all the time! Let's talk about how we could...",
    body: "Yes, we get asked about lead gen all the time!\n\nLet's talk about how we could potentially partner on this. I think there's a real opportunity here.\n\nAre you free for a quick call tomorrow?\n\nDavid",
    time: '2d ago',
    unread: false,
    starred: true,
    campaign: 'Agency Partnership'
  },
];

export default function InboxPage() {
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(emails[0]);
  const [filter, setFilter] = useState<'all' | 'unread' | 'starred'>('all');

  const filteredEmails = emails.filter(email => {
    if (filter === 'unread') return email.unread;
    if (filter === 'starred') return email.starred;
    return true;
  });

  return (
    <div className="min-h-screen flex">
      {/* Email List */}
      <div className="w-[400px] border-r border-white/10 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-white/10">
          <h1 className="text-xl font-bold text-white mb-4">Inbox</h1>
          
          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
            <input
              type="text"
              placeholder="Search replies..."
              className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/30 outline-none focus:border-cyan-500/50 transition-colors"
            />
          </div>

          {/* Filters */}
          <div className="flex gap-2">
            {(['all', 'unread', 'starred'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                  filter === f
                    ? 'bg-white/10 text-white'
                    : 'text-white/40 hover:text-white/60'
                }`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
                {f === 'unread' && (
                  <span className="ml-1.5 px-1.5 py-0.5 bg-cyan-500/20 text-cyan-400 text-xs rounded-full">
                    {emails.filter(e => e.unread).length}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Email List */}
        <div className="flex-1 overflow-y-auto">
          {filteredEmails.map((email) => (
            <motion.div
              key={email.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              onClick={() => setSelectedEmail(email)}
              className={`p-4 border-b border-white/5 cursor-pointer transition-colors ${
                selectedEmail?.id === email.id
                  ? 'bg-white/[0.08]'
                  : 'hover:bg-white/[0.03]'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-400 to-sky-500 flex items-center justify-center text-white font-bold text-sm shrink-0">
                  {email.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className={`font-medium ${email.unread ? 'text-white' : 'text-white/70'}`}>
                        {email.name}
                      </span>
                      {email.unread && (
                        <span className="w-2 h-2 bg-cyan-400 rounded-full" />
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {email.starred && (
                        <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                      )}
                      <span className="text-xs text-white/30">{email.time}</span>
                    </div>
                  </div>
                  <p className={`text-sm mb-1 ${email.unread ? 'text-white/80 font-medium' : 'text-white/50'}`}>
                    {email.subject}
                  </p>
                  <p className="text-sm text-white/40 truncate">{email.preview}</p>
                  <p className="text-xs text-cyan-400/60 mt-1.5">{email.campaign}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Email Detail */}
      <div className="flex-1 flex flex-col">
        {selectedEmail ? (
          <>
            {/* Email Header */}
            <div className="p-6 border-b border-white/10">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-400 to-sky-500 flex items-center justify-center text-white font-bold text-lg">
                    {selectedEmail.name.charAt(0)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h2 className="text-lg font-semibold text-white">{selectedEmail.name}</h2>
                      <span className="text-sm text-white/40">from {selectedEmail.company}</span>
                    </div>
                    <p className="text-sm text-white/50">{selectedEmail.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button className="p-2 text-white/40 hover:text-white/60 hover:bg-white/5 rounded-lg transition-colors">
                    <Star className={`w-5 h-5 ${selectedEmail.starred ? 'text-amber-400 fill-amber-400' : ''}`} />
                  </button>
                  <button className="p-2 text-white/40 hover:text-white/60 hover:bg-white/5 rounded-lg transition-colors">
                    <Archive className="w-5 h-5" />
                  </button>
                  <button className="p-2 text-white/40 hover:text-red-400 hover:bg-white/5 rounded-lg transition-colors">
                    <Trash2 className="w-5 h-5" />
                  </button>
                  <button className="p-2 text-white/40 hover:text-white/60 hover:bg-white/5 rounded-lg transition-colors">
                    <MoreHorizontal className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <h3 className="text-xl font-bold text-white mb-2">{selectedEmail.subject}</h3>
              <div className="flex items-center gap-4 text-sm text-white/40">
                <span className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {selectedEmail.time}
                </span>
                <span className="px-2 py-0.5 bg-cyan-500/10 text-cyan-400 rounded-full text-xs">
                  {selectedEmail.campaign}
                </span>
              </div>
            </div>

            {/* Email Body */}
            <div className="flex-1 p-6 overflow-y-auto">
              <div className="max-w-2xl">
                <div className="text-white/80 whitespace-pre-wrap leading-relaxed">
                  {selectedEmail.body}
                </div>
              </div>
            </div>

            {/* Reply Actions */}
            <div className="p-4 border-t border-white/10 flex items-center gap-3">
              <button className="flex items-center gap-2 px-4 py-2.5 bg-cyan-500 text-white font-medium rounded-xl hover:bg-cyan-400 transition-colors">
                <Reply className="w-4 h-4" />
                Reply
              </button>
              <button className="flex items-center gap-2 px-4 py-2.5 bg-white/5 text-white/70 font-medium rounded-xl hover:bg-white/10 transition-colors">
                <Forward className="w-4 h-4" />
                Forward
              </button>
              <div className="flex-1" />
              <button className="flex items-center gap-2 px-4 py-2.5 text-white/40 font-medium rounded-xl hover:bg-white/5 transition-colors">
                <ChevronDown className="w-4 h-4" />
                More actions
              </button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-white/30">
            Select an email to view
          </div>
        )}
      </div>
    </div>
  );
}

