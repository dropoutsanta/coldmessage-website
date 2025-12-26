import { scrapeWebsite, extractCompanyName } from './websiteScraper';
import { analyzeCompanyAndICP, AnalysisProgressCallback } from './icpAnalyzer';
import { findLeads, buildSalesNavUrl } from './leadFinder';
import { generateEmailsForLeads } from './emailWriter';
import { CampaignData, GenerateCampaignRequest, ICPSettings, TargetGeo, LinkedInGeoLocation } from '../types';
import { CampaignDebugData } from '../types/debug';

export type CampaignStatus = 
  | 'scraping_website'
  | 'analyzing_company'
  | 'finding_leads'
  | 'waiting_for_leads'
  | 'writing_emails'
  | 'complete'
  | 'error';

export interface CampaignProgress {
  status: CampaignStatus;
  message: string;
  progress: number; // 0-100
  campaign?: CampaignData;
  debugData?: CampaignDebugData;
  /** Partial debug data updated in real-time as agents complete */
  liveDebug?: LiveDebugData;
  error?: string;
}

export interface CampaignResult {
  campaign: CampaignData;
  debugData?: CampaignDebugData;
}

/**
 * Live debug data that gets updated as each agent completes
 */
export interface LiveDebugData {
  pipelineId: string;
  domain: string;
  startedAt: string;
  currentAgent: string;
  completedAgents: LiveAgentResult[];
  allPersonas?: {
    id: string;
    name: string;
    titles: string[];
    roleDescription?: string; // valueTheySeek or whyThisPersona
  }[];
  selectedPersona?: {
    id: string;
    name: string;
    reason: string;
  };
  rankings?: {
    personaId: string;
    personaName: string;
    score: number;
  }[];
  finalFilters?: {
    titles: string[];
    industries: string[];
    locations: string[];
    companySize: string;
  };
  salesNavUrl?: string;
}

/**
 * Detailed result from each agent including I/O
 */
export interface LiveAgentResult {
  name: string;
  duration: number;
  result: string;
  details?: string[];
  /** The prompt sent to the LLM */
  prompt?: string;
  /** The raw response from the LLM */
  response?: string;
  /** Parsed/structured output */
  output?: unknown;
}

// In-memory store for campaign generation progress (keyed by domain, not slug)
const campaignProgress: Map<string, CampaignProgress> = new Map();

export function getCampaignProgress(domain: string): CampaignProgress | undefined {
  // Normalize domain for lookup
  const normalizedDomain = domain.toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];
  return campaignProgress.get(normalizedDomain);
}

function updateProgress(domain: string, slug: string, progress: CampaignProgress) {
  // Normalize domain for storage
  const normalizedDomain = domain.toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];
  campaignProgress.set(normalizedDomain, progress);
  console.log(`[CampaignGenerator] ${slug}: ${progress.status} (${progress.progress}%) - ${progress.message}`);
}

/**
 * Generate a complete campaign from a domain
 * Optimized with parallel execution where possible
 */
