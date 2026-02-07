'use server';

/**
 * @fileOverview Suggests relevant new sales opportunities for existing clients based on historical data and profiles.
 *
 * - suggestOpportunities - A function that suggests sales opportunities.
 * - SuggestOpportunitiesInput - The input type for the suggestOpportunities function.
 * - SuggestOpportunitiesOutput - The return type for the suggestOpportunities function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestOpportunitiesInputSchema = z.object({
  clientId: z.string().describe('The ID of the client to suggest opportunities for.'),
  clientProfile: z.string().describe('A description of the client, their industry, and their needs.'),
  historicalSalesData: z
    .string()
    .describe('Historical sales data for the client, including products purchased, dates, and amounts.'),
});
export type SuggestOpportunitiesInput = z.infer<typeof SuggestOpportunitiesInputSchema>;

const SuggestOpportunitiesOutputSchema = z.object({
  opportunities: z
    .array(z.string())
    .describe('A list of suggested sales opportunities for the client.'),
  reasoning: z.string().describe('The AI agents reasoning for the suggestions'),
});
export type SuggestOpportunitiesOutput = z.infer<typeof SuggestOpportunitiesOutputSchema>;

export async function suggestOpportunities(
  input: SuggestOpportunitiesInput
): Promise<SuggestOpportunitiesOutput> {
  return suggestOpportunitiesFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestOpportunitiesPrompt',
  input: {schema: SuggestOpportunitiesInputSchema},
  output: {schema: SuggestOpportunitiesOutputSchema},
  prompt: `You are an AI sales assistant tasked with identifying new sales opportunities for existing clients.

  Based on the client profile and historical sales data provided, suggest new products or services that the client may be interested in.
  Explain your reasoning for the suggestions.

  Client Profile: {{{clientProfile}}}
  Historical Sales Data: {{{historicalSalesData}}}

  Provide a list of potential sales opportunities, including a brief description of each opportunity and why it would be a good fit for the client.  Format the description in a way that is suitable for presenting directly to the sales representative.
  The reasoning should be a short paragraph.`,
});

const suggestOpportunitiesFlow = ai.defineFlow(
  {
    name: 'suggestOpportunitiesFlow',
    inputSchema: SuggestOpportunitiesInputSchema,
    outputSchema: SuggestOpportunitiesOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
