<script setup>
import { Head } from '@inertiajs/vue3';
import { BookOpen, FileText, LayoutDashboard, Users, Calendar, BookUser, BrainCircuit, CheckCircle2 } from 'lucide-vue-next';
import AppLayout from '@/Layouts/AppLayout.vue';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/Components/ui/card';
import { Badge } from '@/Components/ui/badge';
import { ScrollArea } from '@/Components/ui/scroll-area';

defineOptions({ layout: AppLayout });

const features = [
    {
        id: 'propostas', title: 'Gerador de Propostas e Pedidos', icon: FileText,
        description: 'Emissão de documentos blindados com layout Word-Style (Modelo 2).',
        image: 'https://picsum.photos/seed/prop1/800/450',
        details: [
            'Numeração sequencial inteligente (#1, #2, #3...).',
            'Alternância entre Proposta Comercial e Pedido de Venda.',
            'Faturamento com lógica de Entrada + Parcelas.',
            'Motor PDF anti-fusão de letras (espaçamento 0.3pt).',
            'Sem sublinhados: estética limpa baseada em negritos.',
        ],
    },
    {
        id: 'dashboard', title: 'Dashboard de Gestão Real', icon: LayoutDashboard,
        description: 'Monitoramento de faturamento e performance em tempo real.',
        image: 'https://picsum.photos/seed/dash1/800/450',
        details: [
            'Indicadores reais de Vendas Totais e Ticket Médio.',
            'Filtro de período personalizado (calendário flexível).',
            'Gráficos operacionais integrados às O.S. e Pedidos.',
            'Alerta de segurança para backup de dados.',
        ],
    },
    {
        id: 'crm', title: 'Gestão de Clientes e CRM', icon: Users,
        description: 'Controle total da carteira de clientes e funil de vendas.',
        image: 'https://picsum.photos/seed/crm1/800/450',
        details: [
            'Funil de Vendas (Kanban) com arraste e solte.',
            'Consulta automática de CNPJ via BrasilAPI.',
            'Privacidade: Oculte valores financeiros com um clique.',
            'Categorização por segmentos (Ponto, Acesso, Gestão).',
        ],
    },
    {
        id: 'agenda', title: 'Agenda e Notificações', icon: Calendar,
        description: 'Organização de visitas técnicas e avisos via WhatsApp.',
        image: 'https://picsum.photos/seed/cal1/800/450',
        details: [
            'Calendário mensal de visitas e compromissos.',
            'Disparo de lembretes automáticos via WhatsApp.',
            'Sincronização direcionada com Google Agenda.',
            'Popup de avisos matinais ao logar no sistema.',
        ],
    },
    {
        id: 'os', title: 'Ordens de Serviço (O.S.)', icon: BookUser,
        description: 'Fluxo de trabalho técnico e controle de peças.',
        image: 'https://picsum.photos/seed/os1/800/450',
        details: [
            'Acompanhamento de status (Aberta, Em andamento, Finalizada).',
            'Histórico detalhado de quem alterou a OS.',
            'Protocolo de justificativa para encerramento.',
            'Tabela de peças e serviços com subtotal real.',
        ],
    },
    {
        id: 'ia', title: 'Inteligência Artificial (IA)', icon: BrainCircuit,
        description: 'Assistente de vendas para sugestão de novas oportunidades.',
        image: 'https://picsum.photos/seed/ai1/800/450',
        details: [
            'Análise de perfil de cliente e histórico.',
            'Sugestão inteligente de novos produtos e serviços.',
            'Raciocínio lógico da IA exposto para o usuário.',
            'Integração direta com o Dashboard.',
        ],
    },
];
</script>

<template>
    <Head title="Manual do Usuário" />

    <div class="flex-1 space-y-6 p-4 md:p-8 pt-6 bg-background/50">
        <div class="flex items-center justify-between">
            <div>
                <h2 class="text-3xl font-bold tracking-tight font-headline flex items-center gap-3">
                    <BookOpen class="h-8 w-8 text-primary" /> Manual de Operações VendasPro
                </h2>
                <p class="text-muted-foreground">Guia completo das funcionalidades do sistema.</p>
            </div>
        </div>

        <ScrollArea class="h-[calc(100vh-10rem)]">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-8 pb-10">
                <Card v-for="feature in features" :key="feature.id" class="overflow-hidden border-primary/10 shadow-lg group hover:border-primary/30 transition-all">
                    <div class="relative h-56 w-full bg-muted">
                        <img :src="feature.image" :alt="feature.title" class="absolute inset-0 h-full w-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                        <div class="absolute top-4 left-4">
                            <Badge class="bg-primary/90 hover:bg-primary gap-2 h-8 px-3">
                                <component :is="feature.icon" class="h-4 w-4" />
                                {{ feature.id.toUpperCase() }}
                            </Badge>
                        </div>
                    </div>
                    <CardHeader>
                        <CardTitle class="font-headline text-xl">{{ feature.title }}</CardTitle>
                        <CardDescription>{{ feature.description }}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ul class="space-y-2">
                            <li v-for="(detail, idx) in feature.details" :key="idx" class="flex items-start gap-2 text-sm text-muted-foreground">
                                <CheckCircle2 class="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                                <span>{{ detail }}</span>
                            </li>
                        </ul>
                    </CardContent>
                </Card>
            </div>
        </ScrollArea>
    </div>
</template>
