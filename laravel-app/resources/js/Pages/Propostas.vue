<script setup>
import { computed, ref } from 'vue';
import { Head, router, useForm } from '@inertiajs/vue3';
import { addDays, format, parseISO } from 'date-fns';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import {
    PlusCircle, Trash2, Printer, Loader2, Pencil, Copy, Share2, XCircle, FileText,
    LayoutGrid, History, Eye, Search, CheckCircle2,
} from 'lucide-vue-next';
import AppLayout from '@/Layouts/AppLayout.vue';
import { Button } from '@/Components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/Components/ui/select';
import { Switch } from '@/Components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/Components/ui/table';
import { Textarea } from '@/Components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/Components/ui/popover';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/Components/ui/dialog';
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/Components/ui/alert-dialog';
import { ScrollArea } from '@/Components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/Components/ui/tabs';
import { Badge } from '@/Components/ui/badge';
import { Checkbox } from '@/Components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/Components/ui/radio-group';
import { useToast } from '@/composables/useToast';
import { formatCurrency, formatPhoneNumber } from '@/lib/utils';
import { usePage } from '@inertiajs/vue3';

defineOptions({ layout: AppLayout });

const props = defineProps({ proposals: Array, customers: Array, products: Array });
const { toast } = useToast();
const page = usePage();
const companyProfile = computed(() => page.props.companyProfile);

const isQuickAddingClient = ref(false);
const selectedProposal = ref(null);
const deletingProposal = ref(null);
const isDeleteDialogOpen = ref(false);
const isDownloading = ref(false);
const isSharing = ref(false);
const editingProposal = ref(null);
const activeTab = ref('gerador');
const proposalSearch = ref('');

const defaults = {
    document_type: 'proposta', client_id: null, client_name: '', contact_name: '', client_phone: '',
    save_to_contacts: false, contact_type: 'lead',
    proposal_date: format(new Date(), 'yyyy-MM-dd'), validity_date: format(addDays(new Date(), 10), 'yyyy-MM-dd'),
    items: [{ name: '', quantity: 1, price: 0, is_monthly: false }],
    payment_method: 'boleto', installments: 1, first_as_down_payment: false, observations: '',
};
const form = useForm({ ...defaults });

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

const totals = computed(() => (form.items || []).reduce((acc, item) => {
    const qty = parseFloat(item.quantity) || 0;
    const price = parseFloat(item.price) || 0;
    const subtotal = qty * price;
    if (item.is_monthly) acc.monthly += subtotal; else acc.oneTime += subtotal;
    return acc;
}, { oneTime: 0, monthly: 0 }));

const installmentValue = computed(() => totals.value.oneTime / (Number(form.installments) || 1));

const filteredProposals = computed(() => {
    const term = proposalSearch.value.toLowerCase();
    return props.proposals.filter((p) => p.client_name.toLowerCase().includes(term) || String(p.id).includes(term)).slice().sort((a, b) => b.id - a.id);
});

function handleClientSelect(clientId) {
    const client = props.customers.find((c) => c.id === clientId);
    if (client) {
        form.client_id = client.id;
        form.client_name = client.nome_fantasia || client.name;
        form.contact_name = client.contact_name || '';
        form.client_phone = formatPhoneNumber(client.telefone || '');
        isQuickAddingClient.value = false;
    }
}

function handleItemNameBlur(idx) {
    const name = form.items[idx]?.name;
    if (!name) return;
    const existing = props.products.find((p) => p.name.toLowerCase().trim() === name.toLowerCase().trim());
    if (existing) form.items[idx].price = existing.price;
}

function addItem() { form.items.push({ name: '', quantity: 1, price: 0, is_monthly: false }); }
function removeItem(idx) { form.items.splice(idx, 1); }

async function generatePdf() {
    const el = document.getElementById('proposal-preview');
    const canvas = await html2canvas(el, {
        scale: 3, useCORS: true, backgroundColor: '#ffffff',
        onclone: (clonedDoc) => {
            const clonedEl = clonedDoc.getElementById('proposal-preview');
            clonedEl?.querySelectorAll('*').forEach((node) => {
                node.style.letterSpacing = '0.3pt';
                node.style.fontVariantLigatures = 'none';
                node.style.webkitFontSmoothing = 'antialiased';
                node.style.textDecoration = 'none';
            });
        },
    });
    const imgData = canvas.toDataURL('image/png', 1.0);
    const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
    pdf.addImage(imgData, 'PNG', 0, 0, 210, 297);
    return pdf;
}

