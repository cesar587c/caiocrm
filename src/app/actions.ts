
"use server";

import { suggestOpportunities } from "@/ai/flows/intelligent-opportunity-suggestion";
import { consultarCnpj, ConsultarCnpjInput } from "@/ai/flows/consultar-cnpj-flow";

export async function getOpportunitySuggestions(input: {
  clientProfile: string;
  historicalSalesData: string;
}) {
  try {
    const result = await suggestOpportunities({
      clientId: "vendaspro-client",
      ...input,
    });
    return { success: result };
  } catch (error) {
    console.error("Error getting opportunity suggestions:", error);
    return { error: "Falha ao obter sugestões. Por favor, tente novamente." };
  }
}

export async function consultarCnpjAction(input: ConsultarCnpjInput) {
    try {
        const result = await consultarCnpj(input);
        return { success: result };
    } catch (error) {
        console.error("Error consulting CNPJ:", error);
        return { error: "Falha ao consultar CNPJ. Verifique o número e tente novamente." };
    }
}
