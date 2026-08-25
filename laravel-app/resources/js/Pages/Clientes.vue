<script setup>
import { computed, ref } from 'vue';
import { Head, router, useForm } from '@inertiajs/vue3';
import axios from 'axios';
import {
    PlusCircle, Search, Loader2, Trash2, Phone, Pencil, FileText, Tag, Repeat,
    UserCheck, Briefcase, Layers, DollarSign, User, Eye, EyeOff, MessageSquare,
} from 'lucide-vue-next';
import AppLayout from '@/Layouts/AppLayout.vue';
import { Badge } from '@/Components/ui/badge';
import { Button } from '@/Components/ui/button';
import { Card, CardContent } from '@/Components/ui/card';
import { Input } from '@/Components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/Components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/Components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/Components/ui/dialog';
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/Components/ui/alert-dialog';
import { ScrollArea } from '@/Components/ui/scroll-area';
import { Label } from '@/Components/ui/label';
import { Switch } from '@/Components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/Components/ui/radio-group';
import { Textarea } from '@/Components/ui/textarea';
import { useToast } from '@/composables/useToast';
import { cn, formatCurrency, formatDocument, formatPhoneNumber } from '@/lib/utils';

defineOptions({ layout: AppLayout });

const props = defineProps({ customers: Array });
const { toast } = useToast();

