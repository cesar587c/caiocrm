
"use server";

import { suggestOpportunities } from "@/ai/flows/intelligent-opportunity-suggestion";

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
