import Anthropic from '@anthropic-ai/sdk';
import { CompanyProfile } from './companyProfiler';
import { ICPPersona } from './icpBrainstormer';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

/**
 * Evaluation of a single persona for cold email effectiveness
 */
export interface PersonaEvaluation {
  personaId: string;
  personaName: string;
  
  // Scoring (1-10)
  overallScore: number;
  
  // Individual factors
  inboxAccessibility: number; // How likely to actually see the email (vs. gatekept)
  painUrgency: number; // How urgent is their problem
  decisionAuthority: number; // Can they make or influence the buying decision
  reachability: number; // How easy to find and contact
  responselikelihood: number; // General propensity to respond to cold email
  
  // Reasoning
  strengths: string[];
  weaknesses: string[];
  recommendation: string;
}

/**
 * Output from Agent 3
 */
export interface ColdEmailRankingResult {
  evaluations: PersonaEvaluation[];
  selectedPersona: ICPPersona;
  selectionReasoning: string;
  debug: {
    prompt: string;
    response: string;
  };
}

/**
 * Agent 3: Cold Email Susceptibility Ranker
 * 
 * Focused task: Evaluate each ICP persona for cold email effectiveness
 * and select the one most likely to respond.
 * 
 * This is NOT about "who would buy" but "who would RESPOND to a cold email"
 * These are different! A CEO might be the buyer but never reads cold email.
 */
export async function rankPersonasForColdEmail(
  companyProfile: CompanyProfile,
  personas: ICPPersona[]
): Promise<ColdEmailRankingResult> {
  console.log(`[Agent3:ColdEmailRanker] Evaluating ${personas.length} personas...`);
  const startTime = Date.now();

  const personasJson = personas.map(p => ({
    id: p.id,
    name: p.name,
    titles: p.titles,
    seniority: p.seniority,
    department: p.department,
    companySize: p.companySize,
    companyStage: p.companyStage,
    painPoints: p.painPoints,
    buyingTriggers: p.buyingTriggers,
  }));

  const prompt = `You are a cold email expert. Your job is to evaluate buyer personas and determine which one is MOST LIKELY TO RESPOND to a cold email.

## Important Distinction

"Who would buy" ≠ "Who would respond to cold email"

A CEO might be the ultimate buyer, but they:
- Have overflowing inboxes
- Have assistants screening email
- Rarely read unsolicited messages

A Head of Revenue Operations might:
- Actively research solutions
- Have more inbox capacity
- Be empowered to champion tools internally

## Company Sending the Email

Name: ${companyProfile.name}
Product: ${companyProfile.productOrService}
Problem Solved: ${companyProfile.problemTheySolve}
Value Prop: ${companyProfile.competitiveAdvantage}

## Personas to Evaluate

${JSON.stringify(personasJson, null, 2)}

## Evaluation Criteria

For each persona, score 1-10 on:

1. **Inbox Accessibility** - Will they actually SEE the email?
   - Low: C-suite, heavily gatekept roles
   - High: Individual contributors, managers, ops roles

2. **Pain Urgency** - Is their problem urgent enough to act?
   - Low: Nice-to-have improvements
   - High: Blocking problems, quota pressure, growth mandates

3. **Decision Authority** - Can they buy or champion internally?
   - Low: No budget, no influence
   - High: Budget owner or known internal champion

4. **Reachability** - How easy to find and contact?
   - Low: Private profiles, no email patterns
   - High: Active on LinkedIn, company email patterns

5. **Response Likelihood** - General propensity to engage?
   - Low: Senior execs, "too busy" roles
   - High: Growth-minded, network builders, ops roles

## Response Format

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
      "responselikelihood": 7,
      "strengths": ["Strength 1", "Strength 2"],
      "weaknesses": ["Weakness 1"],
      "recommendation": "Brief recommendation"
    }
  ],
  "selectedPersonaId": "icp_b",
  "selectionReasoning": "Why this persona is the best choice for cold email outreach"
}

Be strategic. The goal is RESPONSE RATE, not just finding buyers.`;

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2048,
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
    throw new Error('[Agent3:ColdEmailRanker] Failed to parse response as JSON');
  }

  const parsed = JSON.parse(jsonMatch[0]);
  
  // Find the selected persona from the original list
  const selectedPersona = personas.find(p => p.id === parsed.selectedPersonaId);
  if (!selectedPersona) {
    throw new Error(`[Agent3:ColdEmailRanker] Selected persona ${parsed.selectedPersonaId} not found`);
  }

  const result: ColdEmailRankingResult = {
    evaluations: parsed.evaluations,
    selectedPersona,
    selectionReasoning: parsed.selectionReasoning,
    debug: {
      prompt,
      response: responseText,
    },
  };
  
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`[Agent3:ColdEmailRanker] Complete in ${elapsed}s - Selected: ${selectedPersona.name}`);

  return result;
}

