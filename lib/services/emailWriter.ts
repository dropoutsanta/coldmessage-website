import Anthropic from '@anthropic-ai/sdk';
import { LinkedInLead, QualifiedLead, CompanyInfo } from '../types';
import { CompanyProfile } from './agents/companyProfiler';
import { ICPPersona } from './agents/icpBrainstormer';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

/**
 * Normalize a company name for use in casual email copy.
 * Strips legal suffixes like LLC, Inc., Corp., etc.
 * 
 * "Acme Corporation, Inc." -> "Acme Corporation"
 * "TechStart LLC" -> "TechStart"
 * "Global Solutions, L.L.C." -> "Global Solutions"
 */
function normalizeCompanyName(name: string): string {
  if (!name) return name;
  
  // Common legal suffixes to remove (case insensitive)
  // Order matters - check longer patterns first
  const suffixes = [
    /,?\s*(L\.?L\.?C\.?|LLC)\.?$/i,
    /,?\s*(Inc\.?|Incorporated)$/i,
    /,?\s*(Corp\.?|Corporation)$/i,
    /,?\s*(Ltd\.?|Limited)$/i,
    /,?\s*(L\.?L\.?P\.?|LLP)\.?$/i,
    /,?\s*(P\.?L\.?L\.?C\.?|PLLC)\.?$/i,
    /,?\s*(P\.?C\.?|PC)\.?$/i,
    /,?\s*(Co\.?)$/i,
    /,?\s*(S\.?A\.?)$/i,         // Spanish/French
    /,?\s*(GmbH)$/i,             // German
    /,?\s*(B\.?V\.?)$/i,         // Dutch
    /,?\s*(Pty\.?\s*Ltd\.?)$/i,  // Australian
  ];
  
  let normalized = name.trim();
  
  for (const suffix of suffixes) {
    normalized = normalized.replace(suffix, '');
  }
  
  return normalized.trim();
}

/**
 * Try to extract the primary position from a lead's data.
 * 
 * The Apify Sales Navigator scraper has a known issue where it sometimes returns
 * a secondary position (side gig, board role) instead of the primary job.
 * However, the "about" field often contains the correct primary position.
 * 
 * Example: about says "As a Manager of Business Development for American Express..."
 *          but company shows "Great Artist Program" (a side gig)
 */
