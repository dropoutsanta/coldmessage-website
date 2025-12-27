'use client';

import { useState, useEffect } from 'react';
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
  Clock,
  Loader2,
  Send,
  CheckCircle
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface InboxMessage {
  id: string;
  subject: string | null;
  body: string | null;
  body_html: string | null;
  from_email: string | null;
  to_email: string | null;
  received_at: string;
  is_read: boolean;
  is_archived: boolean;
  is_interested: boolean | null;
  emailbison_thread_id: string | null;
  leads: {
    id: string;
    first_name: string;
    last_name: string;
    email: string | null;
    company: string;
    title: string;
    profile_picture_url: string | null;
  } | null;
  campaigns: {
    id: string;
    slug: string;
    company_name: string;
  } | null;
}

interface ThreadMessage extends InboxMessage {
  direction: 'inbound' | 'outbound';
}

interface Campaign {
  id: string;
  slug: string;
  company_name: string;
}

export default function InboxPage() {
  const [messages, setMessages] = useState<InboxMessage[]>([]);
  const [selectedMessage, setSelectedMessage] = useState<InboxMessage | null>(null);
  const [thread, setThread] = useState<ThreadMessage[]>([]);
  const [filter, setFilter] = useState<'all' | 'unread' | 'interested'>('all');
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [replying, setReplying] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);

  useEffect(() => {
    fetchCampaigns();
  }, []);

  useEffect(() => {
    fetchMessages();
  }, [filter, selectedCampaignId]);

  const fetchCampaigns = async () => {
    try {
      const supabase = createClient();
      const { data } = await supabase
        .from('campaigns')
        .select('id, slug, company_name')
        .order('created_at', { ascending: false });
      
      if (data && data.length > 0) {
        setCampaigns(data);
        // Auto-select first campaign if none selected
        if (!selectedCampaignId) {
          setSelectedCampaignId(data[0].id);
        }
      }
    } catch (error) {
      console.error('Error fetching campaigns:', error);
    }
  };

  useEffect(() => {
    if (selectedMessage) {
      fetchThread(selectedMessage.id);
      // Mark as read
      if (!selectedMessage.is_read) {
        markAsRead(selectedMessage.id);
      }
    }
  }, [selectedMessage]);

  const fetchMessages = async () => {
    if (!selectedCampaignId) return; // Don't fetch without a campaign selected
    
    try {
      setLoading(true);
      
      const params = new URLSearchParams();
      params.append('campaignId', selectedCampaignId);
      
      if (filter === 'unread') {
        params.append('unreadOnly', 'true');
      } else if (filter === 'interested') {
        params.append('interestedOnly', 'true');
      }

      const response = await fetch(`/api/inbox?${params.toString()}`);
      const data = await response.json();

      if (data.messages) {
        setMessages(data.messages);
        setUnreadCount(data.unreadCount || 0);
        
        // Select first message if none selected
        if (!selectedMessage && data.messages.length > 0) {
          setSelectedMessage(data.messages[0]);
        }
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchThread = async (messageId: string) => {
    try {
      const response = await fetch(`/api/inbox/${messageId}`);
      const data = await response.json();
      
      if (data.thread) {
        setThread(data.thread);
      }
    } catch (error) {
      console.error('Error fetching thread:', error);
    }
  };

  const markAsRead = async (messageId: string) => {
    try {
      await fetch(`/api/inbox/${messageId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_read: true }),
      });
      
      // Update local state
      setMessages(prev => prev.map(msg => 
        msg.id === messageId ? { ...msg, is_read: true } : msg
      ));
      
      if (selectedMessage?.id === messageId) {
        setSelectedMessage(prev => prev ? { ...prev, is_read: true } : null);
      }
      
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const handleReply = async () => {
    if (!replyText.trim() || !selectedMessage) return;

    try {
      setReplying(true);
      const response = await fetch(`/api/inbox/${selectedMessage.id}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: replyText }),
      });

      if (response.ok) {
        setReplyText('');
        // Refresh thread to show the reply
        await fetchThread(selectedMessage.id);
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to send reply');
      }
    } catch (error) {
      console.error('Error sending reply:', error);
      alert('Failed to send reply');
    } finally {
      setReplying(false);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const filteredMessages = messages.filter(msg => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const name = `${msg.leads?.first_name} ${msg.leads?.last_name}`.toLowerCase();
      const subject = msg.subject?.toLowerCase() || '';
      const body = msg.body?.toLowerCase() || '';
      return name.includes(query) || subject.includes(query) || body.includes(query);
    }
    return true;
  });

  const lead = selectedMessage?.leads;
  const campaign = selectedMessage?.campaigns;

  return (
    <div className="min-h-screen flex">
      {/* Email List */}
      <div className="w-[400px] border-r border-white/10 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-white/10">
          <h1 className="text-xl font-bold text-white mb-4">Inbox</h1>
          
          {/* Campaign Selector */}
          <div className="relative mb-4">
            <select
              value={selectedCampaignId || ''}
              onChange={(e) => {
                setSelectedCampaignId(e.target.value);
                setSelectedMessage(null);
                setThread([]);
              }}
              className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white outline-none focus:border-cyan-500/50 transition-colors appearance-none cursor-pointer"
            >
              {campaigns.map((campaign) => (
                <option key={campaign.id} value={campaign.id} className="bg-gray-900">
                  {campaign.company_name}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 pointer-events-none" />
          </div>
          
          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
            <input
              type="text"
              placeholder="Search replies..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/30 outline-none focus:border-cyan-500/50 transition-colors"
            />
          </div>

          {/* Filters */}
          <div className="flex gap-2">
            {(['all', 'unread', 'interested'] as const).map((f) => (
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
                {f === 'unread' && unreadCount > 0 && (
                  <span className="ml-1.5 px-1.5 py-0.5 bg-cyan-500/20 text-cyan-400 text-xs rounded-full">
                    {unreadCount}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Email List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="w-6 h-6 text-cyan-400 animate-spin" />
            </div>
          ) : filteredMessages.length === 0 ? (
            <div className="p-8 text-center text-white/40">
              No messages found
            </div>
          ) : (
            filteredMessages.map((message) => {
              const leadName = message.leads ? `${message.leads.first_name} ${message.leads.last_name}` : 'Unknown';
              return (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  onClick={() => setSelectedMessage(message)}
                  className={`p-4 border-b border-white/5 cursor-pointer transition-colors ${
                    selectedMessage?.id === message.id
                      ? 'bg-white/[0.08]'
                      : 'hover:bg-white/[0.03]'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {message.leads?.profile_picture_url ? (
                      <img
                        src={message.leads.profile_picture_url}
                        alt={leadName}
                        className="w-10 h-10 rounded-full object-cover shrink-0"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-400 to-sky-500 flex items-center justify-center text-white font-bold text-sm shrink-0">
                        {message.leads?.first_name?.charAt(0) || '?'}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className={`font-medium ${message.is_read ? 'text-white/70' : 'text-white'}`}>
                            {leadName}
                          </span>
                          {!message.is_read && (
                            <span className="w-2 h-2 bg-cyan-400 rounded-full" />
                          )}
                          {message.is_interested && (
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                          )}
                        </div>
                        <span className="text-xs text-white/30">{formatTime(message.received_at)}</span>
                      </div>
                      <p className={`text-sm mb-1 ${message.is_read ? 'text-white/50' : 'text-white/80 font-medium'}`}>
                        {message.subject || '(No subject)'}
                      </p>
                      <p className="text-sm text-white/40 truncate">
                        {message.body?.substring(0, 60) || ''}
                      </p>
                      {message.campaigns && (
                        <p className="text-xs text-cyan-400/60 mt-1.5">{message.campaigns.company_name}</p>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>
      </div>

      {/* Email Detail */}
      <div className="flex-1 flex flex-col">
        {selectedMessage ? (
          <>
            {/* Email Header */}
            <div className="p-6 border-b border-white/10">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-4">
                  {lead?.profile_picture_url ? (
                    <img
                      src={lead.profile_picture_url}
                      alt={`${lead.first_name} ${lead.last_name}`}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-400 to-sky-500 flex items-center justify-center text-white font-bold text-lg">
                      {lead?.first_name?.charAt(0) || '?'}
                    </div>
                  )}
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h2 className="text-lg font-semibold text-white">
                        {lead ? `${lead.first_name} ${lead.last_name}` : 'Unknown'}
                      </h2>
                      {selectedMessage.is_interested && (
                        <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 rounded-full text-xs">
                          Interested
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-white/50">
                      {lead?.title} at {lead?.company}
                    </p>
                    <p className="text-sm text-white/40">{selectedMessage.from_email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => markAsRead(selectedMessage.id)}
                    className="p-2 text-white/40 hover:text-white/60 hover:bg-white/5 rounded-lg transition-colors"
                  >
                    <Archive className="w-5 h-5" />
                  </button>
                  <button className="p-2 text-white/40 hover:text-white/60 hover:bg-white/5 rounded-lg transition-colors">
                    <MoreHorizontal className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <h3 className="text-xl font-bold text-white mb-2">
                {selectedMessage.subject || '(No subject)'}
              </h3>
              <div className="flex items-center gap-4 text-sm text-white/40">
                <span className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {formatTime(selectedMessage.received_at)}
                </span>
                {campaign && (
                  <span className="px-2 py-0.5 bg-cyan-500/10 text-cyan-400 rounded-full text-xs">
                    {campaign.company_name}
                  </span>
                )}
              </div>
            </div>

            {/* Thread Messages */}
            <div className="flex-1 p-6 overflow-y-auto">
              <div className="max-w-2xl space-y-6">
                {thread.map((msg) => (
                  <div
                    key={msg.id}
                    className={`p-4 rounded-lg ${
                      msg.direction === 'inbound'
                        ? 'bg-white/5'
                        : 'bg-cyan-500/10 ml-auto'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm font-medium text-white/70">
                        {msg.direction === 'inbound'
                          ? `${msg.leads?.first_name} ${msg.leads?.last_name}`
                          : 'You'}
                      </span>
                      <span className="text-xs text-white/40">
                        {formatTime(msg.received_at)}
                      </span>
                    </div>
                    <div className="text-white/80 whitespace-pre-wrap leading-relaxed">
                      {msg.body || '(No content)'}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Reply Composer */}
            <div className="p-4 border-t border-white/10">
              <div className="max-w-2xl">
                <textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Type your reply..."
                  className="w-full p-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/30 outline-none focus:border-cyan-500/50 transition-colors resize-none mb-3"
                  rows={4}
                />
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleReply}
                    disabled={!replyText.trim() || replying}
                    className="flex items-center gap-2 px-4 py-2.5 bg-cyan-500 text-white font-medium rounded-xl hover:bg-cyan-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {replying ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        Reply
                      </>
                    )}
                  </button>
                  <button className="flex items-center gap-2 px-4 py-2.5 bg-white/5 text-white/70 font-medium rounded-xl hover:bg-white/10 transition-colors">
                    <Forward className="w-4 h-4" />
                    Forward
                  </button>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-white/30">
            {loading ? (
              <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
            ) : (
              'Select a message to view'
            )}
          </div>
        )}
      </div>
    </div>
  );
}