export async function generateCampaign(
  request: GenerateCampaignRequest & { captureDebug?: boolean }
): Promise<CampaignResult> {
  const { domain, slug, icpSettings, salesNavigatorUrl, captureDebug = false } = request;
  
  // Debug data accumulator
  let debugData: CampaignDebugData | undefined;
  
  // Live debug data for real-time updates
  const liveDebug: LiveDebugData = {
    pipelineId: `campaign-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    domain,
    startedAt: new Date().toISOString(),
    currentAgent: 'Website Scraper',
    completedAgents: [],
  };
  
  console.log(`[CampaignGenerator] Starting campaign generation for ${domain}...`);
  const startTime = Date.now();

  try {
    // Check if lead source is configured (Apify or AI Ark)
    const hasApify = !!process.env.APIFY_API_TOKEN;
    const hasArk = !!process.env.AI_ARK_TOKEN;
    const useArk = process.env.LEAD_SOURCE === '1';
    const hasLeadSource = useArk ? hasArk : hasApify;
    
    // If we have ICP settings or sales nav URL, we can start lead search EARLY (in parallel with scraping)
    let leadSearchPromise: Promise<{ leads: LinkedInLead[] }> | null = null;
    
    // Need to import LinkedInLead type for the promise
    type LinkedInLead = {
      about: string;
      company: string;
      company_id: string;
      first_name: string;
      full_name: string;
      job_title: string;
      last_name: string;
      linkedin_url: string;
      location: string;
      profile_id: string;
    };
    
    if (hasLeadSource && (salesNavigatorUrl || icpSettings)) {
      console.log(`[CampaignGenerator] Starting lead search early with ${useArk ? 'AI Ark' : 'Apify'} (parallel with website analysis)`);
      
      updateProgress(domain, slug, {
        status: 'finding_leads',
        message: `Starting lead search with ${useArk ? 'AI Ark' : 'LinkedIn Sales Navigator'}...`,
        progress: 10,
      });
      
      // Start lead search in background - don't await yet!
      // findLeads() handles both Apify and AI Ark based on LEAD_SOURCE env
      leadSearchPromise = findLeads(icpSettings!, salesNavigatorUrl, 5)
        .then(result => ({ leads: result.leads || [] }))
        .catch(err => {
          console.error('[CampaignGenerator] Early lead search failed:', err);
          return { leads: [] as LinkedInLead[] };
        });
    }

    // Step 1: Scrape website
    const scrapeStart = Date.now();
    updateProgress(domain, slug, {
      status: 'scraping_website',
      message: 'Analyzing your website...',
      progress: 15,
      liveDebug, // Always pass liveDebug for insight teasers
    });

    const scrapedWebsite = await scrapeWebsite(domain);
    const scrapeEnd = Date.now();
    
    // Always update live debug with scrape completion (for insight teasers)
    liveDebug.completedAgents.push({
      name: 'Website Scraper',
      duration: scrapeEnd - scrapeStart,
      result: `Scraped ${domain}`,
      details: [scrapedWebsite.title || 'No title'],
    });
    liveDebug.currentAgent = 'Company Profiler';

    // Step 2: Analyze company and ICP
    updateProgress(domain, slug, {
      status: 'analyzing_company',
      message: 'Understanding your business and ideal customers...',
      progress: 30,
      liveDebug, // Always pass liveDebug for insight teasers
    });

    // Create progress callback for live updates (always enabled for insight teasers)
    const analysisProgressCallback: AnalysisProgressCallback = (update) => {
      liveDebug.currentAgent = update.currentAgent;
      
      // Always capture basic agent results for insight teasers
      if (update.completedAgent) {
        // For debug mode, include full prompt/response; otherwise just basics
        if (captureDebug) {
          liveDebug.completedAgents.push(update.completedAgent);
        } else {
          // Strip sensitive prompt/response data for non-debug mode
          liveDebug.completedAgents.push({
            name: update.completedAgent.name,
            duration: update.completedAgent.duration,
            result: update.completedAgent.result,
            details: update.completedAgent.details,
            output: update.completedAgent.output,
          });
        }
      }
      if (update.allPersonas) {
        liveDebug.allPersonas = update.allPersonas.map((p: any) => ({
          id: p.id,
          name: p.name,
          titles: p.titles,
          roleDescription: p.valueTheySeek || p.whyThisPersona, // Map richer context
        }));
      }
      if (update.selectedPersona) {
        liveDebug.selectedPersona = update.selectedPersona;
      }
      if (update.rankings) {
        liveDebug.rankings = update.rankings;
      }
      if (update.finalFilters) {
        liveDebug.finalFilters = update.finalFilters;
      }
      if (update.salesNavUrl) {
        liveDebug.salesNavUrl = update.salesNavUrl;
      }
      
      // Update progress store with new live debug
      updateProgress(domain, slug, {
        status: 'analyzing_company',
        message: `Running ${update.currentAgent}...`,
        progress: 30 + (liveDebug.completedAgents.length * 8),
        liveDebug,
      });
    };

    const analysis = await analyzeCompanyAndICP(
      scrapedWebsite, 
      domain, 
      undefined, 
      captureDebug,
      analysisProgressCallback // Always pass callback for insight teasers
    );
    const finalICP = icpSettings || analysis.suggestedICP;
    
    // Initialize debug data with analysis trace
    if (captureDebug && analysis.debugTrace) {
      debugData = {
        analysis: analysis.debugTrace,
      };
    }

    // Step 3: Get leads (either from early search or start new search)
    let leads: LinkedInLead[];
    
    if (leadSearchPromise) {
      // Wait for the early lead search to complete
      updateProgress(domain, slug, {
        status: 'waiting_for_leads',
        message: 'Waiting for lead data...',
        progress: 50,
      });
      
      const results = await leadSearchPromise;
      leads = results.leads || [];
      
      // If early search failed, fall back to mock leads
      if (leads.length === 0) {
        console.log('[CampaignGenerator] Early search returned no leads, using mock data');
        leads = generateMockLeads(finalICP);
      }
    } else if (hasLeadSource) {
      // Start lead search now (we didn't have ICP settings earlier)
      liveDebug.currentAgent = 'Lead Finder';
      updateProgress(domain, slug, {
        status: 'finding_leads',
        message: `Searching for qualified leads with ${useArk ? 'AI Ark' : 'LinkedIn Sales Navigator'}...`,
        progress: 60,
        liveDebug,
      });
      
      const searchUrl = salesNavigatorUrl || buildSalesNavUrl(finalICP);
      const leadSearchStart = Date.now();
      
      try {
        console.log(`[CampaignGenerator] Using ${useArk ? 'AI Ark' : 'Apify'} for lead search`);
        
        updateProgress(domain, slug, {
          status: 'waiting_for_leads',
          message: useArk ? 'Searching AI Ark database...' : 'Waiting for lead data (this may take a few minutes)...',
          progress: 50,
        });

        // findLeads() handles both Apify and AI Ark based on LEAD_SOURCE env
        const results = await findLeads(finalICP, salesNavigatorUrl, 5);
        leads = results.leads || [];
        
        // Capture lead search debug data
        if (captureDebug && debugData) {
          const leadSearchEnd = Date.now();
          debugData.leadSearch = {
            salesNavUrl: useArk ? 'AI Ark (no URL)' : searchUrl,
            requestId: results.requestId,
            startedAt: new Date(leadSearchStart).toISOString(),
            completedAt: new Date(leadSearchEnd).toISOString(),
            durationMs: leadSearchEnd - leadSearchStart,
            leadsFound: leads.length,
            status: leads.length > 0 ? 'completed' : 'timeout',
          };
        }
      } catch (leadSearchError) {
        console.error('[CampaignGenerator] Lead search error, falling back to mock leads:', leadSearchError);
        leads = generateMockLeads(finalICP);
        
        // Capture error in debug data
        if (captureDebug && debugData) {
          debugData.leadSearch = {
            salesNavUrl: useArk ? 'AI Ark (no URL)' : searchUrl,
            requestId: 'error',
            startedAt: new Date(leadSearchStart).toISOString(),
            leadsFound: 0,
            status: 'error',
          };
        }
      }
    } else {
      // No lead source configured - use mock leads
      console.log('[CampaignGenerator] No lead source configured (APIFY_API_TOKEN or AI_ARK_TOKEN), using demo leads');
      leads = generateMockLeads(finalICP);
    }

    // Step 4: Write personalized emails (parallel)
    // Always update liveDebug for insight teasers
    liveDebug.currentAgent = 'Email Writer';
    liveDebug.completedAgents.push({
      name: 'Lead Finder',
      duration: 0, // Timing handled elsewhere
      result: `Found ${leads.length} leads`,
      details: leads.slice(0, 3).map(l => l.full_name),
    });
    updateProgress(domain, slug, {
      status: 'writing_emails',
      message: 'Crafting personalized emails in parallel...',
      progress: 80,
      liveDebug,
    });

    const emailGenStart = Date.now();
    
    // Pass rich context for better email writing
    const emailWriterContext = analysis.companyProfile && analysis.selectedPersona ? {
      companyProfile: analysis.companyProfile,
      selectedPersona: analysis.selectedPersona,
      selectionReasoning: analysis.selectionReasoning,
    } : undefined;
    
    const qualifiedLeads = await generateEmailsForLeads(
      leads,
      analysis.companyInfo,
      'Bella',
      5,
      emailWriterContext
    );
    const emailGenEnd = Date.now();
    
    // Capture email generation debug data
    if (captureDebug && debugData) {
      debugData.emailGeneration = {
        startedAt: new Date(emailGenStart).toISOString(),
        completedAt: new Date(emailGenEnd).toISOString(),
        durationMs: emailGenEnd - emailGenStart,
        emailsGenerated: qualifiedLeads.length,
        parallelBatchSize: 5,
      };
    }

    // Step 5: Build campaign data
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`[CampaignGenerator] Campaign completed in ${elapsed}s`);

    updateProgress(domain, slug, {
      status: 'complete',
      message: `Campaign ready! (${elapsed}s)`,
      progress: 100,
    });

    // Extract location text (handle both string and object formats)
    const firstLocation = finalICP.locations[0];
    const locationText = typeof firstLocation === 'object' && 'text' in firstLocation 
      ? firstLocation.text 
      : (typeof firstLocation === 'string' ? firstLocation : 'United States');

    // Get Sales Navigator URL
    const salesNavUrl = salesNavigatorUrl || buildSalesNavUrl(finalICP);

    // Extract all personas from debug trace if available
    let allPersonas = null;
    let personaRankings = null;
    if (analysis.debugTrace) {
      // Get all personas from ICP Brainstormer step
      const icpStep = analysis.debugTrace.steps.icpBrainstormer;
      if (icpStep && icpStep.output && typeof icpStep.output === 'object' && 'personas' in icpStep.output) {
        allPersonas = (icpStep.output as { personas: unknown[] }).personas;
      }

      // Get persona rankings from Cold Email Ranker step
      const rankerStep = analysis.debugTrace.steps.coldEmailRanker;
      if (rankerStep && rankerStep.output && typeof rankerStep.output === 'object') {
        const output = rankerStep.output as {
          evaluations?: unknown[];
          selectedPersonaId?: string;
          selectedPersonaName?: string;
          selectionReasoning?: string;
        };
        if (output.evaluations && output.selectedPersonaId && output.selectedPersonaName && output.selectionReasoning) {
          personaRankings = {
            evaluations: output.evaluations as any[],
            selectedPersonaId: output.selectedPersonaId,
            selectedPersonaName: output.selectedPersonaName,
            selectionReasoning: output.selectionReasoning,
          };
        }
      }
    }

    // Build complete pipeline debug data
    let pipelineDebug = null;
    if (debugData) {
      pipelineDebug = {
        pipelineId: debugData.analysis.pipelineId,
        startedAt: debugData.analysis.startedAt,
        completedAt: debugData.analysis.completedAt,
        totalDurationMs: debugData.analysis.totalDurationMs,
        steps: {
          companyProfiler: debugData.analysis.steps.companyProfiler ? {
            agent: debugData.analysis.steps.companyProfiler.agent,
            title: debugData.analysis.steps.companyProfiler.title,
            startedAt: debugData.analysis.steps.companyProfiler.startedAt,
            completedAt: debugData.analysis.steps.companyProfiler.completedAt,
            durationMs: debugData.analysis.steps.companyProfiler.durationMs,
            status: debugData.analysis.steps.companyProfiler.status,
            prompt: debugData.analysis.steps.companyProfiler.prompt,
            response: debugData.analysis.steps.companyProfiler.response,
            output: debugData.analysis.steps.companyProfiler.output,
          } : undefined,
          icpBrainstormer: debugData.analysis.steps.icpBrainstormer ? {
            agent: debugData.analysis.steps.icpBrainstormer.agent,
            title: debugData.analysis.steps.icpBrainstormer.title,
            startedAt: debugData.analysis.steps.icpBrainstormer.startedAt,
            completedAt: debugData.analysis.steps.icpBrainstormer.completedAt,
            durationMs: debugData.analysis.steps.icpBrainstormer.durationMs,
            status: debugData.analysis.steps.icpBrainstormer.status,
            prompt: debugData.analysis.steps.icpBrainstormer.prompt,
            response: debugData.analysis.steps.icpBrainstormer.response,
            output: debugData.analysis.steps.icpBrainstormer.output,
          } : undefined,
          coldEmailRanker: debugData.analysis.steps.coldEmailRanker ? {
            agent: debugData.analysis.steps.coldEmailRanker.agent,
            title: debugData.analysis.steps.coldEmailRanker.title,
            startedAt: debugData.analysis.steps.coldEmailRanker.startedAt,
            completedAt: debugData.analysis.steps.coldEmailRanker.completedAt,
            durationMs: debugData.analysis.steps.coldEmailRanker.durationMs,
            status: debugData.analysis.steps.coldEmailRanker.status,
            prompt: debugData.analysis.steps.coldEmailRanker.prompt,
            response: debugData.analysis.steps.coldEmailRanker.response,
            output: debugData.analysis.steps.coldEmailRanker.output,
          } : undefined,
          linkedInFilterBuilder: debugData.analysis.steps.linkedInFilterBuilder ? {
            agent: debugData.analysis.steps.linkedInFilterBuilder.agent,
            title: debugData.analysis.steps.linkedInFilterBuilder.title,
            startedAt: debugData.analysis.steps.linkedInFilterBuilder.startedAt,
            completedAt: debugData.analysis.steps.linkedInFilterBuilder.completedAt,
            durationMs: debugData.analysis.steps.linkedInFilterBuilder.durationMs,
            status: debugData.analysis.steps.linkedInFilterBuilder.status,
            prompt: debugData.analysis.steps.linkedInFilterBuilder.prompt,
            response: debugData.analysis.steps.linkedInFilterBuilder.response,
            output: debugData.analysis.steps.linkedInFilterBuilder.output,
          } : undefined,
          leadFinder: debugData.leadSearch,
          emailWriter: debugData.emailGeneration,
        },
      };
    }

    const campaign: CampaignData = {
      id: crypto.randomUUID(),
      slug,
      companyName: analysis.companyInfo.name || extractCompanyName(domain),
      websiteUrl: domain.startsWith('http') ? domain : `https://${domain}`,
      location: locationText,
      helpsWith: analysis.companyInfo.whatTheyDo,
      greatAt: analysis.companyInfo.valueProposition,
      icpAttributes: [
        finalICP.titles.join(', '),
        finalICP.companySize,
        finalICP.industries.map(i => typeof i === 'object' && 'text' in i ? i.text : i).join(', '),
      ],
      qualifiedLeads,
      targetGeo: buildTargetGeo(finalICP),
      priceTier1: 100,
      priceTier1Emails: 500,
      priceTier2: 399,
      priceTier2Emails: 2500,
      createdAt: new Date().toISOString(),
      // New fields for full data persistence (camelCase to match CampaignData type)
      domain,
      updatedAt: new Date().toISOString(),
      salesNavigatorUrl: salesNavUrl,
      companyProfile: analysis.companyProfile || null,
      icpPersonas: allPersonas as any,
      personaRankings: personaRankings as any,
      linkedinFilters: finalICP as any,
      pipelineDebug: pipelineDebug as any,
    };

    updateProgress(domain, slug, {
      status: 'complete',
      message: `Campaign ready! (${elapsed}s)`,
      progress: 100,
      campaign,
      debugData,
    });

    return { campaign, debugData };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    updateProgress(domain, slug, {
      status: 'error',
      message: errorMessage,
      progress: 0,
      error: errorMessage,
    });

    throw error;
  }
}

