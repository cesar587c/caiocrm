
'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { 
  FileText, 
  LayoutDashboard, 
  Users, 
  Calendar, 
  BookUser, 
  BrainCircuit, 
  CheckCircle2,
  BookOpen
} from 'lucide-react';
import Image from 'next/image';
import placeholderData from '@/app/lib/placeholder-images.json';

export default function ManualPage() {
  const getImageUrl = (id: string) => {
    return placeholderData.placeholderImages.find(img => img.id === id)?.imageUrl || '';
  };

  const features = [
    {
      id: 'propostas',
      title: 'Gerador de Propostas e Pedidos',
      icon: FileText,
      description: 'Emissão de documentos blindados com layout Word-Style (Modelo 2).',
      image: 'manual_propostas',
      details: [
        'Numeração sequencial inteligente (#1, #2, #3...).',
        'Alternância entre Proposta Comercial e Pedido de Venda.',
        'Faturamento com lógica de Entrada + Parcelas.',
        'Motor PDF anti-fusão de letras (espaçamento 0.3pt).',
        'Sem sublinhados: estética limpa baseada em negritos.'
      ]
    },
    {
      id: 'dashboard',
      title: 'Dashboard de Gestão Real',
      icon: LayoutDashboard,
      description: 'Monitoramento de faturamento e performance em tempo real.',
      image: 'manual_dashboard',
      details: [
        'Indicadores reais de Vendas Totais e Ticket Médio.',
        'Filtro de período personalizado (calendário flexível).',
        'Gráficos operacionais integrados às O.S. e Pedidos.',
        'Alerta de segurança para backup de dados local.'
      ]
    },
    {
      id: 'crm',
      title: 'Gestão de Clientes e CRM',
      icon: Users,
      description: 'Controle total da carteira de clientes e funil de vendas.',
      image: 'manual_crm',
      details: [
        'Funil de Vendas (Kanban) com arraste e solte.',
        'Consulta automática de CNPJ via BrasilAPI.',
        'Privacidade: Oculte valores financeiros com um clique.',
        'Categorização por segmentos (Ponto, Acesso, Gestão).'
      ]
    },
    {
      id: 'agenda',
      title: 'Agenda e Notificações',
      icon: Calendar,
      description: 'Organização de visitas técnicas e avisos via WhatsApp.',
      image: 'manual_agenda',
      details: [
        'Calendário mensal de visitas e compromissos.',
        'Disparo de lembretes automáticos via WhatsApp.',
        'Sincronização direcionada com Google Agenda.',
        'Popup de avisos matinais ao logar no sistema.'
      ]
    },
    {
      id: 'os',
      title: 'Ordens de Serviço (O.S.)',
      icon: BookUser,
      description: 'Fluxo de trabalho técnico e controle de peças.',
      image: 'manual_os',
      details: [
        'Acompanhamento de status (Aberta, Em andamento, Finalizada).',
        'Histórico detalhado de quem alterou a OS.',
        'Protocolo de justificativa para encerramento.',
        'Tabela de peças e serviços com subtotal real.'
      ]
    },
    {
      id: 'ia',
      title: 'Inteligência Artificial (IA)',
      icon: BrainCircuit,
      description: 'Assistente de vendas Genkit para novas oportunidades.',
      image: 'manual_ia',
      details: [
        'Análise de perfil de cliente e histórico.',
        'Sugestão inteligente de novos produtos e serviços.',
        'Raciocínio lógico da IA exposto para o usuário.',
        'Integração direta com o Dashboard.'
      ]
    }
  ];

  return (
    <div className="flex-1 space-y-6 p-8 pt-6 bg-background/50">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight font-headline flex items-center gap-3">
            <BookOpen className="h-8 w-8 text-primary" />
            Manual de Operações VendasPro
          </h2>
          <p className="text-muted-foreground">Guia completo das funcionalidades blindadas (Protocolo SALVAR).</p>
        </div>
      </div>

      <ScrollArea className="h-[calc(100vh-10rem)]">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pb-10">
          {features.map((feature) => (
            <Card key={feature.id} className="overflow-hidden border-primary/10 shadow-lg group hover:border-primary/30 transition-all">
              <div className="relative h-56 w-full bg-muted">
                <Image 
                  src={getImageUrl(feature.image)} 
                  alt={feature.title} 
                  fill 
                  className="object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                  data-ai-hint={placeholderData.placeholderImages.find(img => img.id === feature.image)?.imageHint}
                />
                <div className="absolute top-4 left-4">
                  <Badge className="bg-primary/90 hover:bg-primary gap-2 h-8 px-3">
                    <feature.icon className="h-4 w-4" />
                    {feature.id.toUpperCase()}
                  </Badge>
                </div>
              </div>
              <CardHeader>
                <CardTitle className="font-headline text-xl">{feature.title}</CardTitle>
                <CardDescription>{feature.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {feature.details.map((detail, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                      <span>{detail}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
