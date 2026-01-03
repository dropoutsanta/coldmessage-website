'use client';

import { CampaignData, QualifiedLead } from '@/lib/types';
import { useState, useEffect, useRef, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useSearchParams, useRouter } from 'next/navigation';
import DomainEntryForm from './DomainEntryForm';
import LiveDebugPanel from './LiveDebugPanel';
import InsightTeaser from './InsightTeaser';
import CheckoutSheet from './CheckoutSheet';
import PaymentSuccessModal from './PaymentSuccessModal';
import { CampaignDebugData } from '@/lib/types/debug';
import { LiveDebugData, LiveAgentResult } from '@/lib/services/campaignGenerator';
import { createClient } from '@/lib/supabase/client';
import { useStreamingCampaign } from '@/lib/hooks/useStreamingCampaign';

interface Props {
  campaign: CampaignData | null;
  slug: string;
}

/**
 * Convert CampaignDebugData (returned after generation) to LiveDebugData format
 * so we can reuse the same LiveDebugPanel component
 */
function convertDebugDataToLiveDebug(debugData: CampaignDebugData): LiveDebugData {
  const { analysis } = debugData;
  const completedAgents: LiveAgentResult[] = [];

  // Company Profiler
  if (analysis.steps.companyProfiler) {
    const step = analysis.steps.companyProfiler;
    completedAgents.push({
      name: 'Company Profiler',
      duration: step.durationMs,
      result: `Analyzed ${step.output?.name || 'company'}`,
      prompt: step.prompt,
      response: step.response,
      output: step.output,
    });
  }

  // ICP Brainstormer
  if (analysis.steps.icpBrainstormer) {
    const step = analysis.steps.icpBrainstormer;
    completedAgents.push({
      name: 'ICP Brainstormer',
      duration: step.durationMs,
      result: `Generated ${step.output?.personas?.length || 0} personas`,
      details: step.output?.personas?.map((p: { name: string }) => p.name),
      prompt: step.prompt,
      response: step.response,
      output: step.output,
    });
  }

  // Cold Email Ranker
  if (analysis.steps.coldEmailRanker) {
    const step = analysis.steps.coldEmailRanker;
    completedAgents.push({
      name: 'Cold Email Ranker',
      duration: step.durationMs,
      result: `Selected: ${step.output?.selectedPersonaName || 'unknown'}`,
      prompt: step.prompt,
      response: step.response,
      output: step.output,
    });
  }

  // LinkedIn Filter Builder
  if (analysis.steps.linkedInFilterBuilder) {
    const step = analysis.steps.linkedInFilterBuilder;
    completedAgents.push({
      name: 'LinkedIn Filter Builder',
      duration: step.durationMs,
      result: `Built filters with ${step.output?.filters?.titles?.length || 0} titles`,
      prompt: step.prompt,
      response: step.response,
      output: step.output,
    });
  }

  return {
    pipelineId: analysis.pipelineId,
    domain: analysis.domain,
    startedAt: analysis.startedAt,
    currentAgent: '', // Completed, no current agent
    completedAgents,
    allPersonas: analysis.steps.icpBrainstormer?.output?.personas?.map((p: any) => ({
      id: p.id,
      name: p.name,
      titles: p.titles || [],
      roleDescription: p.valueTheySeek || p.whyThisPersona || '',
    })),
    selectedPersona: {
      id: analysis.steps.coldEmailRanker?.output?.selectedPersonaId || '',
      name: analysis.steps.coldEmailRanker?.output?.selectedPersonaName || '',
      reason: analysis.steps.coldEmailRanker?.output?.selectionReasoning || '',
    },
    rankings: analysis.steps.coldEmailRanker?.output?.evaluations?.map((e: { personaId: string; personaName: string; overallScore: number }) => ({
      personaId: e.personaId,
      personaName: e.personaName,
      score: e.overallScore,
    })),
    finalFilters: analysis.summary?.finalFilters,
    salesNavUrl: analysis.steps.linkedInFilterBuilder?.output?.salesNavUrl,
  };
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
  { text: 'Building LinkedIn search filters...', status: 'building_filters' },
  { text: 'Searching for qualified leads...', status: 'finding_leads' },
  { text: 'Retrieving lead data from LinkedIn...', status: 'waiting_for_leads' },
  { text: 'Crafting personalized emails...', status: 'writing_emails' },
  { text: 'Finalizing your campaign...', status: 'complete' },
];

