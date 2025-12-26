'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LiveDebugData, LiveAgentResult } from '@/lib/services/campaignGenerator';
import { 
  Globe, 
  Building2, 
  BrainCircuit, 
  Mail, 
  Filter, 
  Search, 
  PenTool, 
  Check, 
  ChevronRight, 
  ChevronDown,
  Microscope
} from 'lucide-react';

interface Props {
  liveDebug: LiveDebugData | null;
  isLoading: boolean;
}

function AgentDebugDetails({ agent }: { agent: LiveAgentResult }) {
  const [expandedSection, setExpandedSection] = useState<'prompt' | 'response' | 'output' | null>(null);

  if (!agent.prompt && !agent.response && !agent.output) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      className="mt-2 pt-2 border-t border-slate-700/50"
    >
      <div className="flex gap-2 mb-2">
        {agent.prompt && (
          <button
            onClick={() => setExpandedSection(expandedSection === 'prompt' ? null : 'prompt')}
            className={`px-2 py-1 text-xs rounded font-medium transition-colors ${
              expandedSection === 'prompt'
                ? 'bg-purple-500/30 text-purple-300'
                : 'bg-slate-700/50 text-slate-400 hover:bg-slate-700'
            }`}
          >
            📝 Prompt
          </button>
        )}
        {agent.response && (
          <button
            onClick={() => setExpandedSection(expandedSection === 'response' ? null : 'response')}
            className={`px-2 py-1 text-xs rounded font-medium transition-colors ${
              expandedSection === 'response'
                ? 'bg-blue-500/30 text-blue-300'
                : 'bg-slate-700/50 text-slate-400 hover:bg-slate-700'
            }`}
          >
            💬 Response
          </button>
        )}
        {agent.output !== undefined && agent.output !== null && (
          <button
            onClick={() => setExpandedSection(expandedSection === 'output' ? null : 'output')}
            className={`px-2 py-1 text-xs rounded font-medium transition-colors ${
              expandedSection === 'output'
                ? 'bg-emerald-500/30 text-emerald-300'
                : 'bg-slate-700/50 text-slate-400 hover:bg-slate-700'
            }`}
          >
            📦 Output
          </button>
        )}
      </div>

      <AnimatePresence mode="wait">
        {expandedSection && (
          <motion.div
            key={expandedSection}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-slate-950 rounded-lg p-3 max-h-64 overflow-auto">
              <pre className="text-xs text-slate-300 whitespace-pre-wrap font-mono leading-relaxed">
                {expandedSection === 'prompt' && String(agent.prompt || '')}
                {expandedSection === 'response' && String(agent.response || '')}
                {expandedSection === 'output' && JSON.stringify(agent.output, null, 2)}
              </pre>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function LiveDebugPanel({ liveDebug, isLoading }: Props) {
  const [expandedAgents, setExpandedAgents] = useState<Set<string>>(new Set());

  if (!liveDebug) return null;

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const toggleAgent = (name: string) => {
    const newSet = new Set(expandedAgents);
    if (newSet.has(name)) {
      newSet.delete(name);
    } else {
      newSet.add(name);
    }
    setExpandedAgents(newSet);
  };

  // All possible agents in order
  const allAgents = [
    { name: 'Website Scraper', icon: <Globe className="w-4 h-4" />, description: 'Analyzing website content' },
    { name: 'Company Profiler', icon: <Building2 className="w-4 h-4" />, description: 'Understanding the business' },
    { name: 'ICP Brainstormer', icon: <BrainCircuit className="w-4 h-4" />, description: 'Generating buyer personas' },
    { name: 'Cold Email Ranker', icon: <Mail className="w-4 h-4" />, description: 'Evaluating response likelihood' },
    { name: 'LinkedIn Filter Builder', icon: <Filter className="w-4 h-4" />, description: 'Building search filters' },
    { name: 'Lead Finder', icon: <Search className="w-4 h-4" />, description: 'Searching for leads' },
    { name: 'Email Writer', icon: <PenTool className="w-4 h-4" />, description: 'Crafting personalized emails' },
  ];

  const completedNames = new Set(liveDebug.completedAgents.map(a => a.name));

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      className="mt-6 bg-slate-900 rounded-xl border border-slate-700 overflow-hidden"
    >
      {/* Header */}
      <div className="bg-slate-800 px-4 py-3 border-b border-slate-700 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Microscope className="w-4 h-4 text-amber-400" />
          <h3 className="font-semibold text-white text-sm">Live Agent Pipeline</h3>
        </div>
        {isLoading && (
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
            Running...
          </div>
        )}
      </div>

      {/* Agent Pipeline */}
      <div className="p-4 space-y-2">
        {allAgents.map((agent, i) => {
          const completed = liveDebug.completedAgents.find(a => a.name === agent.name);
          const isCurrent = liveDebug.currentAgent === agent.name;
          const isPending = !completed && !isCurrent;
          const isComplete = !!completed;
          const isExpanded = expandedAgents.has(agent.name);
          const hasDebugData = completed && (completed.prompt || completed.response || completed.output !== undefined);

          // Only show if completed, current, or next up
          const shouldShow = isComplete || isCurrent || (isPending && completedNames.size >= i - 1);
          if (!shouldShow && i > completedNames.size + 1) return null;

          return (
            <motion.div
              key={agent.name}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className={`p-3 rounded-lg transition-all ${
                isCurrent
                  ? 'bg-amber-500/10 border border-amber-500/30'
                  : isComplete
                  ? 'bg-slate-800/50 border border-slate-700/50'
                  : 'bg-slate-800/20 border border-slate-700/20 opacity-40'
              }`}
            >
              <div 
                className={`flex items-center gap-3 ${hasDebugData ? 'cursor-pointer' : ''}`}
                onClick={() => hasDebugData && toggleAgent(agent.name)}
              >
                {/* Icon */}
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-lg ${
                  isCurrent
                    ? 'bg-amber-500/20 text-amber-400'
                    : isComplete
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : 'bg-slate-700/50 text-slate-500'
                }`}>
                  {isCurrent ? (
                    <motion.div
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ repeat: Infinity, duration: 1.5 }}
                    >
                      {agent.icon}
                    </motion.div>
                  ) : (
                    agent.icon
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`font-medium text-sm ${
                      isCurrent ? 'text-amber-400' : isComplete ? 'text-white' : 'text-slate-500'
                    }`}>
                      {agent.name}
                    </span>
                    {isCurrent && (
                      <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 text-xs rounded-full font-medium">
                        Running...
                      </span>
                    )}
                    {isComplete && (
                      <Check className="w-3 h-3 text-emerald-400" />
                    )}
                    {hasDebugData && (
                      <span className="text-slate-500 text-xs flex items-center gap-1">
                        {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />} details
                      </span>
                    )}
                  </div>
                  {completed ? (
                    <p className="text-xs text-slate-400 truncate">{completed.result}</p>
                  ) : (
                    <p className="text-xs text-slate-500">{agent.description}</p>
                  )}
                </div>

                {/* Duration */}
                {completed && (
                  <div className="text-right">
                    <span className="text-xs font-mono text-emerald-400">
                      {formatDuration(completed.duration)}
                    </span>
                  </div>
                )}
              </div>

              {/* Expanded Debug Info */}
              <AnimatePresence>
                {isExpanded && completed && (
                  <AgentDebugDetails agent={completed} />
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>

      {/* Live Data Preview */}
      <AnimatePresence>
        {liveDebug.allPersonas && liveDebug.allPersonas.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="border-t border-slate-700 p-4"
          >
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
              Generated Personas
            </h4>
            <div className="flex flex-wrap gap-2">
              {liveDebug.allPersonas.map((persona, i) => (
                <motion.span
                  key={persona.id}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.1 }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium ${
                    liveDebug.selectedPersona?.id === persona.id
                      ? 'bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/50'
                      : 'bg-slate-700 text-slate-300'
                  }`}
                >
                  {persona.name}
                  {liveDebug.selectedPersona?.id === persona.id && (
                    <span className="ml-1 text-emerald-400">✓</span>
                  )}
                </motion.span>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Rankings Preview */}
      <AnimatePresence>
        {liveDebug.rankings && liveDebug.rankings.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="border-t border-slate-700 p-4"
          >
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
              Persona Rankings
            </h4>
            <div className="space-y-2">
              {[...liveDebug.rankings].sort((a, b) => b.score - a.score).map((rank, i) => (
                <motion.div
                  key={rank.personaId}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="flex items-center gap-3"
                >
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    i === 0 ? 'bg-emerald-500 text-white' : 'bg-slate-700 text-slate-400'
                  }`}>
                    {i + 1}
                  </span>
                  <span className={`text-sm flex-1 ${i === 0 ? 'text-emerald-400 font-medium' : 'text-slate-300'}`}>
                    {rank.personaName}
                  </span>
                  <div className="w-24 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${rank.score * 10}%` }}
                      className={`h-full rounded-full ${i === 0 ? 'bg-emerald-500' : 'bg-slate-500'}`}
                    />
                  </div>
                  <span className="text-xs font-mono text-slate-400 w-8 text-right">
                    {rank.score.toFixed(1)}
                  </span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Selection Reasoning */}
      <AnimatePresence>
        {liveDebug.selectedPersona?.reason && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="border-t border-slate-700 p-4"
          >
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Why This Persona?
            </h4>
            <p className="text-sm text-slate-300 leading-relaxed">
              {liveDebug.selectedPersona.reason}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Final Filters Preview */}
      <AnimatePresence>
        {liveDebug.finalFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="border-t border-slate-700 p-4"
          >
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
              LinkedIn Filters Ready
            </h4>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-slate-500">Titles:</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {liveDebug.finalFilters.titles.slice(0, 3).map(t => (
                    <span key={t} className="px-2 py-0.5 bg-cyan-500/20 text-cyan-300 rounded">
                      {t}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <span className="text-slate-500">Locations:</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {liveDebug.finalFilters.locations.slice(0, 2).map(l => (
                    <span key={l} className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 rounded">
                      {l}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sales Navigator URL */}
      <AnimatePresence>
        {liveDebug.salesNavUrl && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="border-t border-slate-700 p-4"
          >
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Sales Navigator URL
            </h4>
            <a
              href={liveDebug.salesNavUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-cyan-400 hover:text-cyan-300 underline break-all"
            >
              {liveDebug.salesNavUrl.slice(0, 80)}...
            </a>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
