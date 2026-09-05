<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { Head, router, useForm, usePage } from '@inertiajs/vue3';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { format, parseISO, isPast } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
    PlusCircle, User as UserIcon, AlertCircle, Printer, Download, Mail, Send, Loader2,
    Trash2, Search, XCircle, Copy,
} from 'lucide-vue-next';
import AppLayout from '@/Layouts/AppLayout.vue';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/Components/ui/card';
import { Button } from '@/Components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/Components/ui/dialog';
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/Components/ui/alert-dialog';
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuTrigger } from '@/Components/ui/dropdown-menu';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/Components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/Components/ui/tabs';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import { Textarea } from '@/Components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/Components/ui/select';
import { Badge } from '@/Components/ui/badge';
import { ScrollArea } from '@/Components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/Components/ui/tooltip';
import { useToast } from '@/composables/useToast';
import { cn, formatCurrency } from '@/lib/utils';

defineOptions({ layout: AppLayout });

const props = defineProps({
    serviceOrders: Array,
    customers: Array,
    technicians: Array,
    products: Array,
    prefillFromAppointment: Object,
});
const { toast } = useToast();
const page = usePage();
const companyProfile = computed(() => page.props.companyProfile);

const stages = [
    { id: 'Aberta', title: 'Aberta' },
    { id: 'Em andamento', title: 'Em Andamento' },
    { id: 'Aguardando peça', title: 'Aguardando Peça' },
    { id: 'Finalizada', title: 'Finalizada' },
    { id: 'Cancelada', title: 'Cancelada' },
];
const statusColors = {
    'Aberta': 'bg-blue-500 hover:bg-blue-500/90',
    'Em andamento': 'bg-yellow-500 hover:bg-yellow-500/90 text-black',
    'Aguardando peça': 'bg-orange-500 hover:bg-orange-500/90',
    'Finalizada': 'bg-green-500 hover:bg-green-500/90',
    'Cancelada': 'bg-gray-500 hover:bg-gray-500/90',
};

const editingOrder = ref(null);
const deletingOrder = ref(null);
const isDeleteDialogOpen = ref(false);
const activeTab = ref('todos');
const technicianFilter = ref([]);
const selectedOrderForPreview = ref(null);
const isPreviewOpen = ref(false);
const isDownloading = ref(false);
const productSearch = ref('');

const finalizationState = reactive({ isOpen: false });
const finalizationJustification = ref('');
const reassignmentState = reactive({ isOpen: false, oldTechnicianName: '', newTechnicianName: '' });
const reassignmentJustification = ref('');

const defaults = { client_id: '', technician_id: '', status: 'Aberta', problem_description: '', technical_diagnosis: '', executed_services: '', delivery_date: '', items: [], justification: '' };
const form = useForm({ ...defaults });

function safeFormat(dateString, outputFormat) {
    if (!dateString) return outputFormat === 'yyyy-MM-dd' ? '' : 'N/A';
    try {
        const d = parseISO(dateString);
        if (isNaN(d.getTime())) return outputFormat === 'yyyy-MM-dd' ? '' : 'Data Inválida';
        return format(d, outputFormat, { locale: ptBR });
    } catch (e) {
        return outputFormat === 'yyyy-MM-dd' ? '' : 'Data Inválida';
    }
}

function checkDelayed(order) {
    if (!order.delivery_date || order.status === 'Finalizada' || order.status === 'Cancelada') return false;
    try {
        const d = parseISO(order.delivery_date);
        return !isNaN(d.getTime()) && isPast(d);
    } catch (e) { return false; }
}

const filteredOrders = computed(() => props.serviceOrders.filter((order) => {
    const statusMatch = activeTab.value === 'todos' || order.status === activeTab.value;
    const techMatch = technicianFilter.value.length === 0 || technicianFilter.value.includes(order.technician_id);
    return statusMatch && techMatch;
}).slice().sort((a, b) => new Date(b.opening_date) - new Date(a.opening_date)));

const filteredProducts = computed(() => {
    if (!productSearch.value) return props.products;
    return props.products.filter((p) => p.name.toLowerCase().includes(productSearch.value.toLowerCase()));
});

