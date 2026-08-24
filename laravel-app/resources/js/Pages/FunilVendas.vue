<script setup>
import { computed, ref } from 'vue';
import { Head, router } from '@inertiajs/vue3';
import { CheckCircle2, FileText, Phone, Repeat, Tag, User as UserIcon, Users, XCircle } from 'lucide-vue-next';
import AppLayout from '@/Layouts/AppLayout.vue';
import { Card, CardContent } from '@/Components/ui/card';
import { Badge } from '@/Components/ui/badge';
import { Button } from '@/Components/ui/button';
import {
    AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/Components/ui/alert-dialog';
import { useToast } from '@/composables/useToast';
import { formatCurrency } from '@/lib/utils';

defineOptions({ layout: AppLayout });

const props = defineProps({ customers: Array });
const { toast } = useToast();

const stages = [
    { id: 'lead', title: 'Lead', color: 'bg-[#EAB308]' },
    { id: 'proposal', title: 'Proposta Enviada', color: 'bg-[#8B5CF6]' },
    { id: 'negotiation', title: 'Em Negociação', color: 'bg-[#F43F5E]' },
    { id: 'won', title: 'Ganho', color: 'bg-[#22C55E]' },
    { id: 'lost', title: 'Perdido', color: 'bg-[#EF4444]' },
];

const potentialColor = { high: 'bg-red-500', medium: 'bg-yellow-500', low: 'bg-blue-500' };

function getStage(status) {
    if (status === 'proposal') return 'proposal';
    if (status === 'negotiation') return 'negotiation';
    if (status === 'won' || status === 'active') return 'won';
    if (status === 'lost' || status === 'discarded' || status === 'inactive') return 'lost';
    return 'lead';
}

const convertingCustomer = ref(null);

function handleDragStart(e, customer) {
    e.dataTransfer.setData('customerId', String(customer.id));
}

function handleDrop(e, targetStage) {
    e.preventDefault();
    const id = Number(e.dataTransfer.getData('customerId'));
    const customer = props.customers.find((c) => c.id === id);
    if (!customer) return;

    if (targetStage === 'won') {
        convertingCustomer.value = customer;
        return;
    }
    if (getStage(customer.status) !== targetStage) {
        router.patch(`/dashboard/funil-vendas/${customer.id}`, { status: targetStage }, { preserveScroll: true });
    }
}

function confirmConvert(type) {
    if (!convertingCustomer.value) return;
    router.patch(`/dashboard/funil-vendas/${convertingCustomer.value.id}`, { status: 'won', type }, {
        preserveScroll: true,
        onSuccess: () => toast({ title: 'Lead Convertido!', description: `${convertingCustomer.value.nome_fantasia || convertingCustomer.value.name} agora é um cliente oficial.` }),
    });
    convertingCustomer.value = null;
}

const columns = computed(() => stages.map((stage) => {
    const items = props.customers.filter((c) => getStage(c.status) === stage.id);
    return {
        ...stage,
        items,
        totalOneTime: items.reduce((acc, c) => acc + (Number(c.one_time_value) || 0), 0),
        totalMonthly: items.reduce((acc, c) => acc + (Number(c.monthly_value) || 0), 0),
    };
}));
</script>

<template>
    <Head title="Funil de Vendas" />

    <div class="flex h-full flex-1 flex-col space-y-6 p-4 md:p-8 pt-6 bg-background/50">
        <div>
            <h2 class="text-4xl font-bold tracking-tight font-headline text-foreground">Funil de Vendas</h2>
            <p class="text-muted-foreground">Gerencie seus leads e prospectos com valores estimados de venda e mensalidade.</p>
        </div>

        <div class="grid flex-1 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            <div
                v-for="col in columns" :key="col.id"
                class="flex flex-col rounded-xl bg-card border border-border overflow-hidden min-h-[400px]"
                @dragover.prevent
                @drop="(e) => handleDrop(e, col.id)"
            >
                <div class="px-4 py-3 text-left" :class="col.color">
                    <div class="flex justify-between items-center mb-1">
                        <h3 class="font-bold text-xs uppercase tracking-wider text-white">{{ col.title }}</h3>
                        <Badge variant="secondary" class="bg-white/20 text-white border-none h-5 px-1.5 min-w-[20px] justify-center text-[10px]">{{ col.items.length }}</Badge>
                    </div>
                    <div class="flex flex-col gap-0.5 mt-2">
                        <p v-if="col.totalOneTime > 0" class="text-white/90 text-[10px] font-bold flex items-center gap-1 bg-black/10 px-1 rounded w-fit"><Tag class="h-2.5 w-2.5" /> Venda: {{ formatCurrency(col.totalOneTime) }}</p>
                        <p v-if="col.totalMonthly > 0" class="text-white/90 text-[10px] font-bold flex items-center gap-1 bg-black/10 px-1 rounded w-fit"><Repeat class="h-2.5 w-2.5" /> Mensal: {{ formatCurrency(col.totalMonthly) }}</p>
                    </div>
                </div>
                <div class="p-3 overflow-y-auto flex-1 bg-muted/20">
                    <Card
                        v-for="customer in col.items" :key="customer.id"
                        draggable="true"
                        class="mb-3 cursor-grab active:cursor-grabbing bg-card hover:bg-accent/10 border-border transition-colors shadow-sm"
                        @dragstart="(e) => handleDragStart(e, customer)"
                    >
                        <CardContent class="p-3 space-y-2 text-sm">
                            <div class="flex justify-between items-start">
                                <div class="h-1.5 w-10 rounded-full" :class="potentialColor[customer.potential] || 'bg-yellow-500'" />
                                <div class="flex flex-col items-end gap-1">
                                    <div v-if="customer.one_time_value" class="flex items-center gap-1 text-[9px] font-bold text-primary bg-primary/5 px-1 rounded border border-primary/20"><Tag class="h-2 w-2" /> V: {{ formatCurrency(customer.one_time_value) }}</div>
                                    <div v-if="customer.monthly_value" class="flex items-center gap-1 text-[9px] font-bold text-emerald-500 bg-emerald-500/5 px-1 rounded border border-emerald-500/20"><Repeat class="h-2 w-2" /> M: {{ formatCurrency(customer.monthly_value) }}</div>
                                </div>
                            </div>
                            <div>
                                <p class="font-bold text-foreground leading-tight">{{ customer.nome_fantasia || customer.name }}</p>
                                <p v-if="customer.nome_fantasia && customer.nome_fantasia !== customer.name" class="text-[9px] text-muted-foreground uppercase leading-tight mt-1 tracking-tighter line-clamp-1">{{ customer.name }}</p>
                            </div>
                            <div class="text-muted-foreground space-y-1 text-xs pt-1">
                                <div class="flex items-center gap-1.5"><UserIcon class="h-3 w-3" /><span class="truncate">{{ customer.responsible }}</span></div>
                                <div v-if="customer.telefone" class="flex items-center gap-1.5"><Phone class="h-3 w-3" /><span>{{ customer.telefone }}</span></div>
                            </div>
                        </CardContent>
                    </Card>
                    <div v-if="col.items.length === 0" class="h-full flex items-center justify-center border-2 border-dashed border-border/50 rounded-lg p-4">
                        <p class="text-[10px] text-muted-foreground uppercase font-bold text-center">Vazio</p>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <AlertDialog :open="!!convertingCustomer" @update:open="(o) => !o && (convertingCustomer = null)">
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle class="flex items-center gap-2"><CheckCircle2 class="h-5 w-5 text-green-500" /> Parabéns pela Venda!</AlertDialogTitle>
                <div class="text-sm text-muted-foreground space-y-1">
                    <p>Você está convertendo <strong>{{ convertingCustomer?.nome_fantasia || convertingCustomer?.name }}</strong> em cliente.</p>
                    <div class="flex flex-col gap-1 p-2 bg-muted rounded-md mt-2">
                        <div v-if="convertingCustomer?.one_time_value" class="flex justify-between text-xs"><span>Valor de Venda:</span><span class="font-bold text-primary">{{ formatCurrency(convertingCustomer.one_time_value) }}</span></div>
                        <div v-if="convertingCustomer?.monthly_value" class="flex justify-between text-xs"><span>Valor Mensal:</span><span class="font-bold text-emerald-500">{{ formatCurrency(convertingCustomer.monthly_value) }}</span></div>
                    </div>
                </div>
            </AlertDialogHeader>
            <div class="grid grid-cols-2 gap-4 py-6">
                <Button variant="outline" class="h-auto flex-col gap-3 p-6 hover:border-primary hover:bg-primary/5" @click="confirmConvert('one_time')">
                    <Users class="h-8 w-8 text-blue-500" />
                    <div class="text-center"><p class="font-bold">Cliente Avulso</p><p class="text-[10px] text-muted-foreground">Sem mensalidade fixa</p></div>
                </Button>
                <Button variant="outline" class="h-auto flex-col gap-3 p-6 hover:border-primary hover:bg-primary/5" @click="confirmConvert('active_contract')">
                    <FileText class="h-8 w-8 text-purple-500" />
                    <div class="text-center"><p class="font-bold">Contrato</p><p class="text-[10px] text-muted-foreground">Faturamento recorrente</p></div>
                </Button>
            </div>
            <AlertDialogFooter>
                <AlertDialogCancel @click="convertingCustomer = null"><XCircle class="mr-2 h-4 w-4" /> Cancelar</AlertDialogCancel>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
</template>
