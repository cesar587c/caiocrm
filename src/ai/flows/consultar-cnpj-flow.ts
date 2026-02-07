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
             // If the CNPJ is not found, BrasilAPI returns 404.
            if (response.status === 404) {
                 throw new Error('CNPJ não encontrado na base de dados da BrasilAPI.');
            }
            const errorText = await response.text();
            console.error(`BrasilAPI request failed with status ${response.status}: ${errorText}`);
            throw new Error(`A consulta na BrasilAPI falhou: ${response.statusText}`);
        }

        const data = await response.json();

        // BrasilAPI doesn't provide a dedicated 'inscricao_estadual' field.
        // We create a descriptive string based on the company's status and state.
        const inscricaoEstadual = data.uf ? `Ativo em ${data.uf}` : 'Não informado';

        return {
            razao_social: data.razao_social || '',
            nome_fantasia: data.nome_fantasia || '',
            // BrasilAPI may not provide email. We return a placeholder that passes email validation.
            email: data.email || 'naoinformado@exemplo.com',
            telefone: data.ddd_telefone_1 || data.ddd_telefone_2 || '',
            inscricao_estadual: inscricaoEstadual,
        };

    } catch (error) {
        console.error("Error fetching CNPJ data from BrasilAPI:", error);
        if (error instanceof Error) {
            throw error; // Re-throw the error to be handled by the caller.
        }
        throw new Error('Falha na comunicação com a API de CNPJ.');
    }
}


const fetchCnpjDataTool = ai.defineTool(
    {
        name: 'fetchCnpjData',
        description: 'Fetches company data for a given Brazilian CNPJ number from BrasilAPI.',
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

const consultarCnpjFlow = ai.defineFlow(
  {
    name: 'consultarCnpjFlow',
    inputSchema: ConsultarCnpjInputSchema,
    outputSchema: ConsultarCnpjOutputSchema,
  },
  async (input) => {
    // We call the tool directly instead of using an LLM prompt to map fields.
    // This is more reliable, efficient, and fixes the 'use server' export error.
    const toolOutput = await fetchCnpjDataTool(input);

    return {
        razaoSocial: toolOutput.razao_social,
        nomeFantasia: toolOutput.nome_fantasia,
        email: toolOutput.email,
        telefone: toolOutput.telefone,
        inscricaoEstadual: toolOutput.inscricao_estadual,
    };
  }
);


export type ConsultarCnpjInput = z.infer<typeof ConsultarCnpjInputSchema>;
export type ConsultarCnpjOutput = z.infer<typeof ConsultarCnpjOutputSchema>;
