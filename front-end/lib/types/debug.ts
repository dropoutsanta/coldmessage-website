/**
 * Debug types for the multi-agent ICP analysis pipeline
 * These capture the full reasoning chain for transparency
 */

import { CompanyProfile } from '../services/agents/companyProfiler';
import { ICPPersona } from '../services/agents/icpBrainstormer';
import { PersonaEvaluation } from '../services/agents/coldEmailRanker';
import { ICPSettings } from './index';

/**
 * A single step in the agent pipeline
 */
export interface AgentStep {
  agent: string;
  title: string;
  startedAt: string;
  completedAt: string;
  durationMs: number;
  status: 'completed' | 'failed';
  error?: string;
  /** The full prompt sent to the LLM */
  prompt?: string;
  /** The raw response from the LLM */
  response?: string;
}

/**
 * Stage 1: Company Profiler debug data
 */
export interface CompanyProfilerDebug extends AgentStep {
  agent: 'company-profiler';
  input: {
    url: string;
    title: string;
    description: string;
    markdownLength: number;
  };
  output: CompanyProfile;
}

/**
 * Stage 2: ICP Brainstormer debug data
 */
export interface ICPBrainstormerDebug extends AgentStep {
  agent: 'icp-brainstormer';
  input: {
    companyName: string;
    productOrService: string;
    targetMarket: string;
  };
  output: {
    personas: ICPPersona[];
    reasoning: string;
  };
}

/**
 * Stage 3: Cold Email Ranker debug data
 */
export interface ColdEmailRankerDebug extends AgentStep {
  agent: 'cold-email-ranker';
  input: {
    companyName: string;
    personaCount: number;
    personaNames: string[];
  };
  output: {
    evaluations: PersonaEvaluation[];
    selectedPersonaId: string;
    selectedPersonaName: string;
    selectionReasoning: string;
  };
}

/**
 * Stage 4: LinkedIn Filter Builder debug data
 */
export interface LinkedInFilterBuilderDebug extends AgentStep {
  agent: 'linkedin-filter-builder';
  input: {
    personaName: string;
    titles: string[];
    companySize: string;
    industries: string[];
  };
  output: {
    filters: ICPSettings;
    salesNavUrl: string;
  };
}

/**
 * Complete debug trace for the analysis pipeline
 */
export interface AnalysisDebugTrace {
  pipelineId: string;
  domain: string;
  startedAt: string;
  completedAt: string;
  totalDurationMs: number;
  
  steps: {
    companyProfiler: CompanyProfilerDebug;
    icpBrainstormer: ICPBrainstormerDebug;
    coldEmailRanker: ColdEmailRankerDebug;
    linkedInFilterBuilder: LinkedInFilterBuilderDebug;
  };
  
  // Summary for quick display
  summary: {
    companyName: string;
    personasGenerated: number;
    selectedPersona: string;
    selectionReason: string;
    finalFilters: {
      titles: string[];
      industries: string[];
      locations: string[];
      companySize: string;
    };
  };
}

/**
 * Full campaign debug data including lead finding
 */
export interface CampaignDebugData {
  analysis: AnalysisDebugTrace;
  leadSearch?: {
    salesNavUrl: string;
    requestId: string;
    startedAt: string;
    completedAt?: string;
    durationMs?: number;
    leadsFound: number;
    status: 'pending' | 'completed' | 'timeout' | 'error';
  };
  emailGeneration?: {
    startedAt: string;
    completedAt: string;
    durationMs: number;
    emailsGenerated: number;
    parallelBatchSize: number;
  };
}