async function handleDownloadPdf() {
    if (!selectedProposal.value) return;
    isDownloading.value = true;
    try {
        const pdf = await generatePdf();
        pdf.save(`${selectedProposal.value.document_type || 'proposta'}-${selectedProposal.value.id}.pdf`);
    } catch (e) {
        toast({ variant: 'destructive', title: 'Erro ao gerar PDF' });
    } finally { isDownloading.value = false; }
}

async function handleSharePdf(proposal) {
    isSharing.value = true;
    try {
        const pdf = await generatePdf();
        const pdfBlob = pdf.output('blob');
        const file = new File([pdfBlob], `proposta-${proposal.id}.pdf`, { type: 'application/pdf' });
        const phone = proposal.client_phone?.replace(/\D/g, '');
        const whatsappUrl = phone ? `https://wa.me/55${phone}` : null;
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
            await navigator.share({ files: [file], title: `Proposta #${proposal.id}` });
        } else if (whatsappUrl) {
            window.open(whatsappUrl, '_blank');
            pdf.save(`proposta-${proposal.id}.pdf`);
        } else {
            pdf.save(`proposta-${proposal.id}.pdf`);
        }
    } catch (e) {
        toast({ variant: 'destructive', title: 'Falha ao processar' });
    } finally { isSharing.value = false; }
}

