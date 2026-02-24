'use server';
/**
 * @fileOverview A utility to consult CNPJ data from the BrasilAPI.
 *
 * - consultarCnpj - A function that handles the CNPJ consultation.
 * - ConsultarCnpjInput - The input type for the consultarCnpj function.
 * - ConsultarCnpjOutput - The return type for the consultarCnpj function.
 */

// Define types that were previously Zod schemas
export interface ConsultarCnpjInput {
  cnpj: string;
}

export interface ConsultarCnpjOutput {
  razaoSocial: string;
  nomeFantasia: string;
  email: string;
  telefone: string;
  inscricaoEstadual: string;
}

// Function to fetch and process data from BrasilAPI
async function fetchCnpjDataFromApi(cnpj: string): Promise<ConsultarCnpjOutput> {
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
            razaoSocial: data.razao_social || '',
            nomeFantasia: data.nome_fantasia || '',
            email: data.email || '',
            telefone: data.ddd_telefone_1 || data.ddd_telefone_2 || '',
            inscricaoEstadual: inscricaoEstadual,
        };

    } catch (error) {
        console.error("Error fetching CNPJ data from BrasilAPI:", error);
        if (error instanceof Error) {
            throw error; // Re-throw the error to be handled by the caller.
        }
        throw new Error('Falha na comunicação com a API de CNPJ.');
    }
}


/**
 * Consults CNPJ data from BrasilAPI.
 * @param input - The CNPJ to consult.
 * @returns The company data.
 */
export async function consultarCnpj(input: ConsultarCnpjInput): Promise<ConsultarCnpjOutput> {
    // Clean up CNPJ, removing non-digit characters
    const cleanedCnpj = input.cnpj.replace(/\D/g, '');
    return await fetchCnpjDataFromApi(cleanedCnpj);
}
