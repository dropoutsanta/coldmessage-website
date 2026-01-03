'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LiveDebugData } from '@/lib/services/campaignGenerator';
import { useStreamingFields } from '@/lib/hooks/useStreamingCampaign';
import StreamingFieldsDisplay from './StreamingFieldsDisplay';
import { Check } from 'lucide-react';

interface Props {
  liveDebug: LiveDebugData | null;
}

interface SectionData {
  id: string;
  agentName: string;
  status: 'streaming' | 'complete';
  content?: React.ReactNode;
}

/**
 * Minimal card for Company Profile
 */
function CompanyCard({ profile }: { profile: any }) {
  return (
    <div className="bg-white rounded-lg border border-slate-200 p-4">
      <div className="text-lg font-bold text-slate-900 mb-1">{profile.name}</div>
      <div className="text-sm text-slate-600 mb-2">{profile.tagline}</div>
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <span>{profile.industry}</span>
        <span>•</span>
        <span>{profile.targetMarket}</span>
      </div>
    </div>
  );
}

/**
 * Minimal card for Personas - horizontal scroll
 */
function PersonasCard({ personas }: { personas: any[] }) {
  return (
    <div className="bg-white rounded-lg border border-slate-200 p-4">
      <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">
        {personas.length} Buyer Personas
      </div>
      <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {personas.map((p, i) => (
          <div
            key={i}
            className="px-3 py-1.5 bg-slate-50 rounded-md border border-slate-200 text-sm font-medium text-slate-700 whitespace-nowrap shrink-0"
          >
            {p.name}
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Minimal card for Ranking - score bars
 */
function RankingCard({ winner, rankings }: { winner: any; rankings: any[] }) {
  const sorted = [...rankings].sort((a, b) => b.score - a.score);
  
  return (
    <div className="bg-white rounded-lg border border-slate-200 p-4">
      <div className="space-y-2.5">
        {sorted.slice(0, 3).map((r, i) => (
          <div key={i} className="flex items-center gap-3">
            {i === 0 && <Check className="w-4 h-4 text-emerald-600 shrink-0" />}
            {i !== 0 && <div className="w-4 h-4 shrink-0" />}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <span className={`text-sm font-medium truncate ${i === 0 ? 'text-slate-900' : 'text-slate-600'}`}>
                  {r.personaName}
                </span>
                <span className={`text-xs font-mono font-bold ml-2 shrink-0 ${i === 0 ? 'text-emerald-600' : 'text-slate-400'}`}>
                  {r.score.toFixed(1)}
                </span>
              </div>
              <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${i === 0 ? 'bg-emerald-500' : 'bg-slate-300'}`}
                  style={{ width: `${(r.score / 10) * 100}%` }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Minimal card for Filters - tags and inline metadata
 */
function FiltersCard({ filters }: { filters: any }) {
  return (
    <div className="bg-white rounded-lg border border-slate-200 p-4">
      <div className="flex flex-wrap gap-1.5 mb-3">
        {filters.titles.slice(0, 6).map((t: string, i: number) => (
          <span
            key={i}
            className="px-2 py-1 bg-slate-50 text-slate-700 text-xs rounded border border-slate-200 font-medium"
          >
            {t}
          </span>
        ))}
      </div>
      <div className="flex items-center gap-3 text-xs text-slate-500 pt-2 border-t border-slate-100">
        <span>{filters.industries[0]?.text || filters.industries[0]}</span>
        <span>•</span>
        <span>{filters.locations[0]?.text || filters.locations[0]}</span>
        {filters.companySize && (
          <>
            <span>•</span>
            <span>{filters.companySize}</span>
          </>
        )}
      </div>
    </div>
  );
}

/**
 * Wrapper for streaming content - minimal version
 */
function StreamingWrapper({ agentName }: { agentName: string }) {
  const { fields, tokenCount } = useStreamingFields(agentName);
  
  if (Object.keys(fields).length === 0) {
    return (
      <div className="bg-white rounded-lg border-2 border-amber-200 border-dashed p-4">
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <div className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
          <span>Analyzing...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border-2 border-amber-200 p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
          <span className="text-xs font-semibold text-amber-600 uppercase tracking-wide">Live</span>
        </div>
        <span className="text-[10px] font-mono text-slate-400">{tokenCount} tokens</span>
      </div>
      <StreamingFieldsDisplay 
        parsedFields={fields}
        agentName={agentName}
        isStreaming={true}
      />
    </div>
  );
}

export default function InsightTeaser({ liveDebug }: Props) {
  const [sections, setSections] = useState<SectionData[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [userHasScrolled, setUserHasScrolled] = useState(false);

  // Build sections based on liveDebug data
  useEffect(() => {
    if (!liveDebug) return;

    const newSections: SectionData[] = [];

    // Helper to add sections
    const addSection = (agentName: string, id: string, content?: React.ReactNode) => {
      const isComplete = liveDebug.completedAgents.some(a => a.name === agentName);
      const isRunning = liveDebug.currentAgent === agentName;
      
      if (isComplete || isRunning) {
        newSections.push({
          id,
          agentName,
          status: isComplete ? 'complete' : 'streaming',
          content: isComplete ? content : undefined
        });
      }
    };

    // 1. Company Profiler
    const profiler = liveDebug.completedAgents.find(a => a.name === 'Company Profiler');
    const profile = profiler?.output as any;
    
    addSection('Company Profiler', 'company', profile && (
      <CompanyCard profile={profile} />
    ));

    // 2. ICP Brainstormer
    const personas = (liveDebug.allPersonas || []);
    
    addSection('ICP Brainstormer', 'personas', personas.length > 0 && (
      <PersonasCard personas={personas} />
    ));

    // 3. Cold Email Ranker
    const winner = liveDebug.selectedPersona;
    const rankings = liveDebug.rankings || [];
    
    addSection('Cold Email Ranker', 'ranker', winner && (
      <RankingCard winner={winner} rankings={rankings} />
    ));

    // 4. LinkedIn Filter Builder
    const filters = liveDebug.finalFilters;
    
    addSection('LinkedIn Filter Builder', 'filters', filters && (
      <FiltersCard filters={filters} />
    ));

    setSections(newSections);
  }, [liveDebug]);

  // Auto-scroll logic
  useEffect(() => {
    if (!userHasScrolled && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [sections.length, liveDebug?.currentAgent, userHasScrolled]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - scrollTop - clientHeight > 100) {
      setUserHasScrolled(true);
    } else {
      setUserHasScrolled(false);
    }
  };

  if (!liveDebug) return null;

  return (
    <div className="w-full h-full bg-slate-50 flex flex-col">
      <div 
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto custom-scrollbar px-4 sm:px-6 py-8"
        onScroll={handleScroll}
      >
        <div className="max-w-xl mx-auto space-y-6">
          <AnimatePresence mode="popLayout">
            {sections.map((section, index) => (
              <motion.div
                key={section.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="relative pl-6"
              >
                {/* Connector Line */}
                {index < sections.length - 1 && (
                  <div className="absolute left-[11px] top-8 bottom-[-1.5rem] w-0.5 bg-slate-200" />
                )}

                {/* Minimal Dot Indicator */}
                <div className={`absolute left-0 top-2 w-3 h-3 rounded-full border-2 border-white ${
                  section.status === 'streaming' 
                    ? 'bg-amber-400 animate-pulse ring-2 ring-amber-100' 
                    : 'bg-slate-300'
                }`} />

                {/* Card Content */}
                <div className="pt-1">
                  {section.status === 'streaming' ? (
                    <StreamingWrapper agentName={section.agentName} />
                  ) : (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.1 }}
                    >
                      {section.content}
                    </motion.div>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          <div ref={bottomRef} className="h-4" />
        </div>
      </div>
    </div>
  );
}