function VideoPlayer({ className = '' }: { className?: string }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const handlePlay = () => {
    if (videoRef.current) {
      videoRef.current.play();
      setIsPlaying(true);
    }
  };

  return (
    <div className={`relative group h-full ${className}`}>
      <div className="absolute -inset-1 bg-gradient-to-r from-sky-300 to-cyan-300 rounded-2xl blur opacity-30 group-hover:opacity-60 transition duration-1000"></div>
      <div className="relative bg-black rounded-xl shadow-xl border border-slate-800 overflow-hidden h-full min-h-[200px] flex items-center justify-center">
        <video
          ref={videoRef}
          src="/VSL.mov"
          poster="/VSL-thumbnail.jpg"
          controls={isPlaying}
          playsInline
          preload="metadata"
          className="w-full h-full object-contain"
          onPause={() => setIsPlaying(false)}
        >
          Your browser does not support the video tag.
        </video>
        
        {!isPlaying && (
          <div 
            onClick={handlePlay}
            className="absolute inset-0 flex items-center justify-center cursor-pointer bg-black/10 hover:bg-black/20 transition-all duration-300 group/btn pointer-events-auto"
          >
            <div className="text-center space-y-5 transform group-hover/btn:scale-105 transition-transform duration-700 ease-out">
              <div className="relative">
                {/* Main button */}
                <div className="relative w-24 h-24 rounded-full bg-white/30 backdrop-blur-md flex items-center justify-center mx-auto border border-white/50 shadow-2xl group-hover/btn:shadow-3xl transition-all duration-700">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-sky-500 to-cyan-400 flex items-center justify-center shadow-lg text-white group-hover/btn:shadow-sky-500/50 transition-all duration-700 border-2 border-white/20">
                    <svg className="w-10 h-10 drop-shadow-sm" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z"/>
                    </svg>
                  </div>
                </div>
              </div>
              
              <p className="font-bold text-slate-700 text-lg drop-shadow-sm bg-white/80 backdrop-blur-sm px-4 py-1 rounded-full inline-block">
                How It Works
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function CampaignPage({ campaign: initialCampaign, slug }: Props) {
  const [campaign, setCampaign] = useState<CampaignData | null>(initialCampaign);
  const [debugData, setDebugData] = useState<CampaignDebugData | null>(null);
  const [liveDebug, setLiveDebug] = useState<LiveDebugData | null>(null);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [showPaymentSuccess, setShowPaymentSuccess] = useState(false);
  const [customerEmail, setCustomerEmail] = useState<string | null>(null);
  const [isCompletingCheckout, setIsCompletingCheckout] = useState(false);
  const [currentUserEmail, setCurrentUserEmail] = useState<string | undefined>(undefined);
  
  // Sync campaign state when props change (e.g., after router.refresh())
  // This is critical for when the campaign transitions from 'generating' to 'draft'/'complete'
  useEffect(() => {
    // Update campaign state when:
    // 1. We have new initial data AND
    // 2. Either we're transitioning out of generating OR the status changed
    if (initialCampaign) {
      const wasGenerating = campaign?.status === 'generating';
      const nowNotGenerating = initialCampaign.status !== 'generating';
      
      if ((wasGenerating && nowNotGenerating) || 
          (initialCampaign.status && initialCampaign.status !== campaign?.status)) {
        console.log('[CampaignPage] Syncing campaign state:', campaign?.status, '->', initialCampaign.status);
        setCampaign(initialCampaign);
      }
    }
  }, [initialCampaign, campaign?.status]);
  
  // Generating state tracking
  const [serverStatus, setServerStatus] = useState<string>('');
  const [serverProgress, setServerProgress] = useState<number>(0);
  const [serverStatusType, setServerStatusType] = useState<string>('');
  const [currentStep, setCurrentStep] = useState(0);
  const [displayProgress, setDisplayProgress] = useState(0);
  const [hasRealTimeProgress, setHasRealTimeProgress] = useState(false);
  const targetProgressRef = useRef(0);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  
  const searchParams = useSearchParams();
  const router = useRouter();
  const isDebugMode = searchParams.get('debug') === 'true';
  const sessionId = searchParams.get('session_id');
  
  // Fetch current user session on mount
  useEffect(() => {
    const supabase = createClient();
    
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) {
        setCurrentUserEmail(user.email);
      }
    };
    
    fetchUser();
    
    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user?.email) {
        setCurrentUserEmail(session.user.email);
      } else {
        setCurrentUserEmail(undefined);
      }
    });
    
    return () => subscription.unsubscribe();
  }, []);
  
  // Check if campaign is still generating
  const isGenerating = campaign?.status === 'generating';
  const campaignDomain = campaign?.domain;
  const campaignId = campaign?.id;
  
  // SSE Streaming for real-time generation updates
  const streaming = useStreamingCampaign();
  const hasStartedStreaming = useRef(false);
  
  // Start SSE streaming when campaign is generating
  useEffect(() => {
    if (isGenerating && campaignDomain && campaignId && !hasStartedStreaming.current && !streaming.isStreaming) {
      hasStartedStreaming.current = true;
      console.log('[CampaignPage] Starting SSE stream for', campaignDomain);
      streaming.startGeneration(campaignDomain, campaignId, slug);
    }
  }, [isGenerating, campaignDomain, campaignId, slug, streaming]);
  
  // When streaming completes, refresh the page
  useEffect(() => {
    if (streaming.campaign && !streaming.isStreaming && hasStartedStreaming.current) {
      console.log('[CampaignPage] Stream complete, refreshing...');
      router.refresh();
    }
  }, [streaming.campaign, streaming.isStreaming, router]);
  
  // Use streaming progress if available, otherwise fall back to server progress
  const effectiveProgress = streaming.isStreaming ? streaming.progress : serverProgress;
  const effectiveCurrentAgent = streaming.isStreaming ? streaming.currentAgent : '';
  
  // Memoize the liveDebug object for streaming to prevent creating new object on every render
  // This is critical - without memo, InsightTeaser's useEffect fires on every SSE event
  const streamingLiveDebug = useMemo(() => {
    if (!streaming.isStreaming) return null;
    
    const completedAgents = streaming.agents
      .filter(a => a.status === 'complete')
      .map(a => ({
        name: a.name,
        duration: a.duration || 0,
        result: a.result || '',
        output: a.output,
      }));
    
    return {
      pipelineId: streaming.pipelineId || '',
      startedAt: new Date().toISOString(), // OK to recalculate - only when deps change
      currentAgent: streaming.currentAgent,
      completedAgents,
      domain: campaignDomain || '',
    };
  }, [
    streaming.isStreaming,
    streaming.pipelineId,
    streaming.currentAgent,
    // Only depend on completed agents count, not the full agents array
    streaming.agents.filter(a => a.status === 'complete').length,
    campaignDomain,
  ]);
  
  // Use persisted generation progress from database if available (for refresh scenarios)
  const persistedProgress = campaign?.generationProgress;
  
  // Consider persisted progress as real-time progress for UI purposes
  const [initializedFromPersisted, setInitializedFromPersisted] = useState(false);

  // Handle Stripe redirect with session_id
  useEffect(() => {
    if (sessionId && !showPaymentSuccess && !isCompletingCheckout) {
      setIsCompletingCheckout(true);
      
      // Complete the checkout
      fetch('/api/checkout/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          campaignSlug: slug,
        }),
      })
        .then(res => res.json())
        .then(data => {
          if (data.autoLoginUrl) {
            // Redirect to auto-login URL - this will log them in and redirect to dashboard
            window.location.href = data.autoLoginUrl;
            return;
          }
          
          // Fallback: show success modal if auto-login failed
          if (data.email) {
            setCustomerEmail(data.email);
          }
          setShowPaymentSuccess(true);
          setIsCompletingCheckout(false);
          
          // Clean up URL (remove session_id param)
          const url = new URL(window.location.href);
          url.searchParams.delete('session_id');
          window.history.replaceState({}, '', url.toString());
        })
        .catch(err => {
          console.error('Error completing checkout:', err);
          // Still show success - payment went through
          setShowPaymentSuccess(true);
          setIsCompletingCheckout(false);
        });
    }
  }, [sessionId, slug, showPaymentSuccess, isCompletingCheckout]);

  // Legacy polling disabled - we now use SSE streaming instead
  // This useEffect is kept as a fallback only if streaming fails to start
  useEffect(() => {
    // Don't poll if streaming is active - SSE handles everything
    if (streaming.isStreaming) {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
      return;
    }
    
    if (!isGenerating || !campaignDomain) {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
      return;
    }

    // Only poll as fallback if streaming hasn't started after 5 seconds
    const fallbackTimeout = setTimeout(() => {
      if (!streaming.isStreaming && isGenerating) {
        console.log('[CampaignPage] Streaming not started, falling back to status polling');
        const pollStatus = async () => {
          try {
            const statusResponse = await fetch(`/api/campaigns/status?slug=${encodeURIComponent(slug)}`);
            if (statusResponse.ok) {
              const statusData = await statusResponse.json();
              if (statusData.status && statusData.status !== 'generating') {
                if (pollingRef.current) {
                  clearInterval(pollingRef.current);
                  pollingRef.current = null;
                }
                router.refresh();
              }
            }
          } catch {
            // Ignore polling errors
          }
        };
        pollingRef.current = setInterval(pollStatus, 3000);
        pollStatus();
      }
    }, 5000);

    return () => {
      clearTimeout(fallbackTimeout);
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [isGenerating, campaignDomain, slug, router, streaming.isStreaming]);

  // Smoothly animate progress bar
  useEffect(() => {
    if (!isGenerating) {
      setDisplayProgress(0);
      targetProgressRef.current = 0;
      return;
    }

    targetProgressRef.current = serverProgress;

    const interval = setInterval(() => {
      setDisplayProgress(prev => {
        const target = targetProgressRef.current;
        if (prev < target) {
          const diff = target - prev;
          const increment = Math.max(0.5, diff * 0.1);
          return Math.min(prev + increment, target);
        }
        return prev;
      });
    }, 50);

    return () => clearInterval(interval);
  }, [isGenerating, serverProgress]);

  // Update step index based on server status type
  useEffect(() => {
    if (serverStatusType) {
      const stepIdx = statusToStepIndex[serverStatusType];
      if (stepIdx !== undefined && stepIdx !== currentStep) {
        setCurrentStep(stepIdx);
      }
    }
  }, [serverStatusType, currentStep]);

  // Initialize from persisted progress on mount (for refresh scenarios)
  useEffect(() => {
    if (persistedProgress && !initializedFromPersisted && isGenerating) {
      setInitializedFromPersisted(true);
      setHasRealTimeProgress(true);
      setLiveDebug(persistedProgress as LiveDebugData);
      
      // Estimate progress based on completed agents
      const completedCount = persistedProgress.completedAgents?.length || 0;
      const estimatedProgress = Math.min(30 + (completedCount * 12), 85);
      setServerProgress(estimatedProgress);
      
      // Set current agent from persisted data
      if (persistedProgress.currentAgent) {
        setServerStatus(`Running ${persistedProgress.currentAgent}...`);
      }
    }
  }, [persistedProgress, initializedFromPersisted, isGenerating]);

  const handleRegenerateEmails = async () => {
    if (!campaign || isRegenerating) return;
    
    setIsRegenerating(true);
    try {
      const response = await fetch('/api/regenerate-emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug }),
      });
      
      const result = await response.json();
      
      if (result.success && result.campaign) {
        // Update campaign with new leads (convert from snake_case to camelCase)
        const updatedLeads = result.campaign.qualified_leads.map((lead: {
          id: string;
          name: string;
          title: string;
          company: string;
          linkedin_url: string;
          profile_picture_url?: string;
          why_picked: string;
          email_subject: string;
          email_body: string;
          location?: string;
          about?: string;
        }) => ({
          id: lead.id,
          name: lead.name,
          title: lead.title,
          company: lead.company,
          linkedinUrl: lead.linkedin_url,
          profilePictureUrl: lead.profile_picture_url || '',
          whyPicked: lead.why_picked,
          emailSubject: lead.email_subject,
          emailBody: lead.email_body,
          location: lead.location,
          about: lead.about,
        }));
        
        setCampaign({
          ...campaign,
          qualifiedLeads: updatedLeads,
          updatedAt: result.campaign.updated_at,
        });
        
        console.log(`[CampaignPage] Regenerated ${result.emailsRegenerated} emails in ${result.durationMs}ms`);
      } else {
        console.error('[CampaignPage] Failed to regenerate emails:', result.error);
      }
    } catch (error) {
      console.error('[CampaignPage] Error regenerating emails:', error);
    } finally {
      setIsRegenerating(false);
    }
  };


  // Convert debugData to liveDebug format if we have debugData but not liveDebug
  const effectiveLiveDebug = liveDebug || (debugData ? convertDebugDataToLiveDebug(debugData) : null);

  // Progress for display (capped at 99% until complete)
  // Prefer streaming progress when available
  const progress = streaming.isStreaming 
    ? Math.min(streaming.progress, 99) 
    : Math.min(displayProgress, 99);
  
  // Consider streaming as real-time progress
  const hasStreamingProgress = streaming.isStreaming && streaming.progress > 0;

  // If campaign is generating, show the loading UI
  if (isGenerating) {
    return (
      <div className="min-h-screen bg-[#F0F9FF] flex items-center justify-center p-6 font-sans">
        {/* Background Ambient Glows */}
        <div className="fixed top-0 left-1/4 w-[500px] h-[500px] bg-sky-200/40 rounded-full blur-[100px] pointer-events-none mix-blend-multiply" />
        <div className="fixed bottom-0 right-1/4 w-[600px] h-[600px] bg-cyan-200/40 rounded-full blur-[100px] pointer-events-none mix-blend-multiply" />

        {/* Unified Dynamic Insight Card */}
        <div className="relative w-full max-w-[420px] aspect-[4/5] z-10">
          

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
              <InsightTeaser 
                liveDebug={streamingLiveDebug || liveDebug || persistedProgress || {
                  pipelineId: '',
                  startedAt: new Date().toISOString(),
                  currentAgent: 'Website Scraper',
                  completedAgents: [],
                  domain: campaignDomain || ''
                }}
              />
            </div>

            {/* Footer Status */}
            <div className="px-6 py-4 bg-slate-50/80 border-t border-slate-100 flex flex-col gap-2">
              <div className="flex justify-between items-end mb-1">
                <div>
                   <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-0.5">Current Step</p>
                   <p className="text-sm font-semibold text-slate-700">
                     {(hasStreamingProgress || hasRealTimeProgress)
                       ? (streaming.currentAgent || serverStatus || loadingSteps[currentStep]?.text || 'Processing...')
                       : 'Generation in progress...'
                     }
                   </p>
                </div>
                {(hasStreamingProgress || hasRealTimeProgress) ? (
                  <span className="text-2xl font-bold text-slate-900 tabular-nums">
                    {Math.round(progress)}%
                  </span>
                ) : (
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-sky-500 animate-pulse" />
                    <div className="w-2 h-2 rounded-full bg-sky-400 animate-pulse" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 rounded-full bg-sky-300 animate-pulse" style={{ animationDelay: '300ms' }} />
                  </div>
                )}
              </div>

              {/* Mini progress bar */}
              <div className="h-1 w-full bg-slate-200 rounded-full overflow-hidden">
                {(hasStreamingProgress || hasRealTimeProgress) ? (
                  <motion.div 
                    className="h-full bg-sky-500"
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                  />
                ) : (
                  <div className="h-full bg-gradient-to-r from-sky-400 via-sky-500 to-sky-400 animate-pulse" 
                       style={{ width: '60%', animation: 'pulse 1.5s ease-in-out infinite' }} />
                )}
              </div>

              <p className="text-[10px] text-center text-slate-400 mt-2 font-medium">
                {(hasStreamingProgress || hasRealTimeProgress)
                  ? `Estimated time: ~${Math.max(0, Math.ceil((100 - progress) / 100 * 2.5))} minutes`
                  : 'Please wait while we generate your campaign...'
                }
              </p>
            </div>
          </div>

          {/* Debug Panel (if enabled) */}
          {isDebugMode && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute top-full left-0 right-0 mt-4"
            >
              <LiveDebugPanel liveDebug={liveDebug} isLoading={true} />
            </motion.div>
          )}
        </div>
      </div>
    );
  }

  // If campaign failed to generate, show error state with retry option
  if (campaign?.status === 'error') {
    return (
      <div className="min-h-screen bg-[#F0F9FF] flex items-center justify-center p-6 font-sans">
        {/* Background Ambient Glows */}
        <div className="fixed top-0 left-1/4 w-[500px] h-[500px] bg-red-200/30 rounded-full blur-[100px] pointer-events-none mix-blend-multiply" />
        <div className="fixed bottom-0 right-1/4 w-[600px] h-[600px] bg-orange-200/30 rounded-full blur-[100px] pointer-events-none mix-blend-multiply" />

        <div className="relative w-full max-w-md z-10">
          <div className="bg-white/90 backdrop-blur-2xl rounded-2xl shadow-2xl p-8 text-center border border-red-100">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">Generation Failed</h2>
            <p className="text-slate-500 mb-6">
              We encountered an issue while generating your campaign for <span className="font-semibold text-slate-700">{campaign.domain || campaign.companyName}</span>. This can happen due to temporary issues with our lead sources.
            </p>
            <button
              onClick={() => {
                // Reset to show domain entry form
                setCampaign(null);
              }}
              className="w-full bg-slate-900 text-white font-semibold py-3 px-6 rounded-xl hover:bg-slate-800 transition-colors"
            >
              Try Again
            </button>
            <p className="text-xs text-slate-400 mt-4">
              If the issue persists, please contact support.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // If no campaign data, show the domain entry form
  if (!campaign) {
    return (
      <DomainEntryForm 
        slug={slug}
        debugMode={isDebugMode}
        onCampaignGenerated={(newCampaign, newDebugData, newLiveDebug) => {
          setCampaign(newCampaign);
          if (newDebugData) {
            setDebugData(newDebugData);
          }
          if (newLiveDebug) {
            setLiveDebug(newLiveDebug);
          }
        }} 
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#F0F9FF] text-slate-800 font-sans selection:bg-cyan-200 selection:text-cyan-900 relative overflow-x-hidden">
      
      {/* Background Ambient Glows */}
      <div className="fixed top-0 left-1/4 w-[500px] h-[500px] bg-sky-200/40 rounded-full blur-[100px] pointer-events-none mix-blend-multiply" />
      <div className="fixed bottom-0 right-1/4 w-[600px] h-[600px] bg-cyan-200/40 rounded-full blur-[100px] pointer-events-none mix-blend-multiply" />

      {/* Header - Fixed */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-white backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 md:px-6 py-3 md:py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 md:gap-6 min-w-0 w-1/2 md:w-auto md:flex-1">
            <img src="/coldmessage_logo.png" alt="ColdMessage" className="h-6 md:h-12 w-auto shrink-0" />
            <div className="min-w-0">
              <h1 className="text-sm md:text-2xl font-extrabold text-slate-900 tracking-tight truncate">
                {campaign.companyName}
              </h1>
              <p className="text-[10px] md:text-sm text-slate-500 font-medium leading-tight">
                500 cold emails<br className="md:hidden" /> ready to send
              </p>
            </div>
          </div>
          
          <button 
            onClick={() => setShowCheckout(true)}
            className="bg-slate-900 text-white font-bold py-2.5 md:py-3 px-4 md:px-8 rounded-lg hover:bg-slate-800 transform transition-all active:scale-[0.98] flex items-center justify-center gap-1.5 md:gap-2 text-xs md:text-base w-1/2 md:w-auto"
          >
            <span>Launch Campaign</span>
            <span>🚀</span>
          </button>
        </div>
      </div>
      
      {/* Spacer for fixed header */}
      <div className="h-16 md:h-20"></div>

      {/* Campaign Summary - Compact */}
      <section className="px-6 py-8 relative z-10">
        <div className="max-w-6xl mx-auto">
          
          {/* Section Header */}
          <div className="mb-6">
            <h2 className="text-xl md:text-2xl font-bold text-slate-900 mb-1">Here's the campaign we built for you</h2>
            <p className="text-slate-500 text-sm">Review the targeting, numbers, and sample emails below.</p>
          </div>

          <div className="space-y-4">
          
          {/* Video + Targeting - Side by Side on Desktop */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Video */}
            <div className="h-full">
              <VideoPlayer className="h-full" />
            </div>
            
            {/* Targeting Card */}
            <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
              <div className="px-6 py-3 bg-slate-50 border-b border-slate-200">
                <h2 className="font-semibold text-slate-900 text-base">Targeting Criteria</h2>
              </div>
              
              <div className="p-6">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <p className="text-xs text-slate-400 uppercase tracking-wide mb-1 font-semibold">Titles</p>
                    <p className="text-sm text-slate-900 font-medium">{campaign.icpAttributes?.[0] || 'Founders, CEOs, VPs of Sales'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 uppercase tracking-wide mb-1 font-semibold">Company Size</p>
                    <p className="text-sm text-slate-900 font-medium">{campaign.icpAttributes?.[1] || '10-200 employees'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 uppercase tracking-wide mb-1 font-semibold">Industry</p>
                    <p className="text-sm text-slate-900 font-medium">{campaign.icpAttributes?.[2] || 'SaaS, Tech, Agencies'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 uppercase tracking-wide mb-1 font-semibold">Location</p>
                    <p className="text-sm text-slate-900 font-medium">{campaign.location}</p>
                  </div>
                </div>
                
                {/* Sample companies - inline */}
                <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap items-center gap-2">
                  <p className="text-xs text-slate-400 uppercase tracking-wide font-semibold mr-2">Sample companies:</p>
                  {(() => {
                    const isValidCompany = (name: string) => {
                      if (!name || name.length > 50) return false;
                      if (name.split(' ').length > 5) return false;
                      if (/^[a-z]/.test(name)) return false;
                      if (/\b(and|the|with|for|from|through|such as|not only)\b/i.test(name)) return false;
                      return true;
                    };
                    const companies = [...new Set((campaign.qualifiedLeads || []).map(lead => lead.company))]
                      .filter(isValidCompany)
                      .slice(0, 5);
                    const remainingCount = Math.max(0, (campaign.priceTier1Emails || 0) - companies.length);
                    return (
                      <>
                        {companies.map((company, i) => (
                          <span key={i} className="px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-600">
                            {company}
                          </span>
                        ))}
                        {remainingCount > 0 && (
                          <span className="text-xs text-slate-400">+ {remainingCount} more</span>
                        )}
                      </>
                    );
                  })()}
                </div>
              </div>
            </div>
          </div>

          {/* The Numbers - Simplified */}
          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
            <div className="px-6 py-3 bg-slate-50 border-b border-slate-200">
              <h2 className="font-semibold text-slate-900 text-base">The numbers</h2>
            </div>
            <div className="p-6">
              <div className="flex justify-center gap-12 md:gap-16">
                <div className="text-center">
                  <p className="text-2xl font-bold text-slate-900">{campaign.priceTier1Emails}</p>
                  <p className="text-xs text-slate-500">emails sent</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-slate-900">~2%</p>
                  <p className="text-xs text-slate-500">expected reply rate</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-sky-600">~{Math.round((campaign.priceTier1Emails || 500) * 0.02)}</p>
                  <p className="text-xs text-slate-500">expected replies</p>
                </div>
              </div>
              <p className="text-[10px] text-slate-400 mt-4 text-center">Results may vary based on industry and offer.</p>
            </div>
          </div>

          {/* What you get */}
          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
            <div className="px-6 py-3 bg-slate-50 border-b border-slate-200">
              <h2 className="font-semibold text-slate-900 text-base">What you get</h2>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="flex items-start gap-3">
                  <span className="text-green-500 mt-0.5">✓</span>
                  <span className="text-slate-700">Dashboard access to track leads, emails sent, and manage replies</span>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-green-500 mt-0.5">✓</span>
                  <span className="text-slate-700">Notifications when you get a positive response</span>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-green-500 mt-0.5">✓</span>
                  <span className="text-slate-700">Option to test multiple ICPs with additional campaigns</span>
                </div>
              </div>
            </div>
          </div>

          </div>
        </div>
      </section>

      {/* Review Your Campaign */}
      <section className="px-6 py-10 relative z-10">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8 flex items-start justify-between">
            <div>
              <h2 className="text-xl md:text-2xl font-bold text-slate-900 mb-2">Review Your Prospects</h2>
              <p className="text-slate-500">
                We found {(campaign.qualifiedLeads || []).length} high-intent leads. Click a row to preview the personalized email.
              </p>
            </div>
            
            {/* Regenerate Emails Button - Debug Mode Only */}
            {isDebugMode && (
              <button
                onClick={handleRegenerateEmails}
                disabled={isRegenerating}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                  isRegenerating
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    : 'bg-amber-100 text-amber-800 hover:bg-amber-200 border border-amber-300'
                }`}
              >
                {isRegenerating ? (
                  <>
                    <motion.span
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      className="inline-block"
                    >
                      ⏳
                    </motion.span>
                    Regenerating...
                  </>
                ) : (
                  <>
                    <span>✍️</span>
                    Regenerate Emails
                  </>
                )}
              </button>
            )}
          </div>

          <LeadSelector leads={(campaign.qualifiedLeads || []).slice(0, 5)} />
        </div>
      </section>

      {/* CTA Section */}
      <section className="px-6 py-12 relative z-10">
        <div className="max-w-6xl mx-auto">
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Left Content */}
            <div className="space-y-8">
              <div>
                <h2 className="text-3xl font-bold text-slate-900 mb-4">Ready to break the ice?</h2>
                <p className="text-slate-500 text-lg">
                  Launch your campaign today and start conversations with your ideal customers. We handle the technical setup, warming, and sending.
                </p>
              </div>
              
              <ul className="space-y-4">
                <li className="flex items-center gap-3 text-slate-700">
                  <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-600 font-bold text-sm">1</div>
                  <span className="font-medium">We'll verify all emails one last time</span>
                </li>
                <li className="flex items-center gap-3 text-slate-700">
                  <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-600 font-bold text-sm">2</div>
                  <span className="font-medium">Campaign starts sending immediately</span>
                </li>
                <li className="flex items-center gap-3 text-slate-700">
                  <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-600 font-bold text-sm">3</div>
                  <span className="font-medium">You get replies directly in your inbox</span>
                </li>
              </ul>
              
            </div>

            {/* Right Pricing Card */}
            <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8 relative overflow-hidden">
               <div className="absolute top-0 right-0 p-6 opacity-[0.05] grayscale">
                  <img src="/coldmessage_logo.png" alt="" className="w-40 h-auto" />
               </div>
               
              <div className="relative z-10">
                <div className="flex items-baseline gap-1 mb-2">
                  <span className="text-5xl font-black text-slate-900 tracking-tight">${campaign.priceTier1}</span>
                  <span className="text-slate-500 font-medium">/ campaign</span>
                </div>
                
                <p className="text-slate-500 mb-8 font-medium">
                  Reach <strong>{campaign.priceTier1Emails} verified prospects</strong> with personalized messages.
                </p>
                
                <button 
                  onClick={() => setShowCheckout(true)}
                  className="w-full bg-slate-900 text-white text-lg font-bold py-4 rounded-xl shadow-lg hover:shadow-xl hover:bg-slate-800 transform transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  <span>Launch Campaign</span>
                  <span>🚀</span>
                </button>
                
                <div className="mt-4 flex items-center justify-center gap-2 text-xs text-slate-400">
                  <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                  100% Money-back guarantee if no replies
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer Removed */}
      
      {/* Debug Panel - shows when ?debug=true */}
      {isDebugMode && effectiveLiveDebug && (
        <LiveDebugPanel liveDebug={effectiveLiveDebug} isLoading={false} />
      )}
      
      {/* No debug data message - shows when ?debug=true but no debug data available */}
      {isDebugMode && !effectiveLiveDebug && (
        <div className="fixed bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur-sm border-t border-slate-700 p-6 z-50">
          <div className="max-w-2xl mx-auto text-center">
            <div className="text-amber-400 text-xl mb-2">🔬</div>
            <h3 className="text-white font-semibold mb-2">Debug Mode Active</h3>
            <p className="text-slate-400 text-sm">
              No debug data available for this campaign. Debug data is only captured when generating a new campaign with <code className="bg-slate-800 px-1.5 py-0.5 rounded text-amber-400">?debug=true</code> in the URL.
            </p>
            <p className="text-slate-500 text-xs mt-2">
              To see the full agent pipeline, regenerate the campaign with debug mode enabled.
            </p>
          </div>
        </div>
      )}
      
      {/* Checkout Sheet */}
      <CheckoutSheet
        isOpen={showCheckout}
        onClose={() => setShowCheckout(false)}
        campaign={campaign}
        tier="tier1"
        currentUserEmail={currentUserEmail}
      />
      
      {/* Payment Success Modal (shown after Stripe redirect) */}
      <PaymentSuccessModal
        isOpen={showPaymentSuccess}
        onClose={() => setShowPaymentSuccess(false)}
        email={customerEmail}
        campaignSlug={slug}
      />
      
      {/* Loading overlay while completing checkout */}
      {isCompletingCheckout && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-white rounded-2xl p-8 text-center max-w-sm">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-emerald-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">Payment Successful!</h3>
            <p className="text-slate-500 mb-4">Setting up your account...</p>
            <div className="w-8 h-8 border-2 border-slate-200 border-t-slate-600 rounded-full animate-spin mx-auto" />
          </div>
        </div>
      )}
    </div>
  );
}


function LeadAvatar({ lead }: { lead: QualifiedLead }) {
  const [showFallback, setShowFallback] = useState(!lead.profilePictureUrl);
  const [showInitials, setShowInitials] = useState(false);
  
  if (showInitials) {
    return (
      <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-sm font-bold text-slate-500 shadow-sm">
        {lead.name?.charAt(0) || '?'}
      </div>
    );
  }
  
  if (showFallback) {
    return (
      <img
        src="/linkedinavatar.png"
        alt=""
        className="w-10 h-10 rounded-full object-cover shadow-sm bg-slate-100"
        onError={() => setShowInitials(true)}
      />
    );
  }
  
  return (
    <img
      src={lead.profilePictureUrl}
      alt=""
      className="w-10 h-10 rounded-full object-cover shadow-sm"
      onError={() => setShowFallback(true)}
    />
  );
}

function LeadSelector({ leads }: { leads: QualifiedLead[] }) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const selectedLead = leads[selectedIndex];

  if (!selectedLead) {
    return (
      <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-8 text-center">
        <p className="text-slate-500">No leads available yet.</p>
      </div>
    );
  }

  // Replace merge tags with actual values - guard against undefined
  const filledEmail = (selectedLead.emailBody || '')
    .replace(/\{\{first_name\}\}/g, selectedLead.name?.split(' ')[0] || '')
    .replace(/\{\{company\}\}/g, selectedLead.company || '');

  const filledSubject = (selectedLead.emailSubject || '')
    .replace(/\{\{first_name\}\}/g, selectedLead.name?.split(' ')[0] || '')
    .replace(/\{\{company\}\}/g, selectedLead.company || '');

  return (
    <div className="bg-white rounded-2xl shadow-[0_20px_50px_-12px_rgba(0,0,0,0.1)] border border-slate-200 overflow-hidden flex flex-col lg:flex-row lg:h-[600px]">
      
      {/* Left - Lead List */}
      <div className="lg:w-5/12 border-b lg:border-b-0 lg:border-r border-slate-100 bg-slate-50/50 flex flex-col">
        <div className="p-4 border-b border-slate-100 bg-white/80 backdrop-blur-sm sticky top-0 z-10">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Prospect List</h3>
        </div>
        <div className="overflow-y-auto flex-1 max-h-[300px] lg:max-h-none">
          {leads.map((lead, index) => (
            <div
              key={lead.id}
              onClick={() => setSelectedIndex(index)}
              className={`group px-5 py-4 cursor-pointer transition-all border-b border-slate-100 last:border-0 hover:bg-white ${
                selectedIndex === index
                  ? 'bg-white border-l-4 border-l-sky-500 shadow-sm'
                  : 'border-l-4 border-l-transparent'
              }`}
            >
              <div className="flex items-start gap-3">
                {/* Avatar */}
                <div className="shrink-0 pt-1">
                  <LeadAvatar lead={lead} />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2">
                      <h4 className={`font-bold truncate ${selectedIndex === index ? 'text-sky-900' : 'text-slate-700'}`}>
                        {lead.name}
                      </h4>
                      <a
                        href={lead.linkedinUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-[#0A66C2] hover:text-[#004182] transition-colors shrink-0"
                      >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                        </svg>
                      </a>
                    </div>
                    {selectedIndex === index && (
                      <span className="text-sky-500">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mb-1">{lead.title} @ {lead.company}</p>
                  <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                    {lead.whyPicked}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right - Email Preview */}
      <div className="lg:w-7/12 bg-slate-50 flex flex-col relative">
        {/* Background Patterns */}
        <div className="absolute inset-0 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:20px_20px] opacity-50 pointer-events-none"></div>

        <div className="flex-1 p-4 lg:p-8 flex flex-col justify-center">
          
          {/* Email Window */}
          <motion.div 
            key={selectedLead.id}
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.2 }}
            className="bg-white rounded-xl shadow-2xl shadow-slate-200/50 border border-slate-200 overflow-hidden"
          >
            {/* Window Controls */}
            <div className="bg-slate-100 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
              <div className="flex gap-2">
                <div className="w-3 h-3 rounded-full bg-red-400 border border-red-500/20"></div>
                <div className="w-3 h-3 rounded-full bg-amber-400 border border-amber-500/20"></div>
                <div className="w-3 h-3 rounded-full bg-green-400 border border-green-500/20"></div>
              </div>
              <div className="text-xs font-medium text-slate-400 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-green-500"></span>
                Ready to send
              </div>
            </div>

            {/* Email Header */}
            <div className="px-4 lg:px-6 py-4 border-b border-slate-50">
              <div className="flex items-center gap-2 lg:gap-3 text-sm mb-3">
                <span className="text-slate-400 w-12 text-right shrink-0">To:</span>
                <div className="flex flex-wrap items-center gap-1 lg:gap-2 bg-sky-50 text-sky-700 px-2 py-0.5 rounded border border-sky-100">
                  <span className="font-medium">{selectedLead.name}</span>
                  <span className="text-sky-400 text-xs hidden sm:inline">&lt;{selectedLead.name.split(' ')[0].toLowerCase()}@{selectedLead.company.toLowerCase().replace(/\s+/g, '')}.com&gt;</span>
                </div>
              </div>
              <div className="flex items-center gap-2 lg:gap-3 text-sm">
                <span className="text-slate-400 w-12 text-right shrink-0">Subject:</span>
                <span className="font-medium text-slate-800">{filledSubject}</span>
              </div>
            </div>

            {/* Email Body */}
            <div className="px-4 lg:px-6 py-6 bg-white">
              <p className="whitespace-pre-wrap text-slate-700 leading-relaxed text-sm font-medium">
                {filledEmail}
              </p>
              
              <div className="mt-8 pt-4 border-t border-slate-100 flex items-center gap-3">
                 <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 font-bold">
                    B
                 </div>
                 <div className="text-xs text-slate-500">
                    <p className="font-bold text-slate-900">Bella Young</p>
                    <p>Growth @ ColdMessage.io</p>
                 </div>
              </div>
            </div>
          </motion.div>

        </div>
        
        {/* Verification Link */}
        <div className="bg-white border-t border-slate-200 px-6 py-3 flex justify-between items-center text-xs">
          <span className="text-slate-400">Preview Mode</span>
          <a
             href={selectedLead.linkedinUrl}
             target="_blank"
             rel="noopener noreferrer"
             className="flex items-center gap-1 text-blue-600 hover:text-blue-700 font-medium transition-colors"
          >
            Verify on LinkedIn
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M19 19H5V5h7V3H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z"/></svg>
          </a>
        </div>
      </div>
    </div>
  );
}
