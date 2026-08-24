<script setup>
import { computed, ref } from 'vue';
import { Head, router } from '@inertiajs/vue3';
import {
    ArrowUpCircle, CalendarPlus, Download, AlertTriangle, DollarSign, ShoppingCart,
    Percent, Target, BookUser, Clock, ShieldCheck, PhoneOff,
} from 'lucide-vue-next';
import AppLayout from '@/Layouts/AppLayout.vue';
import { Alert, AlertDescription, AlertTitle } from '@/Components/ui/alert';
import { Button } from '@/Components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/Components/ui/card';
import { Progress } from '@/Components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/Components/ui/select';
import { Input } from '@/Components/ui/input';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/Components/ui/tooltip';
import SimpleBarChart from '@/Components/charts/SimpleBarChart.vue';
import OpportunitySuggester from '@/Components/features/OpportunitySuggester.vue';
import { formatCurrency } from '@/lib/utils';

defineOptions({ layout: AppLayout });

const props = defineProps({
    filter: String,
    range: Object,
    salesStats: Object,
    serviceStats: Object,
    agendaStats: Object,
    volumeChart: Object,
});

const from = ref(props.range.from);
const to = ref(props.range.to);

function onFilterChange(value) {
    router.get('/dashboard', { filter: value, from: from.value, to: to.value }, { preserveState: true });
}

function applyCustomRange() {
    router.get('/dashboard', { filter: 'custom', from: from.value, to: to.value }, { preserveState: true });
}

function downloadBackup() {
    window.open('/dashboard/configuracoes/exportar', '_blank');
}

const salesKpis = computed(() => ([
    { title: 'Vendas Totais', value: formatCurrency(props.salesStats.totalSales), icon: DollarSign, tooltip: 'Soma de todos os Pedidos de Venda no período selecionado.' },
    { title: 'Ticket Médio', value: formatCurrency(props.salesStats.averageTicket), icon: ShoppingCart, tooltip: 'Valor médio por cada pedido fechado.' },
    { title: 'Conversão', value: `${props.salesStats.conversion}%`, icon: Percent, tooltip: 'Percentagem de Propostas que viraram Pedidos.' },
    { title: 'Meta vs Realizado', value: `${props.salesStats.goalProgress}%`, icon: Target, tooltip: 'Progresso em relação à meta de faturamento definida.' },
]));

const serviceKpis = computed(() => ([
    { title: 'Volume de Chamados', value: String(props.serviceStats.volume), icon: BookUser, tooltip: 'Total de Ordens de Serviço abertas no período.' },
    { title: 'TMA', value: '0m 00s', icon: Clock, tooltip: 'Tempo médio de atendimento (em implementação).' },
    { title: 'SLA (95%)', value: '100%', icon: ShieldCheck, tooltip: 'Percentual de chamados atendidos dentro do prazo.' },
    { title: 'Abandono', value: '0%', icon: PhoneOff, tooltip: 'Percentual de solicitações não atendidas.' },
]));

const chartLabels = ['Pedidos', 'Propostas', 'O.S.'];
const chartValues = computed(() => [props.volumeChart.pedidos, props.volumeChart.propostas, props.volumeChart.os]);
const chartColors = ['#8b6fd6', '#4fb0c6', '#7bd47b'];
</script>