/**
 * Build targetGeo from ICP locations for map display
 */
function buildTargetGeo(icp: ICPSettings): TargetGeo {
  const locations = icp.locations || [];
  
  if (locations.length === 0) {
    // Default to US if no locations specified
    return { region: 'us', states: [] };
  }

  // US state abbreviations and their full names
  const US_STATES: Record<string, string> = {
    'alabama': 'AL', 'alaska': 'AK', 'arizona': 'AZ', 'arkansas': 'AR', 'california': 'CA',
    'colorado': 'CO', 'connecticut': 'CT', 'delaware': 'DE', 'florida': 'FL', 'georgia': 'GA',
    'hawaii': 'HI', 'idaho': 'ID', 'illinois': 'IL', 'indiana': 'IN', 'iowa': 'IA',
    'kansas': 'KS', 'kentucky': 'KY', 'louisiana': 'LA', 'maine': 'ME', 'maryland': 'MD',
    'massachusetts': 'MA', 'michigan': 'MI', 'minnesota': 'MN', 'mississippi': 'MS', 'missouri': 'MO',
    'montana': 'MT', 'nebraska': 'NE', 'nevada': 'NV', 'new hampshire': 'NH', 'new jersey': 'NJ',
    'new mexico': 'NM', 'new york': 'NY', 'north carolina': 'NC', 'north dakota': 'ND', 'ohio': 'OH',
    'oklahoma': 'OK', 'oregon': 'OR', 'pennsylvania': 'PA', 'rhode island': 'RI', 'south carolina': 'SC',
    'south dakota': 'SD', 'tennessee': 'TN', 'texas': 'TX', 'utah': 'UT', 'vermont': 'VT',
    'virginia': 'VA', 'washington': 'WA', 'west virginia': 'WV', 'wisconsin': 'WI', 'wyoming': 'WY',
    'district of columbia': 'DC',
  };

  // US-related location keywords
  const US_KEYWORDS = ['united states', 'usa', 'us', 'america'];
  
  const states: string[] = [];
  const countries: string[] = [];
  let hasUS = false;
  let hasInternational = false;

  for (const location of locations) {
    const locationText = typeof location === 'object' && 'text' in location 
      ? (location as LinkedInGeoLocation).text 
      : (typeof location === 'string' ? location : '');
    
    const lowerLocation = locationText.toLowerCase();
    
    // Check if it's a US state
    let isState = false;
    for (const [stateName, abbr] of Object.entries(US_STATES)) {
      if (lowerLocation.includes(stateName) || lowerLocation === abbr.toLowerCase()) {
        if (!states.includes(abbr)) {
          states.push(abbr);
        }
        isState = true;
        hasUS = true;
        break;
      }
    }
    
    if (isState) continue;
    
    // Check if it's explicitly US
    if (US_KEYWORDS.some(kw => lowerLocation === kw || lowerLocation.includes(kw))) {
      hasUS = true;
      continue;
    }
    
    // Otherwise it's an international country
    if (locationText && !US_KEYWORDS.some(kw => lowerLocation.includes(kw))) {
      // Extract country name (remove ", United States" suffix if present)
      const countryName = locationText.replace(/,\s*United States$/i, '').trim();
      if (countryName && !countries.includes(countryName)) {
        countries.push(countryName);
        hasInternational = true;
      }
    }
  }

  // Determine map region based on what we found
  if (hasInternational && !hasUS && states.length === 0) {
    // Only international locations
    return { region: 'world', countries };
  }
  
  if (hasUS || states.length > 0) {
    // US-based (either specific states or general US)
    return { region: 'us', states };
  }
  
  // Mix of locations - show world map with all countries (including US if present)
  if (hasUS) {
    countries.push('United States');
  }
  return { region: 'world', countries };
}

