import Anthropic from '@anthropic-ai/sdk';
import { LinkedInLead, QualifiedLead, CompanyInfo } from '../types';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export interface EmailContent {
  whyPicked: string;
  emailSubject: string;
  emailBody: string;
}

/**
 * Generate personalized email for a single lead
 */
export async function generateEmailForLead(
  lead: LinkedInLead,
  senderCompany: CompanyInfo,
  senderName: string = 'Bella'
): Promise<EmailContent> {
  console.log(`[EmailWriter] Generating email for ${lead.full_name}...`);

  const prompt = `You are writing a cold email for ${senderCompany.name}.

About the sender's company:
- Name: ${senderCompany.name}
- What they do: ${senderCompany.whatTheyDo}
- Value proposition: ${senderCompany.valueProposition}

About the recipient:
- Name: ${lead.full_name}
- Title: ${lead.job_title}
- Company: ${lead.company}
- Location: ${lead.location}
- Their LinkedIn About: ${lead.about || 'Not available'}

Write a personalized cold email that:
1. Is short (under 100 words for the body)
2. Opens with something specific to them (their role, company, or something from their about)
3. Quickly explains how the sender can help
4. Has a soft CTA (asking if it makes sense to chat)
5. Sounds human, not salesy

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
  maxLeads: number = 5
): Promise<QualifiedLead[]> {
  const leadsToProcess = leads.slice(0, maxLeads);
  console.log(`[EmailWriter] Generating ${leadsToProcess.length} emails in parallel...`);

  const startTime = Date.now();

  // Run all email generations in parallel
  const results = await Promise.allSettled(
    leadsToProcess.map(async (lead, index) => {
      try {
        const email = await generateEmailForLead(lead, senderCompany, senderName);
        
        return {
          id: lead.profile_id || `lead-${index + 1}`,
          name: lead.full_name,
          firstName: lead.first_name,
          lastName: lead.last_name,
          title: lead.job_title,
          company: lead.company,
          linkedinUrl: lead.linkedin_url,
          profilePictureUrl: '',
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

