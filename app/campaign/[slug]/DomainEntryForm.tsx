'use client';

import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { CampaignData } from '@/lib/types';
import { CampaignDebugData } from '@/lib/types/debug';
import { LiveDebugData } from '@/lib/services/campaignGenerator';
import LiveDebugPanel from './LiveDebugPanel';
import InsightTeaser from './InsightTeaser';

interface Props {
  slug: string;
  debugMode?: boolean;
  onCampaignGenerated: (campaign: CampaignData, debugData?: CampaignDebugData, liveDebug?: LiveDebugData) => void;
}

// Map server status to step index for visual indicators
const statusToStepIndex: Record<string, number> = {
  'scraping_website': 0,
  'analyzing_company': 1,
  'finding_leads': 2,
  'waiting_for_leads': 3,
  'writing_emails': 4,
  'complete': 5,
};

const loadingSteps = [
  { text: 'Analyzing your website...', status: 'scraping_website' },
  { text: 'Understanding your ideal customer profile...', status: 'analyzing_company' },
  { text: 'Searching for qualified leads...', status: 'finding_leads' },
  { text: 'Retrieving lead data from LinkedIn...', status: 'waiting_for_leads' },
  { text: 'Crafting personalized emails...', status: 'writing_emails' },
  { text: 'Finalizing your campaign...', status: 'complete' },
];