const total = computed(() => (form.items || []).reduce((acc, item) => acc + (Number(item.quantity) || 0) * (Number(item.price) || 0), 0));

function handleAddNew() {
    editingOrder.value = null;
    form.clearErrors();
    Object.assign(form, defaults, { items: [] });
}

onMounted(() => {
    const p = props.prefillFromAppointment;
    if (!p) return;

    handleAddNew();
    const parts = [`Atendimento agendado para ${safeFormat(p.delivery_date, 'dd/MM/yyyy')}${p.time ? ` às ${p.time}` : ''}.`];
    if (p.address) parts.push(`Endereço: ${p.address}.`);
    if (p.contact) parts.push(`Contato: ${p.contact}.`);
    if (p.summary) parts.push(`Resumo: ${p.summary}`);
    Object.assign(form, {
        client_id: p.client_id || '',
        technician_id: p.technician_id || '',
        delivery_date: p.delivery_date || '',
        problem_description: parts.join('\n'),
    });

    if (!p.client_id) {
        toast({ variant: 'destructive', title: 'Cliente não encontrado', description: `Não encontramos "${p.client_name}" na base. Selecione ou cadastre o cliente antes de salvar.` });
    } else {
        toast({ title: 'OS pré-preenchida', description: 'Dados do agendamento carregados. Confira e complete o restante.' });
    }

    // Deferred: Inertia's own router touches history.state right after mount,
    // which would otherwise race and clobber this URL cleanup.
    setTimeout(() => window.history.replaceState(window.history.state, '', '/dashboard/chamados'), 0);
});

function handleEdit(order) {
    editingOrder.value = order;
    form.clearErrors();
    Object.assign(form, {
        client_id: order.client_id,
        technician_id: order.technician_id,
        status: order.status,
        problem_description: order.problem_description,
        technical_diagnosis: order.technical_diagnosis || '',
        executed_services: order.executed_services || '',
        delivery_date: order.delivery_date || '',
        items: order.items.map((i) => ({ name: i.name, quantity: i.quantity, price: i.price })),
        justification: '',
    });
}

function handleCloneClick(order) {
    router.post(`/dashboard/chamados/${order.id}/clone`, {}, { preserveScroll: true });
}

function handlePreview(order) {
    selectedOrderForPreview.value = order;
    isPreviewOpen.value = true;
}

function confirmDelete() {
    if (!deletingOrder.value) return;
    const id = deletingOrder.value.id;
    router.delete(`/dashboard/chamados/${id}`, {
        onSuccess: () => { if (editingOrder.value?.id === id) handleAddNew(); },
    });
    deletingOrder.value = null;
}

function addItem() { form.items.push({ name: '', quantity: 1, price: 0 }); }
function removeItem(idx) { form.items.splice(idx, 1); }

function handleItemNameBlur(idx) {
    const itemName = form.items[idx]?.name;
    if (!itemName) return;
    const existing = props.products.find((p) => p.name.toLowerCase().trim() === itemName.toLowerCase().trim());
    if (existing) form.items[idx].price = existing.price;
}

function handleAddProductFromList(product) {
    form.items.push({ name: product.name, quantity: 1, price: product.price });
    toast({ title: 'Item Adicionado!', description: `"${product.name}" foi adicionado à OS.` });
}

function checkPendingJustification() {
    const flash = page.props.flash;
    if (flash?.reassignment_pending) {
        const oldTech = props.technicians.find((t) => t.id === editingOrder.value.technician_id)?.name || 'N/A';
        const newTech = props.technicians.find((t) => t.id === form.technician_id)?.name || 'N/A';
        reassignmentState.isOpen = true;
        reassignmentState.oldTechnicianName = oldTech;
        reassignmentState.newTechnicianName = newTech;
        return true;
    }
    if (flash?.finalization_pending) {
        finalizationState.isOpen = true;
        return true;
    }
    return false;
}