/**
 * Generate mock leads for demo/testing when no Sales Navigator URL is provided
 */
function generateMockLeads(icp: ICPSettings) {
  const titles = icp.titles.length > 0 ? icp.titles : ['CEO', 'Founder', 'VP of Sales'];
  const firstNames = ['James', 'Sarah', 'Michael', 'Emily', 'David'];
  const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones'];
  const companies = ['TechFlow', 'ScaleUp Inc', 'GrowthLabs', 'CloudBase', 'DataSync'];

  // Get location text from first location
  const firstLocation = icp.locations[0];
  const locationText = typeof firstLocation === 'object' && 'text' in firstLocation
    ? firstLocation.text
    : (typeof firstLocation === 'string' ? firstLocation : 'United States');

  return firstNames.map((firstName, i) => ({
    about: `Experienced ${titles[i % titles.length]} with a passion for growth and innovation.`,
    company: companies[i],
    company_id: `company-${i}`,
    first_name: firstName,
    full_name: `${firstName} ${lastNames[i]}`,
    job_title: titles[i % titles.length],
    last_name: lastNames[i],
    linkedin_url: `https://linkedin.com/in/${firstName.toLowerCase()}${lastNames[i].toLowerCase()}`,
    location: locationText,
    profile_id: `profile-${i}`,
  }));
}

