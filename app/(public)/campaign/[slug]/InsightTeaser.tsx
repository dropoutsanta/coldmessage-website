'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { LiveDebugData } from '@/lib/services/campaignGenerator';
import { 
  Globe, 
  Building2, 
  BrainCircuit, 
  BarChart3, 
  Filter, 
  Search, 
  PenTool, 
  Check, 
  Target,
  Users2,
  MapPin,
  Briefcase
} from 'lucide-react';

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
  const agentIcons: Record<string, React.ReactNode> = {
    'Website Scraper': <Globe className="w-12 h-12 text-blue-500" />,
    'Company Profiler': <Building2 className="w-12 h-12 text-indigo-500" />,
    'ICP Brainstormer': <BrainCircuit className="w-12 h-12 text-purple-500" />,
    'Cold Email Ranker': <BarChart3 className="w-12 h-12 text-emerald-500" />,
    'LinkedIn Filter Builder': <Filter className="w-12 h-12 text-amber-500" />,
    'Lead Finder': <Search className="w-12 h-12 text-orange-500" />,
    'Email Writer': <PenTool className="w-12 h-12 text-pink-500" />,
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
      <div className="mb-6 drop-shadow-sm p-4 bg-white/50 rounded-2xl border border-white/60">
        {agentIcons[agentName] || <Globe className="w-12 h-12 text-slate-400" />}
      </div>
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
  // Helper for truncating text with simple expand logic if needed in future
  // For now, we keep it concise with line clamping
  const Section = ({ title, content, borderColor }: { title: string, content: string, borderColor: string }) => (
    <div className={`border-l-2 pl-3 text-left ${borderColor} py-1`}>
      <h4 className="text-[10px] font-bold uppercase tracking-wider mb-1 text-slate-400">
        {title}
      </h4>
      <p className="text-sm text-slate-700 leading-relaxed font-medium line-clamp-3">
        {content}
      </p>
    </div>
  );

  return (
    <div className="h-full flex flex-col">
      {/* Main Content with integrated header */}
      <div className="flex-1 overflow-y-auto custom-scrollbar px-1 pb-2">
        {/* Header - now scrolls */}
        <div className="flex items-center gap-4 mb-6 px-2 pt-2">
          <div className="w-14 h-14 bg-white rounded-2xl border border-slate-100 flex items-center justify-center shadow-sm shrink-0 text-indigo-500">
            <Building2 className="w-8 h-8" />
          </div>
          <div className="min-w-0 flex-1 text-left">
            {(output.name || companyName) && (
              <h3 className="text-lg font-bold text-slate-900 leading-tight truncate">
                {output.name || companyName}
          </h3>
            )}
            {output.industry && (
              <p className="text-xs font-semibold text-slate-400 mt-1 truncate">
                {output.industry}
              </p>
          )}
        </div>
      </div>
      
        {output.tagline && (
          <div className="text-center mb-6 px-2">
            <p className="text-sm text-slate-600 font-medium italic relative">
              <span className="text-slate-300 absolute -top-2 -left-1 text-2xl">"</span>
              {output.tagline}
              <span className="text-slate-300 absolute -bottom-4 -right-1 text-2xl">"</span>
            </p>
          </div>
        )}
        
        <div className="space-y-4 px-1">
        {output.productOrService && (
          <Section 
            title="What they do" 
            content={output.productOrService}
            borderColor="border-sky-400"
          />
        )}
        
        {output.problemTheySolve && (
          <Section 
            title="Problem Solved" 
            content={output.problemTheySolve}
            borderColor="border-rose-400"
          />
        )}
        
        {output.targetMarket && (
          <Section 
            title="Who they serve" 
            content={output.targetMarket}
            borderColor="border-indigo-400"
          />
        )}

        {output.competitiveAdvantage && (
          <Section 
            title="Why them" 
            content={output.competitiveAdvantage}
            borderColor="border-emerald-400"
          />
        )}
        </div>
      </div>
    </div>
  );
}

/**
 * Personas brainstorm content
 */
