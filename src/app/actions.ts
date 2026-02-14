
"use server";

import { suggestOpportunities } from "@/ai/flows/intelligent-opportunity-suggestion";
import { consultarCnpj, ConsultarCnpjInput } from "@/ai/flows/consultar-cnpj-flow";
import { sendWhatsapp, SendWhatsappInput } from "@/ai/flows/send-whatsapp-flow";

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
        const message = error instanceof Error ? error.message : "Falha ao consultar CNPJ. Verifique o número e tente novamente.";
        return { error: message };
    }
}

export async function sendWhatsappAction(input: SendWhatsappInput) {
    try {
        const result = await sendWhatsapp(input);
        if (result.success) {
            return { success: result };
        }
        return { error: result.error || 'Falha ao enviar mensagem.' };
    } catch (error) {
        console.error("Error in sendWhatsappAction:", error);
        const message = error instanceof Error ? error.message : "Falha ao enviar mensagem via WhatsApp.";
        return { error: message };
    }
}
