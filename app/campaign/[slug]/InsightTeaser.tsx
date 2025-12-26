'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { LiveDebugData } from '@/lib/services/campaignGenerator';

interface Props {
  liveDebug: LiveDebugData | null;
}

interface CompanyProfileOutput {
  name?: string;
  productOrService?: string;
  targetMarket?: string;
  competitiveAdvantage?: string;
  problemTheySolve?: string;
  howTheySolveIt?: string;
  industry?: string;
  tagline?: string;
}

interface PanelData {
  id: string;
  type: 'current' | 'company' | 'brainstorm' | 'winner' | 'targets';
  content: React.ReactNode;
}

/**
 * Glass panel wrapper with frosted ice aesthetic
 */
function GlassPanel({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-full w-full backdrop-blur-md bg-white/85 border border-slate-200/60 rounded-xl shadow-xl shadow-sky-100/40 p-5 relative overflow-hidden">
      {/* Subtle ice gradient overlay */}
      <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-sky-50/50 via-transparent to-blue-50/30 pointer-events-none" />
      <div className="relative z-10 h-full overflow-y-auto custom-scrollbar">
        {children}
      </div>
    </div>
  );
}

/**
 * Currently running agent indicator
 */
function CurrentAgentContent({ agentName }: { agentName: string }) {
  const agentIcons: Record<string, string> = {
    'Website Scraper': '🌐',
    'Company Profiler': '🏢',
    'ICP Brainstormer': '🧠',
    'Cold Email Ranker': '📊',
    'LinkedIn Filter Builder': '🔗',
    'Lead Finder': '🔍',
    'Email Writer': '✍️',
  };

  const agentDescriptions: Record<string, string> = {
    'Website Scraper': 'Reading your website content and structure...',
    'Company Profiler': 'Understanding what your company does and who you serve...',
    'ICP Brainstormer': 'Generating potential buyer personas for your product...',
    'Cold Email Ranker': 'Evaluating which personas are most likely to respond...',
    'LinkedIn Filter Builder': 'Building targeted search filters for LinkedIn...',
    'Lead Finder': 'Searching for qualified prospects on LinkedIn...',
    'Email Writer': 'Crafting personalized emails for each lead...',
  };

  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-2">
      <motion.span 
        className="text-5xl mb-6 drop-shadow-sm"
        animate={{ scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] }}
        transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
      >
        {agentIcons[agentName] || '⚡'}
      </motion.span>
      <h3 className="text-xs font-bold text-amber-600 uppercase tracking-widest mb-2 border-b border-amber-100 pb-1">
        Now Running
      </h3>
      <p className="text-lg font-bold text-slate-800 mb-3">{agentName}</p>
      <p className="text-sm text-slate-600 leading-relaxed font-medium">
        {agentDescriptions[agentName] || 'Processing...'}
      </p>
      <motion.div 
        className="mt-6 flex gap-2"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        {[0, 1, 2].map(i => (
          <motion.div
            key={i}
            className="w-2 h-2 rounded-full bg-amber-400"
            animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.2, 0.8] }}
            transition={{ repeat: Infinity, duration: 1.5, delay: i * 0.2 }}
          />
        ))}
      </motion.div>
    </div>
  );
}

/**
 * Company Profile content
 */
function CompanyContent({ output, companyName }: { output: CompanyProfileOutput; companyName?: string }) {
  return (
    <div className="space-y-4 h-full flex flex-col">
      <div className="flex items-center gap-3 mb-1">
        <span className="text-2xl bg-blue-50 p-2 rounded-lg border border-blue-100">🏢</span>
        <div>
          <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
            Company Profile
          </h3>
          {(output.name || companyName) && (
            <p className="text-base font-bold text-slate-900 leading-tight">{output.name || companyName}</p>
          )}
        </div>
      </div>
      
      <div className="flex-1 space-y-3 overflow-y-auto pr-1">
        {output.tagline && (
          <p className="text-xs font-medium text-slate-600 italic border-l-2 border-sky-300 pl-3 py-0.5 bg-sky-50/50 rounded-r-md">
            "{output.tagline}"
          </p>
        )}
        
        {output.productOrService && (
          <div className="text-sm text-slate-800">
            <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">What they do</span>
            <span className="leading-snug font-medium">{output.productOrService}</span>
          </div>
        )}
        
        {output.targetMarket && (
          <div className="text-sm text-slate-800">
            <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Who they serve</span>
            <span className="leading-snug font-medium">{output.targetMarket}</span>
          </div>
        )}
      </div>

      {output.industry && (
        <div className="pt-2 mt-auto border-t border-slate-100">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-sky-100 text-sky-800 text-xs rounded-full font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-500"></span>
            {output.industry}
          </span>
        </div>
      )}
    </div>
  );
}

/**
 * Personas brainstorm content
 */
