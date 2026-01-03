import { NextRequest } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { supabaseAdmin } from '@/lib/supabase';
import { domainToSlug } from '@/lib/utils/slugify';
import { scrapeWebsite, extractCompanyName, ScrapedWebsite } from '@/lib/services/websiteScraper';
import { CompanyProfile } from '@/lib/services/agents/companyProfiler';
import { ICPPersona } from '@/lib/services/agents/icpBrainstormer';
import { ICPSettings, QualifiedLead, CompanyInfo } from '@/lib/types';
import { findLeads } from '@/lib/services/leadFinder';
import { generateEmailsForLeads } from '@/lib/services/emailWriter';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

/**
 * Clean up common LLM JSON output issues before parsing
 */
function cleanJsonString(str: string): string {
  return str
    .replace(/,(\s*[}\]])/g, '$1')
    .replace(/[\x00-\x1F\x7F]/g, (match) => {
      if (match === '\n' || match === '\r' || match === '\t') return match;
      return '';
    });
}

/**
 * SSE Streaming endpoint for campaign generation
 * 
 * Streams real-time tokens as each agent generates output.
 * Users see the AI "thinking" in real-time.
 * 
 * Accepts campaignId to UPDATE an existing placeholder campaign
 * created by /api/campaigns/init
 */
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { domain, campaignId, slug: existingSlug } = body;

  if (!domain) {
    return new Response(JSON.stringify({ error: 'Domain is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Create a TransformStream for SSE
  const encoder = new TextEncoder();
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();
  let streamClosed = false;

  // Helper to send SSE events (safe - checks if stream is still open)
  const sendEvent = async (event: string, data: unknown) => {
    if (streamClosed) return;
    try {
      const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
      await writer.write(encoder.encode(message));
    } catch {
      // Stream was closed by client - mark it and stop trying to write
      streamClosed = true;
    }
  };

  // Run campaign generation in background
  (async () => {
    try {
      // Use existing slug if provided (from init), otherwise generate new one
      const slug = existingSlug || await getNextAvailableSlug(domainToSlug(domain));
      const pipelineId = `stream-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      
      await sendEvent('start', { 
        pipelineId, 
        domain, 
        slug,
        startedAt: new Date().toISOString() 
      });

      // ========================================
      // STEP 1: Website Scraper
      // ========================================
      await sendEvent('agent_start', { 
        agent: 'Website Scraper',
        message: 'Analyzing your website...',
        progress: 5
      });
      
      const scrapeStartTime = Date.now();
      const websiteUrl = domain.startsWith('http') ? domain : `https://${domain}`;
      const scrapedWebsite = await scrapeWebsite(websiteUrl);
      const companyName = extractCompanyName(domain);
      
      await sendEvent('agent_complete', {
        agent: 'Website Scraper',
        duration: Date.now() - scrapeStartTime,
        result: `Found: ${companyName}`,
        output: { companyName, title: scrapedWebsite.title },
        progress: 10
      });

      // ========================================
      // STEP 2: Company Profiler (with token streaming)
      // ========================================
      console.log('[StreamAPI] Starting Company Profiler...');
      await sendEvent('agent_start', { 
        agent: 'Company Profiler',
        message: 'Understanding your business...',
        progress: 12
      });
      
      const profilerStartTime = Date.now();
      const companyProfile = await runStreamingAgent(
        'Company Profiler',
        buildCompanyProfilerPrompt(scrapedWebsite, domain),
        4096,
        sendEvent
      ) as unknown as CompanyProfile;
      console.log('[StreamAPI] Company Profiler completed:', companyProfile?.name);
      
      await sendEvent('agent_complete', {
        agent: 'Company Profiler',
        duration: Date.now() - profilerStartTime,
        result: `Analyzed ${companyProfile.name}`,
        output: companyProfile,
        progress: 20
      });

      // ========================================
      // STEP 3: ICP Brainstormer (with token streaming)
      // ========================================
      await sendEvent('agent_start', { 
        agent: 'ICP Brainstormer',
        message: 'Generating buyer personas...',
        progress: 22
      });
      
      const brainstormStartTime = Date.now();
      const icpResult = await runStreamingAgent(
        'ICP Brainstormer',
        buildICPBrainstormerPrompt(companyProfile),
        8192,
        sendEvent
      ) as unknown as { personas: ICPPersona[]; reasoning: string };
      const personas: ICPPersona[] = icpResult.personas || [];
      
      await sendEvent('agent_complete', {
        agent: 'ICP Brainstormer',
        duration: Date.now() - brainstormStartTime,
        result: `Generated ${personas.length} personas`,
        output: icpResult,
        details: personas.map((p: ICPPersona) => p.name),
        progress: 30
      });

      // ========================================
      // STEP 4: Cold Email Ranker (with token streaming)
      // ========================================
      await sendEvent('agent_start', { 
        agent: 'Cold Email Ranker',
        message: 'Selecting best persona for outreach...',
        progress: 32
      });
      
      const rankStartTime = Date.now();
      const rankResult = await runStreamingAgent(
        'Cold Email Ranker',
        buildColdEmailRankerPrompt(companyProfile, personas),
        4096,
        sendEvent
      ) as unknown as { evaluations: unknown[]; selectedPersonaId: string; selectedPersonaName: string; selectionReasoning?: string };
      
      const selectedPersona = personas.find((p: ICPPersona) => p.id === rankResult.selectedPersonaId) || personas[0];
      
      await sendEvent('agent_complete', {
        agent: 'Cold Email Ranker',
        duration: Date.now() - rankStartTime,
        result: `Selected: ${rankResult.selectedPersonaName || selectedPersona?.name}`,
        output: rankResult,
        progress: 40
      });

      // ========================================
      // STEP 5: LinkedIn Filter Builder (with token streaming)
      // ========================================
      await sendEvent('agent_start', { 
        agent: 'LinkedIn Filter Builder',
        message: 'Building search filters...',
        progress: 42
      });
      
      const filterStartTime = Date.now();
      const filters = await runStreamingAgent(
        'LinkedIn Filter Builder',
        buildLinkedInFilterPrompt(selectedPersona, companyProfile),
        2048,
        sendEvent
      ) as unknown as ICPSettings;
      
      await sendEvent('agent_complete', {
        agent: 'LinkedIn Filter Builder',
        duration: Date.now() - filterStartTime,
        result: `Built filters: ${filters.titles?.join(', ') || 'N/A'}`,
        output: filters,
        progress: 50
      });

      // ========================================
      // STEP 6: Lead Finder (Pre-purchase preview - no email enrichment)
      // ========================================
      await sendEvent('agent_start', { 
        agent: 'Lead Finder',
        message: 'Finding sample leads...',
        progress: 52
      });
      
      const leadStartTime = Date.now();
      console.log('[StreamAPI] Starting Lead Finder (preview mode) with filters:', JSON.stringify(filters, null, 2));
      
      // Pre-purchase: Get 5 sample leads from AI Ark WITHOUT email enrichment
      // Email enrichment happens post-purchase via findLeadsWithEmails()
      const leadResult = await findLeads(filters, undefined, 5);
      
      if (leadResult.status === 'error') {
        console.error('[StreamAPI] Lead Finder error:', leadResult.message);
        await sendEvent('agent_complete', {
          agent: 'Lead Finder',
          duration: Date.now() - leadStartTime,
          result: `Error: ${leadResult.message}`,
          output: { error: leadResult.message },
          progress: 70
        });
      } else {
        console.log(`[StreamAPI] Lead Finder found ${leadResult.leads?.length || 0} leads`);
        await sendEvent('agent_complete', {
          agent: 'Lead Finder',
          duration: Date.now() - leadStartTime,
          result: `Found ${leadResult.leads?.length || 0} leads`,
          output: { leadCount: leadResult.leads?.length || 0 },
          progress: 70
        });
      }

      const foundLeads = leadResult.leads || [];

      // ========================================
      // STEP 7: Email Writer
      // ========================================
      let qualifiedLeads: QualifiedLead[] = [];
      
      if (foundLeads.length > 0) {
        await sendEvent('agent_start', { 
          agent: 'Email Writer',
          message: 'Crafting personalized emails...',
          progress: 72
        });
        
        const emailStartTime = Date.now();
        console.log('[StreamAPI] Starting Email Writer for', foundLeads.length, 'leads');
        
        // Build company info for email writer
        const senderCompany: CompanyInfo = {
          name: companyProfile.name || companyName,
          domain: domain,
          description: companyProfile.tagline || '',
          whatTheyDo: companyProfile.productOrService || '',
          valueProposition: companyProfile.competitiveAdvantage || '',
          targetCustomers: companyProfile.targetMarket || '',
          industry: companyProfile.industry || '',
        };
        
        // Generate personalized emails for each lead
        qualifiedLeads = await generateEmailsForLeads(
          foundLeads,
          senderCompany,
          'Bella', // Default sender name
          10, // Max leads to process
          {
            companyProfile,
            selectedPersona,
            selectionReasoning: rankResult.selectionReasoning,
          }
        );
        
        console.log(`[StreamAPI] Email Writer generated ${qualifiedLeads.length} emails`);
        await sendEvent('agent_complete', {
          agent: 'Email Writer',
          duration: Date.now() - emailStartTime,
          result: `Generated ${qualifiedLeads.length} personalized emails`,
          output: { emailCount: qualifiedLeads.length },
          progress: 95
        });
      } else {
        console.log('[StreamAPI] No leads found, skipping email generation');
        await sendEvent('agent_start', { 
          agent: 'Email Writer',
          message: 'No leads to write emails for...',
          progress: 72
        });
        await sendEvent('agent_complete', {
          agent: 'Email Writer',
          duration: 0,
          result: 'No leads found - skipped',
          output: { emailCount: 0 },
          progress: 95
        });
      }

      // ========================================
      // COMPLETE - Save to Database
      // ========================================
      // Helper to extract text from union types
      const getLocationText = (loc: string | { text: string }): string => 
        typeof loc === 'string' ? loc : loc.text;
      const getIndustryText = (ind: string | { text: string }): string => 
        typeof ind === 'string' ? ind : ind.text;

      // Convert QualifiedLead[] to database format (snake_case)
      const dbQualifiedLeads = qualifiedLeads.map(lead => ({
        id: lead.id,
        name: lead.name,
        first_name: lead.firstName,
        last_name: lead.lastName,
        title: lead.title,
        company: lead.company,
        linkedin_url: lead.linkedinUrl,
        profile_picture_url: lead.profilePictureUrl,
        location: lead.location,
        about: lead.about,
        why_picked: lead.whyPicked,
        email_subject: lead.emailSubject,
        email_body: lead.emailBody,
      }));

      const campaign = {
        slug,
        domain,
        company_name: companyProfile.name || companyName,
        website_url: websiteUrl,
        loom_video_url: '',
        website_screenshot_url: '',
        location: filters.locations?.[0] ? getLocationText(filters.locations[0]) : 'United States',
        helps_with: companyProfile.problemTheySolve || 'grow their business',
        great_at: companyProfile.howTheySolveIt || 'finding qualified leads',
        icp_attributes: [
          filters.titles?.join(', ') || '',
          filters.companySize || '',
          filters.industries?.map(getIndustryText).join(', ') || ''
        ],
        qualified_leads: dbQualifiedLeads,
        target_geo: { region: 'us' as const, states: [], cities: [] },
        price_tier_1: 100,
        price_tier_1_emails: 500,
        price_tier_2: 399,
        price_tier_2_emails: 2500,
        company_profile: companyProfile,
        icp_personas: personas,
        persona_rankings: rankResult.evaluations,
        linkedin_filters: filters,
        status: 'draft',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      if (supabaseAdmin) {
        let data, error;
        
        if (campaignId) {
          // UPDATE existing placeholder campaign
          const result = await supabaseAdmin
            .from('campaigns')
            .update(campaign)
            .eq('id', campaignId)
            .select()
            .single();
          data = result.data;
          error = result.error;
        } else {
          // INSERT new campaign (fallback)
          const result = await supabaseAdmin
            .from('campaigns')
            .insert(campaign)
            .select()
            .single();
          data = result.data;
          error = result.error;
        }

        if (error) {
          await sendEvent('error', { message: 'Failed to save campaign', error: error.message });
        } else {
          await sendEvent('complete', {
            slug,
            campaign: data,
            progress: 100,
            message: 'Campaign generated successfully!'
          });
        }
      } else {
        await sendEvent('complete', {
          slug,
          campaign,
          progress: 100,
          message: 'Campaign generated successfully!'
        });
      }

    } catch (error) {
      console.error('[StreamAPI] Error:', error);
      await sendEvent('error', { 
        message: error instanceof Error ? error.message : 'Unknown error' 
      });
    } finally {
      // Safely close the stream (may already be closed if client disconnected)
      if (!streamClosed) {
        try {
          await writer.close();
        } catch {
          // Stream already closed - ignore
        }
      }
    }
  })();

  return new Response(stream.readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}

// Server-side throttle interval for token batching (ms)
// 500ms = 2 updates/second, good balance between responsiveness and client load
const SERVER_TOKEN_BATCH_INTERVAL_MS = 500;

/**
 * Extract field values from partial JSON - handles strings, arrays, and objects
 * Uses bracket/brace counting for proper nesting detection
 */
function extractFieldsFromPartialJSON(
  text: string, 
  fieldDefs: { name: string; type: 'string' | 'array' | 'object' }[]
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  
  for (const { name, type } of fieldDefs) {
    const pattern = `"${name}":`;
    const fieldIdx = text.indexOf(pattern);
    if (fieldIdx === -1) continue;
    
    const afterColon = fieldIdx + pattern.length;
    
    if (type === 'string') {
      // Find opening quote
      const quoteStart = text.indexOf('"', afterColon);
      if (quoteStart === -1) continue;
      
      // Find closing quote (handle escapes)
      let quoteEnd = quoteStart + 1;
      while (quoteEnd < text.length) {
        if (text[quoteEnd] === '"' && text[quoteEnd - 1] !== '\\') break;
        quoteEnd++;
      }
      if (quoteEnd < text.length && text[quoteEnd] === '"') {
        result[name] = text.slice(quoteStart + 1, quoteEnd);
      }
    } else if (type === 'array') {
      // Find opening bracket
      const bracketStart = text.indexOf('[', afterColon);
      if (bracketStart === -1) continue;
      
      // Count brackets to find matching close
      let depth = 1;
      let i = bracketStart + 1;
      while (i < text.length && depth > 0) {
        if (text[i] === '[') depth++;
        else if (text[i] === ']') depth--;
        i++;
      }
      
      // Only extract if we found the complete array
      if (depth === 0) {
        try {
          const arrayStr = text.slice(bracketStart, i);
          result[name] = JSON.parse(arrayStr);
        } catch {
          // Incomplete array, skip
        }
      } else {
        // Try to extract partial array items that are complete
        const partialArray = extractPartialArray(text.slice(bracketStart));
        if (partialArray.length > 0) {
          result[name] = partialArray;
        }
      }
    } else if (type === 'object') {
      // Find opening brace
      const braceStart = text.indexOf('{', afterColon);
      if (braceStart === -1) continue;
      
      // Count braces to find matching close
      let depth = 1;
      let i = braceStart + 1;
      while (i < text.length && depth > 0) {
        if (text[i] === '{') depth++;
        else if (text[i] === '}') depth--;
        i++;
      }
      
      if (depth === 0) {
        try {
          result[name] = JSON.parse(text.slice(braceStart, i));
        } catch {
          // Incomplete object
        }
      }
    }
  }
  
  return result;
}

/**
 * Extract complete items from a partial array
 */
function extractPartialArray(arrayText: string): unknown[] {
  const items: unknown[] = [];
  let i = 1; // Skip opening [
  
  while (i < arrayText.length) {
    // Skip whitespace
    while (i < arrayText.length && /\s/.test(arrayText[i])) i++;
    
    if (arrayText[i] === '{') {
      // Object item - count braces
      const start = i;
      let depth = 1;
      i++;
      while (i < arrayText.length && depth > 0) {
        if (arrayText[i] === '{') depth++;
        else if (arrayText[i] === '}') depth--;
        i++;
      }
      if (depth === 0) {
        try {
          items.push(JSON.parse(arrayText.slice(start, i)));
        } catch { /* skip incomplete */ }
      }
    } else if (arrayText[i] === '"') {
      // String item
      const start = i;
      i++;
      while (i < arrayText.length && !(arrayText[i] === '"' && arrayText[i - 1] !== '\\')) i++;
      if (i < arrayText.length) {
        try {
          items.push(JSON.parse(arrayText.slice(start, i + 1)));
          i++;
        } catch { /* skip */ }
      }
    } else if (arrayText[i] === ',') {
      i++;
    } else {
      i++;
    }
  }
  
  return items;
}

// Field definitions for each agent type (with types for proper extraction)
const AGENT_FIELD_DEFS: Record<string, { name: string; type: 'string' | 'array' | 'object' }[]> = {
  'Company Profiler': [
    { name: 'name', type: 'string' },
    { name: 'tagline', type: 'string' },
    { name: 'productOrService', type: 'string' },
    { name: 'problemTheySolve', type: 'string' },
    { name: 'targetMarket', type: 'string' },
    { name: 'industry', type: 'string' },
    { name: 'pricingModel', type: 'string' },
    { name: 'competitiveAdvantage', type: 'string' },
  ],
  'ICP Brainstormer': [
    { name: 'personas', type: 'array' },
    { name: 'reasoning', type: 'string' },
  ],
  'Cold Email Ranker': [
    { name: 'evaluations', type: 'array' },
    { name: 'selectedPersonaId', type: 'string' },
    { name: 'selectedPersonaName', type: 'string' },
    { name: 'selectionReasoning', type: 'string' },
  ],
  'LinkedIn Filter Builder': [
    { name: 'titles', type: 'array' },
    { name: 'companySize', type: 'string' },
    { name: 'industries', type: 'array' },
    { name: 'locations', type: 'array' },
  ],
};

/**
 * Run an agent with real-time token streaming
 * Sends PRE-PARSED fields to client - no client-side parsing needed!
 */
async function runStreamingAgent(
  agentName: string,
  prompt: string,
  maxTokens: number,
  sendEvent: (event: string, data: unknown) => Promise<void>
): Promise<Record<string, unknown>> {
  console.log(`[StreamAgent] Starting ${agentName} with ${maxTokens} max tokens`);
  let responseText = '';
  let tokenCount = 0;
  let lastSendTime = Date.now();
  const fieldDefs = AGENT_FIELD_DEFS[agentName] || [];
  
  const stream = anthropic.messages.stream({
    model: 'claude-sonnet-4-20250514',
    max_tokens: maxTokens,
    messages: [{ role: 'user', content: prompt }],
  });
  console.log(`[StreamAgent] ${agentName} stream created, waiting for tokens...`);

  for await (const event of stream) {
    if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
      const token = event.delta.text;
      responseText += token;
      tokenCount++;
      
      // Only send batched updates every SERVER_TOKEN_BATCH_INTERVAL_MS
      const now = Date.now();
      if (now - lastSendTime >= SERVER_TOKEN_BATCH_INTERVAL_MS) {
        // Extract fields server-side and send pre-parsed data
        const parsedFields = fieldDefs.length > 0 
          ? extractFieldsFromPartialJSON(responseText, fieldDefs)
          : {};
        
        await sendEvent('agent_token', { 
          agent: agentName, 
          fields: parsedFields, // Pre-parsed fields - client just displays!
          fieldCount: Object.keys(parsedFields).length,
          tokenCount 
        });
        lastSendTime = now;
      }
    }
  }

  // Parse JSON from response
  const jsonMatch = responseText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error(`[${agentName}] Failed to parse response as JSON`);
  }

  try {
    const cleanedJson = cleanJsonString(jsonMatch[0]);
    const parsed = JSON.parse(cleanedJson);
    
    // Send final parsed state
    await sendEvent('agent_token', { 
      agent: agentName, 
      fields: parsed, // Full parsed object
      fieldCount: Object.keys(parsed).length,
      tokenCount,
      complete: true
    });
    
    return parsed;
  } catch (parseError) {
    console.error(`[${agentName}] JSON parse error:`, parseError);
    throw new Error(`[${agentName}] Failed to parse JSON`);
  }
}

// ========================================
// PROMPT BUILDERS
// ========================================

function buildCompanyProfilerPrompt(website: ScrapedWebsite, domain: string): string {
  return `You are a company research analyst. Analyze this website and extract a structured company profile.

## Website Data
URL: ${website.url}
Title: ${website.title}
Description: ${website.description}

## Content
${website.markdown.slice(0, 8000)}

Respond with ONLY valid JSON:
{
  "name": "Company Name",
  "domain": "${domain}",
  "tagline": "Main tagline",
  "productOrService": "What they sell",
  "problemTheySolve": "Core problem they address",
  "howTheySolveIt": "Solution approach",
  "targetMarket": "Who they serve",
  "existingCustomerTypes": ["Type 1", "Type 2"],
  "caseStudiesOrTestimonials": ["Case study 1"],
  "geography": {
    "primaryMarkets": ["Country 1"],
    "officeLocations": [],
    "evidenceSignals": ["Signal 1"],
    "confidence": "medium",
    "reasoning": "Geographic reasoning"
  },
  "industry": "Industry",
  "competitiveAdvantage": "What makes them different",
  "pricingModel": "freemium | enterprise | SMB | unknown",
  "companyMaturity": "early-stage | growth | established | enterprise",
  "salesMotion": "self-serve | sales-led | hybrid | unknown"
}`;
}

function buildICPBrainstormerPrompt(profile: CompanyProfile): string {
  return `You are a sales strategist. Generate 4 buyer personas for this company.

## Company
Name: ${profile.name}
Product: ${profile.productOrService}
Problem: ${profile.problemTheySolve}
Target: ${profile.targetMarket}
Industry: ${profile.industry}

## Case Studies
${profile.caseStudiesOrTestimonials?.join(', ') || 'None'}

Respond with ONLY valid JSON:
{
  "personas": [
    {
      "id": "icp_a",
      "name": "The [Name]",
      "titles": ["Title 1", "Title 2", "Title 3"],
      "seniority": "vp",
      "department": "Sales",
      "companySize": "50-200",
      "companyStage": "Series A/B",
      "industries": ["SaaS"],
      "painPoints": ["Pain 1"],
      "goals": ["Goal 1"],
      "dayToDay": "Brief description",
      "buyingTriggers": ["Trigger 1"],
      "valueTheySeek": "Value",
      "whyThisPersona": "Why this persona"
    }
  ],
  "reasoning": "Overall reasoning"
}`;
}

function buildColdEmailRankerPrompt(profile: CompanyProfile, personas: ICPPersona[]): string {
  const personasSummary = personas.map(p => 
    `- ${p.id}: ${p.name} (${p.titles?.slice(0, 2).join(', ')})`
  ).join('\n');

  return `You are a cold email expert. Select the persona MOST LIKELY TO RESPOND to cold email.

## Company
${profile.name} - ${profile.productOrService}
Pricing: ${profile.pricingModel}

## Personas
${personasSummary}

Score each on: Inbox Accessibility, Pain Urgency, Decision Authority, Reachability, Response Likelihood (1-10)

Respond with ONLY valid JSON:
{
  "evaluations": [
    {
      "personaId": "icp_a",
      "personaName": "The...",
      "overallScore": 7.5,
      "inboxAccessibility": 6,
      "painUrgency": 8,
      "decisionAuthority": 7,
      "reachability": 8,
      "responseLikelihood": 7,
      "strengths": ["Strength 1"],
      "weaknesses": ["Weakness 1"],
      "recommendation": "Brief recommendation"
    }
  ],
  "selectedPersonaId": "icp_a",
  "selectedPersonaName": "The...",
  "selectionReasoning": "Why this persona is best for cold email"
}`;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function buildLinkedInFilterPrompt(persona: ICPPersona, _profile: CompanyProfile): string {
  return `Translate this ICP to LinkedIn Sales Navigator filters.

## Persona
Name: ${persona.name}
Titles: ${persona.titles?.join(', ')}
Company Size: ${persona.companySize}
Industries: ${persona.industries?.join(', ')}

## Geography IDs
- United States: 103644278
- United Kingdom: 101165590
- Canada: 101174742
- Germany: 101282230

## Industry IDs
- Software Development: 4
- IT Services: 96
- Financial Services: 43
- Marketing Services: 1862

Respond with ONLY valid JSON:
{
  "titles": ["Title 1", "Title 2"],
  "companySize": "50-200",
  "industries": [{ "id": "4", "text": "Software Development" }],
  "locations": [{ "id": "103644278", "text": "United States" }]
}`;
}

/**
 * Find the next available slug
 */
async function getNextAvailableSlug(baseSlug: string): Promise<string> {
  if (!supabaseAdmin) return baseSlug;

  const { data: baseExists } = await supabaseAdmin
    .from('campaigns')
    .select('slug')
    .eq('slug', baseSlug)
    .single();

  if (!baseExists) return baseSlug;

  const { data: existingSlugs } = await supabaseAdmin
    .from('campaigns')
    .select('slug')
    .or(`slug.eq.${baseSlug},slug.like.${baseSlug}-%`);

  if (!existingSlugs || existingSlugs.length === 0) return baseSlug;

  let maxNumber = 1;
  for (const row of existingSlugs) {
    if (row.slug === baseSlug) continue;
    const match = row.slug.match(new RegExp(`^${baseSlug}-(\\d+)$`));
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > maxNumber) maxNumber = num;
    }
  }

  return `${baseSlug}-${maxNumber + 1}`;
}
