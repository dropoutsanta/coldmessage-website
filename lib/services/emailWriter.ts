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
    /,?\s*(sp\.?\s*z\.?\s*o\.?\s*o\.?)$/i,  // Polish (sp. z o.o.)
    /,?\s*(s\.?\s*r\.?\s*o\.?)$/i,          // Czech/Slovak (s.r.o.)
    /,?\s*(A\.?S\.?|a\/s)$/i,               // Danish/Norwegian (A/S)
    /,?\s*(AB)$/i,                          // Swedish
    /,?\s*(AG)$/i,                          // German/Swiss
    /,?\s*(S\.?r\.?l\.?)$/i,                // Italian/Romanian (S.r.l.)
    /,?\s*(S\.?L\.?)$/i,                    // Spanish (S.L.)
    /,?\s*(N\.?V\.?)$/i,                    // Dutch (N.V.)
    /,?\s*(OÜ)$/i,                          // Estonian
  ];
  
  let normalized = name.trim();
  
  for (const suffix of suffixes) {
    normalized = normalized.replace(suffix, '');
  }
  
  return normalized.trim();
}

/**
 * Normalize a first name for casual email use.
 * Handles titles, nicknames in parentheses, and compound names.
 * 
 * "Dr. John Smith" -> "John"
 * "Robert (Bob) Johnson" -> "Bob"
 * "Mary-Jane Watson" -> "Mary-Jane"
 * "Prof. Elizabeth" -> "Elizabeth"
 */
function normalizeFirstName(firstName: string, fullName?: string): string {
  if (!firstName) return firstName;
  
  let name = firstName.trim();
  
  // If we have a full name, check for nickname patterns there first
  // e.g., "Robert (Bob) Johnson" or "Robert 'Bob' Johnson"
  if (fullName) {
    const nicknameMatch = fullName.match(/\(([^)]+)\)/) || fullName.match(/'([^']+)'/) || fullName.match(/"([^"]+)"/);
    if (nicknameMatch) {
      // Use the nickname - it's more casual
      return nicknameMatch[1].trim();
    }
  }
  
  // Remove common titles/prefixes
  const titlePatterns = [
    /^(Dr\.?|Prof\.?|Mr\.?|Mrs\.?|Ms\.?|Miss|Sir|Dame|Rev\.?|Hon\.?)\s+/i,
  ];
  
  for (const pattern of titlePatterns) {
    name = name.replace(pattern, '');
  }
  
  // Handle "J. Robert" -> "Robert" (initial followed by actual name)
  name = name.replace(/^[A-Z]\.?\s+/, '');
  
  // If the name still has multiple parts (shouldn't for first name, but just in case)
  // take the first part unless it's an initial
  const parts = name.split(/\s+/);
  if (parts.length > 1 && parts[0].length <= 2) {
    name = parts[1]; // Skip the initial
  } else {
    name = parts[0];
  }
  
  return name.trim();
}

/**
 * Validate that a string looks like a real company name, not bio text.
 */
