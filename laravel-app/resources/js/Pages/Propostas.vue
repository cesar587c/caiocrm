<script setup>
import { computed, ref } from 'vue';
import { Head, router, useForm } from '@inertiajs/vue3';
import { addDays, format } from 'date-fns';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import {
    PlusCircle, Trash2, Printer, Loader2, Pencil, Copy, Share2, XCircle, FileText,
    LayoutGrid, History, Eye, Search, CheckCircle2,
} from 'lucide-vue-next';
import AppLayout from '@/Layouts/AppLayout.vue';
import ProposalDocument from '@/Components/features/ProposalDocument.vue';
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
import { formatCurrency, formatPhoneNumber, parseDateOnly } from '@/lib/utils';
import { usePage } from '@inertiajs/vue3';

defineOptions({ layout: AppLayout });

const props = defineProps({ proposals: Array, customers: Array, products: Array, technicians: Array });
const { toast } = useToast();
const page = usePage();
const companyProfile = computed(() => page.props.companyProfile);

const isQuickAddingClient = ref(false);
const hasTechnicianInfluence = ref(false);
const selectedProposal = ref(null);
const deletingProposal = ref(null);
const isDeleteDialogOpen = ref(false);
const isDownloading = ref(false);
const editingProposal = ref(null);
const activeTab = ref('gerador');
const proposalSearch = ref('');