function submit() {
    if (!editingOrder.value) {
        form.transform((d) => { const { justification, ...rest } = d; return rest; }).post('/dashboard/chamados', {
            onSuccess: () => handleAddNew(),
        });
        return;
    }

    form.put(`/dashboard/chamados/${editingOrder.value.id}`, {
        preserveScroll: true,
        onSuccess: () => { if (!checkPendingJustification()) handleAddNew(); },
        onError: () => { checkPendingJustification(); },
    });
}

function handleCancelFinalization() {
    finalizationState.isOpen = false;
    finalizationJustification.value = '';
    if (editingOrder.value) form.status = editingOrder.value.status;
}

function handleCancelReassignment() {
    reassignmentState.isOpen = false;
    reassignmentJustification.value = '';
    if (editingOrder.value) form.technician_id = editingOrder.value.technician_id;
}

function handleConfirmFinalization() {
    if (!finalizationJustification.value.trim()) {
        toast({ variant: 'destructive', title: 'Justificativa é obrigatória.' });
        return;
    }
    form.transform((d) => ({ ...d, justification: finalizationJustification.value })).put(`/dashboard/chamados/${editingOrder.value.id}`, {
        onSuccess: () => {
            finalizationState.isOpen = false;
            finalizationJustification.value = '';
            handleAddNew();
        },
    });
}

function handleConfirmReassignment() {
    if (!reassignmentJustification.value.trim()) {
        toast({ variant: 'destructive', title: 'Justificativa é obrigatória.' });
        return;
    }
    form.transform((d) => ({ ...d, justification: reassignmentJustification.value })).put(`/dashboard/chamados/${editingOrder.value.id}`, {
        onSuccess: (page) => {
            if (page.props.flash?.finalization_pending) {
                reassignmentState.isOpen = false;
                reassignmentJustification.value = '';
                finalizationState.isOpen = true;
                return;
            }
            reassignmentState.isOpen = false;
            reassignmentJustification.value = '';
            handleAddNew();
        },
    });
}

async function handleDownloadPdf() {
    const el = document.getElementById('os-preview');
    if (!el || !selectedOrderForPreview.value) return;
    isDownloading.value = true;
    try {
        const canvas = await html2canvas(el, { scale: 2, useCORS: true });
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        const props2 = pdf.getImageProperties(imgData);
        let imgHeight = (props2.height * pdfWidth) / props2.width;
        if (imgHeight > pdfHeight) imgHeight = pdfHeight;
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, imgHeight);
        pdf.save(`os-${selectedOrderForPreview.value.number}.pdf`);
    } catch (e) {
        toast({ variant: 'destructive', title: 'Erro ao gerar PDF' });
    } finally { isDownloading.value = false; }
}

function customerOf(order) { return order.client || props.customers.find((c) => c.id === order.client_id); }
function technicianOf(order) { return order.technician || props.technicians.find((t) => t.id === order.technician_id); }

function handleSendEmail() {
    const order = selectedOrderForPreview.value;
    const customer = customerOf(order);
    if (!customer?.email) { toast({ variant: 'destructive', title: 'E-mail não encontrado' }); return; }
    const subject = `Ordem de Serviço #${order.number}`;
    const body = `Olá ${customer.name},\n\nSegue em anexo a sua Ordem de Serviço de número #${order.number}.`;
    window.location.href = `mailto:${customer.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

function handleSendWhatsApp() {
    const order = selectedOrderForPreview.value;
    const customer = customerOf(order);
    const technician = technicianOf(order);
    if (!customer?.telefone) { toast({ variant: 'destructive', title: 'Telefone não encontrado' }); return; }
    const message = `*Ordem de Serviço #${order.number}*\n\n*Cliente:* ${customer.name}\n*Técnico:* ${technician?.name || 'N/A'}\n*Data de Abertura:* ${safeFormat(order.opening_date, 'dd/MM/yyyy')}\n*Status:* ${order.status}\n\n*Problema Relatado:*\n${order.problem_description}\n\n*Diagnóstico Técnico:*\n${order.technical_diagnosis || 'Aguardando diagnóstico.'}`;
    const clean = customer.telefone.replace(/\D/g, '');
    const phone = clean.length > 11 ? clean : `55${clean}`;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, 'vendaspro_whatsapp');
}
</script>