function isValidCompanyName(name: string): boolean {
  if (!name || name.length > 50) return false; // Too long = probably bio text
  if (name.split(' ').length > 6) return false; // Too many words
  if (/^[a-z]/.test(name)) return false; // Starts with lowercase
  // Contains common sentence/bio words
  if (/\b(and|the|with|for|from|through|such as|not only|who|where|that|this|their|have|has|been|being|were|was|are|is|a\s|an\s|in\s|on\s|at\s|to\s|of\s|as\s|by\s|or\s)\b/i.test(name)) return false;
  // Looks like a sentence fragment
  if (/\b(experience|track record|organisations|organizations|years|clients|helping|serving|leading|building|creating|developing|managing)\b/i.test(name)) return false;
  return true;
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
 * 
 * IMPORTANT: We validate extracted companies to avoid replacing good data with garbage.
 */
function extractPrimaryPosition(lead: LinkedInLead): { title: string; company: string } {
  // Priority 1: Use current_company/current_title if available (most reliable)
  if (lead.current_company && lead.current_title) {
    return {
      title: lead.current_title,
      company: lead.current_company,
    };
  }
  
  // Priority 2: Parse the headline if available (usually accurate)
  if (lead.headline) {
    const headlinePatterns = [
      /^(.+?)\s+at\s+(.+?)(?:\s*[|•]|$)/i,
      /^(.+?)\s*@\s*(.+?)(?:\s*[|•]|$)/i,
      /^(.+?)\s*\|\s*(.+?)(?:\s*[|•]|$)/i,
    ];
    
    for (const pattern of headlinePatterns) {
      const match = lead.headline.match(pattern);
      if (match) {
        const extractedCompany = match[2].trim();
        if (isValidCompanyName(extractedCompany)) {
          return {
            title: match[1].trim(),
            company: extractedCompany,
          };
        }
      }
    }
  }
  
  // Priority 3: Parse the "about" field - but ONLY if extracted company looks valid
  // This is risky because about text is freeform and regex can match garbage
  if (lead.about) {
    const aboutPatterns = [
      // "As a Manager of Business Development for American Express"
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
        
        // CRITICAL: Only use if extracted company looks like a real company name
        // AND is different from the original
        if (extractedCompany.toLowerCase() !== lead.company.toLowerCase() && isValidCompanyName(extractedCompany)) {
          console.log(`[EmailWriter] Extracted primary position from about: "${extractedTitle} at ${extractedCompany}" (was: "${lead.job_title} at ${lead.company}")`);
          return {
            title: extractedTitle,
            company: extractedCompany,
          };
        }
      }
    }
  }
  
  // Fall back to the matched position from the scraper (most reliable source)
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
3. Open with a 5-word MAX hook AS A QUESTION. NO fluffy adjectives (unforgettable, incredible, amazing, seamless, revolutionary). Examples:
   - "Team retreat in Montenegro?"
   - "Cut your sales cycle in half?"
   - "New leads on autopilot?"
4. Then describe the offer/experience — what they GET, not what they're missing
5. End with a CTA that name-drops similar companies: "Want to see what we did for [Company] from [Country]?" NOT generic "Want to chat?"
6. Sounds human, not salesy - be direct and confident
7. Uses social proof if available (case studies, testimonials)

BANNED PATTERNS - Never use these:
- "Most [X] struggle with..." 
- "Saw [company] is..." or "I noticed..."
- "Companies like yours..."
- "Are you facing challenges with..."
- Any opener that talks about their problems before the offer

## Writing Style

STRUCTURE: 2-3 short paragraphs, not a wall of text but also not every sentence on its own line. Group related thoughts together naturally. Think casual email, not poetry.

BAD (too corporate, wall of text):
"Our platform helps businesses streamline their operations and improve productivity through our comprehensive suite of tools designed to meet your specific needs."

BAD (too choppy, every line isolated):
"Cut your sales cycle by 40%?

3 demos closed in under 2 hours last week.

Your reps spend less time chasing & more time closing."

GOOD (natural grouping, flows like a real email):
"[Question hook - 5 words max]?

[What they get - 2-3 sentences grouped naturally, specific details].

[Social proof with real numbers]. Want to see what we did for [similar company]?"

VOICE:
- Use "&" instead of "and" 
- Casual, like texting a friend
- Specific details, not corporate vague ("40%" not "significant improvement", "last week" not "recently")
- Name-drop real numbers, real timeframes, real results

BANNED WORDS: "just", "really", "very", "actually", "basically", "honestly", "definitely", "unique", "tailored", "leverage", "solutions", "comprehensive", "streamline"

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
  "emailBody": "Hi {{first_name}},\\n\\n[5-word hook - the offer, not their pain].\\n\\n[What they get - specifics, details, the experience].\\n\\n[Social proof or credibility - brief].\\n\\n[CTA asking for a response - Want me to send X?].\\n\\nBest,\\n${senderName}"
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
        
        // Normalize first name for casual email use
        const normalizedFirstName = normalizeFirstName(lead.first_name, lead.full_name);
        
        return {
          id: lead.profile_id || `lead-${index + 1}`,
          name: lead.full_name,
          firstName: normalizedFirstName,
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

