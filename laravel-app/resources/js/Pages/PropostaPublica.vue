<script setup>
import { ref } from 'vue';
import { Head } from '@inertiajs/vue3';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { Download, Loader2 } from 'lucide-vue-next';
import ProposalDocument from '@/Components/features/ProposalDocument.vue';

const props = defineProps({ proposal: Object, companyProfile: Object });
const isDownloading = ref(false);

async function handleDownload() {
    const el = document.getElementById('proposal-preview');
    if (!el) return;
    isDownloading.value = true;
    try {
        const canvas = await html2canvas(el, { scale: 3, useCORS: true, backgroundColor: '#ffffff' });
        const imgData = canvas.toDataURL('image/png', 1.0);
        const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
        pdf.addImage(imgData, 'PNG', 0, 0, 210, 297);
        pdf.save(`${props.proposal.document_type || 'proposta'}-${props.proposal.id}.pdf`);
    } finally {
        isDownloading.value = false;
    }
}
</script>

<template>
    <Head :title="`${proposal.document_type === 'pedido' ? 'Pedido' : 'Proposta'} #${proposal.id}`" />

    <div class="min-h-screen bg-[#F5F5F5] py-8 px-3">
        <div class="mx-auto flex justify-end" style="width: 210mm; max-width: 100%">
            <button
                type="button"
                :disabled="isDownloading"
                class="inline-flex items-center gap-2 rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-emerald-700 disabled:opacity-60 mb-4"
                @click="handleDownload"
            >
                <Loader2 v-if="isDownloading" class="h-4 w-4 animate-spin" /><Download v-else class="h-4 w-4" />
                Baixar PDF
            </button>
        </div>
        <ProposalDocument :proposal="proposal" :company-profile="companyProfile" />
    </div>
</template>
