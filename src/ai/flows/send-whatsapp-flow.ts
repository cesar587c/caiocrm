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
  isSimulated: z.boolean().default(false),
});
export type SendWhatsappOutput = z.infer<typeof SendWhatsappOutputSchema>;

/**
 * Esta é uma função para enviar uma mensagem de WhatsApp.
 * @param input - Os detalhes da mensagem a ser enviada.
 * @returns O resultado da operação de envio.
 */
async function sendWhatsappApi(input: SendWhatsappInput): Promise<SendWhatsappOutput> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_WHATSAPP_FROM;

  // Se não houver credenciais, avisamos que foi simulado
  if (!accountSid || !authToken || !fromNumber) {
    console.warn("Credenciais de API não encontradas. Simulação ativada.");
    return { success: true, messageId: `simulated_${Date.now()}`, isSimulated: true };
  }

  try {
    const twilio = require('twilio');
    const client = twilio(accountSid, authToken);
    
    const message = await client.messages.create({
      from: `whatsapp:${fromNumber}`,
      to: `whatsapp:${input.to}`,
      body: input.message,
    });
    
    return { success: true, messageId: message.sid, isSimulated: false };
  } catch (error: any) {
    console.error("Erro na API de WhatsApp:", error);
    return { success: false, error: error.message || 'Erro na API.', isSimulated: false };
  }
}

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

export async function sendWhatsapp(input: SendWhatsappInput): Promise<SendWhatsappOutput> {
  return sendWhatsappFlow(input);
}