function BrainstormContent({ personas }: { personas: NonNullable<LiveDebugData['allPersonas']> }) {
  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-3 mb-4">
        <span className="text-2xl bg-purple-50 p-2 rounded-lg border border-purple-100">🧠</span>
        <div>
          <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
            Buyer Personas
          </h3>
          <p className="text-sm font-bold text-slate-900">{personas.length} identified</p>
        </div>
      </div>
      
      <div className="space-y-3 flex-1 overflow-y-auto pr-1">
        {personas.slice(0, 4).map((persona, i) => (
          <div key={persona.id} className="flex items-start gap-3 p-2 rounded-lg hover:bg-white/50 transition-colors">
            <span className="w-6 h-6 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-xs font-bold text-slate-500 shrink-0 mt-0.5">
              {i + 1}
            </span>
            <div className="min-w-0">
              <p className="text-sm font-bold text-slate-800 truncate">{persona.name}</p>
              {persona.titles.length > 0 && (
                <p className="text-xs text-slate-500 font-medium truncate mt-0.5">
                  {persona.titles.slice(0, 2).join(', ')}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Persona winner content
 */
function WinnerContent({ 
  rankings, 
  selectedPersona,
  allPersonas
}: { 
  rankings: NonNullable<LiveDebugData['rankings']>;
  selectedPersona: NonNullable<LiveDebugData['selectedPersona']>;
  allPersonas?: LiveDebugData['allPersonas'];
}) {
  const sortedRankings = [...rankings].sort((a, b) => b.score - a.score);
  const winner = sortedRankings[0];
  const winnerPersona = allPersonas?.find(p => p.id === winner?.personaId);

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-3 mb-3">
        <span className="text-2xl bg-emerald-50 p-2 rounded-lg border border-emerald-100">🎯</span>
        <div>
          <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
            Best Fit Selected
          </h3>
          <p className="text-xs font-semibold text-slate-700">Ranked {rankings.length} personas</p>
        </div>
      </div>
      
      {/* Winner highlight */}
      <div className="bg-gradient-to-br from-emerald-50 to-white border border-emerald-200 rounded-lg p-3 mb-3 shadow-sm">
        <div className="flex items-center gap-2 mb-1.5">
          <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center text-white text-[10px] shadow-sm">✓</div>
          <span className="text-sm font-bold text-emerald-900 truncate">{winner?.personaName}</span>
          <span className="ml-auto text-xs font-bold font-mono bg-white text-emerald-700 px-2 py-0.5 rounded border border-emerald-100 shadow-sm">
            {winner?.score.toFixed(1)}
          </span>
        </div>
        {winnerPersona?.titles && winnerPersona.titles.length > 0 && (
          <p className="text-xs text-emerald-700 font-medium truncate pl-7">
            {winnerPersona.titles.slice(0, 2).join(' • ')}
          </p>
        )}
      </div>

      {/* Runner ups */}
      <div className="space-y-1.5 mb-3 px-1">
        {sortedRankings.slice(1, 3).map((rank, i) => (
          <div key={rank.personaId} className="flex items-center gap-3 text-xs text-slate-600">
            <span className="w-5 h-5 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-400 shadow-sm">
              {i + 2}
            </span>
            <span className="flex-1 truncate font-medium">{rank.personaName}</span>
            <span className="font-mono text-slate-400 font-semibold">{rank.score.toFixed(1)}</span>
          </div>
        ))}
      </div>

      {/* Reasoning */}
      {selectedPersona.reason && (
        <div className="pt-2 mt-auto border-t border-slate-100">
          <p className="text-xs text-slate-600 font-medium leading-relaxed line-clamp-3">
            <span className="font-bold text-slate-700">Why: </span>
            {selectedPersona.reason}
          </p>
        </div>
      )}
    </div>
  );
}

/**
 * Target filters content
 */
function TargetsContent({ 
  filters,
  leadsFound 
}: { 
  filters: NonNullable<LiveDebugData['finalFilters']>;
  leadsFound?: number;
}) {
  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-3 mb-4">
        <span className="text-2xl bg-amber-50 p-2 rounded-lg border border-amber-100">🔍</span>
        <div>
          <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
            Search Criteria
          </h3>
          <p className="text-xs font-semibold text-slate-700">LinkedIn Sales Navigator</p>
        </div>
      </div>
      
      <div className="space-y-4 flex-1">
        {filters.titles.length > 0 && (
          <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase mb-2">Target Titles</p>
            <div className="flex flex-wrap gap-1.5">
              {filters.titles.slice(0, 3).map((title, i) => (
                <span key={i} className="px-2.5 py-1 bg-white border border-slate-200 text-slate-700 text-xs rounded-md font-bold shadow-sm truncate max-w-[140px]">
                  {title}
                </span>
              ))}
              {filters.titles.length > 3 && (
                <span className="px-2 py-1 bg-slate-50 border border-slate-100 text-slate-500 text-xs rounded-md font-medium">
                  +{filters.titles.length - 3}
                </span>
              )}
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
            {filters.industries.length > 0 && (
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">Industry</p>
                <p className="text-xs font-bold text-slate-800 line-clamp-2">
                  {filters.industries.slice(0, 2).join(', ')}
                </p>
              </div>
            )}
            
            {(filters.locations.length > 0 || filters.companySize) && (
              <div>
                 <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">Details</p>
                 <div className="space-y-1">
                    {filters.locations.length > 0 && (
                        <p className="text-xs font-medium text-slate-600 truncate">📍 {filters.locations[0]}</p>
                    )}
                    {filters.companySize && (
                        <p className="text-xs font-medium text-slate-600 truncate">🏢 {filters.companySize}</p>
                    )}
                 </div>
              </div>
            )}
        </div>

        {leadsFound !== undefined && leadsFound > 0 && (
          <div className="mt-auto pt-3 border-t border-slate-100">
            <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-100 px-3 py-2 rounded-lg">
              <span className="text-emerald-500 font-bold text-lg">✓</span>
              <div>
                 <p className="text-sm font-bold text-emerald-800">Found {leadsFound} leads</p>
                 <p className="text-[10px] font-medium text-emerald-600 uppercase tracking-wide">Ready to message</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Main InsightTeaser component - Apple-style swipeable carousel
 */
export default function InsightTeaser({ liveDebug }: Props) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [panels, setPanels] = useState<PanelData[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  // Build panels array based on available data
  useEffect(() => {
    if (!liveDebug) {
      setPanels([]);
      return;
    }

    const newPanels: PanelData[] = [];

    // Current agent panel (always first when processing)
    const isStillProcessing = liveDebug.currentAgent && 
      !['', 'complete'].includes(liveDebug.currentAgent.toLowerCase());
    if (isStillProcessing) {
      newPanels.push({
        id: 'current',
        type: 'current',
        content: <CurrentAgentContent agentName={liveDebug.currentAgent} />
      });
    }

    // Company profile
    const companyProfilerAgent = liveDebug.completedAgents.find(a => a.name === 'Company Profiler');
    const companyProfile = companyProfilerAgent?.output as CompanyProfileOutput | undefined;
    if (companyProfile) {
      newPanels.push({
        id: 'company',
        type: 'company',
        content: <CompanyContent 
          output={companyProfile} 
          companyName={liveDebug.domain?.replace(/\.(com|io|co|net|org).*$/, '')}
        />
      });
    }

    // Personas brainstorm (before ranking)
    const hasPersonas = liveDebug.allPersonas && liveDebug.allPersonas.length > 0;
    const hasRankings = liveDebug.rankings && liveDebug.rankings.length > 0;
    if (hasPersonas && !hasRankings) {
      newPanels.push({
        id: 'brainstorm',
        type: 'brainstorm',
        content: <BrainstormContent personas={liveDebug.allPersonas!} />
      });
    }

    // Winner (after ranking)
    const hasSelectedPersona = liveDebug.selectedPersona?.id;
    if (hasRankings && hasSelectedPersona) {
      newPanels.push({
        id: 'winner',
        type: 'winner',
        content: <WinnerContent 
          rankings={liveDebug.rankings!}
          selectedPersona={liveDebug.selectedPersona!}
          allPersonas={liveDebug.allPersonas}
        />
      });
    }

    // Target filters
    const hasFilters = liveDebug.finalFilters && liveDebug.finalFilters.titles.length > 0;
    if (hasFilters) {
      const leadFinderAgent = liveDebug.completedAgents.find(a => a.name === 'Lead Finder');
      const leadsFound = leadFinderAgent?.details?.length || 
        (leadFinderAgent?.result.match(/Found (\d+)/)?.[1] 
          ? parseInt(leadFinderAgent.result.match(/Found (\d+)/)![1]) 
          : undefined);
      
      newPanels.push({
        id: 'targets',
        type: 'targets',
        content: <TargetsContent filters={liveDebug.finalFilters!} leadsFound={leadsFound} />
      });
    }

    setPanels(newPanels);

    // Auto-advance to newest panel when new panels appear
    if (newPanels.length > panels.length && newPanels.length > 0) {
      setCurrentIndex(newPanels.length - 1);
    }
  }, [liveDebug, panels.length]);

  // Handle swipe gestures
  const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const threshold = 50;
    if (info.offset.x < -threshold && currentIndex < panels.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else if (info.offset.x > threshold && currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  if (!liveDebug || panels.length === 0) return null;

  return (
    <div className="w-full max-w-[320px]">
      {/* Carousel container with fixed height */}
      <div 
        ref={containerRef}
        className="relative h-[280px] w-full overflow-hidden"
      >
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.div
            key={panels[currentIndex]?.id}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.2}
            onDragEnd={handleDragEnd}
            className="absolute inset-0 cursor-grab active:cursor-grabbing"
          >
            <GlassPanel>
              {panels[currentIndex]?.content}
            </GlassPanel>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation dots */}
      {panels.length > 1 && (
        <div className="flex justify-center gap-1.5 mt-3">
          {panels.map((panel, i) => (
            <button
              key={panel.id}
              onClick={() => setCurrentIndex(i)}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                i === currentIndex 
                  ? 'bg-sky-500 w-4' 
                  : 'bg-slate-300 hover:bg-slate-400'
              }`}
              aria-label={`Go to panel ${i + 1}`}
            />
          ))}
        </div>
      )}

      {/* Swipe hint */}
      {panels.length > 1 && currentIndex === 0 && (
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="text-center text-xs text-slate-400 mt-2"
        >
          Swipe to see more →
        </motion.p>
      )}
    </div>
  );
}