<template>
    <Head title="Ordens de Serviço" />

    <datalist id="product-datalist"><option v-for="p in products" :key="p.id" :value="p.name" /></datalist>

    <div class="flex h-full flex-1 flex-col space-y-4 p-4 md:p-8 pt-6">
        <div>
            <h2 class="text-3xl font-bold tracking-tight font-headline">Ordens de Serviço</h2>
            <p class="text-muted-foreground">Gerencie e acompanhe o fluxo de trabalho da sua equipe técnica.</p>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            <div class="lg:col-span-2 space-y-4">
                <Tabs :model-value="activeTab" @update:modelValue="(v) => (activeTab = v)">
                    <div class="flex items-center justify-between flex-wrap gap-2">
                        <TabsList class="flex-wrap h-auto">
                            <TabsTrigger value="todos">Todas</TabsTrigger>
                            <TabsTrigger v-for="stage in stages" :key="stage.id" :value="stage.id">{{ stage.title }}</TabsTrigger>
                        </TabsList>
                        <div class="flex items-center gap-2">
                            <DropdownMenu>
                                <DropdownMenuTrigger as-child>
                                    <Button variant="outline"><UserIcon class="mr-2 h-4 w-4" /> Técnico ({{ technicianFilter.length > 0 ? technicianFilter.length : 'Todos' }})</Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent>
                                    <DropdownMenuCheckboxItem
                                        v-for="tech in technicians" :key="tech.id"
                                        :checked="technicianFilter.includes(tech.id)"
                                        @update:checked="(c) => (technicianFilter = c ? [...technicianFilter, tech.id] : technicianFilter.filter((t) => t !== tech.id))"
                                    >{{ tech.name }}</DropdownMenuCheckboxItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                            <Button @click="handleAddNew"><PlusCircle class="mr-2 h-4 w-4" /> Nova OS</Button>
                        </div>
                    </div>

                    <TabsContent :value="activeTab" class="w-full mt-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>Lista de Ordens de Serviço</CardTitle>
                                <CardDescription>{{ activeTab === 'todos' ? 'Exibindo todas as ordens de serviço.' : `Exibindo ordens com status "${stages.find(s => s.id === activeTab)?.title}".` }}</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow><TableHead>OS</TableHead><TableHead>Cliente</TableHead><TableHead>Técnico</TableHead><TableHead>Status</TableHead><TableHead>Prazo</TableHead><TableHead class="text-right">Ações</TableHead></TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        <TableRow v-if="filteredOrders.length === 0"><TableCell colspan="6" class="h-24 text-center">Nenhuma ordem de serviço encontrada.</TableCell></TableRow>
                                        <TableRow v-for="order in filteredOrders" :key="order.id" class="cursor-pointer" :class="editingOrder?.id === order.id && 'bg-muted/50'" @click="handleEdit(order)">
                                            <TableCell class="font-medium">#{{ order.number }}</TableCell>
                                            <TableCell>{{ customerOf(order)?.name || 'N/A' }}</TableCell>
                                            <TableCell>{{ technicianOf(order)?.name || 'N/A' }}</TableCell>
                                            <TableCell><Badge :class="statusColors[order.status]">{{ order.status }}</Badge></TableCell>
                                            <TableCell>
                                                <div class="flex items-center gap-2">
                                                    {{ safeFormat(order.delivery_date, 'dd/MM/yyyy') }}
                                                    <TooltipProvider v-if="checkDelayed(order)">
                                                        <Tooltip><TooltipTrigger><AlertCircle class="h-4 w-4 text-destructive" /></TooltipTrigger><TooltipContent><p>Esta OS está atrasada.</p></TooltipContent></Tooltip>
                                                    </TooltipProvider>
                                                </div>
                                            </TableCell>
                                            <TableCell class="text-right">
                                                <div class="flex justify-end gap-1">
                                                    <Button variant="ghost" size="icon" class="h-8 w-8 text-muted-foreground" @click.stop="handleCloneClick(order)"><Copy class="h-4 w-4" /></Button>
                                                    <Button variant="ghost" size="icon" class="h-8 w-8" @click.stop="handlePreview(order)"><Printer class="h-4 w-4" /></Button>
                                                    <Button variant="ghost" size="icon" class="h-8 w-8 text-destructive" @click.stop="deletingOrder = order; isDeleteDialogOpen = true"><Trash2 class="h-4 w-4" /></Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    </TableBody>
                                </Table>
                            </CardContent>
                            <CardFooter><div class="text-xs text-muted-foreground">Mostrando <strong>{{ filteredOrders.length }}</strong> de <strong>{{ serviceOrders.length }}</strong> ordens de serviço.</div></CardFooter>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>

            <div class="lg:col-span-1 sticky top-4">
                <form @submit.prevent="submit">
                    <Card class="flex flex-col max-h-[calc(100vh-5rem)]">
                        <CardHeader class="flex flex-row items-start justify-between">
                            <div>
                                <CardTitle>{{ editingOrder ? `Editar OS #${editingOrder.number}` : 'Nova Ordem de Serviço' }}</CardTitle>
                                <CardDescription>{{ editingOrder ? 'Altere os dados da OS. O cliente não pode ser modificado.' : 'Preencha os dados para abrir uma nova OS.' }}</CardDescription>
                            </div>
                            <Button v-if="editingOrder" type="button" variant="ghost" size="icon" class="h-7 w-7" @click="handleAddNew"><XCircle class="h-5 w-5" /></Button>
                        </CardHeader>
                        <CardContent class="flex-1 overflow-y-auto space-y-4">
                            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div class="space-y-2">
                                    <Label>Cliente</Label>
                                    <Select v-model="form.client_id" :disabled="!!editingOrder">
                                        <SelectTrigger><SelectValue placeholder="Selecione um cliente" /></SelectTrigger>
                                        <SelectContent><SelectItem v-for="c in customers" :key="c.id" :value="c.id">{{ c.name }}</SelectItem></SelectContent>
                                    </Select>
                                    <p v-if="form.errors.client_id" class="text-xs text-destructive">{{ form.errors.client_id }}</p>
                                </div>
                                <div class="space-y-2">
                                    <Label>Técnico Responsável</Label>
                                    <Select v-model="form.technician_id">
                                        <SelectTrigger><SelectValue placeholder="Selecione um técnico" /></SelectTrigger>
                                        <SelectContent><SelectItem v-for="t in technicians" :key="t.id" :value="t.id">{{ t.name }}</SelectItem></SelectContent>
                                    </Select>
                                    <p v-if="form.errors.technician_id" class="text-xs text-destructive">{{ form.errors.technician_id }}</p>
                                </div>
                            </div>
                            <div class="space-y-2">
                                <Label>Descrição do Problema (Relatado pelo Cliente)</Label>
                                <Textarea v-model="form.problem_description" rows="3" placeholder="Ex: O equipamento não liga..." />
                                <p v-if="form.errors.problem_description" class="text-xs text-destructive">{{ form.errors.problem_description }}</p>
                            </div>
                            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div class="space-y-2">
                                    <Label>Status</Label>
                                    <Select v-model="form.status">
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent><SelectItem v-for="s in stages" :key="s.id" :value="s.id">{{ s.title }}</SelectItem></SelectContent>
                                    </Select>
                                </div>
                                <div class="space-y-2"><Label>Prazo de Entrega</Label><Input v-model="form.delivery_date" type="date" /></div>
                            </div>

                            <template v-if="editingOrder">
                                <div class="space-y-2"><Label>Diagnóstico Técnico</Label><Textarea v-model="form.technical_diagnosis" placeholder="Causa provável do problema..." /></div>
                                <div class="space-y-2"><Label>Serviços Executados (Descrição)</Label><Textarea v-model="form.executed_services" placeholder="Limpeza, troca de peça, configuração..." /></div>

                                <Card>
                                    <CardHeader class="p-4"><CardTitle class="text-base">Peças e Serviços Utilizados</CardTitle></CardHeader>
                                    <CardContent class="p-4 pt-0 space-y-3">
                                        <div v-if="form.items.length === 0" class="text-xs text-muted-foreground italic">Nenhum item adicionado.</div>
                                        <div v-for="(item, idx) in form.items" :key="idx" class="rounded-lg border p-3 space-y-2">
                                            <div class="flex items-start gap-2">
                                                <Input v-model="item.name" list="product-datalist" placeholder="Descrição do item" class="flex-1" :title="item.name" @blur="handleItemNameBlur(idx)" />
                                                <Button type="button" variant="ghost" size="icon" class="shrink-0" @click="removeItem(idx)"><Trash2 class="h-4 w-4 text-destructive" /></Button>
                                            </div>
                                            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                <div class="space-y-1">
                                                    <Label class="text-[10px] uppercase text-muted-foreground">Qtd.</Label>
                                                    <Input v-model="item.quantity" type="number" />
                                                </div>
                                                <div class="space-y-1">
                                                    <Label class="text-[10px] uppercase text-muted-foreground">Preço Unit.</Label>
                                                    <Input v-model="item.price" type="number" step="0.01" />
                                                </div>
                                            </div>
                                        </div>
                                        <Button type="button" variant="outline" size="sm" class="mt-2" @click="addItem"><PlusCircle class="mr-2 h-4 w-4" /> Adicionar Item</Button>
                                    </CardContent>
                                    <CardFooter class="bg-muted/50 p-4 flex justify-end">
                                        <div class="text-right"><p class="text-muted-foreground text-sm">Total dos Itens</p><p class="text-lg font-bold">{{ formatCurrency(total) }}</p></div>
                                    </CardFooter>
                                </Card>

                                <Card>
                                    <CardHeader class="p-4">
                                        <CardTitle class="text-base">Adicionar Produtos e Serviços</CardTitle>
                                        <div class="relative pt-2"><Search class="absolute left-2.5 top-4 h-4 w-4 text-muted-foreground" /><Input v-model="productSearch" placeholder="Buscar item..." class="pl-8" /></div>
                                    </CardHeader>
                                    <CardContent class="p-4 pt-0">
                                        <ScrollArea class="h-40">
                                            <div class="flex flex-col gap-1 pr-2">
                                                <div v-for="product in filteredProducts" :key="product.id" class="flex cursor-pointer items-center justify-between rounded-md p-2 hover:bg-muted" @click="handleAddProductFromList(product)">
                                                    <div class="flex-1 truncate pr-2"><p class="font-semibold text-sm truncate">{{ product.name }}</p><p class="text-xs text-muted-foreground">{{ formatCurrency(product.price) }}</p></div>
                                                </div>
                                                <p v-if="filteredProducts.length === 0" class="text-sm text-center text-muted-foreground py-4">Nenhum item encontrado.</p>
                                            </div>
                                        </ScrollArea>
                                    </CardContent>
                                </Card>

                                <div v-if="editingOrder.history?.length" class="space-y-2">
                                    <h4 class="text-sm font-medium text-foreground">Histórico de Alterações</h4>
                                    <ScrollArea class="h-40 rounded-md border p-2">
                                        <div class="space-y-3">
                                            <div v-for="entry in editingOrder.history.slice().reverse()" :key="entry.id" class="text-xs text-muted-foreground">
                                                <p class="flex items-center gap-1.5 flex-wrap">
                                                    <span class="font-semibold text-foreground">{{ entry.user_name }}</span>
                                                    <span>{{ entry.action }}</span>
                                                    <Badge v-if="entry.from_value" variant="outline">{{ entry.from_value }}</Badge>
                                                    <span v-if="entry.to_value">&rarr;</span>
                                                    <Badge v-if="entry.to_value" variant="secondary">{{ entry.to_value }}</Badge>
                                                </p>
                                                <p class="text-xs text-muted-foreground/80 pl-2">{{ safeFormat(entry.happened_at, 'dd/MM/yyyy HH:mm') }}</p>
                                                <blockquote v-if="entry.details" class="mt-1 ml-2 pl-2 border-l-2 text-foreground/80 italic">"{{ entry.details }}"</blockquote>
                                            </div>
                                        </div>
                                    </ScrollArea>
                                </div>
                            </template>
                        </CardContent>
                        <CardFooter><Button type="submit" class="w-full" :disabled="form.processing">Salvar</Button></CardFooter>
                    </Card>
                </form>
            </div>
        </div>
    </div>

    <AlertDialog v-model:open="isDeleteDialogOpen">
        <AlertDialogContent>
            <AlertDialogHeader><AlertDialogTitle>Você tem certeza?</AlertDialogTitle><AlertDialogDescription>Essa ação não pode ser desfeita. Isso excluirá permanentemente a OS <span class="font-medium">#{{ deletingOrder?.number }}</span>.</AlertDialogDescription></AlertDialogHeader>
            <AlertDialogFooter><AlertDialogCancel @click="deletingOrder = null">Cancelar</AlertDialogCancel><AlertDialogAction @click="confirmDelete">Confirmar Exclusão</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>

    <Dialog v-model:open="isPreviewOpen">
        <DialogContent class="sm:max-w-3xl h-[90vh] flex flex-col">
            <DialogHeader><DialogTitle>Ordem de Serviço #{{ selectedOrderForPreview?.number }}</DialogTitle><DialogDescription>Pré-visualização da Ordem de Serviço para impressão ou envio.</DialogDescription></DialogHeader>
            <ScrollArea v-if="selectedOrderForPreview" class="flex-1 -mx-6">
                <div id="os-preview" class="bg-white text-black p-8 shadow-lg max-w-2xl mx-auto font-sans my-8">
                    <div class="flex justify-between items-start mb-8">
                        <div class="flex items-center gap-3">
                            <img v-if="companyProfile?.logo_url" :src="companyProfile.logo_url" alt="Logo" class="h-14 w-14 object-contain" />
                            <div>
                                <h1 class="text-xl font-bold">Ordem de Serviço</h1>
                                <p v-if="companyProfile?.name" class="text-xs font-semibold text-gray-600">{{ companyProfile.name }}</p>
                            </div>
                        </div>
                        <div class="text-right text-xs">
                            <p class="font-bold">OS #{{ selectedOrderForPreview.number }}</p>
                            <p>Abertura: {{ safeFormat(selectedOrderForPreview.opening_date, 'dd/MM/yyyy') }}</p>
                            <p v-if="selectedOrderForPreview.delivery_date">Prazo: {{ safeFormat(selectedOrderForPreview.delivery_date, 'dd/MM/yyyy') }}</p>
                        </div>
                    </div>
                    <hr class="my-6 border-gray-300" />
                    <div class="grid grid-cols-2 gap-4 mb-6 text-sm">
                        <div><p class="font-bold text-gray-600">CLIENTE:</p><p class="font-semibold">{{ customerOf(selectedOrderForPreview)?.name }}</p><p>{{ customerOf(selectedOrderForPreview)?.email }}</p><p>{{ customerOf(selectedOrderForPreview)?.telefone }}</p></div>
                        <div class="text-right"><p class="font-bold text-gray-600">TÉCNICO RESPONSÁVEL:</p><p class="font-semibold">{{ technicianOf(selectedOrderForPreview)?.name }}</p></div>
                    </div>
                    <div class="space-y-4 text-sm">
                        <div><h3 class="font-bold border-b pb-1 mb-2">Problema Relatado</h3><p class="whitespace-pre-wrap">{{ selectedOrderForPreview.problem_description }}</p></div>
                        <div v-if="selectedOrderForPreview.technical_diagnosis"><h3 class="font-bold border-b pb-1 mb-2">Diagnóstico Técnico</h3><p class="whitespace-pre-wrap">{{ selectedOrderForPreview.technical_diagnosis }}</p></div>
                        <div v-if="selectedOrderForPreview.executed_services"><h3 class="font-bold border-b pb-1 mb-2">Serviços Executados</h3><p class="whitespace-pre-wrap">{{ selectedOrderForPreview.executed_services }}</p></div>
                        <div v-if="selectedOrderForPreview.items?.length">
                            <h3 class="font-bold border-b pb-1 mb-2">Peças e Serviços Utilizados</h3>
                            <table class="w-full text-left text-sm my-4">
                                <thead class="bg-gray-100"><tr><th class="p-2 font-semibold">Item</th><th class="p-2 text-center font-semibold">Qtd.</th><th class="p-2 text-right font-semibold">Preço Unit.</th><th class="p-2 text-right font-semibold">Subtotal</th></tr></thead>
                                <tbody>
                                    <tr v-for="(item, idx) in selectedOrderForPreview.items" :key="idx" class="border-b border-gray-200">
                                        <td class="p-2">{{ item.name }}</td><td class="p-2 text-center">{{ item.quantity }}</td>
                                        <td class="p-2 text-right">{{ formatCurrency(item.price) }}</td><td class="p-2 text-right">{{ formatCurrency(item.quantity * item.price) }}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                    <hr class="my-6 border-gray-300" />
                    <div v-if="selectedOrderForPreview.items?.length" class="flex justify-end mb-8">
                        <div class="w-1/2 text-right flex justify-between text-lg"><span class="font-bold">Total:</span><span class="font-bold">{{ formatCurrency(selectedOrderForPreview.items.reduce((a, i) => a + i.quantity * i.price, 0)) }}</span></div>
                    </div>
                    <div class="mt-24 grid grid-cols-2 gap-8 text-center text-sm">
                        <div><hr class="border-gray-400 mb-1" /><p>{{ technicianOf(selectedOrderForPreview)?.name }}</p><p class="text-xs text-gray-600">Assinatura do Técnico</p></div>
                        <div><hr class="border-gray-400 mb-1" /><p>{{ customerOf(selectedOrderForPreview)?.name }}</p><p class="text-xs text-gray-600">Assinatura do Cliente</p></div>
                    </div>
                </div>
            </ScrollArea>
            <DialogFooter>
                <Button type="button" variant="outline" @click="isPreviewOpen = false">Cancelar</Button>
                <Button type="button" variant="secondary" :disabled="isDownloading" @click="handleDownloadPdf"><Loader2 v-if="isDownloading" class="mr-2 h-4 w-4 animate-spin" /><Download v-else class="mr-2 h-4 w-4" /> Baixar PDF</Button>
                <Button type="button" @click="handleSendEmail"><Mail class="mr-2 h-4 w-4" /> Enviar por E-mail</Button>
                <Button type="button" @click="handleSendWhatsApp"><Send class="mr-2 h-4 w-4" /> Enviar por WhatsApp</Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>

    <Dialog :open="finalizationState.isOpen" @update:open="(o) => !o && handleCancelFinalization()">
        <DialogContent>
            <DialogHeader><DialogTitle>Finalizar Ordem de Serviço</DialogTitle><DialogDescription>Para finalizar a OS, adicione um breve comentário sobre a resolução do problema.</DialogDescription></DialogHeader>
            <div class="py-4"><Textarea v-model="finalizationJustification" placeholder="Ex: Peça substituída e equipamento funcionando normalmente." rows="4" /></div>
            <DialogFooter>
                <Button variant="outline" @click="handleCancelFinalization">Cancelar</Button>
                <Button @click="handleConfirmFinalization">Confirmar Finalização</Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>

    <Dialog :open="reassignmentState.isOpen" @update:open="(o) => !o && handleCancelReassignment()">
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Justificar Reatribuição de Técnico</DialogTitle>
                <DialogDescription>Você está reatribuindo a OS de <span class="font-medium">{{ reassignmentState.oldTechnicianName }}</span> para <span class="font-medium">{{ reassignmentState.newTechnicianName }}</span>.</DialogDescription>
            </DialogHeader>
            <div class="py-4"><Textarea v-model="reassignmentJustification" placeholder="Ex: Mudança de turno, especialidade necessária, etc." rows="4" /></div>
            <DialogFooter>
                <Button variant="outline" @click="handleCancelReassignment">Cancelar</Button>
                <Button @click="handleConfirmReassignment">Confirmar Reatribuição</Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
</template>
