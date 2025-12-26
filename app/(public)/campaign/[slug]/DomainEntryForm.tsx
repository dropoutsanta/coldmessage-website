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
      const apiPromise = fetch('/api/generate-campaign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain: cleanDomain, debug: debugMode }),
      });

      // Minimum loading time (8 seconds) so users can see the insight panels
      // even if the API responds quickly or fails with demo fallback
      const minimumLoadingTime = new Promise(resolve => setTimeout(resolve, 8000));

      // Wait for both the API and minimum time
      const [response] = await Promise.all([apiPromise, minimumLoadingTime]);

      if (!response.ok) {
        throw new Error('Failed to generate campaign');
      }

      const data = await response.json();
      
      if (data.success && data.campaign && data.slug) {
        // Brief pause to show 100% completion before redirect
        setProgress(100);
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Redirect to the domain-based slug
        // The redirect will cause a fresh page load that fetches from Supabase
        // with proper snake_case -> camelCase transformation.
        router.replace(`/campaign/${data.slug}`);
      } else {
        throw new Error(data.error || 'Unknown error');
      }
    } catch (err) {
      console.error('[DomainEntryForm] Campaign generation error:', err);
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
      <div className="min-h-screen bg-[#F0F9FF] flex items-center justify-center p-6 font-sans">
        {/* Background Ambient Glows */}
        <div className="fixed top-0 left-1/4 w-[500px] h-[500px] bg-sky-200/40 rounded-full blur-[100px] pointer-events-none mix-blend-multiply" />
        <div className="fixed bottom-0 right-1/4 w-[600px] h-[600px] bg-cyan-200/40 rounded-full blur-[100px] pointer-events-none mix-blend-multiply" />

        {/* Unified Dynamic Insight Card */}
        <div className="relative w-full max-w-[420px] aspect-[4/5] z-10">
          
          {/* Animated Progress Border */}
          <div className="absolute -inset-[3px] rounded-[32px] overflow-hidden">
             {/* Background track */}
             <div className="absolute inset-0 border-4 border-slate-200/50 rounded-[32px]" />
             
             {/* Progress Fill - using Conic Gradient for a "Ring" effect or SVG for path following */}
             {/* We'll use an SVG for precise path following which looks cleaner */}
             <svg className="absolute inset-0 w-full h-full transform -rotate-90 drop-shadow-[0_0_15px_rgba(14,165,233,0.3)]">
               <rect
                 x="2"
                 y="2"
                 width="100%"
                 height="100%"
                 rx="30"
                    fill="none"
                 stroke="url(#progressGradient)"
                 strokeWidth="4"
                    strokeLinecap="round"
                 // Calculate approximate perimeter for dasharray: (w+h)*2
                 // We'll use percentage-based pathLength for simplicity if supported, 
                 // otherwise we use a large enough number and percentage offset.
                 // pathLength="100" attribute works in most modern browsers for this.
                 pathLength="100"
                 strokeDasharray="100"
                 strokeDashoffset={100 - progress}
                 className="transition-all duration-300 ease-out w-[calc(100%-4px)] h-[calc(100%-4px)]"
                  />
                  <defs>
                 <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#0ea5e9" />
                   <stop offset="50%" stopColor="#6366f1" />
                   <stop offset="100%" stopColor="#ec4899" />
                    </linearGradient>
                  </defs>
                </svg>
          </div>

          {/* Glass Card Content */}
          <div className="absolute inset-0 bg-white/90 backdrop-blur-2xl rounded-[28px] shadow-2xl overflow-hidden flex flex-col">
            {/* Header */}
            <div className="px-6 py-5 border-b border-slate-100/50 flex items-center justify-between bg-white/50">
              <img src="/coldmessage_logo.png" alt="ColdMessage" className="h-6 w-auto opacity-80" />
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  {serverStatusType === 'complete' ? 'Finalizing' : 'Processing'}
                </span>
              </div>
            </div>

            {/* Main Content Area - Insight Teaser */}
            <div className="flex-1 p-2 relative overflow-hidden flex flex-col">
               {/* Pass data to InsightTeaser. If no liveDebug yet, we construct a temporary one 
                   so InsightTeaser can render the "Website Scraper" (first step) state. */}
              <InsightTeaser 
                liveDebug={liveDebug || {
                  pipelineId: '',
                  startedAt: new Date().toISOString(),
                  currentAgent: 'Website Scraper',
                  completedAgents: [],
                  domain: domain
                }} 
              />
            </div>

            {/* Footer Status */}
            <div className="px-6 py-4 bg-slate-50/80 border-t border-slate-100 flex flex-col gap-2">
              <div className="flex justify-between items-end mb-1">
                <div>
                   <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-0.5">Current Step</p>
                   <p className="text-sm font-semibold text-slate-700">
                     {serverStatus || loadingSteps[currentStep]?.text || 'Initializing...'}
                   </p>
                </div>
                <span className="text-2xl font-bold text-slate-900 tabular-nums">
                  {Math.round(progress)}%
                </span>
              </div>

              {/* Mini progress bar for step granularity */}
              <div className="h-1 w-full bg-slate-200 rounded-full overflow-hidden">
                <motion.div 
                  className="h-full bg-sky-500"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  />
              </div>

              <p className="text-[10px] text-center text-slate-400 mt-2 font-medium">
                Estimated time: ~{Math.max(0, Math.ceil((100 - progress) / 100 * 2.5))} minutes
              </p>
            </div>
          </div>

          {/* Debug Panel Toggle / View (if enabled) */}
          {debugMode && (
             <motion.div 
               initial={{ opacity: 0, y: 10 }}
               animate={{ opacity: 1, y: 0 }}
               className="absolute top-full left-0 right-0 mt-4"
             >
               <LiveDebugPanel liveDebug={liveDebug} isLoading={isLoading} />
             </motion.div>
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

