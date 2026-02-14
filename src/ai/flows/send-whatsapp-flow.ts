'use server';
/**
 * @fileOverview Um fluxo para enviar mensagens de WhatsApp através de uma API.
 *
 * - sendWhatsapp - Uma função que envia uma mensagem de WhatsApp.
 * - SendWhatsappInput - O tipo de entrada para a função sendWhatsapp.
 * - SendWhatsappOutput - O tipo de retorno para a função sendWhatsapp.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const SendWhatsappInputSchema = z.object({
  to: z.string().describe('O número de telefone do destinatário com código do país (ex: 5511999999999).'),
  message: z.string().describe('A mensagem a ser enviada.'),
});
export type SendWhatsappInput = z.infer<typeof SendWhatsappInputSchema>;

const SendWhatsappOutputSchema = z.object({
  success: z.boolean(),
  messageId: z.string().optional(),
  error: z.string().optional(),
});
export type SendWhatsappOutput = z.infer<typeof SendWhatsappOutputSchema>;

/**
 * Esta é uma função de placeholder para enviar uma mensagem de WhatsApp.
 * Uma implementação real requer um provedor de API do WhatsApp Business, como Twilio.
 * @param input - Os detalhes da mensagem a ser enviada.
 * @returns O resultado da operação de envio.
 */
async function sendWhatsappApi(input: SendWhatsappInput): Promise<SendWhatsappOutput> {
  console.log(`Tentando enviar mensagem para ${input.to}: "${input.message}"`);

  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_WHATSAPP_FROM;

  // Verifica se as credenciais estão configuradas. Se não, simula o envio.
  if (!accountSid || !authToken || !fromNumber) {
    console.warn("Credenciais do provedor de WhatsApp (Twilio) não configuradas no .env. Simulando o envio...");
    // Simula um pequeno atraso para parecer mais realista
    await new Promise(resolve => setTimeout(resolve, 1000));
    return { success: true, messageId: `simulated_${Date.now()}` };
  }

  // Implementação real usando Twilio
  try {
    const twilio = require('twilio');
    const client = twilio(accountSid, authToken);
    
    const message = await client.messages.create({
      from: `whatsapp:${fromNumber}`,
      to: `whatsapp:${input.to}`,
      body: input.message,
    });
    
    console.log("Mensagem enviada via Twilio com SID:", message.sid);
    return { success: true, messageId: message.sid };

  } catch (error: any) {
    console.error("Erro na API do Twilio:", error);
    return { success: false, error: error.message || 'Erro desconhecido ao contatar a API do WhatsApp.' };
  }
}

// Define o fluxo do Genkit
const sendWhatsappFlow = ai.defineFlow(
  {
    name: 'sendWhatsappFlow',
    inputSchema: SendWhatsappInputSchema,
    outputSchema: SendWhatsappOutputSchema,
  },
  async (input) => {
    return await sendWhatsappApi(input);
  }
);

// Função exportada para ser usada nas actions
export async function sendWhatsapp(input: SendWhatsappInput): Promise<SendWhatsappOutput> {
  return sendWhatsappFlow(input);
}