function extractPrimaryPosition(lead: LinkedInLead): { title: string; company: string } {
  // Priority 1: Parse the "about" field - it often contains the real primary position
  // Common patterns: "As a [Title] at/for [Company]" or "[Title] at [Company]"
  if (lead.about) {
    const aboutPatterns = [
      // "As a Manager of Business Development for American Express Global Commercial Services"
      /\bAs (?:a |an |the )?(.+?)\s+(?:for|at|with)\s+([A-Z][A-Za-z0-9\s&.,'-]+?)(?:,|\.|I\s|where|helping|serving|\n|$)/i,
      // "I am the VP of Sales at Acme Corp"
      /\bI (?:am|serve as|work as) (?:a |an |the )?(.+?)\s+(?:at|for|with)\s+([A-Z][A-Za-z0-9\s&.,'-]+?)(?:,|\.|where|helping|\n|$)/i,
      // "Currently [Title] at [Company]"
      /\bCurrently(?:,)?\s+(?:a |an |the )?(.+?)\s+(?:at|for|with)\s+([A-Z][A-Za-z0-9\s&.,'-]+?)(?:,|\.|where|\n|$)/i,
    ];
    
    for (const pattern of aboutPatterns) {
      const match = lead.about.match(pattern);
      if (match) {
        const extractedTitle = match[1].trim();
        const extractedCompany = match[2].trim();
        
        // Only use if the extracted company is different and looks more "legitimate"
        // (has a company_id or the original one doesn't)
        if (extractedCompany.toLowerCase() !== lead.company.toLowerCase()) {
          console.log(`[EmailWriter] Extracted primary position from about: "${extractedTitle} at ${extractedCompany}" (was: "${lead.job_title} at ${lead.company}")`);
          return {
            title: extractedTitle,
            company: extractedCompany,
          };
        }
      }
    }
  }
  
  // Priority 2: Parse the headline if available
  if (lead.headline) {
    const headlinePatterns = [
      /^(.+?)\s+at\s+(.+?)(?:\s*[|•]|$)/i,
      /^(.+?)\s*@\s*(.+?)(?:\s*[|•]|$)/i,
      /^(.+?)\s*\|\s*(.+?)(?:\s*[|•]|$)/i,
    ];
    
    for (const pattern of headlinePatterns) {
      const match = lead.headline.match(pattern);
      if (match) {
        return {
          title: match[1].trim(),
          company: match[2].trim(),
        };
      }
    }
  }
  
  // Priority 3: Use current_company/current_title if available
  if (lead.current_company && lead.current_title) {
    return {
      title: lead.current_title,
      company: lead.current_company,
    };
  }
  
  // Fall back to the matched position (may be a secondary role)
  return {
    title: lead.job_title,
    company: lead.company,
  };
}

export interface EmailContent {
  whyPicked: string;
  emailSubject: string;
  emailBody: string;
}

/**
 * Enriched context for writing better emails
 */
export interface EmailWriterContext {
  companyProfile?: CompanyProfile; // Full company profile for context
  selectedPersona?: ICPPersona; // Why we're targeting this type of person
  selectionReasoning?: string; // Why this persona was chosen for cold email
}

/**
 * Generate personalized email for a single lead
 */
export async function generateEmailForLead(
  lead: LinkedInLead,
  senderCompany: CompanyInfo,
  senderName: string = 'Bella',
  context?: EmailWriterContext
): Promise<EmailContent> {
  console.log(`[EmailWriter] Generating email for ${lead.full_name}...`);
  
  // Extract primary position (may differ from matched position if they have multiple roles)
  const primaryPosition = extractPrimaryPosition(lead);

  // Build rich company context section
  const companyContextSection = context?.companyProfile ? `
## Deep Company Context (use this to write a compelling email)

Company Name: ${normalizeCompanyName(context.companyProfile.name)}
Tagline: ${context.companyProfile.tagline}

What They Sell: ${context.companyProfile.productOrService}
Problem They Solve: ${context.companyProfile.problemTheySolve}
How They Solve It: ${context.companyProfile.howTheySolveIt}

Target Market: ${context.companyProfile.targetMarket}
Industry: ${context.companyProfile.industry}
Competitive Advantage: ${context.companyProfile.competitiveAdvantage}

${context.companyProfile.caseStudiesOrTestimonials.length > 0 ? `
Proof Points (use for social proof):
${context.companyProfile.caseStudiesOrTestimonials.map((cs) => `- ${cs}`).join('\n')}
` : ''}
` : `
About the sender's company:
- Name: ${normalizeCompanyName(senderCompany.name)}
- What they do: ${senderCompany.whatTheyDo}
- Value proposition: ${senderCompany.valueProposition}
`;

  // Build persona context section
  const personaContextSection = context?.selectedPersona ? `
## Why We're Targeting This Type of Person

Persona: ${context.selectedPersona.name}
Their Pain Points: ${context.selectedPersona.painPoints.join(', ')}
Their Goals: ${context.selectedPersona.goals.join(', ')}
What They Value: ${context.selectedPersona.valueTheySeek}
Buying Triggers: ${context.selectedPersona.buyingTriggers.join(', ')}

${context.selectionReasoning ? `Why this persona is best for cold email: ${context.selectionReasoning}` : ''}

Use this persona context to write an email that resonates with their specific pain points and goals.
` : '';

  // Normalize company names for casual email copy
  const normalizedSenderCompany = normalizeCompanyName(senderCompany.name);
  const normalizedLeadCompany = normalizeCompanyName(primaryPosition.company);

  const prompt = `You are writing a cold email for ${normalizedSenderCompany}.

${companyContextSection}

${personaContextSection}

## About the Recipient

- Name: ${lead.full_name}
- Title: ${primaryPosition.title}
- Company: ${normalizedLeadCompany}
- Location: ${lead.location}
- Their LinkedIn About: ${lead.about || 'Not available'}
${lead.headline && (lead.headline !== `${primaryPosition.title} at ${primaryPosition.company}`) ? `- LinkedIn Headline: ${lead.headline}` : ''}

## Email Requirements

Write a personalized cold email that:
1. Is short (under 100 words for the body)
2. Gets straight to the point - NO flattery, NO "I noticed you're crushing it", NO compliments about their company/role
3. Opens with a pain point or direct question relevant to their role
4. Connects their likely pain points to the sender's solution
5. Has a soft CTA (asking if it makes sense to chat)
6. Sounds human, not salesy - be direct and confident
7. Uses social proof if available (case studies, testimonials)

IMPORTANT: Do NOT start with compliments or flattery. Skip the "I saw your profile" or "Congrats on..." garbage. Just get to the point.

## Subject Line Requirements

The subject line is CRITICAL. It must be:
- Super short: 2-4 words MAX
- Lowercase or sentence case (NOT Title Case For Every Word)
- Look like it came from a colleague, not a marketer
- Intriguing but not clickbait

Good examples: "quick question", "new leads", "Q4 discussion", "64% more SQLs", "re: pipeline", "idea for {{company}}"
BAD examples: "Unlock Your Sales Potential Today!", "Quick Question About Your Business", "I'd Love To Connect"

Also provide:
1. A reason why this person is a good lead (1 sentence)
2. The subject line (remember: 2-4 words, lowercase)

Respond ONLY with valid JSON:
{
  "whyPicked": "Why this person is a good lead for this company",
  "emailSubject": "quick question",
  "emailBody": "Hi {{first_name}},\\n\\nEmail body here...\\n\\nBest,\\n${senderName}"
}

Use {{first_name}} and {{company}} as placeholders in the email body.

IMPORTANT: When mentioning company names, write them casually like a human would. Never include legal suffixes like LLC, Inc., Corp., Ltd., etc.`;

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 512,
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
  });

  const responseText = message.content[0].type === 'text' ? message.content[0].text : '';
  
  const jsonMatch = responseText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Failed to parse email generation response');
  }

  const result: EmailContent = JSON.parse(jsonMatch[0]);
  
  console.log(`[EmailWriter] Generated email with subject: "${result.emailSubject}"`);

  return result;
}

/**
 * Generate personalized emails for multiple leads (PARALLEL)
 */
export async function generateEmailsForLeads(
  leads: LinkedInLead[],
  senderCompany: CompanyInfo,
  senderName: string = 'Bella',
  maxLeads: number = 5,
  context?: EmailWriterContext
): Promise<QualifiedLead[]> {
  const leadsToProcess = leads.slice(0, maxLeads);
  console.log(`[EmailWriter] Generating ${leadsToProcess.length} emails in parallel...`);

  const startTime = Date.now();

  // Run all email generations in parallel
  const results = await Promise.allSettled(
    leadsToProcess.map(async (lead, index) => {
      try {
        const email = await generateEmailForLead(lead, senderCompany, senderName, context);
        
        // Use the primary position (from headline parsing) instead of the matched position
        // This helps when the lead matched on a secondary role (side gig, board position, etc.)
        const primaryPosition = extractPrimaryPosition(lead);
        
        return {
          id: lead.profile_id || `lead-${index + 1}`,
          name: lead.full_name,
          firstName: lead.first_name,
          lastName: lead.last_name,
          title: primaryPosition.title,
          company: normalizeCompanyName(primaryPosition.company),
          linkedinUrl: lead.linkedin_url,
          profilePictureUrl: lead.profile_picture || '',
          location: lead.location,
          about: lead.about,
          whyPicked: email.whyPicked,
          emailSubject: email.emailSubject,
          emailBody: email.emailBody,
        } as QualifiedLead;
      } catch (error) {
        console.error(`[EmailWriter] Error generating email for ${lead.full_name}:`, error);
        throw error;
      }
    })
  );

  // Filter successful results
  const qualifiedLeads = results
    .filter((r): r is PromiseFulfilledResult<QualifiedLead> => r.status === 'fulfilled')
    .map(r => r.value);

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`[EmailWriter] Generated ${qualifiedLeads.length}/${leadsToProcess.length} emails in ${elapsed}s`);

  return qualifiedLeads;
}