function handleEditProposalClick(p) {
    editingProposal.value = p;
    form.clearErrors();
    Object.assign(form, {
        document_type: p.document_type, client_id: p.client_id, client_name: p.client_name,
        contact_name: p.contact_name || '', client_phone: p.client_phone ? formatPhoneNumber(p.client_phone) : '',
        save_to_contacts: false, contact_type: 'lead',
        proposal_date: p.proposal_date, validity_date: p.validity_date,
        items: p.items.map((i) => ({ name: i.name, quantity: i.quantity, price: i.price, is_monthly: !!i.is_monthly })),
        payment_method: p.payment_method, installments: p.installments, first_as_down_payment: !!p.first_as_down_payment,
        observations: p.observations || '',
    });
    isQuickAddingClient.value = !p.client_id;
    activeTab.value = 'gerador';
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function handleCloneProposal(p) {
    router.post(`/dashboard/propostas/${p.id}/clone`, {}, {
        preserveScroll: true,
        onSuccess: () => { activeTab.value = 'historico'; toast({ title: 'Proposta Clonada!' }); },
    });
}

function submit() {
    const payload = form.transform((d) => ({ ...d, client_phone: d.client_phone?.replace(/\D/g, '') }));
    if (editingProposal.value) {
        payload.put(`/dashboard/propostas/${editingProposal.value.id}`, {
            onSuccess: () => { editingProposal.value = null; form.reset(); Object.assign(form, defaults); activeTab.value = 'historico'; },
        });
    } else {
        payload.post('/dashboard/propostas', {
            onSuccess: () => { form.reset(); Object.assign(form, defaults); activeTab.value = 'historico'; },
        });
    }
}

function confirmDelete() {
    if (!deletingProposal.value) return;
    router.delete(`/dashboard/propostas/${deletingProposal.value.id}`);
    deletingProposal.value = null;
}
</script>

<template>
    <Head title="Propostas" />

    <div class="flex-1 space-y-6 p-4 md:p-8 pt-6 bg-background/50">
        <datalist id="proposal-products-list"><option v-for="p in products" :key="p.id" :value="p.name" /></datalist>

        <div>
            <h2 class="text-3xl font-bold tracking-tight font-headline text-foreground">Gerador de Propostas e Pedidos</h2>
        </div>

        <Tabs :model-value="activeTab" @update:modelValue="(v) => (activeTab = v)" class="space-y-6">
            <TabsList class="grid w-full max-w-[400px] grid-cols-2">
                <TabsTrigger value="gerador" class="gap-2"><LayoutGrid class="h-4 w-4" /> Novo Orçamento</TabsTrigger>
                <TabsTrigger value="historico" class="gap-2"><History class="h-4 w-4" /> Últimas Propostas</TabsTrigger>
            </TabsList>

            <TabsContent value="gerador">
                <form @submit.prevent="submit">
                    <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div class="lg:col-span-2 space-y-6">
                            <Card class="shadow-lg border-primary/10">
                                <CardHeader class="flex flex-row items-start justify-between pb-6">
                                    <div class="space-y-4">
                                        <CardTitle class="text-xl flex items-center gap-2">
                                            <FileText class="h-5 w-5 text-primary" />
                                            {{ editingProposal ? `Editar ${editingProposal.document_type === 'pedido' ? 'Pedido' : 'Proposta'} #${editingProposal.id}` : 'Configurar Documento' }}
                                        </CardTitle>
                                        <RadioGroup v-model="form.document_type" class="flex gap-4">
                                            <div class="flex items-center space-x-2"><RadioGroupItem value="proposta" id="rt-prop" /><Label for="rt-prop" class="text-xs">PROPOSTA COMERCIAL</Label></div>
                                            <div class="flex items-center space-x-2"><RadioGroupItem value="pedido" id="rt-ped" /><Label for="rt-ped" class="text-xs">PEDIDO DE VENDA</Label></div>
                                        </RadioGroup>
                                    </div>
                                    <div class="flex gap-4">
                                        <div class="space-y-1"><Label class="text-[10px] uppercase font-bold text-muted-foreground">Emissão</Label><Input v-model="form.proposal_date" type="date" class="w-[150px] h-9 text-xs" /></div>
                                        <div class="space-y-1"><Label class="text-[10px] uppercase font-bold text-muted-foreground">Validade</Label><Input v-model="form.validity_date" type="date" class="w-[150px] h-9 text-xs" /></div>
                                    </div>
                                </CardHeader>
                                <CardContent class="border-t pt-8 space-y-8">
                                    <div class="space-y-4">
                                        <Label class="text-sm font-semibold">Selecione o Cliente</Label>
                                        <div class="flex gap-3">
                                            <Select :model-value="form.client_id" :disabled="isQuickAddingClient" @update:modelValue="handleClientSelect">
                                                <SelectTrigger class="flex-1"><SelectValue placeholder="Buscar na base..." /></SelectTrigger>
                                                <SelectContent><SelectItem v-for="c in customers" :key="c.id" :value="c.id">{{ c.nome_fantasia || c.name }}</SelectItem></SelectContent>
                                            </Select>
                                            <Button type="button" variant="secondary" class="gap-2" @click="isQuickAddingClient = true"><PlusCircle class="h-4 w-4" /> Digitar Novo</Button>
                                        </div>
                                        <div v-if="isQuickAddingClient" class="p-5 border rounded-xl bg-muted/20 space-y-4">
                                            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div class="space-y-2"><Label>Empresa / Cliente</Label><Input v-model="form.client_name" /></div>
                                                <div class="space-y-2"><Label>A/C (Contato)</Label><Input v-model="form.contact_name" /></div>
                                            </div>
                                            <div class="space-y-2"><Label>Telefone</Label><Input :model-value="form.client_phone" @update:modelValue="(v) => (form.client_phone = formatPhoneNumber(v))" /></div>
                                            <div class="flex items-center justify-between p-3 bg-primary/5 rounded-lg border">
                                                <p class="text-xs font-bold text-primary">Salvar na base de contatos?</p>
                                                <Switch v-model:checked="form.save_to_contacts" />
                                            </div>
                                        </div>
                                    </div>

                                    <div class="space-y-4 border-t pt-8">
                                        <div class="flex items-center justify-between">
                                            <h4 class="text-sm font-bold">Itens do Documento</h4>
                                            <Button type="button" variant="outline" size="sm" class="gap-2" @click="addItem"><PlusCircle class="h-3.5 w-3.5" /> Item</Button>
                                        </div>
                                        <Table>
                                            <TableHeader><TableRow><TableHead>Descrição</TableHead><TableHead class="w-24 text-center">Qtd</TableHead><TableHead class="w-40 text-center">Preço (R$)</TableHead><TableHead class="w-10 text-center">Rec.</TableHead><TableHead class="w-10" /></TableRow></TableHeader>
                                            <TableBody>
                                                <TableRow v-for="(item, idx) in form.items" :key="idx">
                                                    <TableCell><Input v-model="item.name" list="proposal-products-list" class="h-10 text-sm" @blur="handleItemNameBlur(idx)" /></TableCell>
                                                    <TableCell><Input v-model="item.quantity" type="number" class="h-10 text-sm text-center" /></TableCell>
                                                    <TableCell><Input v-model="item.price" type="number" step="0.01" class="h-10 text-sm text-right" /></TableCell>
                                                    <TableCell class="text-center"><Checkbox v-model:checked="item.is_monthly" class="h-4 w-4" /></TableCell>
                                                    <TableCell><Button type="button" variant="ghost" size="icon" class="h-8 w-8 text-destructive" @click="removeItem(idx)"><Trash2 class="h-3.5 w-3.5" /></Button></TableCell>
                                                </TableRow>
                                            </TableBody>
                                        </Table>
                                    </div>

                                    <div class="border-t pt-8">
                                        <div class="space-y-2"><Label class="font-bold">Observações e Prazos</Label><Textarea v-model="form.observations" rows="3" placeholder="Ex: Prazo de entrega 10 dias úteis..." class="text-xs" /></div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        <div class="lg:col-span-1 space-y-6">
                            <Card class="shadow-lg sticky top-4">
                                <CardHeader class="bg-primary/5 pb-4"><CardTitle class="text-lg">Faturamento</CardTitle></CardHeader>
                                <CardContent class="space-y-6 pt-6">
                                    <div class="space-y-2">
                                        <Label class="text-xs font-bold text-muted-foreground">Forma de Pagamento</Label>
                                        <Select v-model="form.payment_method">
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent><SelectItem v-for="pm in PAYMENT_METHODS" :key="pm.id" :value="pm.id">{{ pm.label }}</SelectItem></SelectContent>
                                        </Select>
                                    </div>
                                    <div class="space-y-2">
                                        <Label class="text-xs font-bold text-muted-foreground">Parcelamento</Label>
                                        <Select :model-value="String(form.installments)" @update:modelValue="(v) => (form.installments = Number(v))">
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent><SelectItem v-for="i in 12" :key="i" :value="String(i)">{{ i }}x</SelectItem></SelectContent>
                                        </Select>
                                    </div>
                                    <div class="flex items-center justify-between p-3 bg-muted/30 rounded-lg border">
                                        <Label class="text-xs font-bold">Primeira como Entrada?</Label>
                                        <Switch v-model:checked="form.first_as_down_payment" />
                                    </div>
                                    <div class="space-y-2 p-3 bg-primary/5 rounded-lg border border-primary/10">
                                        <p class="text-xs font-bold text-primary">Venda: {{ formatCurrency(totals.oneTime) }}</p>
                                        <div class="flex flex-col gap-1 mt-2 p-2 bg-background/50 rounded border border-primary/20">
                                            <p class="text-[11px] font-bold text-primary flex items-center gap-2">
                                                <CheckCircle2 class="h-3 w-3" />
                                                <template v-if="form.first_as_down_payment">
                                                    ENTRADA DE {{ formatCurrency(installmentValue) }}{{ form.installments > 1 ? ` + ${form.installments - 1}X DE ${formatCurrency(installmentValue)}` : '' }}
                                                </template>
                                                <template v-else>{{ form.installments }}X DE {{ formatCurrency(installmentValue) }}</template>
                                            </p>
                                        </div>
                                        <p v-if="totals.monthly > 0" class="text-xs font-bold text-emerald-500 mt-2">Mensal: {{ formatCurrency(totals.monthly) }}</p>
                                    </div>
                                    <Button type="submit" class="w-full h-11 font-bold shadow-md" :disabled="form.processing">FINALIZAR E SALVAR</Button>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </form>
            </TabsContent>

            <TabsContent value="historico">
                <Card class="shadow-lg">
                    <CardHeader>
                        <div class="flex items-center justify-between">
                            <CardTitle>Histórico de Documentos</CardTitle>
                            <div class="relative w-72"><Search class="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /><Input v-model="proposalSearch" placeholder="Buscar por cliente ou ID..." class="pl-10" /></div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader><TableRow><TableHead>Nº</TableHead><TableHead>Tipo</TableHead><TableHead>Cliente</TableHead><TableHead>Data</TableHead><TableHead>Venda</TableHead><TableHead class="text-right">Ações</TableHead></TableRow></TableHeader>
                            <TableBody>
                                <TableRow v-if="filteredProposals.length === 0"><TableCell colspan="6" class="h-24 text-center text-muted-foreground italic">Nenhum documento encontrado.</TableCell></TableRow>
                                <TableRow v-for="p in filteredProposals" :key="p.id" class="hover:bg-muted/50 cursor-pointer" @click="selectedProposal = p">
                                    <TableCell class="font-bold">#{{ p.id }}</TableCell>
                                    <TableCell><Badge variant="outline" :class="p.document_type === 'pedido' && 'border-emerald-500 text-emerald-500'">{{ p.document_type === 'pedido' ? 'Pedido' : 'Proposta' }}</Badge></TableCell>
                                    <TableCell>{{ p.client_name }}</TableCell>
                                    <TableCell class="text-xs">{{ format(parseISO(p.proposal_date), 'dd/MM/yyyy') }}</TableCell>
                                    <TableCell class="font-bold">{{ formatCurrency(p.total_one_time) }}</TableCell>
                                    <TableCell class="text-right">
                                        <div class="flex justify-end gap-1" @click.stop>
                                            <Button variant="ghost" size="icon" @click="selectedProposal = p" title="Ver PDF"><Eye class="h-4 w-4" /></Button>
                                            <Button variant="ghost" size="icon" @click="handleCloneProposal(p)" title="Clonar"><Copy class="h-4 w-4" /></Button>
                                            <Button variant="ghost" size="icon" @click="handleEditProposalClick(p)" title="Editar"><Pencil class="h-4 w-4" /></Button>
                                            <Button variant="ghost" size="icon" class="text-destructive" @click="deletingProposal = p; isDeleteDialogOpen = true"><Trash2 class="h-4 w-4" /></Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </TabsContent>
        </Tabs>
    </div>

    <Dialog :open="!!selectedProposal" @update:open="(o) => !o && (selectedProposal = null)">
        <DialogContent class="sm:max-w-[950px] h-[95vh] flex flex-col p-0 bg-background border-none shadow-2xl">
            <DialogHeader class="p-6 border-b bg-muted/20 flex flex-row items-center justify-between space-y-0">
                <DialogTitle>Visualização do Documento</DialogTitle>
                <Button variant="ghost" size="icon" @click="selectedProposal = null"><XCircle class="h-5 w-5" /></Button>
            </DialogHeader>
            <ScrollArea class="flex-1 bg-[#F5F5F5] p-10">
                <div v-if="selectedProposal" id="proposal-preview" class="bg-white text-black mx-auto shadow-2xl" style="width: 210mm; min-height: 297mm; padding: 15mm; font-family: Arial, sans-serif; font-size: 11pt; line-height: 1.4; color: #000000">
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
                        <span style="font-size: 13pt; font-weight: bold; text-transform: uppercase">{{ selectedProposal.document_type === 'pedido' ? 'PEDIDO DE VENDA' : 'PROPOSTA COMERCIAL' }}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; margin-bottom: 35px">
                        <div style="flex: 1">
                            <p style="font-size: 8pt; color: #666; font-weight: bold; margin: 0 0 4px 0; text-transform: uppercase">DESTINATÁRIO</p>
                            <h1 style="font-size: 13pt; font-weight: bold; margin: 0; text-transform: uppercase">{{ selectedProposal.client_name }}</h1>
                            <p style="font-size: 10pt; color: #4F46E5; font-weight: bold; margin: 4px 0">A/C: {{ (selectedProposal.contact_name || 'SETOR RESPONSÁVEL').toUpperCase() }}</p>
                            <p v-if="selectedProposal.client_phone" style="font-size: 9pt; margin: 0">{{ formatPhoneNumber(selectedProposal.client_phone) }}</p>
                        </div>
                        <div style="text-align: right; min-width: 180px">
                            <p style="margin: 0; font-size: 9.5pt"><strong>Nº DOCUMENTO:</strong> {{ selectedProposal.id }}</p>
                            <p style="margin: 2px 0; font-size: 9.5pt"><strong>EMISSÃO:</strong> {{ format(parseISO(selectedProposal.proposal_date), 'dd/MM/yyyy') }}</p>
                            <p style="margin: 0; font-size: 9.5pt"><strong>VALIDADE:</strong> <span style="color: #E11D48; font-weight: bold">{{ format(parseISO(selectedProposal.validity_date), 'dd/MM/yyyy') }}</span></p>
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
                            <tr v-for="(it, i) in selectedProposal.items" :key="i" style="border-bottom: 0.5px solid #eee">
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
                                <span style="font-size: 13pt; font-weight: bold">{{ formatCurrency(selectedProposal.total_one_time) }}</span>
                            </div>
                            <div v-if="Number(selectedProposal.total_monthly) > 0">
                                <span style="font-size: 9pt; font-weight: bold; text-transform: uppercase; margin-right: 20px; color: #4F46E5">TAXA MENSAL (SUPORTE):</span>
                                <span style="font-size: 11pt; font-weight: bold; color: #4F46E5">{{ formatCurrency(selectedProposal.total_monthly) }}</span>
                            </div>
                        </div>
                    </div>
                    <div style="border: 1.5px solid #000; padding: 20px; border-radius: 4px; margin-bottom: 60px">
                        <p style="font-weight: bold; font-size: 11pt; margin: 0 0 15px 0; text-transform: uppercase">CONDIÇÕES DE PAGAMENTO</p>
                        <div style="font-size: 10pt; line-height: 1.8">
                            <p style="margin: 0">• FORMA DE PAGAMENTO: {{ paymentMethodLabel(selectedProposal.payment_method) }}</p>
                            <p style="margin: 0">
                                • CONDIÇÃO:
                                <template v-if="selectedProposal.first_as_down_payment">
                                    ENTRADA DE {{ formatCurrency(selectedProposal.total_one_time / selectedProposal.installments) }}{{ selectedProposal.installments > 1 ? ` + ${selectedProposal.installments - 1}X DE ${formatCurrency(selectedProposal.total_one_time / selectedProposal.installments)}` : '' }}
                                </template>
                                <template v-else>{{ selectedProposal.installments }}X DE {{ formatCurrency(selectedProposal.total_one_time / selectedProposal.installments) }}</template>
                            </p>
                        </div>
                        <div style="margin-top: 20px; padding-top: 15px; border-top: 1.5px solid #DDD">
                            <p style="font-weight: bold; font-size: 9pt; margin: 0 0 5px 0; text-transform: uppercase">OBSERVAÇÕES E PRAZOS:</p>
                            <p style="font-size: 9.5pt; margin: 0; text-transform: uppercase">{{ selectedProposal.observations || 'SEM OBSERVAÇÕES ADICIONAIS.' }}</p>
                        </div>
                    </div>
                    <div style="display: flex; justify-content: space-between; gap: 60px; padding-top: 40px">
                        <div style="flex: 1; text-align: center"><div style="border-top: 1px solid #000; width: 100%; margin-bottom: 6px" /><p style="font-size: 9pt; font-weight: bold; margin: 0; text-transform: uppercase">{{ companyProfile.name }}</p><p style="font-size: 7.5pt; color: #777; margin: 0; text-transform: uppercase">EMITENTE RESPONSÁVEL</p></div>
                        <div style="flex: 1; text-align: center"><div style="border-top: 1px solid #000; width: 100%; margin-bottom: 6px" /><p style="font-size: 9pt; font-weight: bold; margin: 0; text-transform: uppercase">{{ selectedProposal.client_name }}</p><p style="font-size: 7.5pt; color: #777; margin: 0; text-transform: uppercase">ACEITE DO CLIENTE</p></div>
                    </div>
                </div>
            </ScrollArea>
            <DialogFooter class="p-6 border-t bg-muted/20 gap-3">
                <Button variant="secondary" :disabled="isDownloading" @click="handleDownloadPdf"><Loader2 v-if="isDownloading" class="h-4 w-4 animate-spin mr-2" /><Printer v-else class="h-4 w-4 mr-2" /> Baixar PDF</Button>
                <Button class="bg-emerald-600 hover:bg-emerald-700" :disabled="isSharing" @click="handleSharePdf(selectedProposal)"><Share2 class="h-4 w-4 mr-2" /> Enviar WhatsApp</Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>

    <AlertDialog v-model:open="isDeleteDialogOpen">
        <AlertDialogContent>
            <AlertDialogHeader><AlertDialogTitle>Excluir Registro?</AlertDialogTitle><AlertDialogDescription>Esta ação é irreversível.</AlertDialogDescription></AlertDialogHeader>
            <AlertDialogFooter><AlertDialogCancel @click="deletingProposal = null">Voltar</AlertDialogCancel><AlertDialogAction class="bg-destructive" @click="confirmDelete">Confirmar Exclusão</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
</template>
