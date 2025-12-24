'use client';

import { CampaignData, QualifiedLead } from '@/lib/types';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSearchParams, useRouter } from 'next/navigation';
import WorldMap from './WorldMap';
import DomainEntryForm from './DomainEntryForm';
import ICPSettingsModal from './ICPSettingsModal';
import LiveDebugPanel from './LiveDebugPanel';
import { CampaignDebugData } from '@/lib/types/debug';
import { LiveDebugData, LiveAgentResult } from '@/lib/services/campaignGenerator';

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
    allPersonas: analysis.steps.icpBrainstormer?.output?.personas?.map((p: { id: string; name: string; titles: string[] }) => ({
      id: p.id,
      name: p.name,
      titles: p.titles || [],
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

export default function CampaignPage({ campaign: initialCampaign, slug }: Props) {
  const router = useRouter();
  const [campaign, setCampaign] = useState<CampaignData | null>(initialCampaign);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [debugData, setDebugData] = useState<CampaignDebugData | null>(null);
  const [liveDebug, setLiveDebug] = useState<LiveDebugData | null>(null);
  const [isRegenerating, setIsRegenerating] = useState(false);
  
  const searchParams = useSearchParams();
  const isDebugMode = searchParams.get('debug') === 'true';

  const handleRegenerate = async () => {
    if (!campaign?.domain) return;
    
    setIsRegenerating(true);
    try {
      // Navigate to domain entry form with the domain pre-filled
      router.push(`/campaign/new?domain=${encodeURIComponent(campaign.domain)}`);
    } catch (error) {
      console.error('Failed to regenerate campaign:', error);
      setIsRegenerating(false);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Unknown';
    try {
      const date = new Date(dateString);
      return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });
    } catch {
      return 'Unknown';
    }
  };

  // Convert debugData to liveDebug format if we have debugData but not liveDebug
  const effectiveLiveDebug = liveDebug || (debugData ? convertDebugDataToLiveDebug(debugData) : null);

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

  // Extract ICP settings from current campaign
  const currentICPSettings = {
    domain: campaign.websiteUrl?.replace(/^https?:\/\//, '').replace(/^www\./, '') || '',
    titles: campaign.icpAttributes?.[0]?.split(', ') || ['CEO', 'Founder'],
    companySize: campaign.icpAttributes?.[1] || '10-200 employees',
    industries: campaign.icpAttributes?.[2]?.split(', ') || ['SaaS', 'Tech'],
    locations: [campaign.location || 'United States'],
  };

  return (
    <div className="min-h-screen bg-[#F0F9FF] text-slate-800 font-sans selection:bg-cyan-200 selection:text-cyan-900 relative overflow-hidden">
      
      {/* Background Ambient Glows */}
      <div className="fixed top-0 left-1/4 w-[500px] h-[500px] bg-sky-200/40 rounded-full blur-[100px] pointer-events-none mix-blend-multiply" />
      <div className="fixed bottom-0 right-1/4 w-[600px] h-[600px] bg-cyan-200/40 rounded-full blur-[100px] pointer-events-none mix-blend-multiply" />

      {/* Action Buttons - Floating */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
        <button
          onClick={() => setIsSettingsOpen(true)}
          className="bg-white px-4 py-2 rounded-lg shadow-lg border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-all flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          Edit Settings
        </button>
        <button
          onClick={handleRegenerate}
          disabled={isRegenerating || !campaign?.domain}
          className="bg-sky-600 text-white px-4 py-2 rounded-lg shadow-lg border border-sky-700 text-sm font-semibold hover:bg-sky-700 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          {isRegenerating ? 'Regenerating...' : 'Regenerate Campaign'}
        </button>
      </div>

      {/* ICP Settings Modal */}
      <ICPSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        currentSettings={currentICPSettings}
        slug={slug}
        onSave={(newCampaign) => setCampaign(newCampaign)}
      />

      {/* Hero Section */}
      <section className="px-6 py-12 border-b border-white/50 relative z-10 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left */}
          <div className="space-y-6">
            <div>
              <img src="/coldmessage_logo.png" alt="ColdMessage" className="h-32 w-auto drop-shadow-xl" />
            </div>
            
            <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight">
              {campaign.companyName}
            </h1>
            <p className="text-xl text-slate-600 font-medium">
              Your cold email campaign is ready to launch.
            </p>
            
            {/* Last Updated & Sales Nav Link */}
            <div className="flex flex-col gap-2 text-sm">
              {campaign.updatedAt && (
                <p className="text-slate-500">
                  Last generated: <span className="font-semibold text-slate-700">{formatDate(campaign.updatedAt)}</span>
                </p>
              )}
              {campaign.salesNavigatorUrl && (
                <a
                  href={campaign.salesNavigatorUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sky-600 hover:text-sky-700 font-medium flex items-center gap-1 w-fit"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                  </svg>
                  View Sales Navigator Search
                </a>
              )}
            </div>
            
            <div className="flex flex-wrap gap-3">
              {[
                'Start sending today',
                '99% Deliverability',
                '100% Personalized'
              ].map((text, i) => (
                <div key={i} className="px-4 py-2 rounded-lg bg-white/70 border border-sky-100 shadow-sm text-sm font-semibold text-slate-700">
                  {text}
                </div>
              ))}
            </div>
            
            {/* Trusted By */}
            <div className="pt-8">
              <p className="text-xs text-slate-400 font-medium mb-4">Trusted by</p>
              <div className="flex items-center gap-8 flex-wrap">
                {[
                  { src: '/logos/instantly.svg', alt: 'Instantly' },
                  { src: '/logos/heyreach.png', alt: 'HeyReach' },
                  { src: '/logos/emailbison.png', alt: 'EmailBison' },
                  { src: '/logos/emailguard.png', alt: 'EmailGuard' },
                  { src: '/logos/ezshop.png', alt: 'EZShop' },
                ].map((logo) => (
                  <img
                    key={logo.alt}
                    src={logo.src}
                    alt={logo.alt}
                    className="h-6 w-auto object-contain opacity-50 grayscale"
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Right - Loom Video */}
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-sky-300 to-cyan-300 rounded-2xl blur opacity-30 group-hover:opacity-60 transition duration-1000"></div>
            <div className="relative bg-white rounded-xl shadow-xl border border-sky-100 overflow-hidden aspect-video flex items-center justify-center">
              {campaign.loom_video_url ? (
                <iframe
                  src={campaign.loom_video_url.replace('share', 'embed')}
                  allowFullScreen
                  className="w-full h-full"
                />
              ) : (
                <div className="text-center space-y-4">
                  <div className="w-20 h-20 rounded-full bg-sky-50 flex items-center justify-center mx-auto shadow-inner">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-sky-400 to-cyan-400 flex items-center justify-center shadow-lg text-white pl-1">
                      <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                    </div>
                  </div>
                  <p className="font-semibold text-slate-500">Watch Campaign Walkthrough</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Campaign Summary */}
      <section className="px-6 py-12 relative z-10">
        <div className="max-w-6xl mx-auto">
          
          {/* Section Header */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Here's the campaign we built for you</h2>
            <p className="text-slate-500">Review the targeting, numbers, and sample emails below. If everything looks good, launch it today.</p>
          </div>

          <div className="space-y-4">
          
          {/* Targeting Card */}
          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden flex flex-col lg:flex-row">
            
            {/* Left - Map Visual */}
            <div className="lg:w-5/12 bg-slate-50 border-r border-slate-200 relative min-h-[300px] lg:min-h-full">
              <div className="absolute top-4 left-4 z-10 bg-white/90 backdrop-blur-sm px-2.5 py-1 rounded-md border border-slate-200 shadow-sm">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Target Region</p>
              </div>
              <div className="absolute inset-0 p-4">
                <WorldMap targetGeo={campaign.targetGeo} />
              </div>
            </div>

            {/* Right - Data Points */}
            <div className="lg:w-7/12 p-6 lg:p-8 flex flex-col justify-center">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-semibold text-slate-900 text-lg">Targeting Criteria</h2>
                <button
                  onClick={() => setIsSettingsOpen(true)}
                  className="text-xs text-sky-600 hover:text-sky-700 font-semibold flex items-center gap-1"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                  Edit
                </button>
              </div>
              
              <div className="grid grid-cols-2 gap-y-8 gap-x-4">
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-wide mb-1.5 font-semibold">Titles</p>
                  <p className="text-sm text-slate-900 font-medium leading-relaxed">{campaign.icpAttributes[0] || 'Founders, CEOs, VPs of Sales'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-wide mb-1.5 font-semibold">Company Size</p>
                  <p className="text-sm text-slate-900 font-medium leading-relaxed">{campaign.icpAttributes[1] || '10-200 employees'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-wide mb-1.5 font-semibold">Industry</p>
                  <p className="text-sm text-slate-900 font-medium leading-relaxed">{campaign.icpAttributes[2] || 'SaaS, Tech, Agencies'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-wide mb-1.5 font-semibold">Primary Location</p>
                  <p className="text-sm text-slate-900 font-medium leading-relaxed">{campaign.location}</p>
                </div>
              </div>
              
              {/* Sample companies */}
              <div className="mt-8 pt-6 border-t border-slate-100">
                <p className="text-xs text-slate-400 uppercase tracking-wide mb-3 font-semibold">Sample companies</p>
                <div className="flex flex-wrap gap-2">
                  {['Acme Corp', 'TechFlow', 'ScaleUp Inc', 'GrowthLabs', 'CloudBase', '+ 495 more'].map((company, i) => (
                    <span key={i} className={`px-2.5 py-1 rounded-md text-xs font-medium ${i === 5 ? 'bg-slate-100 text-slate-500' : 'bg-white text-slate-600 border border-slate-200 shadow-sm'}`}>
                      {company}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* The Numbers */}
          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
            <div className="px-6 py-3 bg-slate-50 border-b border-slate-200">
              <h2 className="font-semibold text-slate-900 text-sm">The numbers</h2>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
                <div>
                  <p className="text-2xl font-bold text-slate-900">{campaign.priceTier1Emails}</p>
                  <p className="text-xs text-slate-500">emails sent</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">7</p>
                  <p className="text-xs text-slate-500">days to send</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">~45%</p>
                  <p className="text-xs text-slate-500">open rate</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">~3%</p>
                  <p className="text-xs text-slate-500">reply rate</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-sky-600">~15</p>
                  <p className="text-xs text-slate-500">expected replies</p>
                </div>
              </div>
            </div>
          </div>

          {/* What you get */}
          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
            <div className="px-6 py-3 bg-slate-50 border-b border-slate-200">
              <h2 className="font-semibold text-slate-900 text-sm">What you get</h2>
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
                  <span className="text-slate-700">Suggested follow-up campaigns to keep momentum</span>
                </div>
              </div>
            </div>
          </div>

          </div>
        </div>
      </section>

      {/* Review Your Campaign */}
      <section className="px-6 py-16 relative z-10">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Review Your Prospects</h2>
            <p className="text-slate-500">
              We found {campaign.qualifiedLeads.length} high-intent leads. Click a row to preview the personalized email.
            </p>
          </div>

          <LeadSelector leads={campaign.qualifiedLeads.slice(0, 5)} />
        </div>
      </section>

      {/* CTA Section */}
      <section className="px-6 py-24 relative z-10">
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
                
                <button className="w-full bg-slate-900 text-white text-lg font-bold py-4 rounded-xl shadow-lg hover:shadow-xl hover:bg-slate-800 transform transition-all active:scale-[0.98] flex items-center justify-center gap-2">
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

      {/* Footer */}
      <footer className={`bg-slate-950 py-12 px-6 text-center border-t border-slate-800 relative z-10 ${isDebugMode && effectiveLiveDebug ? 'pb-[75vh]' : ''}`}>
        <div className="flex items-center justify-center gap-3 mb-6 opacity-50 grayscale hover:grayscale-0 hover:opacity-100 transition-all duration-500">
          <img src="/coldmessage_logo.png" alt="ColdMessage" className="h-24 w-auto" />
          <span className="text-white font-bold tracking-tight text-lg">ColdMessage.io</span>
        </div>
        <p className="text-slate-600 text-sm">
          © {new Date().getFullYear()} ColdMessage Inc. All rights reserved.
        </p>
      </footer>
      
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
    </div>
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

  // Replace merge tags with actual values
  const filledEmail = selectedLead.emailBody
    .replace(/\{\{first_name\}\}/g, selectedLead.name.split(' ')[0])
    .replace(/\{\{company\}\}/g, selectedLead.company);

  const filledSubject = selectedLead.emailSubject
    .replace(/\{\{first_name\}\}/g, selectedLead.name.split(' ')[0])
    .replace(/\{\{company\}\}/g, selectedLead.company);

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
                   {lead.profilePictureUrl ? (
                      <img
                        src={lead.profilePictureUrl}
                        alt={lead.name}
                        className="w-10 h-10 rounded-full object-cover shadow-sm"
                      />
                    ) : (
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shadow-sm transition-colors ${
                        selectedIndex === index 
                          ? 'bg-sky-500 text-white' 
                          : 'bg-white border border-slate-200 text-slate-500 group-hover:border-sky-200'
                      }`}>
                        {lead.name.charAt(0)}
                      </div>
                    )}
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
            <div className="px-4 lg:px-6 py-4 border-b border-slate-50 space-y-3">
              <div className="flex items-start lg:items-center gap-2 lg:gap-3 text-sm">
                <span className="text-slate-400 w-10 lg:w-12 text-right shrink-0">To:</span>
                <div className="flex flex-wrap items-center gap-1 lg:gap-2 bg-sky-50 text-sky-700 px-2 py-0.5 rounded border border-sky-100">
                  <span className="font-medium">{selectedLead.name}</span>
                  <span className="text-sky-400 text-xs hidden sm:inline">&lt;{selectedLead.name.split(' ')[0].toLowerCase()}@{selectedLead.company.toLowerCase().replace(/\s+/g, '')}.com&gt;</span>
                </div>
              </div>
              <div className="flex items-start lg:items-center gap-2 lg:gap-3 text-sm">
                <span className="text-slate-400 w-10 lg:w-12 text-right shrink-0">Subject:</span>
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
