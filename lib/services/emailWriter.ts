import Anthropic from '@anthropic-ai/sdk';
import { LinkedInLead, QualifiedLead, CompanyInfo } from '../types';
import { CompanyProfile } from './agents/companyProfiler';
import { ICPPersona } from './agents/icpBrainstormer';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

/**
 * Try to extract the primary position from a lead's data.
 * The headline often shows the main position even when we matched on a secondary role.
 * Example headline: "Manager, Business Development at American Express"
 */
function extractPrimaryPosition(lead: LinkedInLead): { title: string; company: string } {
  // If we have a headline, try to parse it - it usually shows the primary position
  if (lead.headline) {
    // Common patterns: "Title at Company" or "Title | Company" or "Title @ Company"
    const patterns = [
      /^(.+?)\s+at\s+(.+?)(?:\s*[|•]|$)/i,
      /^(.+?)\s*@\s*(.+?)(?:\s*[|•]|$)/i,
      /^(.+?)\s*\|\s*(.+?)(?:\s*[|•]|$)/i,
    ];
    
    for (const pattern of patterns) {
      const match = lead.headline.match(pattern);
      if (match) {
        return {
          title: match[1].trim(),
          company: match[2].trim(),
        };
      }
    }
  }
  
  // Use current_company/current_title if available (some scrapers provide this)
  if (lead.current_company && lead.current_title) {
    return {
      title: lead.current_title,
      company: lead.current_company,
    };
  }
  
  // Fall back to the matched position
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

Company Name: ${context.companyProfile.name}
Tagline: ${context.companyProfile.tagline}

What They Sell: ${context.companyProfile.productOrService}
Problem They Solve: ${context.companyProfile.problemTheySolve}
How They Solve It: ${context.companyProfile.howTheySolveIt}

Target Market: ${context.companyProfile.targetMarket}
Industry: ${context.companyProfile.industry}
Competitive Advantage: ${context.companyProfile.competitiveAdvantage}

${context.companyProfile.caseStudiesOrTestimonials.length > 0 ? `
Proof Points (use for social proof):
${context.companyProfile.caseStudiesOrTestimonials.map((cs, i) => `- ${cs}`).join('\n')}
` : ''}
` : `
About the sender's company:
- Name: ${senderCompany.name}
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

  const prompt = `You are writing a cold email for ${senderCompany.name}.

${companyContextSection}

${personaContextSection}

## About the Recipient

- Name: ${lead.full_name}
- Title: ${primaryPosition.title}
- Company: ${primaryPosition.company}
- Location: ${lead.location}
- Their LinkedIn About: ${lead.about || 'Not available'}
${lead.headline && (lead.headline !== `${primaryPosition.title} at ${primaryPosition.company}`) ? `- LinkedIn Headline: ${lead.headline}` : ''}

## Email Requirements

Write a personalized cold email that:
1. Is short (under 100 words for the body)
2. Opens with something specific to them (their role, company, or something from their about)
3. Connects their likely pain points to the sender's solution
4. Has a soft CTA (asking if it makes sense to chat)
5. Sounds human, not salesy
6. Uses social proof if available (case studies, testimonials)

Also provide:
1. A reason why this person is a good lead (1 sentence)
2. A short, personalized subject line

Respond ONLY with valid JSON:
{
  "whyPicked": "Why this person is a good lead for this company",
  "emailSubject": "Short personalized subject line",
  "emailBody": "Hi {{first_name}},\\n\\nEmail body here...\\n\\nBest,\\n${senderName}"
}

Use {{first_name}} and {{company}} as placeholders in the email body.`;

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
          company: primaryPosition.company,
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