const defaults = {
    document_type: 'proposta', client_id: null, client_name: '', contact_name: '', client_phone: '',
    save_to_contacts: false, contact_type: 'lead', influenced_by_technician_id: null,
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

function handleSendWhatsApp(proposal) {
    if (!proposal.client_phone) {
        toast({ variant: 'destructive', title: 'Telefone do cliente não encontrado' });
        return;
    }
    if (!proposal.public_url) {
        toast({ variant: 'destructive', title: 'Link do documento indisponível' });
        return;
    }
    const label = proposal.document_type === 'pedido' ? 'pedido' : 'orçamento';
    const message = `Olá! Segue o link do seu ${label} #${proposal.id} da ${companyProfile.value?.name || 'nossa empresa'}, para você visualizar e baixar:\n${proposal.public_url}`;
    const clean = proposal.client_phone.replace(/\D/g, '');
    const phone = clean.length > 11 ? clean : `55${clean}`;
    window.open(`https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(message)}`, 'vendaspro_whatsapp');
}

function handleEditProposalClick(p) {
    editingProposal.value = p;
    form.clearErrors();
    Object.assign(form, {
        document_type: p.document_type, client_id: p.client_id, client_name: p.client_name,
        contact_name: p.contact_name || '', client_phone: p.client_phone ? formatPhoneNumber(p.client_phone) : '',
        save_to_contacts: false, contact_type: 'lead',
        proposal_date: p.proposal_date.slice(0, 10),
        validity_date: p.validity_date.slice(0, 10),
        items: p.items.map((i) => ({ name: i.name, quantity: i.quantity, price: i.price, is_monthly: !!i.is_monthly })),
        payment_method: p.payment_method, installments: p.installments, first_as_down_payment: !!p.first_as_down_payment,
        observations: p.observations || '', influenced_by_technician_id: p.influenced_by_technician_id || null,
    });
    isQuickAddingClient.value = !p.client_id;
    hasTechnicianInfluence.value = !!p.influenced_by_technician_id;
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
    const payload = form.transform((d) => ({
        ...d,
        client_phone: d.client_phone?.replace(/\D/g, ''),
        influenced_by_technician_id: hasTechnicianInfluence.value ? d.influenced_by_technician_id : null,
    }));
    if (editingProposal.value) {
        payload.put(`/dashboard/propostas/${editingProposal.value.id}`, {
            onSuccess: () => { editingProposal.value = null; form.reset(); Object.assign(form, defaults); hasTechnicianInfluence.value = false; activeTab.value = 'historico'; },
        });
    } else {
        payload.post('/dashboard/propostas', {
            onSuccess: () => { form.reset(); Object.assign(form, defaults); hasTechnicianInfluence.value = false; activeTab.value = 'historico'; },
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
            <TabsList class="grid h-auto w-full max-w-[400px] grid-cols-1 gap-1 sm:h-10 sm:grid-cols-2 sm:gap-0">
                <TabsTrigger value="gerador" class="gap-2"><LayoutGrid class="h-4 w-4" /> Novo Orçamento</TabsTrigger>
                <TabsTrigger value="historico" class="gap-2"><History class="h-4 w-4" /> Últimas Propostas</TabsTrigger>
            </TabsList>

            <TabsContent value="gerador">
                <form @submit.prevent="submit">
                    <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div class="lg:col-span-2 space-y-6">
                            <Card class="shadow-lg border-primary/10">
                                <CardHeader class="flex flex-col md:flex-row md:items-start justify-between gap-4 pb-6">
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
                                    <div class="flex flex-wrap gap-4">
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
                                        <Table class="min-w-[520px]">
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
                                    <div class="space-y-3 p-3 bg-orange-500/5 rounded-lg border border-orange-500/20">
                                        <div class="flex items-center justify-between">
                                            <Label class="text-xs font-bold text-orange-600">Teve influência de um técnico?</Label>
                                            <Switch v-model:checked="hasTechnicianInfluence" />
                                        </div>
                                        <div v-if="hasTechnicianInfluence" class="space-y-2">
                                            <Label class="text-[10px] uppercase text-muted-foreground">Técnico que influenciou</Label>
                                            <Select v-model="form.influenced_by_technician_id">
                                                <SelectTrigger><SelectValue placeholder="Selecione o técnico" /></SelectTrigger>
                                                <SelectContent><SelectItem v-for="t in technicians" :key="t.id" :value="t.id">{{ t.name }}</SelectItem></SelectContent>
                                            </Select>
                                        </div>
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
                        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <CardTitle>Histórico de Documentos</CardTitle>
                            <div class="relative w-full sm:w-72"><Search class="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /><Input v-model="proposalSearch" placeholder="Buscar por cliente ou ID..." class="pl-10" /></div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <Table class="min-w-[650px]">
                            <TableHeader><TableRow><TableHead>Nº</TableHead><TableHead>Tipo</TableHead><TableHead>Cliente</TableHead><TableHead>Data</TableHead><TableHead>Venda</TableHead><TableHead class="text-right">Ações</TableHead></TableRow></TableHeader>
                            <TableBody>
                                <TableRow v-if="filteredProposals.length === 0"><TableCell colspan="6" class="h-24 text-center text-muted-foreground italic">Nenhum documento encontrado.</TableCell></TableRow>
                                <TableRow v-for="p in filteredProposals" :key="p.id" class="hover:bg-muted/50 cursor-pointer" @click="selectedProposal = p">
                                    <TableCell class="font-bold">#{{ p.id }}</TableCell>
                                    <TableCell><Badge variant="outline" :class="p.document_type === 'pedido' && 'border-emerald-500 text-emerald-500'">{{ p.document_type === 'pedido' ? 'Pedido' : 'Proposta' }}</Badge></TableCell>
                                    <TableCell>{{ p.client_name }}</TableCell>
                                    <TableCell class="text-xs">{{ format(parseDateOnly(p.proposal_date), 'dd/MM/yyyy') }}</TableCell>
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
                <ProposalDocument v-if="selectedProposal" :proposal="selectedProposal" :company-profile="companyProfile" />
            </ScrollArea>
            <DialogFooter class="p-6 border-t bg-muted/20 gap-3">
                <Button variant="secondary" :disabled="isDownloading" @click="handleDownloadPdf"><Loader2 v-if="isDownloading" class="h-4 w-4 animate-spin mr-2" /><Printer v-else class="h-4 w-4 mr-2" /> Baixar PDF</Button>
                <Button class="bg-emerald-600 hover:bg-emerald-700" @click="handleSendWhatsApp(selectedProposal)"><Share2 class="h-4 w-4 mr-2" /> Enviar WhatsApp</Button>
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
