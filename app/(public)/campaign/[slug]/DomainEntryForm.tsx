'use client';

import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { CampaignData } from '@/lib/types';
import { CampaignDebugData } from '@/lib/types/debug';
import { LiveDebugData } from '@/lib/services/campaignGenerator';

interface Props {
  slug: string;
  debugMode?: boolean;
  onCampaignGenerated: (campaign: CampaignData, debugData?: CampaignDebugData, liveDebug?: LiveDebugData) => void;
}

export default function DomainEntryForm({ slug, debugMode = false, onCampaignGenerated }: Props) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialDomain = searchParams.get('domain') || '';
  
  const [domain, setDomain] = useState(initialDomain);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const hasAutoSubmitted = useRef(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!domain.trim()) {
      setError('Please enter your domain');
      return;
    }

    // Basic domain validation
    const domainPattern = /^([a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;
    const cleanDomain = domain.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];
    
    if (!domainPattern.test(cleanDomain)) {
      setError('Please enter a valid domain (e.g., company.com)');
      return;
    }

    setIsLoading(true);

    try {
      // Call init endpoint to create placeholder and start background generation
      const response = await fetch('/api/campaigns/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain: cleanDomain, debug: debugMode }),
      });

      if (!response.ok) {
        throw new Error('Failed to initialize campaign');
      }

      const data = await response.json();
      
      if (data.success && data.slug) {
        // Redirect immediately to the campaign page
        // The campaign page will handle showing the loading state
        const debugParam = debugMode ? '?debug=true' : '';
        router.replace(`/campaign/${data.slug}${debugParam}`);
      } else {
        throw new Error(data.error || 'Unknown error');
      }
    } catch (err) {
      console.error('[DomainEntryForm] Campaign init error:', err);
      setError('Something went wrong. Please try again.');
      setIsLoading(false);
    }
  };

  // Auto-submit when domain is provided via query params
  useEffect(() => {
    if (initialDomain && !hasAutoSubmitted.current && !isLoading) {
      hasAutoSubmitted.current = true;
      // Trigger submit programmatically
      const fakeEvent = { preventDefault: () => {} } as React.FormEvent;
      handleSubmit(fakeEvent);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialDomain]);

  // Brief loading state while init API call is in progress
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F0F9FF] flex items-center justify-center p-6 font-sans">
        {/* Background Ambient Glows */}
        <div className="fixed top-0 left-1/4 w-[500px] h-[500px] bg-sky-200/40 rounded-full blur-[100px] pointer-events-none mix-blend-multiply" />
        <div className="fixed bottom-0 right-1/4 w-[600px] h-[600px] bg-cyan-200/40 rounded-full blur-[100px] pointer-events-none mix-blend-multiply" />

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8 text-center max-w-sm"
        >
          <img src="/coldmessage_logo.png" alt="ColdMessage" className="h-16 w-auto mx-auto mb-4 opacity-80" />
          <div className="flex items-center justify-center gap-2 mb-2">
            <div className="w-2 h-2 rounded-full bg-sky-500 animate-pulse" />
            <span className="text-sm font-semibold text-slate-700">Setting up your campaign...</span>
          </div>
          <p className="text-xs text-slate-400">You'll be redirected in a moment</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F0F9FF] flex items-center justify-center p-6">
      {/* Background Ambient Glows */}
      <div className="fixed top-0 left-1/4 w-[500px] h-[500px] bg-sky-200/40 rounded-full blur-[100px] pointer-events-none mix-blend-multiply" />
      <div className="fixed bottom-0 right-1/4 w-[600px] h-[600px] bg-cyan-200/40 rounded-full blur-[100px] pointer-events-none mix-blend-multiply" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-lg w-full relative z-10"
      >
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8">
          {/* Logo */}
          <div className="text-center mb-8">
            <img src="/coldmessage_logo.png" alt="ColdMessage" className="h-24 w-auto mx-auto mb-4 drop-shadow-lg" />
            <h1 className="text-2xl font-bold text-slate-900 mb-2">
              Get Your Personalized Campaign
            </h1>
            <p className="text-slate-500">
              Enter your domain to see qualified leads and ready-to-send emails tailored for your business.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="domain" className="block text-sm font-semibold text-slate-700 mb-2">
                Your Company Domain
              </label>
              <div className="relative">
                <input
                  type="text"
                  id="domain"
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  placeholder="yourcompany.com"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-sky-400 focus:ring-2 focus:ring-sky-100 outline-none transition-all text-slate-800 placeholder:text-slate-400"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                  </svg>
                </div>
              </div>
              {error && (
                <p className="mt-2 text-sm text-red-500">{error}</p>
              )}
            </div>

            <button
              type="submit"
              className="w-full bg-slate-900 text-white font-bold py-4 rounded-xl shadow-lg hover:shadow-xl hover:bg-slate-800 transform transition-all active:scale-[0.98]"
            >
              Generate My Campaign
            </button>
          </form>

          {/* Trust Indicators */}
          <div className="mt-8 pt-6 border-t border-slate-100">
            <div className="flex items-center justify-center gap-6 text-xs text-slate-400">
              <div className="flex items-center gap-1">
                <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>No credit card</span>
              </div>
              <div className="flex items-center gap-1">
                <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>2-3 min setup</span>
              </div>
              <div className="flex items-center gap-1">
                <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>100% free preview</span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
