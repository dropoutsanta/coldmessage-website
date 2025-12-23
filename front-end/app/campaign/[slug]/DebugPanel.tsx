'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CampaignDebugData, AnalysisDebugTrace } from '@/lib/types/debug';

interface Props {
  debugData: CampaignDebugData;
}

export default function DebugPanel({ debugData }: Props) {
  const [isOpen, setIsOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'personas' | 'ranking' | 'filters' | 'prompts'>('overview');
  const [expandedPersona, setExpandedPersona] = useState<string | null>(null);

  const { analysis, leadSearch, emailGeneration } = debugData;
  const { steps, summary } = analysis;

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: '🎯' },
    { id: 'personas', label: 'All Personas', icon: '👥' },
    { id: 'ranking', label: 'Rankings', icon: '📊' },
    { id: 'filters', label: 'Filters', icon: '🔍' },
    { id: 'prompts', label: 'LLM I/O', icon: '🤖' },
  ] as const;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50">
      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="absolute -top-12 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-4 py-2 rounded-t-lg text-sm font-semibold flex items-center gap-2 shadow-lg hover:bg-slate-800 transition-colors"
      >
        <span className="text-amber-400">🔬</span>
        Debug Panel
        <motion.span
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          ▲
        </motion.span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="bg-slate-900 text-slate-100 shadow-2xl border-t border-slate-700 max-h-[70vh] overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="bg-slate-800/50 px-6 py-4 border-b border-slate-700/50 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <span className="text-amber-400">⚡</span>
                  Multi-Agent Analysis Pipeline
                </h2>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-slate-400">Total time:</span>
                  <span className="font-mono text-emerald-400">{formatDuration(analysis.totalDurationMs)}</span>
                </div>
              </div>
              
              {/* Tabs */}
              <div className="flex gap-1 bg-slate-800 rounded-lg p-1">
                {tabs.map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5 ${
                      activeTab === tab.id
                        ? 'bg-slate-700 text-white'
                        : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                    }`}
                  >
                    <span>{tab.icon}</span>
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              <AnimatePresence mode="wait">
                {activeTab === 'overview' && (
                  <OverviewTab 
                    key="overview"
                    analysis={analysis} 
                    leadSearch={leadSearch}
                    emailGeneration={emailGeneration}
                    formatDuration={formatDuration}
                  />
                )}
                {activeTab === 'personas' && (
                  <PersonasTab 
                    key="personas"
                    personas={steps.icpBrainstormer.output.personas}
                    reasoning={steps.icpBrainstormer.output.reasoning}
                    selectedId={steps.coldEmailRanker.output.selectedPersonaId}
                    expandedPersona={expandedPersona}
                    setExpandedPersona={setExpandedPersona}
                  />
                )}
                {activeTab === 'ranking' && (
                  <RankingTab 
                    key="ranking"
                    evaluations={steps.coldEmailRanker.output.evaluations}
                    selectedId={steps.coldEmailRanker.output.selectedPersonaId}
                    selectionReasoning={steps.coldEmailRanker.output.selectionReasoning}
                  />
                )}
                {activeTab === 'filters' && (
                  <FiltersTab 
                    key="filters"
                    filters={steps.linkedInFilterBuilder.output}
                    summary={summary}
                  />
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function OverviewTab({ 
  analysis, 
  leadSearch, 
  emailGeneration,
  formatDuration 
}: { 
  analysis: AnalysisDebugTrace;
  leadSearch?: CampaignDebugData['leadSearch'];
  emailGeneration?: CampaignDebugData['emailGeneration'];
  formatDuration: (ms: number) => string;
}) {
  const { steps, summary } = analysis;

  const pipelineSteps = [
    {
      name: 'Company Profiler',
      icon: '🏢',
      duration: steps.companyProfiler.durationMs,
      status: steps.companyProfiler.status,
      result: `Analyzed ${summary.companyName}`,
      details: [
        `Product: ${steps.companyProfiler.output.productOrService}`,
        `Target Market: ${steps.companyProfiler.output.targetMarket}`,
      ],
    },
    {
      name: 'ICP Brainstormer',
      icon: '🧠',
      duration: steps.icpBrainstormer.durationMs,
      status: steps.icpBrainstormer.status,
      result: `Generated ${summary.personasGenerated} personas`,
      details: steps.icpBrainstormer.output.personas.map(p => p.name),
    },
    {
      name: 'Cold Email Ranker',
      icon: '📧',
      duration: steps.coldEmailRanker.durationMs,
      status: steps.coldEmailRanker.status,
      result: `Selected: ${summary.selectedPersona}`,
      details: [summary.selectionReason.slice(0, 150) + '...'],
    },
    {
      name: 'LinkedIn Filter Builder',
      icon: '🔗',
      duration: steps.linkedInFilterBuilder.durationMs,
      status: steps.linkedInFilterBuilder.status,
      result: `${summary.finalFilters.titles.length} titles, ${summary.finalFilters.industries.length} industries`,
      details: summary.finalFilters.titles.slice(0, 3),
    },
  ];

  if (leadSearch) {
    pipelineSteps.push({
      name: 'Lead Search',
      icon: '🔎',
      duration: leadSearch.durationMs || 0,
      status: leadSearch.status === 'completed' ? 'completed' : 'failed',
      result: `Found ${leadSearch.leadsFound} leads`,
      details: [`Request ID: ${leadSearch.requestId.slice(0, 16)}...`],
    });
  }

  if (emailGeneration) {
    pipelineSteps.push({
      name: 'Email Generation',
      icon: '✍️',
      duration: emailGeneration.durationMs,
      status: 'completed',
      result: `Generated ${emailGeneration.emailsGenerated} emails`,
      details: [`Parallel batch size: ${emailGeneration.parallelBatchSize}`],
    });
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-6"
    >
      {/* Summary Card */}
      <div className="bg-gradient-to-br from-slate-800 to-slate-800/50 rounded-xl p-6 border border-slate-700">
        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">Pipeline Summary</h3>
        <div className="grid grid-cols-4 gap-6">
          <div>
            <p className="text-3xl font-bold text-white">{summary.companyName}</p>
            <p className="text-sm text-slate-400">Company analyzed</p>
          </div>
          <div>
            <p className="text-3xl font-bold text-amber-400">{summary.personasGenerated}</p>
            <p className="text-sm text-slate-400">ICPs generated</p>
          </div>
          <div>
            <p className="text-3xl font-bold text-emerald-400">{formatDuration(analysis.totalDurationMs)}</p>
            <p className="text-sm text-slate-400">Analysis time</p>
          </div>
          <div>
            <p className="text-xl font-bold text-cyan-400 truncate">{summary.selectedPersona}</p>
            <p className="text-sm text-slate-400">Selected ICP</p>
          </div>
        </div>
      </div>

      {/* Pipeline Steps */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Agent Pipeline</h3>
        <div className="grid gap-3">
          {pipelineSteps.map((step, i) => (
            <motion.div
              key={step.name}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50 hover:border-slate-600 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-slate-700 flex items-center justify-center text-xl">
                    {step.icon}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-white">{step.name}</h4>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        step.status === 'completed' 
                          ? 'bg-emerald-500/20 text-emerald-400' 
                          : 'bg-red-500/20 text-red-400'
                      }`}>
                        {step.status}
                      </span>
                    </div>
                    <p className="text-sm text-slate-400">{step.result}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-mono text-lg text-emerald-400">{formatDuration(step.duration)}</p>
                  <p className="text-xs text-slate-500">duration</p>
                </div>
              </div>
              {step.details.length > 0 && (
                <div className="mt-3 pt-3 border-t border-slate-700/50">
                  <div className="flex flex-wrap gap-2">
                    {step.details.map((detail, j) => (
                      <span key={j} className="px-2 py-1 bg-slate-700/50 rounded text-xs text-slate-300">
                        {detail}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

function PersonasTab({ 
  personas, 
  reasoning, 
  selectedId,
  expandedPersona,
  setExpandedPersona
}: { 
  personas: AnalysisDebugTrace['steps']['icpBrainstormer']['output']['personas'];
  reasoning: string;
  selectedId: string;
  expandedPersona: string | null;
  setExpandedPersona: (id: string | null) => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-6"
    >
      {/* Reasoning */}
      <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-2">Brainstorming Reasoning</h3>
        <p className="text-slate-300 text-sm leading-relaxed">{reasoning}</p>
      </div>

      {/* Persona Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {personas.map((persona, i) => (
          <motion.div
            key={persona.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.1 }}
            className={`rounded-xl border transition-all cursor-pointer ${
              persona.id === selectedId
                ? 'bg-emerald-500/10 border-emerald-500/50 ring-2 ring-emerald-500/30'
                : 'bg-slate-800/50 border-slate-700/50 hover:border-slate-600'
            }`}
            onClick={() => setExpandedPersona(expandedPersona === persona.id ? null : persona.id)}
          >
            <div className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg font-bold ${
                    persona.id === selectedId
                      ? 'bg-emerald-500 text-white'
                      : 'bg-slate-700 text-slate-300'
                  }`}>
                    {i + 1}
                  </div>
                  <div>
                    <h4 className="font-bold text-white">{persona.name}</h4>
                    <p className="text-sm text-slate-400">{persona.seniority} • {persona.department}</p>
                  </div>
                </div>
                {persona.id === selectedId && (
                  <span className="px-2 py-1 bg-emerald-500/20 text-emerald-400 text-xs font-semibold rounded">
                    ✓ SELECTED
                  </span>
                )}
              </div>

              <div className="mt-4 flex flex-wrap gap-1">
                {persona.titles.slice(0, 3).map(title => (
                  <span key={title} className="px-2 py-0.5 bg-slate-700 rounded text-xs text-slate-300">
                    {title}
                  </span>
                ))}
                {persona.titles.length > 3 && (
                  <span className="px-2 py-0.5 bg-slate-700/50 rounded text-xs text-slate-500">
                    +{persona.titles.length - 3} more
                  </span>
                )}
              </div>
            </div>

            <AnimatePresence>
              {expandedPersona === persona.id && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="border-t border-slate-700/50 overflow-hidden"
                >
                  <div className="p-4 space-y-4 text-sm">
                    <div>
                      <h5 className="text-xs font-semibold text-slate-400 uppercase mb-2">Pain Points</h5>
                      <ul className="space-y-1">
                        {persona.painPoints.map((pain, j) => (
                          <li key={j} className="text-slate-300 flex items-start gap-2">
                            <span className="text-red-400">•</span> {pain}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h5 className="text-xs font-semibold text-slate-400 uppercase mb-2">Buying Triggers</h5>
                      <ul className="space-y-1">
                        {persona.buyingTriggers.map((trigger, j) => (
                          <li key={j} className="text-slate-300 flex items-start gap-2">
                            <span className="text-emerald-400">→</span> {trigger}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="bg-slate-700/30 rounded-lg p-3">
                      <h5 className="text-xs font-semibold text-amber-400 uppercase mb-1">Why This Persona</h5>
                      <p className="text-slate-300">{persona.whyThisPersona}</p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

function RankingTab({ 
  evaluations, 
  selectedId, 
  selectionReasoning 
}: { 
  evaluations: AnalysisDebugTrace['steps']['coldEmailRanker']['output']['evaluations'];
  selectedId: string;
  selectionReasoning: string;
}) {
  const metrics = [
    { key: 'inboxAccessibility', label: 'Inbox Access', color: 'bg-blue-500' },
    { key: 'painUrgency', label: 'Pain Urgency', color: 'bg-red-500' },
    { key: 'decisionAuthority', label: 'Decision Auth', color: 'bg-purple-500' },
    { key: 'reachability', label: 'Reachability', color: 'bg-amber-500' },
    { key: 'responselikelihood', label: 'Response Rate', color: 'bg-emerald-500' },
  ] as const;

  // Sort evaluations by overall score descending
  const sortedEvaluations = [...evaluations].sort((a, b) => b.overallScore - a.overallScore);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-6"
    >
      {/* Selection Reasoning */}
      <div className="bg-gradient-to-br from-emerald-500/10 to-slate-800/50 rounded-xl p-5 border border-emerald-500/30">
        <h3 className="text-sm font-semibold text-emerald-400 uppercase tracking-wider mb-3 flex items-center gap-2">
          <span>🎯</span> Final Selection Reasoning
        </h3>
        <p className="text-slate-200 leading-relaxed">{selectionReasoning}</p>
      </div>

      {/* Rankings Table */}
      <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 overflow-hidden">
        <div className="grid grid-cols-7 gap-4 p-4 bg-slate-800 border-b border-slate-700 text-xs font-semibold text-slate-400 uppercase tracking-wider">
          <div className="col-span-2">Persona</div>
          {metrics.map(m => (
            <div key={m.key} className="text-center">{m.label}</div>
          ))}
        </div>
        
        {sortedEvaluations.map((evaluation, i) => (
          <motion.div
            key={evaluation.personaId}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.1 }}
            className={`grid grid-cols-7 gap-4 p-4 items-center border-b border-slate-700/50 last:border-0 ${
              evaluation.personaId === selectedId ? 'bg-emerald-500/5' : ''
            }`}
          >
            <div className="col-span-2 flex items-center gap-3">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold ${
                evaluation.personaId === selectedId
                  ? 'bg-emerald-500 text-white'
                  : 'bg-slate-700 text-slate-400'
              }`}>
                {i + 1}
              </div>
              <div>
                <p className={`font-semibold ${evaluation.personaId === selectedId ? 'text-emerald-400' : 'text-white'}`}>
                  {evaluation.personaName}
                </p>
                <p className="text-xs text-slate-500">Score: {evaluation.overallScore.toFixed(1)}</p>
              </div>
            </div>
            
            {metrics.map(m => (
              <div key={m.key} className="text-center">
                <div className="relative w-full h-2 bg-slate-700 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(evaluation[m.key] as number) * 10}%` }}
                    transition={{ delay: i * 0.1 + 0.2, duration: 0.5 }}
                    className={`absolute inset-y-0 left-0 ${m.color} rounded-full`}
                  />
                </div>
                <span className="text-xs text-slate-400 mt-1 block">{evaluation[m.key]}</span>
              </div>
            ))}
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

function FiltersTab({ 
  filters, 
  summary 
}: { 
  filters: AnalysisDebugTrace['steps']['linkedInFilterBuilder']['output'];
  summary: AnalysisDebugTrace['summary'];
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-6"
    >
      {/* Final Filters */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-slate-800/50 rounded-xl p-5 border border-slate-700/50">
          <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
            <span>👤</span> Target Titles
          </h3>
          <div className="flex flex-wrap gap-2">
            {summary.finalFilters.titles.map(title => (
              <span key={title} className="px-3 py-1.5 bg-cyan-500/20 text-cyan-300 rounded-lg text-sm font-medium">
                {title}
              </span>
            ))}
          </div>
        </div>

        <div className="bg-slate-800/50 rounded-xl p-5 border border-slate-700/50">
          <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
            <span>🏭</span> Target Industries
          </h3>
          <div className="flex flex-wrap gap-2">
            {summary.finalFilters.industries.map(industry => (
              <span key={industry} className="px-3 py-1.5 bg-purple-500/20 text-purple-300 rounded-lg text-sm font-medium">
                {industry}
              </span>
            ))}
          </div>
        </div>

        <div className="bg-slate-800/50 rounded-xl p-5 border border-slate-700/50">
          <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
            <span>🌍</span> Target Locations
          </h3>
          <div className="flex flex-wrap gap-2">
            {summary.finalFilters.locations.map(location => (
              <span key={location} className="px-3 py-1.5 bg-emerald-500/20 text-emerald-300 rounded-lg text-sm font-medium">
                {location}
              </span>
            ))}
          </div>
        </div>

        <div className="bg-slate-800/50 rounded-xl p-5 border border-slate-700/50">
          <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
            <span>📊</span> Company Size
          </h3>
          <span className="px-3 py-1.5 bg-amber-500/20 text-amber-300 rounded-lg text-sm font-medium">
            {summary.finalFilters.companySize}
          </span>
        </div>
      </div>

      {/* Sales Navigator URL */}
      <div className="bg-slate-800/50 rounded-xl p-5 border border-slate-700/50">
        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
          <span>🔗</span> Generated Sales Navigator URL
        </h3>
        <div className="bg-slate-900 rounded-lg p-4 font-mono text-xs text-slate-300 break-all overflow-x-auto">
          {filters.salesNavUrl}
        </div>
        <button
          onClick={() => navigator.clipboard.writeText(filters.salesNavUrl)}
          className="mt-3 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
        >
          <span>📋</span> Copy URL
        </button>
      </div>
    </motion.div>
  );
}

