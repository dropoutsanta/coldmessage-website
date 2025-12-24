// Multi-Agent ICP Analysis Pipeline
// 
// This pipeline breaks down company analysis into focused, specialized agents:
//
// Agent 1: Company Profiler
//   - Analyzes website content
//   - Extracts structured company profile
//   - Observes facts, doesn't infer
//
// Agent 2: ICP Brainstormer  
//   - Generates 4-5 distinct buyer personas
//   - Explores obvious and non-obvious buyers
//   - Creates rich persona descriptions
//
// Agent 3: Cold Email Susceptibility Ranker
//   - Evaluates each persona for cold email effectiveness
//   - Scores on inbox accessibility, pain urgency, decision authority
//   - Selects the persona most likely to RESPOND (not just buy)
//
// Agent 4: LinkedIn Filter Builder
//   - Translates selected persona to LinkedIn filters
//   - Uses exact LinkedIn IDs for industries and geos
//   - Optimizes for Sales Navigator search

export { profileCompany } from './companyProfiler';
export type { CompanyProfile, CompanyProfilerResult } from './companyProfiler';
export { brainstormICPs } from './icpBrainstormer';
export type { ICPPersona, ICPBrainstormResult } from './icpBrainstormer';
export { rankPersonasForColdEmail } from './coldEmailRanker';
export type { PersonaEvaluation, ColdEmailRankingResult } from './coldEmailRanker';
export { buildLinkedInFilters } from './linkedinFilterBuilder';
export type { LinkedInFilterResult, CompanyContext } from './linkedinFilterBuilder';

