'use server';
/**
 * @fileOverview A flow to consult CNPJ data from a third-party API.
 *
 * - consultarCnpj - A function that handles the CNPJ consultation.
 * - ConsultarCnpjInput - The input type for the consultarCnpj function.
 * - ConsultarCnpjOutput - The return type for the consultarCnpj function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

// Function to fetch data from BrasilAPI
async function fetchCnpjDataFromApi(cnpj: string) {
    console.log(`Fetching real data for CNPJ: ${cnpj} from BrasilAPI`);
    try {
        const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`);

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`BrasilAPI request failed with status ${response.status}: ${errorText}`);
            // The tool will catch this and the flow will return an error to the client.
            throw new Error(`A API da BrasilAPI retornou um erro: ${response.statusText}`);
        }

        const data = await response.json();

        // The tool's output schema must be satisfied.
        return {
            razao_social: data.razao_social || '',
            nome_fantasia: data.nome_fantasia || '',
            email: 'naoinformado@exemplo.com', // BrasilAPI doesn't provide this.
            telefone: data.ddd_telefone_1 || '',
            inscricao_estadual: 'Isento', // BrasilAPI doesn't provide this.
        };

    } catch (error) {
        console.error("Error fetching CNPJ data from BrasilAPI:", error);
        if (error instanceof Error) {
            throw error; // Re-throw the error to be handled by the caller (the tool)
        }
        throw new Error('Falha na comunicação com a API de CNPJ.');
    }
}


const CnpjTool = ai.defineTool(
    {
        name: 'fetchCnpjData',
        description: 'Fetches company data for a given Brazilian CNPJ number.',
        inputSchema: z.object({
            cnpj: z.string().describe('The CNPJ number to look up. Should contain only digits.'),
        }),
        outputSchema: z.object({
            razao_social: z.string(),
            nome_fantasia: z.string(),
            email: z.string(),
            telefone: z.string(),
            inscricao_estadual: z.string(),
        }),
    },
    async ({ cnpj }) => {
        // Clean up CNPJ, removing non-digit characters
        const cleanedCnpj = cnpj.replace(/\D/g, '');
        return await fetchCnpjDataFromApi(cleanedCnpj);
    }
);

const ConsultarCnpjInputSchema = z.object({
  cnpj: z.string().describe('The CNPJ number to consult.'),
});

const ConsultarCnpjOutputSchema = z.object({
  razaoSocial: z.string().describe("The company's official name (Razão Social)."),
  nomeFantasia: z.string().describe("The company's trade name (Nome Fantasia)."),
  email: z.string().email().describe("The company's primary contact email."),
  telefone: z.string().describe("The company's primary phone number."),
  inscricaoEstadual: z.string().describe("The company's state registration number (Inscrição Estadual)."),
});

export async function consultarCnpj(input: ConsultarCnpjInput): Promise<ConsultarCnpjOutput> {
  return consultarCnpjFlow(input);
}


const prompt = ai.definePrompt({
  name: 'consultarCnpjPrompt',
  system: `You are an assistant that processes company information.
  Your task is to use the available tool to fetch data for a given CNPJ.
  Then, map the retrieved data to the specified output format.
  - 'razao_social' maps to 'razaoSocial'.
  - 'nome_fantasia' maps to 'nomeFantasia'.
  - 'email' maps to 'email'.
  - 'telefone' maps to 'telefone'.
  - 'inscricao_estadual' maps to 'inscricaoEstadual'.
  Ensure you only return the data in the requested JSON format.
  `,
  input: { schema: ConsultarCnpjInputSchema },
  output: { schema: ConsultarCnpjOutputSchema },
  tools: [CnpjTool],
});


const consultarCnpjFlow = ai.defineFlow(
  {
    name: 'consultarCnpjFlow',
    inputSchema: ConsultarCnpjInputSchema,
    outputSchema: ConsultarCnpjOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);

export type ConsultarCnpjInput = z.infer<typeof ConsultarCnpjInputSchema>;
export type ConsultarCnpjOutput = z.infer<typeof ConsultarCnpjOutputSchema>;