const SERVICE_CATEGORIES = [
    { id: 'ponto', label: 'Ponto', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
    { id: 'manutencao', label: 'Manut. PC', color: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
    { id: 'gestao', label: 'Gestão', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
    { id: 'acesso', label: 'Acesso', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
    { id: 'catraca', label: 'Catraca', color: 'bg-pink-500/20 text-pink-400 border-pink-500/30' },
];

const isCnpjLoading = ref(false);
const isFormDialogOpen = ref(false);
const editingCustomer = ref(null);
const deletingCustomer = ref(null);
const isDeleteDialogOpen = ref(false);
const searchTerm = ref('');
const activeTab = ref('all');
const showFinancials = ref(false);

const defaults = {
    cnpj: '', name: '', nome_fantasia: '', contact_name: '', telefone: '', email: '',
    endereco: '', isLead: false, type: 'one_time', service_categories: [], observations: '',
    one_time_value: 0, monthly_value: 0,
};
const form = useForm({ ...defaults });

const displayedCustomers = computed(() => {
    const term = searchTerm.value.toLowerCase();
    let filtered = props.customers.filter((c) => term === '' || c.name.toLowerCase().includes(term) || (c.nome_fantasia || '').toLowerCase().includes(term) || (c.cnpj || '').includes(term));
    if (activeTab.value === 'leads') filtered = filtered.filter((c) => c.type === 'lead');
    if (activeTab.value === 'contracts') filtered = filtered.filter((c) => c.type === 'active_contract');
    if (activeTab.value === 'one_time') filtered = filtered.filter((c) => c.type === 'one_time');
    return [...filtered].sort((a, b) => a.name.localeCompare(b.name));
});

async function handleCnpjLookup() {
    const cleaned = (form.cnpj || '').replace(/\D/g, '');
    if (cleaned.length !== 14) return;
    isCnpjLoading.value = true;
    try {
        const { data } = await axios.get('/cnpj-lookup', { params: { cnpj: cleaned } });
        if (data.success) {
            const d = data.success;
            form.name = d.razao_social || '';
            form.nome_fantasia = d.nome_fantasia || d.razao_social || '';
            form.email = d.email || '';
            if (d.ddd_telefone_1) form.telefone = formatPhoneNumber(d.ddd_telefone_1);
            toast({ title: 'CNPJ Consultado!' });
        }
    } catch (e) {
        toast({ variant: 'destructive', title: 'Erro na consulta', description: e.response?.data?.error });
    } finally {
        isCnpjLoading.value = false;
    }
}

function handleEditClick(customer) {
    editingCustomer.value = customer;
    form.clearErrors();
    Object.assign(form, {
        name: customer.name,
        nome_fantasia: customer.nome_fantasia || '',
        contact_name: customer.contact_name || '',
        telefone: customer.telefone ? formatPhoneNumber(customer.telefone) : '',
        email: customer.email || '',
        isLead: customer.type === 'lead',
        type: customer.type === 'active_contract' ? 'active_contract' : 'one_time',
        cnpj: customer.cnpj ? formatDocument(customer.cnpj) : '',
        endereco: customer.endereco || '',
        service_categories: customer.service_categories || [],
        observations: customer.observations || '',
        one_time_value: customer.one_time_value || 0,
        monthly_value: customer.monthly_value || 0,
    });
    isFormDialogOpen.value = true;
}

function handleOpenNew() {
    editingCustomer.value = null;
    form.clearErrors();
    Object.assign(form, defaults);
    isFormDialogOpen.value = true;
}

function toggleCategory(id) {
    const idx = form.service_categories.indexOf(id);
    if (idx >= 0) form.service_categories.splice(idx, 1);
    else form.service_categories.push(id);
}

function submit() {
    const payload = form.transform((data) => ({
        ...data,
        type: data.isLead ? 'lead' : data.type,
        status: data.isLead ? 'lead' : undefined,
    }));

    if (editingCustomer.value) {
        payload.put(`/dashboard/clientes/${editingCustomer.value.id}`, {
            onSuccess: () => { isFormDialogOpen.value = false; editingCustomer.value = null; },
        });
    } else {
        payload.post('/dashboard/clientes', {
            onSuccess: () => { isFormDialogOpen.value = false; },
        });
    }
}

function confirmDelete() {
    if (!deletingCustomer.value) return;
    router.delete(`/dashboard/clientes/${deletingCustomer.value.id}`);
    deletingCustomer.value = null;
}
</script>

<template>
    <Head title="Clientes" />

    <div class="flex-1 space-y-6 p-4 md:p-8 pt-6 bg-background/50">
        <div class="flex items-center justify-between">
            <div>
                <h2 class="text-3xl font-bold tracking-tight font-headline">Clientes e Leads</h2>
                <p class="text-muted-foreground">Gestão de clientes com foco em privacidade e segmentos.</p>
            </div>
            <div class="flex gap-2">
                <Button variant="outline" size="icon" @click="showFinancials = !showFinancials" :title="showFinancials ? 'Ocultar Valores' : 'Mostrar Valores'">
                    <EyeOff v-if="showFinancials" class="h-4 w-4" /><Eye v-else class="h-4 w-4" />
                </Button>
                <Button class="gap-2 shadow-md" @click="handleOpenNew"><PlusCircle class="h-4 w-4" /> Novo Registro</Button>
            </div>
        </div>

        <Tabs :model-value="activeTab" @update:modelValue="(v) => (activeTab = v)" class="space-y-6">
            <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <TabsList class="bg-muted/50 p-1">
                    <TabsTrigger value="all">Todos</TabsTrigger>
                    <TabsTrigger value="leads">Funil (Leads)</TabsTrigger>
                    <TabsTrigger value="contracts">Contratos</TabsTrigger>
                    <TabsTrigger value="one_time">Avulsos</TabsTrigger>
                </TabsList>
                <div class="relative w-full md:w-72">
                    <Search class="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input v-model="searchTerm" placeholder="Buscar cliente..." class="pl-10" />
                </div>
            </div>

            <Card class="shadow-lg border-primary/10 overflow-hidden">
                <CardContent class="p-0">
                    <Table>
                        <TableHeader class="bg-muted/20">
                            <TableRow>
                                <TableHead class="pl-6">Identificação / Cliente</TableHead>
                                <TableHead>Modalidade</TableHead>
                                <TableHead>Segmentos / Serviços</TableHead>
                                <TableHead class="text-right pr-6">Ações</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            <TableRow v-for="customer in displayedCustomers" :key="customer.id" class="cursor-pointer hover:bg-muted/40 transition-colors" @click="handleEditClick(customer)">
                                <TableCell class="pl-6 py-4">
                                    <div class="flex flex-col">
                                        <span class="font-bold text-base leading-tight">{{ customer.nome_fantasia || customer.name }}</span>
                                        <span v-if="customer.contact_name" class="text-[11px] text-primary font-semibold flex items-center gap-1 mt-0.5"><User class="h-3 w-3" /> Contato: {{ customer.contact_name }}</span>
                                        <span class="text-[10px] text-muted-foreground uppercase mt-1">{{ customer.name }}</span>
                                        <div class="flex items-center gap-3 mt-1.5">
                                            <span v-if="customer.telefone" class="text-[10px] flex items-center gap-1"><Phone class="h-3 w-3" /> {{ formatPhoneNumber(customer.telefone) }}</span>
                                            <span v-if="customer.cnpj" class="text-[10px] font-mono">{{ formatDocument(customer.cnpj) }}</span>
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <Badge v-if="customer.type === 'lead'" variant="outline" class="bg-yellow-500/10 text-yellow-600 border-yellow-500/30 gap-1 w-fit"><Tag class="h-3 w-3" /> Lead</Badge>
                                    <Badge v-else-if="customer.type === 'active_contract'" variant="outline" class="bg-purple-500/10 text-purple-600 border-purple-500/30 gap-1 w-fit"><FileText class="h-3 w-3" /> Contrato</Badge>
                                    <Badge v-else variant="outline" class="bg-blue-500/10 text-blue-600 border-blue-500/30 gap-1 w-fit"><UserCheck class="h-3 w-3" /> Avulso</Badge>
                                </TableCell>
                                <TableCell>
                                    <div class="flex flex-col gap-2">
                                        <div class="flex flex-wrap gap-1">
                                            <template v-if="customer.service_categories?.length">
                                                <span v-for="catId in customer.service_categories" :key="catId" :class="cn('text-[9px] px-1.5 rounded-sm font-bold uppercase', SERVICE_CATEGORIES.find(s => s.id === catId)?.color)">
                                                    {{ SERVICE_CATEGORIES.find(s => s.id === catId)?.label }}
                                                </span>
                                            </template>
                                            <span v-else class="text-[10px] text-muted-foreground italic">Nenhum segmento</span>
                                        </div>
                                        <div class="flex flex-col gap-0.5 mt-1 border-t border-muted pt-1">
                                            <span v-if="!showFinancials" class="text-[9px] text-muted-foreground italic flex items-center gap-1"><DollarSign class="h-2.5 w-2.5" /> R$ ****</span>
                                            <div v-else class="flex gap-3">
                                                <span v-if="customer.monthly_value" class="text-[10px] font-bold text-emerald-600 flex items-center gap-1"><Repeat class="h-2.5 w-2.5" /> {{ formatCurrency(customer.monthly_value) }}/mês</span>
                                                <span v-if="customer.one_time_value" class="text-[10px] text-primary font-bold flex items-center gap-1"><DollarSign class="h-2.5 w-2.5" /> {{ formatCurrency(customer.one_time_value) }}</span>
                                            </div>
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell class="text-right pr-6 py-4">
                                    <div class="flex justify-end gap-1 opacity-20 hover:opacity-100 transition-opacity">
                                        <Button variant="ghost" size="icon" class="h-8 w-8" @click.stop="handleEditClick(customer)"><Pencil class="h-4 w-4" /></Button>
                                        <Button variant="ghost" size="icon" class="h-8 w-8 text-destructive" @click.stop="deletingCustomer = customer; isDeleteDialogOpen = true"><Trash2 class="h-4 w-4" /></Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </Tabs>
    </div>

    <Dialog v-model:open="isFormDialogOpen">
        <DialogContent class="sm:max-w-[800px] p-0 overflow-hidden">
            <form @submit.prevent="submit" class="flex flex-col max-h-[90vh]">
                <DialogHeader class="p-6 border-b bg-muted/20">
                    <DialogTitle>{{ editingCustomer ? 'Editar Cadastro' : 'Novo Cadastro' }}</DialogTitle>
                    <DialogDescription>Diferencie entre Leads e Clientes com contrato ou venda única.</DialogDescription>
                </DialogHeader>
                <ScrollArea class="flex-1 p-6">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div class="space-y-6">
                            <h3 class="text-xs font-bold uppercase tracking-widest text-primary flex items-center gap-2"><Briefcase class="h-4 w-4" /> Identificação e Tipo</h3>
                            <div class="grid gap-4 p-4 border rounded-xl bg-muted/10">
                                <div class="flex items-center justify-between p-2 rounded-lg bg-yellow-500/5 border border-yellow-500/20">
                                    <div class="space-y-0.5">
                                        <Label class="text-xs font-bold text-yellow-600">Registro é um LEAD?</Label>
                                        <p class="text-[10px] text-muted-foreground">Marque se for apenas uma prospecção ativa.</p>
                                    </div>
                                    <Switch v-model:checked="form.isLead" />
                                </div>
                                <div v-if="!form.isLead" class="space-y-3">
                                    <Label class="text-xs font-bold">Modalidade de Cliente</Label>
                                    <RadioGroup v-model="form.type" class="flex gap-4">
                                        <div class="flex items-center space-x-2"><RadioGroupItem value="active_contract" id="tc1" /><Label for="tc1" class="font-normal text-xs">Contrato Fixo</Label></div>
                                        <div class="flex items-center space-x-2"><RadioGroupItem value="one_time" id="tc2" /><Label for="tc2" class="font-normal text-xs">Venda Avulsa</Label></div>
                                    </RadioGroup>
                                </div>
                            </div>
                            <div class="grid gap-4">
                                <div class="space-y-2">
                                    <Label>CNPJ / CPF</Label>
                                    <div class="flex gap-2">
                                        <Input :model-value="form.cnpj" @update:modelValue="(v) => (form.cnpj = formatDocument(v))" placeholder="00.000.000/0000-00" />
                                        <Button type="button" variant="secondary" size="icon" :disabled="isCnpjLoading" @click="handleCnpjLookup">
                                            <Loader2 v-if="isCnpjLoading" class="h-4 w-4 animate-spin" /><Search v-else class="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                                <div class="space-y-2">
                                    <Label>Razão Social / Nome</Label>
                                    <Input v-model="form.name" />
                                    <p v-if="form.errors.name" class="text-xs text-destructive">{{ form.errors.name }}</p>
                                </div>
                                <div class="space-y-2"><Label>Nome Fantasia (Opcional)</Label><Input v-model="form.nome_fantasia" /></div>
                                <div class="space-y-2"><Label>Pessoa de Contato Principal</Label><Input v-model="form.contact_name" placeholder="Ex: Sr. Carlos" /></div>
                            </div>
                        </div>

                        <div class="space-y-6">
                            <h3 class="text-xs font-bold uppercase tracking-widest text-primary flex items-center gap-2"><Layers class="h-4 w-4" /> Categorias e Valores</h3>
                            <div class="grid gap-4">
                                <div>
                                    <Label class="text-xs font-bold">Segmentos de Atendimento</Label>
                                    <div class="flex flex-wrap gap-2 pt-1">
                                        <div
                                            v-for="cat in SERVICE_CATEGORIES" :key="cat.id"
                                            :class="cn('flex items-center gap-2 px-3 py-1.5 rounded-full border cursor-pointer transition-all', form.service_categories.includes(cat.id) ? cat.color : 'bg-muted/50')"
                                            @click="toggleCategory(cat.id)"
                                        >
                                            <span class="text-[10px] font-bold uppercase">{{ cat.label }}</span>
                                        </div>
                                    </div>
                                </div>
                                <div class="grid grid-cols-2 gap-4 p-3 bg-primary/5 rounded-lg border border-primary/10">
                                    <div class="space-y-2"><Label class="text-primary font-bold">Vlr. Venda (R$)</Label><Input v-model="form.one_time_value" type="number" step="0.01" /></div>
                                    <div class="space-y-2"><Label class="text-emerald-600 font-bold">Vlr. Mensal (R$)</Label><Input v-model="form.monthly_value" type="number" step="0.01" /></div>
                                </div>
                                <div class="space-y-2">
                                    <Label>WhatsApp de Contato</Label>
                                    <Input :model-value="form.telefone" @update:modelValue="(v) => (form.telefone = formatPhoneNumber(v))" placeholder="(00) 00000-0000" />
                                </div>
                                <div class="space-y-2"><Label>E-mail Comercial</Label><Input v-model="form.email" type="email" /></div>
                                <div class="space-y-2"><Label>Endereço Completo</Label><Textarea v-model="form.endereco" /></div>
                            </div>
                        </div>
                    </div>

                    <div class="mt-8 border-t pt-8">
                        <h3 class="text-xs font-bold uppercase tracking-widest text-primary flex items-center gap-2 mb-4"><MessageSquare class="h-4 w-4" /> Serviços Prestados e Observações</h3>
                        <div class="space-y-2">
                            <Label>Serviços, Sistemas e Produtos (Descrição)</Label>
                            <Textarea v-model="form.observations" class="min-h-[120px] resize-none" placeholder="Descreva aqui quais serviços são prestados, qual sistema é utilizado e quais produtos foram fornecidos ao cliente..." />
                            <p class="text-xs text-muted-foreground">Utilize este espaço para documentar a infraestrutura técnica do cliente.</p>
                        </div>
                    </div>
                </ScrollArea>
                <DialogFooter class="p-6 border-t bg-muted/20">
                    <Button variant="ghost" type="button" @click="isFormDialogOpen = false">Cancelar</Button>
                    <Button type="submit" class="font-bold px-8 shadow-md" :disabled="form.processing">Salvar Registro</Button>
                </DialogFooter>
            </form>
        </DialogContent>
    </Dialog>

    <AlertDialog v-model:open="isDeleteDialogOpen">
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Excluir Registro?</AlertDialogTitle>
                <AlertDialogDescription>Esta ação removerá permanentemente o cliente da sua base.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel @click="deletingCustomer = null">Voltar</AlertDialogCancel>
                <AlertDialogAction class="bg-destructive" @click="confirmDelete">Confirmar Exclusão</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
</template>
