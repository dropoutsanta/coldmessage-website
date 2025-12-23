import { CompanyInfo, ICPSettings } from '../types';
import { ScrapedWebsite } from './websiteScraper';
import {
  profileCompany,
  CompanyProfile,
  brainstormICPs,
  ICPPersona,
  rankPersonasForColdEmail,
  ColdEmailRankingResult,
  buildLinkedInFilters,
} from './agents';
import { buildSalesNavigatorUrl } from './salesNavUrlBuilder';
import {
  AnalysisDebugTrace,
  CompanyProfilerDebug,
  ICPBrainstormerDebug,
  ColdEmailRankerDebug,
  LinkedInFilterBuilderDebug,
} from '../types/debug';

export interface AnalyzedCompany {
  companyInfo: CompanyInfo;
  suggestedICP: ICPSettings;
}

/**
 * Extended result with full pipeline details
 */
export interface AnalysisWithDetails extends AnalyzedCompany {
  companyProfile: CompanyProfile;
  allPersonas: ICPPersona[];
  personaEvaluations: ColdEmailRankingResult;
  selectedPersona: ICPPersona;
  debugTrace?: AnalysisDebugTrace;
}

/**
 * Callback for live progress updates during analysis
 */
export interface AnalysisProgressCallback {
  (update: {
    currentAgent: string;
    completedAgent?: {
      name: string;
      duration: number;
      result: string;
      details?: string[];
      prompt?: string;
      response?: string;
      output?: unknown;
    };
    allPersonas?: { id: string; name: string; titles: string[] }[];
    selectedPersona?: { id: string; name: string; reason: string };
    rankings?: { personaId: string; personaName: string; score: number }[];
    finalFilters?: { titles: string[]; industries: string[]; locations: string[]; companySize: string };
    salesNavUrl?: string;
  }): void;
}

/**
 * Multi-Agent Company & ICP Analysis Pipeline
 * 
 * Stage 1: Company Profiler - Extract structured understanding of the company
 * Stage 2: ICP Brainstormer - Generate 4-5 distinct buyer personas
 * Stage 3: Cold Email Ranker - Evaluate and select best persona for cold email
 * Stage 4: LinkedIn Filter Builder - Translate persona to search filters
 * 
 * This approach is more effective than a single monolithic prompt because:
 * - Each agent has a focused, specialized task
 * - Context is clean and relevant for each stage
 * - Easier to debug which step is failing
 * - The "cold email susceptibility" stage adds expertise the old approach lacked
 */
