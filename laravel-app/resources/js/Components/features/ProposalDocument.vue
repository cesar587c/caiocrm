<script setup>
import { format, parseISO } from 'date-fns';
import { formatCurrency, formatPhoneNumber } from '@/lib/utils';

const props = defineProps({ proposal: { type: Object, required: true }, companyProfile: { type: Object, required: true } });

const PAYMENT_METHODS = [
    { id: 'boleto', label: 'Boleto' },
    { id: 'dinheiro', label: 'Dinheiro' },
    { id: 'pix', label: 'Pix' },
    { id: 'debito', label: 'Débito' },
    { id: 'cartao_credito', label: 'Cartão de Crédito' },
];

function paymentMethodLabel(id) {
    return PAYMENT_METHODS.find((pm) => pm.id === id)?.label.toUpperCase() || (id || '').toUpperCase();
}
</script>

<template>
    <div id="proposal-preview" class="bg-white text-black mx-auto shadow-2xl" style="width: 210mm; min-height: 297mm; padding: 15mm; font-family: Arial, sans-serif; font-size: 11pt; line-height: 1.4; color: #000000">
        <div style="display: flex; align-items: flex-start; margin-bottom: 40px">
            <div style="width: 4px; height: 220px; background-color: #000; margin-right: 15px" />
            <div style="margin-right: 20px">
                <img v-if="companyProfile.logo_url" :src="companyProfile.logo_url" alt="Logo" style="height: 220px; width: 250px; display: block; object-fit: contain" />
            </div>
            <div style="flex: 1; padding-top: 10px">
                <h2 style="font-size: 14pt; font-weight: bold; margin: 0; text-transform: uppercase">{{ companyProfile.name }}</h2>
                <p style="font-size: 9pt; margin: 4px 0; color: #333">{{ companyProfile.email }}</p>
                <p style="font-size: 9pt; margin: 4px 0; color: #333">{{ formatPhoneNumber(companyProfile.phone) }}</p>
                <p style="font-size: 9pt; margin: 0; color: #333">{{ companyProfile.address }}</p>
            </div>
        </div>
        <div style="text-align: center; margin-bottom: 40px">
            <span style="font-size: 13pt; font-weight: bold; text-transform: uppercase">{{ proposal.document_type === 'pedido' ? 'PEDIDO DE VENDA' : 'PROPOSTA COMERCIAL' }}</span>
        </div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 35px">
            <div style="flex: 1">
                <p style="font-size: 8pt; color: #666; font-weight: bold; margin: 0 0 4px 0; text-transform: uppercase">DESTINATÁRIO</p>
                <h1 style="font-size: 13pt; font-weight: bold; margin: 0; text-transform: uppercase">{{ proposal.client_name }}</h1>
                <p style="font-size: 10pt; color: #4F46E5; font-weight: bold; margin: 4px 0">A/C: {{ (proposal.contact_name || 'SETOR RESPONSÁVEL').toUpperCase() }}</p>
                <p v-if="proposal.client_phone" style="font-size: 9pt; margin: 0">{{ formatPhoneNumber(proposal.client_phone) }}</p>
            </div>
            <div style="text-align: right; min-width: 180px">
                <p style="margin: 0; font-size: 9.5pt"><strong>Nº DOCUMENTO:</strong> {{ proposal.id }}</p>
                <p style="margin: 2px 0; font-size: 9.5pt"><strong>EMISSÃO:</strong> {{ format(parseISO(proposal.proposal_date), 'dd/MM/yyyy') }}</p>
                <p style="margin: 0; font-size: 9.5pt"><strong>VALIDADE:</strong> <span style="color: #E11D48; font-weight: bold">{{ format(parseISO(proposal.validity_date), 'dd/MM/yyyy') }}</span></p>
            </div>
        </div>
        <div style="margin-bottom: 35px; font-size: 10.5pt; text-align: justify">
            <p style="margin: 0 0 12px 0">Temos a satisfação de apresentar nossa proposta comercial desenvolvida com foco total na excelência tecnológica e na eficiência operacional que sua empresa demanda.</p>
            <p style="margin: 0">Com ampla experiência de mercado, a {{ companyProfile.name?.toUpperCase() }} combina consultoria especializada e as mais modernas ferramentas para entregar soluções ágeis, seguras e personalizadas.</p>
        </div>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 25px">
            <thead>
                <tr style="border-bottom: 1.5px solid #000">
                    <th style="text-align: left; padding: 10px 5px; font-size: 9.5pt; font-weight: bold; text-transform: uppercase">DESCRIÇÃO</th>
                    <th style="text-align: center; width: 50px; padding: 10px 5px; font-size: 9.5pt; font-weight: bold">QTD.</th>
                    <th style="text-align: right; width: 100px; padding: 10px 5px; font-size: 9.5pt; font-weight: bold">UNITÁRIO</th>
                    <th style="text-align: right; width: 110px; padding: 10px 5px; font-size: 9.5pt; font-weight: bold">SUBTOTAL</th>
                </tr>
            </thead>
            <tbody>
                <tr v-for="(it, i) in proposal.items" :key="i" style="border-bottom: 0.5px solid #eee">
                    <td style="padding: 12px 5px; font-size: 9.5pt; text-transform: uppercase">{{ it.name }} {{ it.is_monthly ? '(MENSAL)' : '' }}</td>
                    <td style="text-align: center; padding: 12px 5px; font-size: 9.5pt">{{ it.quantity }}</td>
                    <td style="text-align: right; padding: 12px 5px; font-size: 9.5pt">{{ formatCurrency(it.price) }}</td>
                    <td style="text-align: right; padding: 12px 5px; font-size: 9.5pt; font-weight: bold">{{ formatCurrency(it.quantity * it.price) }}</td>
                </tr>
            </tbody>
        </table>
        <div style="text-align: right; margin-bottom: 40px; padding-right: 10px">
            <div style="background-color: #F8FAFC; display: inline-block; padding: 15px 30px; border-radius: 6px; border: 1px solid #E2E8F0">
                <div style="margin-bottom: 5px">
                    <span style="font-size: 10pt; font-weight: bold; text-transform: uppercase; margin-right: 20px">TOTAL INVESTIMENTO:</span>
                    <span style="font-size: 13pt; font-weight: bold">{{ formatCurrency(proposal.total_one_time) }}</span>
                </div>
                <div v-if="Number(proposal.total_monthly) > 0">
                    <span style="font-size: 9pt; font-weight: bold; text-transform: uppercase; margin-right: 20px; color: #4F46E5">TAXA MENSAL (SUPORTE):</span>
                    <span style="font-size: 11pt; font-weight: bold; color: #4F46E5">{{ formatCurrency(proposal.total_monthly) }}</span>
                </div>
            </div>
        </div>
        <div style="border: 1.5px solid #000; padding: 20px; border-radius: 4px; margin-bottom: 60px">
            <p style="font-weight: bold; font-size: 11pt; margin: 0 0 15px 0; text-transform: uppercase">CONDIÇÕES DE PAGAMENTO</p>
            <div style="font-size: 10pt; line-height: 1.8">
                <p style="margin: 0">• FORMA DE PAGAMENTO: {{ paymentMethodLabel(proposal.payment_method) }}</p>
                <p style="margin: 0">
                    • CONDIÇÃO:
                    <template v-if="proposal.first_as_down_payment">
                        ENTRADA DE {{ formatCurrency(proposal.total_one_time / proposal.installments) }}{{ proposal.installments > 1 ? ` + ${proposal.installments - 1}X DE ${formatCurrency(proposal.total_one_time / proposal.installments)}` : '' }}
                    </template>
                    <template v-else>{{ proposal.installments }}X DE {{ formatCurrency(proposal.total_one_time / proposal.installments) }}</template>
                </p>
            </div>
            <div style="margin-top: 20px; padding-top: 15px; border-top: 1.5px solid #DDD">
                <p style="font-weight: bold; font-size: 9pt; margin: 0 0 5px 0; text-transform: uppercase">OBSERVAÇÕES E PRAZOS:</p>
                <p style="font-size: 9.5pt; margin: 0; text-transform: uppercase">{{ proposal.observations || 'SEM OBSERVAÇÕES ADICIONAIS.' }}</p>
            </div>
        </div>
        <div style="display: flex; justify-content: space-between; gap: 60px; padding-top: 40px">
            <div style="flex: 1; text-align: center"><div style="border-top: 1px solid #000; width: 100%; margin-bottom: 6px" /><p style="font-size: 9pt; font-weight: bold; margin: 0; text-transform: uppercase">{{ companyProfile.name }}</p><p style="font-size: 7.5pt; color: #777; margin: 0; text-transform: uppercase">EMITENTE RESPONSÁVEL</p></div>
            <div style="flex: 1; text-align: center"><div style="border-top: 1px solid #000; width: 100%; margin-bottom: 6px" /><p style="font-size: 9pt; font-weight: bold; margin: 0; text-transform: uppercase">{{ proposal.client_name }}</p><p style="font-size: 7.5pt; color: #777; margin: 0; text-transform: uppercase">ACEITE DO CLIENTE</p></div>
        </div>
    </div>
</template>
