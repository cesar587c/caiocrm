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

// Mock function to simulate fetching data from an external API
async function fetchCnpjDataFromApi(cnpj: string) {
    console.log(`Simulating API call for CNPJ: ${cnpj}`);
    // In a real scenario, this would be a fetch call to an external service.
    // For demonstration, we return mock data.
    return {
        "razao_social": "TECH SOLUTIONS LTDA",
        "nome_fantasia": "TECH SOLUTIONS",
        "email": "contato@techsolutions.com.br",
        "telefone": "(11) 99999-8888",
        "inscricao_estadual": "123.456.789.112",
        "situacao": "ATIVA",
    };
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
export type ConsultarCnpjInput = z.infer<typeof ConsultarCnpjInputSchema>;

const ConsultarCnpjOutputSchema = z.object({
  razaoSocial: z.string().describe("The company's official name (Razão Social)."),
  nomeFantasia: z.string().describe("The company's trade name (Nome Fantasia)."),
  email: z.string().email().describe("The company's primary contact email."),
  telefone: z.string().describe("The company's primary phone number."),
  inscricaoEstadual: z.string().describe("The company's state registration number (Inscrição Estadual)."),
});
export type ConsultarCnpjOutput = z.infer<typeof ConsultarCnpjOutputSchema>;

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