function BrainstormContent({ personas }: { personas: NonNullable<LiveDebugData['allPersonas']> }) {
  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-3 mb-4 shrink-0">
        <div className="p-2 bg-purple-50 rounded-lg border border-purple-100 text-purple-600">
          <BrainCircuit className="w-6 h-6" />
        </div>
        <div>
          <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
            Buyer Personas
          </h3>
          <p className="text-sm font-bold text-slate-900">{personas.length} identified</p>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto space-y-4 pr-1 pb-2 custom-scrollbar touch-pan-y">
        {personas.map((persona) => (
          <div key={persona.id} className="border-l-2 border-purple-300 pl-3 py-1 hover:bg-purple-50/30 transition-colors rounded-r-lg -ml-1">
            <p className="text-sm font-bold text-slate-800 truncate leading-tight">{persona.name}</p>
              {persona.titles.length > 0 && (
              <p className="text-[11px] text-slate-400 font-medium truncate mt-0.5">
                {persona.titles.slice(0, 2).join(' / ')}
              </p>
            )}
            {/* @ts-ignore - roleDescription added to type recently */}
            {persona.roleDescription && (
              <p className="text-xs text-slate-600 mt-1.5 leading-relaxed line-clamp-2">
                {/* @ts-ignore */}
                {persona.roleDescription}
                </p>
              )}
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
        <div className="p-2 bg-emerald-50 rounded-lg border border-emerald-100 text-emerald-600">
          <Target className="w-6 h-6" />
        </div>
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
          <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center text-white text-[10px] shadow-sm">
            <Check className="w-3 h-3" />
          </div>
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
      {/* Compact Header */}
      <div className="flex items-center gap-3 mb-4 shrink-0">
        <div className="p-2 bg-amber-50 rounded-lg border border-amber-100 text-amber-600">
          <Search className="w-6 h-6" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-slate-900 leading-tight">
            Search Criteria
          </h3>
          <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">
            LinkedIn Sales Navigator
          </p>
        </div>
      </div>
      
      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-1 pb-2 custom-scrollbar touch-pan-y">
        
        {/* Titles Section */}
        {filters.titles.length > 0 && (
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Target Titles</p>
            <div className="flex flex-wrap gap-1.5">
              {filters.titles.slice(0, 5).map((title, i) => (
                <span key={i} className="px-2 py-1 bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded font-medium shadow-sm break-words max-w-full">
                  {title}
                </span>
              ))}
              {filters.titles.length > 5 && (
                <span className="px-2 py-1 bg-slate-50 border border-slate-100 text-slate-400 text-xs rounded font-medium">
                  +{filters.titles.length - 5}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Details Grid */}
        <div className="grid grid-cols-1 gap-3">
            {filters.industries.length > 0 && (
              <div className="bg-slate-50/50 rounded-lg p-2.5 border border-slate-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Industry</p>
                <p className="text-xs font-semibold text-slate-800 leading-relaxed">
                  {filters.industries.join(', ')}
                </p>
              </div>
            )}
            
            {(filters.locations.length > 0 || filters.companySize) && (
              <div className="bg-slate-50/50 rounded-lg p-2.5 border border-slate-100">
                 <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Parameters</p>
                 <div className="flex flex-wrap gap-2">
                    {filters.locations.length > 0 && (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200">
                          <MapPin className="w-3 h-3" /> {filters.locations[0]}
                        </span>
                    )}
                    {filters.companySize && (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200">
                          <Building2 className="w-3 h-3" /> {filters.companySize}
                        </span>
                    )}
                 </div>
              </div>
            )}
        </div>
        </div>

      {/* Footer - Results */}
        {leadsFound !== undefined && leadsFound > 0 && (
        <div className="mt-3 pt-3 border-t border-slate-100 shrink-0">
          <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-100 px-3 py-2.5 rounded-xl">
            <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 font-bold shrink-0">
              <Check className="w-5 h-5" />
            </div>
              <div>
               <p className="text-sm font-bold text-emerald-900 leading-tight">
                  Found {leadsFound.toLocaleString()} leads
               </p>
               <p className="text-[10px] font-medium text-emerald-600 uppercase tracking-wide">
                  Ready to message
               </p>
              </div>
            </div>
          </div>
        )}
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
      
      // Try to parse "Total candidates: X" from the result string first (which indicates total pool)
      // Fallback to "Found X" or details array length
      let leadsFound = undefined;
      
      if (leadFinderAgent?.result) {
         const totalMatch = leadFinderAgent.result.match(/Total candidates: (\d+)/i);
         const foundMatch = leadFinderAgent.result.match(/Found (\d+)/i);
         
         if (totalMatch) {
            leadsFound = parseInt(totalMatch[1]);
         } else if (foundMatch) {
            leadsFound = parseInt(foundMatch[1]);
         }
      }
      
      if (leadsFound === undefined && leadFinderAgent?.details?.length) {
         leadsFound = leadFinderAgent.details.length;
      }
      
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
    <div className="w-full h-full flex flex-col">
      {/* Carousel container filling parent */}
      <div 
        ref={containerRef}
        className="relative flex-1 w-full overflow-hidden"
      >
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.div
            key={panels[currentIndex]?.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            transition={{ duration: 0.4, ease: [0.32, 0.72, 0, 1] }}
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

      {/* Navigation dots - now part of the flex column */}
      {panels.length > 1 && (
        <div className="flex justify-center gap-1.5 mt-4 flex-shrink-0">
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
          className="text-center text-xs text-slate-400 mt-2 flex-shrink-0"
        >
          Swipe to see more →
        </motion.p>
      )}
    </div>
  );
}
