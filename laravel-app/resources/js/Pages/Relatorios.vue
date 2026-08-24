<script setup>
import { computed } from 'vue';
import { Head } from '@inertiajs/vue3';
import { Users, FileText, TrendingUp, Activity, CheckCircle2, UserX, Layers, PieChart as PieChartIcon, UserCheck } from 'lucide-vue-next';
import AppLayout from '@/Layouts/AppLayout.vue';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/Components/ui/card';
import { Badge } from '@/Components/ui/badge';
import SimpleBarChart from '@/Components/charts/SimpleBarChart.vue';
import SimpleDonutChart from '@/Components/charts/SimpleDonutChart.vue';

defineOptions({ layout: AppLayout });

const props = defineProps({
    stats: Object,
    servicesData: Array,
});

const chartColors = ['#8b6fd6', '#4fb0c6', '#e06fa0', '#7bd47b', '#e0b46f'];
const serviceLabels = computed(() => props.servicesData.map((s) => s.name));
const serviceCounts = computed(() => props.servicesData.map((s) => s.count));

const typeLabels = ['Contrato', 'Serviço Avulso'];
const typeValues = computed(() => [props.stats.contracts, props.stats.oneTime]);
</script>

<template>
    <Head title="Relatórios" />

    <div class="flex-1 space-y-6 p-8 pt-6">
        <div>
            <h2 class="text-3xl font-bold tracking-tight font-headline">Dashboards e Relatórios</h2>
            <p class="text-muted-foreground">Visão geral da sua carteira de clientes e desempenho.</p>
        </div>

        <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
                <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle class="text-sm font-medium">Total de Clientes</CardTitle>
                    <Users class="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent><div class="text-2xl font-bold">{{ stats.total }}</div><p class="text-xs text-muted-foreground">Registrados no sistema</p></CardContent>
            </Card>
            <Card>
                <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle class="text-sm font-medium">Contratos</CardTitle>
                    <FileText class="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent><div class="text-2xl font-bold">{{ stats.contracts }}</div><p class="text-xs text-muted-foreground">Faturamento recorrente</p></CardContent>
            </Card>
            <Card>
                <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle class="text-sm font-medium">Leads Qualificados</CardTitle>
                    <TrendingUp class="h-4 w-4 text-green-500" />
                </CardHeader>
                <CardContent><div class="text-2xl font-bold">{{ stats.leads }}</div><p class="text-xs text-muted-foreground">Em prospecção</p></CardContent>
            </Card>
            <Card>
                <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle class="text-sm font-medium">Serviços Avulsos</CardTitle>
                    <Activity class="h-4 w-4 text-orange-500" />
                </CardHeader>
                <CardContent><div class="text-2xl font-bold">{{ stats.oneTime }}</div><p class="text-xs text-muted-foreground">Clientes ocasionais</p></CardContent>
            </Card>
        </div>

        <div class="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
            <Card class="col-span-4">
                <CardHeader>
                    <CardTitle class="flex items-center gap-2"><Layers class="h-5 w-5" /> Distribuição por Tipo de Serviço</CardTitle>
                    <CardDescription>Quantidade de clientes atendidos por cada categoria.</CardDescription>
                </CardHeader>
                <CardContent class="h-[350px]">
                    <SimpleBarChart :labels="serviceLabels" :values="serviceCounts" :colors="chartColors" horizontal />
                </CardContent>
            </Card>

            <Card class="col-span-3">
                <CardHeader>
                    <CardTitle class="flex items-center gap-2"><PieChartIcon class="h-5 w-5" /> Modalidade Contratual</CardTitle>
                    <CardDescription>Proporção entre contratos e avulsos.</CardDescription>
                </CardHeader>
                <CardContent class="flex flex-col items-center">
                    <div class="h-[250px] w-full"><SimpleDonutChart :labels="typeLabels" :values="typeValues" :colors="['#8b6fd6', '#4b5563']" /></div>
                    <div class="mt-4 w-full space-y-2">
                        <div class="flex items-center justify-between text-sm"><span class="text-muted-foreground font-medium">Contratos</span><span class="font-bold">{{ stats.contracts }}</span></div>
                        <div class="flex items-center justify-between text-sm"><span class="text-muted-foreground font-medium">Serviços Avulsos</span><span class="font-bold">{{ stats.oneTime }}</span></div>
                    </div>
                </CardContent>
            </Card>
        </div>

        <div class="grid gap-6 md:grid-cols-2">
            <Card>
                <CardHeader><CardTitle class="text-lg">Resumo por Categoria</CardTitle></CardHeader>
                <CardContent>
                    <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        <div v-for="cat in servicesData" :key="cat.id" class="flex flex-col gap-1 p-3 rounded-lg border bg-muted/20">
                            <span class="text-xs text-muted-foreground font-medium uppercase">{{ cat.name }}</span>
                            <span class="text-2xl font-bold">{{ cat.count }}</span>
                            <Badge variant="outline" class="w-fit text-[10px] py-0">Clientes</Badge>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader><CardTitle class="flex items-center gap-2"><UserCheck class="h-5 w-5" /> Status da Carteira</CardTitle></CardHeader>
                <CardContent class="space-y-6">
                    <div class="flex items-center justify-between border-b pb-4">
                        <div class="flex items-center gap-3">
                            <div class="flex h-10 w-10 items-center justify-center rounded-full bg-green-500/10"><CheckCircle2 class="h-5 w-5 text-green-500" /></div>
                            <div><p class="text-sm font-medium">Clientes Ativos</p><p class="text-xs text-muted-foreground">Já tiveram interação comercial</p></div>
                        </div>
                        <div class="text-right font-bold text-xl">{{ stats.active }}</div>
                    </div>
                    <div class="flex items-center justify-between border-b pb-4">
                        <div class="flex items-center gap-3">
                            <div class="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500/10"><TrendingUp class="h-5 w-5 text-blue-500" /></div>
                            <div><p class="text-sm font-medium">Leads</p><p class="text-xs text-muted-foreground">Oportunidades em aberto</p></div>
                        </div>
                        <div class="text-right font-bold text-xl">{{ stats.leads }}</div>
                    </div>
                    <div class="flex items-center justify-between">
                        <div class="flex items-center gap-3">
                            <div class="flex h-10 w-10 items-center justify-center rounded-full bg-muted"><UserX class="h-5 w-5 text-muted-foreground" /></div>
                            <div><p class="text-sm font-medium">Inativos / Descartados</p><p class="text-xs text-muted-foreground">Fora da carteira atual</p></div>
                        </div>
                        <div class="text-right font-bold text-xl">{{ stats.inactive }}</div>
                    </div>
                </CardContent>
            </Card>
        </div>
    </div>
</template>