<template>
    <Head title="Dashboard" />

    <div class="flex-1 space-y-6 p-4 pt-6 md:p-8 bg-background/50">
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
                <h1 class="font-headline text-4xl font-bold tracking-tight text-foreground/90">Dashboard</h1>
                <p class="text-muted-foreground">Monitoramento em tempo real dos Pedidos e OS.</p>
            </div>

            <div class="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                <template v-if="filter === 'custom'">
                    <Input type="date" v-model="from" class="w-40 h-10" @change="applyCustomRange" />
                    <Input type="date" v-model="to" class="w-40 h-10" @change="applyCustomRange" />
                </template>
                <Select :model-value="filter" @update:modelValue="onFilterChange">
                    <SelectTrigger class="w-[180px] h-10 bg-card">
                        <SelectValue placeholder="Período" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="month">Este Mês</SelectItem>
                        <SelectItem value="30days">Últimos 30 Dias</SelectItem>
                        <SelectItem value="year">Este Ano</SelectItem>
                        <SelectItem value="custom">Personalizado</SelectItem>
                    </SelectContent>
                </Select>
            </div>
        </div>

        <Alert class="bg-amber-500/10 border-amber-500/30 text-amber-500">
            <AlertTriangle class="h-4 w-4 text-amber-500" />
            <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 w-full">
                <div>
                    <AlertTitle class="font-bold">Lembrete de Segurança (SALVAR)</AlertTitle>
                    <AlertDescription class="text-xs text-amber-500/80">
                        Seus dados já ficam salvos no banco de dados do servidor. Ainda assim, faça backups regulares.
                    </AlertDescription>
                </div>
                <Button variant="outline" size="sm" class="h-8 gap-2 border-amber-500/30 hover:bg-amber-500/20 text-amber-500" @click="downloadBackup">
                    <Download class="h-3.5 w-3.5" /> Baixar Backup Agora
                </Button>
            </div>
        </Alert>

        <div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div class="space-y-6 lg:col-span-2">
                <div class="space-y-4">
                    <div class="flex items-center gap-2">
                        <div class="h-2 w-2 rounded-full bg-primary animate-pulse" />
                        <h2 class="text-xl font-semibold tracking-tight font-headline">Indicadores de Vendas (Pedidos)</h2>
                    </div>
                    <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                        <TooltipProvider v-for="kpi in salesKpis" :key="kpi.title">
                            <Tooltip>
                                <TooltipTrigger as-child>
                                    <Card class="hover:border-primary/50 transition-colors cursor-pointer">
                                        <CardContent class="p-6">
                                            <div class="flex flex-row items-center justify-between pb-2">
                                                <h3 class="text-sm font-medium">{{ kpi.title }}</h3>
                                                <component :is="kpi.icon" class="h-4 w-4 text-muted-foreground" />
                                            </div>
                                            <div class="text-2xl font-bold">{{ kpi.value }}</div>
                                        </CardContent>
                                    </Card>
                                </TooltipTrigger>
                                <TooltipContent><p>{{ kpi.tooltip }}</p></TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    </div>
                </div>

                <div class="space-y-4">
                    <div class="flex items-center gap-2">
                        <div class="h-2 w-2 rounded-full bg-blue-500" />
                        <h2 class="text-xl font-semibold tracking-tight font-headline">Indicadores de Atendimento</h2>
                    </div>
                    <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                        <TooltipProvider v-for="kpi in serviceKpis" :key="kpi.title">
                            <Tooltip>
                                <TooltipTrigger as-child>
                                    <Card class="hover:border-primary/50 transition-colors cursor-pointer">
                                        <CardContent class="p-6">
                                            <div class="flex flex-row items-center justify-between pb-2">
                                                <h3 class="text-sm font-medium">{{ kpi.title }}</h3>
                                                <component :is="kpi.icon" class="h-4 w-4 text-muted-foreground" />
                                            </div>
                                            <div class="text-2xl font-bold">{{ kpi.value }}</div>
                                        </CardContent>
                                    </Card>
                                </TooltipTrigger>
                                <TooltipContent><p>{{ kpi.tooltip }}</p></TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    </div>
                </div>

                <div class="grid gap-6 lg:grid-cols-2">
                    <Card class="border-primary/20">
                        <CardHeader>
                            <CardTitle class="font-headline text-lg flex items-center gap-2">
                                <CalendarPlus class="h-5 w-5 text-primary" /> Performance da Agenda
                            </CardTitle>
                            <CardDescription>Visitas e retornos no período selecionado.</CardDescription>
                        </CardHeader>
                        <CardContent class="space-y-6">
                            <div class="flex items-center justify-between">
                                <div>
                                    <p class="text-sm text-muted-foreground">Agendamentos Totais</p>
                                    <p class="text-3xl font-bold">{{ agendaStats.total }}</p>
                                </div>
                                <div class="text-right">
                                    <p class="text-sm text-muted-foreground">Concluídos</p>
                                    <p class="text-3xl font-bold text-green-500">{{ agendaStats.completed }}</p>
                                </div>
                            </div>
                            <div class="space-y-2">
                                <div class="flex justify-between items-baseline text-xs font-bold uppercase tracking-wider">
                                    <span class="text-muted-foreground">Taxa de Sucesso</span>
                                    <span class="text-green-400">{{ agendaStats.completionRate }}%</span>
                                </div>
                                <Progress :model-value="agendaStats.completionRate" class="h-2 [&>div]:bg-green-500" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card class="flex flex-col border-dashed">
                        <CardHeader>
                            <CardTitle class="font-headline text-lg flex items-center gap-2">
                                <ArrowUpCircle class="h-5 w-5 text-orange-500" /> Ranking por Técnico
                            </CardTitle>
                            <CardDescription>Pedidos influenciados pela equipe técnica.</CardDescription>
                        </CardHeader>
                        <CardContent class="flex-1 flex items-center justify-center">
                            <p class="text-sm text-muted-foreground italic text-center px-8">Dados de influência técnica em processamento...</p>
                        </CardContent>
                    </Card>

                    <Card class="flex flex-col col-span-1 lg:col-span-2">
                        <CardHeader>
                            <CardTitle class="font-headline text-lg">Volume Operacional</CardTitle>
                            <CardDescription>Comparativo de movimentação entre Documentos e OS.</CardDescription>
                        </CardHeader>
                        <CardContent class="flex-1 pb-4 h-[300px]">
                            <SimpleBarChart :labels="chartLabels" :values="chartValues" :colors="chartColors" />
                        </CardContent>
                    </Card>
                </div>
            </div>

            <div class="space-y-6 lg:col-span-1">
                <OpportunitySuggester />
            </div>
        </div>
    </div>
</template>
