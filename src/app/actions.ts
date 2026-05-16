
"use server";

import { suggestOpportunities } from "@/ai/flows/intelligent-opportunity-suggestion";
import { sendWhatsapp } from "@/ai/flows/send-whatsapp-flow";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

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

export async function sendAppointmentNotifications(params: {
    appointment: any;
    companyName: string;
    technicians: any[];
    customMessageTemplate?: string;
}) {
    const { appointment, companyName, technicians, customMessageTemplate } = params;
    const results = [];

    try {
        const dateStr = format(parseISO(appointment.date), 'dd/MM/yyyy', { locale: ptBR });
        
        // 1. Notificar Cliente
        if (appointment.phone) {
            const clientTemplate = customMessageTemplate || "Olá, {cliente}! 👋\n\nEste é um lembrete do seu agendamento com a {empresa} no dia {data} às {hora}.\n\nAté breve!";
            const clientMessage = clientTemplate
                .replace('{cliente}', appointment.contact)
                .replace('{empresa}', companyName)
                .replace('{data}', dateStr)
                .replace('{hora}', appointment.time);

            const clientResult = await sendWhatsapp({
                to: appointment.phone.replace(/\D/g, ''),
                message: clientMessage
            });
            results.push({ to: 'client', ...clientResult });
        }

        // 2. Notificar Técnicos
        for (const tech of technicians) {
            if (tech.whatsapp) {
                let techMessage = `*Novo Agendamento Técnico (Automático)*\n\nOlá ${tech.name}, você foi escalado para uma visita.\n\n*Cliente:* ${appointment.clientName}\n*Data:* ${dateStr}\n*Horário:* ${appointment.time}\n*Local:* ${appointment.address}`;
                if (appointment.summary) techMessage += `\n*Resumo:* ${appointment.summary}`;

                const techResult = await sendWhatsapp({
                    to: tech.whatsapp.replace(/\D/g, ''),
                    message: techMessage
                });
                results.push({ to: `tech:${tech.name}`, ...techResult });
            }
        }

        return { success: true, details: results };
    } catch (e) {
        console.error("Erro interno ao enviar notificações:", e);
        return { success: false, error: "Erro interno no servidor de notificações." };
    }
}