export default function DomainEntryForm({ slug, debugMode = false, onCampaignGenerated }: Props) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialDomain = searchParams.get('domain') || '';
  
  const [domain, setDomain] = useState(initialDomain);
  const [isLoading, setIsLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState(0);
  const [liveDebug, setLiveDebug] = useState<LiveDebugData | null>(null);
  const [serverStatus, setServerStatus] = useState<string>('');
  const [serverProgress, setServerProgress] = useState<number>(0);
  const [serverStatusType, setServerStatusType] = useState<string>('');
  const [pollingDomain, setPollingDomain] = useState<string>('');
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const hasAutoSubmitted = useRef(false);

  // Poll for progress updates during loading (using domain, not slug)
  useEffect(() => {
    if (!isLoading || !pollingDomain) {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
      return;
    }

    const pollProgress = async () => {
      try {
        const response = await fetch(`/api/generate-campaign?domain=${encodeURIComponent(pollingDomain)}`);
        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            setServerStatus(data.message || '');
            setServerProgress(data.progress || 0);
            setServerStatusType(data.status || '');
            if (data.liveDebug) {
              setLiveDebug(data.liveDebug);
            }
          }
        }
      } catch {
        // Ignore polling errors
      }
    };

    // Start polling every 800ms for more responsive updates
    pollingRef.current = setInterval(pollProgress, 800);
    // Initial poll
    pollProgress();

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [isLoading, pollingDomain]);

  // Animated progress based on actual server progress
  const [displayProgress, setDisplayProgress] = useState(0);
  const targetProgressRef = useRef(0);
  
  // Smoothly animate progress bar to match server progress
  useEffect(() => {
    if (!isLoading) {
      setDisplayProgress(0);
      targetProgressRef.current = 0;
      return;
    }

    // Update target when server progress changes
    targetProgressRef.current = serverProgress;

    const interval = setInterval(() => {
      setDisplayProgress(prev => {
        const target = targetProgressRef.current;
        if (prev < target) {
          // Smoothly catch up to server progress
          const diff = target - prev;
          const increment = Math.max(0.5, diff * 0.1);
          return Math.min(prev + increment, target);
        }
        return prev;
      });
    }, 50);

    return () => clearInterval(interval);
  }, [isLoading, serverProgress]);

  // Update progress state for display
  useEffect(() => {
    setProgress(Math.min(displayProgress, 99)); // Cap at 99% until complete
  }, [displayProgress]);

  // Update step index based on server status type
  useEffect(() => {
    if (serverStatusType) {
      const stepIdx = statusToStepIndex[serverStatusType];
      if (stepIdx !== undefined && stepIdx !== currentStep) {
        setCurrentStep(stepIdx);
      }
    }
  }, [serverStatusType, currentStep]);

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
    setCurrentStep(0);
    setProgress(0);
    
    // Set the domain for polling (progress is tracked by domain, not slug)
    setPollingDomain(cleanDomain);

    try {
      // Start the API call with debug mode if enabled
      // API will generate unique incremental slug (e.g., dynamicmockups-2)
      const response = await fetch('/api/generate-campaign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain: cleanDomain, debug: debugMode }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate campaign');
      }

      const data = await response.json();
      
      if (data.success && data.campaign && data.slug) {
        // Redirect to the domain-based slug
        // The redirect will cause a fresh page load that fetches from Supabase
        // with proper snake_case -> camelCase transformation.
        // Do NOT call onCampaignGenerated here with raw API data (snake_case format)
        // as it would cause CampaignPage to render with malformed data before redirect completes.
        router.replace(`/campaign/${data.slug}`);
      } else {
        throw new Error(data.error || 'Unknown error');
      }
    } catch {
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F0F9FF] flex items-center justify-center p-6">
        {/* Background Ambient Glows */}
        <div className="fixed top-0 left-1/4 w-[500px] h-[500px] bg-sky-200/40 rounded-full blur-[100px] pointer-events-none mix-blend-multiply" />
        <div className="fixed bottom-0 right-1/4 w-[600px] h-[600px] bg-cyan-200/40 rounded-full blur-[100px] pointer-events-none mix-blend-multiply" />

        {/* Main Layout: Loader + Insight Teasers */}
        <div className="relative z-10 w-full max-w-5xl flex flex-col lg:flex-row items-center lg:items-start justify-center gap-6 lg:gap-8">
          
          {/* Main Loader Card */}
          <div className={`${debugMode ? 'max-w-xl' : 'max-w-lg'} w-full`}>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8 text-center"
            >
              {/* Logo */}
              <img src="/coldmessage_logo.png" alt="ColdMessage" className="h-20 w-auto mx-auto mb-8 drop-shadow-lg" />

              {/* Animated Loader */}
              <div className="relative w-24 h-24 mx-auto mb-8">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                  <circle
                    cx="50"
                    cy="50"
                    r="45"
                    fill="none"
                    stroke="#e2e8f0"
                    strokeWidth="8"
                  />
                  <motion.circle
                    cx="50"
                    cy="50"
                    r="45"
                    fill="none"
                    stroke="url(#gradient)"
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={283}
                    strokeDashoffset={283 - (progress / 100) * 283}
                  />
                  <defs>
                    <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#0ea5e9" />
                      <stop offset="100%" stopColor="#06b6d4" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xl font-bold text-slate-700">{Math.round(progress)}%</span>
                </div>
              </div>

              {/* Current Step - Use server status if available */}
              <AnimatePresence mode="wait">
                <motion.p
                  key={serverStatus || currentStep}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="text-lg font-medium text-slate-700 mb-4"
                >
                  {serverStatus || loadingSteps[currentStep]?.text}
                </motion.p>
              </AnimatePresence>

              {/* Step Progress */}
              <div className="flex justify-center gap-2 mb-8">
                {loadingSteps.map((_, i) => (
                  <div
                    key={i}
                    className={`w-2 h-2 rounded-full transition-colors duration-300 ${
                      i <= currentStep ? 'bg-sky-500' : 'bg-slate-200'
                    }`}
                  />
                ))}
              </div>

              {/* Estimated Time */}
              <p className="text-sm text-slate-400">
                Estimated time remaining: ~{Math.max(0, Math.ceil((100 - progress) / 100 * 2.5))} minutes
              </p>
            </motion.div>

            {/* Live Debug Panel - Show during loading in debug mode */}
            {debugMode && (
              <LiveDebugPanel liveDebug={liveDebug} isLoading={isLoading} />
            )}
          </div>

          {/* Insight Teaser Panels - appear on the right as data comes in */}
          {liveDebug && (
            <div className="w-full lg:w-[320px] flex-shrink-0">
              <InsightTeaser liveDebug={liveDebug} />
            </div>
          )}
        </div>
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