export async function analyzeCompanyAndICP(
  scrapedWebsite: ScrapedWebsite,
  domain: string,
  preferredLocations?: string[],
  captureDebug: boolean = false,
  onProgress?: AnalysisProgressCallback
): Promise<AnalyzedCompany & { debugTrace?: AnalysisDebugTrace }> {
  console.log(`[ICPAnalyzer] Starting multi-agent analysis for ${domain}...`);
  const pipelineStart = Date.now();
  const pipelineId = `analysis-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  // Debug capture helpers
  let debugTrace: AnalysisDebugTrace | undefined;
  let step1Debug: CompanyProfilerDebug | undefined;
  let step2Debug: ICPBrainstormerDebug | undefined;
  let step3Debug: ColdEmailRankerDebug | undefined;
  let step4Debug: LinkedInFilterBuilderDebug | undefined;

  // ========================================
  // STAGE 1: Company Profiler
  // ========================================
  console.log(`[ICPAnalyzer] Stage 1/4: Profiling company...`);
  onProgress?.({ currentAgent: 'Company Profiler' });
  const step1Start = Date.now();
  const companyProfilerResult = await profileCompany(scrapedWebsite, domain);
  const companyProfile = companyProfilerResult.profile;
  const step1End = Date.now();
  
  // Report Stage 1 completion
  onProgress?.({
    currentAgent: 'ICP Brainstormer',
    completedAgent: {
      name: 'Company Profiler',
      duration: step1End - step1Start,
      result: `Analyzed ${companyProfile.name}`,
      details: [
        `Product: ${companyProfile.productOrService}`,
        `Target: ${companyProfile.targetMarket}`,
      ],
      prompt: companyProfilerResult.debug.prompt,
      response: companyProfilerResult.debug.response,
      output: companyProfile,
    },
  });

  if (captureDebug) {
    step1Debug = {
      agent: 'company-profiler',
      title: 'Company Profiler',
      startedAt: new Date(step1Start).toISOString(),
      completedAt: new Date(step1End).toISOString(),
      durationMs: step1End - step1Start,
      status: 'completed',
      input: {
        url: scrapedWebsite.url,
        title: scrapedWebsite.title,
        description: scrapedWebsite.description,
        markdownLength: scrapedWebsite.markdown.length,
      },
      output: companyProfile,
    };
  }

  // ========================================
  // STAGE 2: ICP Brainstormer
  // ========================================
  console.log(`[ICPAnalyzer] Stage 2/4: Brainstorming ICPs...`);
  const step2Start = Date.now();
  const icpResult = await brainstormICPs(companyProfile);
  const step2End = Date.now();
  
  // Report Stage 2 completion with all personas
  onProgress?.({
    currentAgent: 'Cold Email Ranker',
    completedAgent: {
      name: 'ICP Brainstormer',
      duration: step2End - step2Start,
      result: `Generated ${icpResult.personas.length} personas`,
      details: icpResult.personas.map(p => p.name),
      prompt: icpResult.debug.prompt,
      response: icpResult.debug.response,
      output: { personas: icpResult.personas, reasoning: icpResult.reasoning },
    },
    allPersonas: icpResult.personas.map(p => ({
      id: p.id,
      name: p.name,
      titles: p.titles,
    })),
  });

  if (captureDebug) {
    step2Debug = {
      agent: 'icp-brainstormer',
      title: 'ICP Brainstormer',
      startedAt: new Date(step2Start).toISOString(),
      completedAt: new Date(step2End).toISOString(),
      durationMs: step2End - step2Start,
      status: 'completed',
      input: {
        companyName: companyProfile.name,
        productOrService: companyProfile.productOrService,
        targetMarket: companyProfile.targetMarket,
      },
      output: {
        personas: icpResult.personas,
        reasoning: icpResult.reasoning,
      },
    };
  }

  // ========================================
  // STAGE 3: Cold Email Susceptibility Ranker
  // ========================================
  console.log(`[ICPAnalyzer] Stage 3/4: Ranking personas for cold email...`);
  const step3Start = Date.now();
  const rankingResult = await rankPersonasForColdEmail(companyProfile, icpResult.personas);
  const step3End = Date.now();
  
  // Report Stage 3 completion with rankings and selection
  onProgress?.({
    currentAgent: 'LinkedIn Filter Builder',
    completedAgent: {
      name: 'Cold Email Ranker',
      duration: step3End - step3Start,
      result: `Selected: ${rankingResult.selectedPersona.name}`,
      details: [rankingResult.selectionReasoning.slice(0, 100) + '...'],
      prompt: rankingResult.debug.prompt,
      response: rankingResult.debug.response,
      output: { evaluations: rankingResult.evaluations, selectedPersona: rankingResult.selectedPersona.name, selectionReasoning: rankingResult.selectionReasoning },
    },
    selectedPersona: {
      id: rankingResult.selectedPersona.id,
      name: rankingResult.selectedPersona.name,
      reason: rankingResult.selectionReasoning,
    },
    rankings: rankingResult.evaluations.map(e => ({
      personaId: e.personaId,
      personaName: e.personaName,
      score: e.overallScore,
    })),
  });

  if (captureDebug) {
    step3Debug = {
      agent: 'cold-email-ranker',
      title: 'Cold Email Susceptibility Ranker',
      startedAt: new Date(step3Start).toISOString(),
      completedAt: new Date(step3End).toISOString(),
      durationMs: step3End - step3Start,
      status: 'completed',
      input: {
        companyName: companyProfile.name,
        personaCount: icpResult.personas.length,
        personaNames: icpResult.personas.map(p => p.name),
      },
      output: {
        evaluations: rankingResult.evaluations,
        selectedPersonaId: rankingResult.selectedPersona.id,
        selectedPersonaName: rankingResult.selectedPersona.name,
        selectionReasoning: rankingResult.selectionReasoning,
      },
    };
  }

  // ========================================
  // STAGE 4: LinkedIn Filter Builder
  // ========================================
  console.log(`[ICPAnalyzer] Stage 4/4: Building LinkedIn filters...`);
  const step4Start = Date.now();
  const filterResult = await buildLinkedInFilters(
    rankingResult.selectedPersona,
    preferredLocations
  );
  const icpSettings = filterResult.filters;
  const step4End = Date.now();

  // Build the Sales Navigator URL for debug
  const salesNavUrl = buildSalesNavigatorUrl(icpSettings);
  
  // Report Stage 4 completion with final filters
  const industryTextsForCallback = icpSettings.industries.map(i => 
    typeof i === 'object' && 'text' in i ? i.text : String(i)
  );
  const locationTextsForCallback = icpSettings.locations.map(l => 
    typeof l === 'object' && 'text' in l ? l.text : String(l)
  );
  
  onProgress?.({
    currentAgent: 'Complete',
    completedAgent: {
      name: 'LinkedIn Filter Builder',
      duration: step4End - step4Start,
      result: `${icpSettings.titles.length} titles, ${industryTextsForCallback.length} industries`,
      details: icpSettings.titles.slice(0, 3),
      prompt: filterResult.debug.prompt,
      response: filterResult.debug.response,
      output: { filters: icpSettings, salesNavUrl },
    },
    finalFilters: {
      titles: icpSettings.titles,
      industries: industryTextsForCallback,
      locations: locationTextsForCallback,
      companySize: icpSettings.companySize,
    },
    salesNavUrl,
  });

  if (captureDebug) {
    step4Debug = {
      agent: 'linkedin-filter-builder',
      title: 'LinkedIn Filter Builder',
      startedAt: new Date(step4Start).toISOString(),
      completedAt: new Date(step4End).toISOString(),
      durationMs: step4End - step4Start,
      status: 'completed',
      input: {
        personaName: rankingResult.selectedPersona.name,
        titles: rankingResult.selectedPersona.titles,
        companySize: rankingResult.selectedPersona.companySize,
        industries: rankingResult.selectedPersona.industries,
      },
      output: {
        filters: icpSettings,
        salesNavUrl,
      },
    };
  }

  // Transform company profile to CompanyInfo (for backwards compatibility)
  const companyInfo: CompanyInfo = {
    name: companyProfile.name,
    domain: companyProfile.domain,
    description: companyProfile.tagline,
    whatTheyDo: companyProfile.problemTheySolve,
    valueProposition: companyProfile.competitiveAdvantage,
    targetCustomers: companyProfile.targetMarket,
    industry: companyProfile.industry,
  };

  const pipelineEnd = Date.now();
  const elapsed = ((pipelineEnd - pipelineStart) / 1000).toFixed(1);
  console.log(`[ICPAnalyzer] ✓ Complete in ${elapsed}s`);
  console.log(`[ICPAnalyzer] Selected persona: "${rankingResult.selectedPersona.name}"`);
  console.log(`[ICPAnalyzer] Reason: ${rankingResult.selectionReasoning.slice(0, 100)}...`);

  // Build complete debug trace
  if (captureDebug && step1Debug && step2Debug && step3Debug && step4Debug) {
    const industryTexts = icpSettings.industries.map(i => 
      typeof i === 'object' && 'text' in i ? i.text : String(i)
    );
    const locationTexts = icpSettings.locations.map(l => 
      typeof l === 'object' && 'text' in l ? l.text : String(l)
    );

    debugTrace = {
      pipelineId,
      domain,
      startedAt: new Date(pipelineStart).toISOString(),
      completedAt: new Date(pipelineEnd).toISOString(),
      totalDurationMs: pipelineEnd - pipelineStart,
      steps: {
        companyProfiler: step1Debug,
        icpBrainstormer: step2Debug,
        coldEmailRanker: step3Debug,
        linkedInFilterBuilder: step4Debug,
      },
      summary: {
        companyName: companyProfile.name,
        personasGenerated: icpResult.personas.length,
        selectedPersona: rankingResult.selectedPersona.name,
        selectionReason: rankingResult.selectionReasoning,
        finalFilters: {
          titles: icpSettings.titles,
          industries: industryTexts,
          locations: locationTexts,
          companySize: icpSettings.companySize,
        },
      },
    };
  }

  return {
    companyInfo,
    suggestedICP: icpSettings,
    debugTrace,
  };
}

/**
 * Full analysis with all intermediate results
 * Useful for debugging or showing the full reasoning chain to users
 */
export async function analyzeCompanyAndICPWithDetails(
  scrapedWebsite: ScrapedWebsite,
  domain: string,
  preferredLocations?: string[],
  captureDebug: boolean = true
): Promise<AnalysisWithDetails> {
  console.log(`[ICPAnalyzer] Starting detailed multi-agent analysis for ${domain}...`);
  const pipelineStart = Date.now();
  const pipelineId = `analysis-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  // Stage 1
  const step1Start = Date.now();
  const companyProfilerResult = await profileCompany(scrapedWebsite, domain);
  const companyProfileDetail = companyProfilerResult.profile;
  const step1End = Date.now();

  // Stage 2
  const step2Start = Date.now();
  const icpResult = await brainstormICPs(companyProfileDetail);
  const step2End = Date.now();

  // Stage 3
  const step3Start = Date.now();
  const rankingResult = await rankPersonasForColdEmail(companyProfileDetail, icpResult.personas);
  const step3End = Date.now();

  // Stage 4
  const step4Start = Date.now();
  const filterResult = await buildLinkedInFilters(
    rankingResult.selectedPersona,
    preferredLocations
  );
  const icpSettingsDetail = filterResult.filters;
  const step4End = Date.now();

  const salesNavUrl = buildSalesNavigatorUrl(icpSettingsDetail);

  const companyInfo: CompanyInfo = {
    name: companyProfileDetail.name,
    domain: companyProfileDetail.domain,
    description: companyProfileDetail.tagline,
    whatTheyDo: companyProfileDetail.problemTheySolve,
    valueProposition: companyProfileDetail.competitiveAdvantage,
    targetCustomers: companyProfileDetail.targetMarket,
    industry: companyProfileDetail.industry,
  };

  const pipelineEnd = Date.now();
  const elapsed = ((pipelineEnd - pipelineStart) / 1000).toFixed(1);
  console.log(`[ICPAnalyzer] ✓ Detailed analysis complete in ${elapsed}s`);

  // Build debug trace
  let debugTrace: AnalysisDebugTrace | undefined;
  
  if (captureDebug) {
    const industryTexts = icpSettingsDetail.industries.map((i: string | { id: string; text: string }) => 
      typeof i === 'object' && 'text' in i ? i.text : String(i)
    );
    const locationTexts = icpSettingsDetail.locations.map((l: string | { id: string; text: string }) => 
      typeof l === 'object' && 'text' in l ? l.text : String(l)
    );

    debugTrace = {
      pipelineId,
      domain,
      startedAt: new Date(pipelineStart).toISOString(),
      completedAt: new Date(pipelineEnd).toISOString(),
      totalDurationMs: pipelineEnd - pipelineStart,
      steps: {
        companyProfiler: {
          agent: 'company-profiler',
          title: 'Company Profiler',
          startedAt: new Date(step1Start).toISOString(),
          completedAt: new Date(step1End).toISOString(),
          durationMs: step1End - step1Start,
          status: 'completed',
          input: {
            url: scrapedWebsite.url,
            title: scrapedWebsite.title,
            description: scrapedWebsite.description,
            markdownLength: scrapedWebsite.markdown.length,
          },
          output: companyProfileDetail,
        },
        icpBrainstormer: {
          agent: 'icp-brainstormer',
          title: 'ICP Brainstormer',
          startedAt: new Date(step2Start).toISOString(),
          completedAt: new Date(step2End).toISOString(),
          durationMs: step2End - step2Start,
          status: 'completed',
          input: {
            companyName: companyProfileDetail.name,
            productOrService: companyProfileDetail.productOrService,
            targetMarket: companyProfileDetail.targetMarket,
          },
          output: {
            personas: icpResult.personas,
            reasoning: icpResult.reasoning,
          },
        },
        coldEmailRanker: {
          agent: 'cold-email-ranker',
          title: 'Cold Email Susceptibility Ranker',
          startedAt: new Date(step3Start).toISOString(),
          completedAt: new Date(step3End).toISOString(),
          durationMs: step3End - step3Start,
          status: 'completed',
          input: {
            companyName: companyProfileDetail.name,
            personaCount: icpResult.personas.length,
            personaNames: icpResult.personas.map(p => p.name),
          },
          output: {
            evaluations: rankingResult.evaluations,
            selectedPersonaId: rankingResult.selectedPersona.id,
            selectedPersonaName: rankingResult.selectedPersona.name,
            selectionReasoning: rankingResult.selectionReasoning,
          },
        },
        linkedInFilterBuilder: {
          agent: 'linkedin-filter-builder',
          title: 'LinkedIn Filter Builder',
          startedAt: new Date(step4Start).toISOString(),
          completedAt: new Date(step4End).toISOString(),
          durationMs: step4End - step4Start,
          status: 'completed',
          input: {
            personaName: rankingResult.selectedPersona.name,
            titles: rankingResult.selectedPersona.titles,
            companySize: rankingResult.selectedPersona.companySize,
            industries: rankingResult.selectedPersona.industries,
          },
          output: {
            filters: icpSettingsDetail,
            salesNavUrl,
          },
        },
      },
      summary: {
        companyName: companyProfileDetail.name,
        personasGenerated: icpResult.personas.length,
        selectedPersona: rankingResult.selectedPersona.name,
        selectionReason: rankingResult.selectionReasoning,
        finalFilters: {
          titles: icpSettingsDetail.titles,
          industries: industryTexts,
          locations: locationTexts,
          companySize: icpSettingsDetail.companySize,
        },
      },
    };
  }

  return {
    companyInfo,
    suggestedICP: icpSettingsDetail,
    companyProfile: companyProfileDetail,
    allPersonas: icpResult.personas,
    personaEvaluations: rankingResult,
    selectedPersona: rankingResult.selectedPersona,
    debugTrace,
  };
}
