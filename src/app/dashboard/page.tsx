
"use client";

import {
  AlertTriangle,
  Anchor,
  ArrowDown,
  ArrowUp,
  ArrowUpCircle,
  BadgePercent,
  BookUser,
  CalendarCheck,
  CalendarPlus,
  Clock,
  DollarSign,
  Download,
  FileCog,
  Lightbulb,
  Percent,
  PhoneOff,
  ShoppingCart,
  ShieldCheck,
  Split,
  Target,
  Wrench,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
} from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { OpportunitySuggester } from "@/components/features/opportunity-suggester";
import { cn } from "@/lib/utils";
import React, { useMemo } from "react";
import { useSettings } from "@/contexts/SettingsContext";
import { startOfMonth, endOfMonth, isWithinInterval } from "date-fns";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

// Mock Data Zered (Waiting for real data)
const salesKpis = [
  { title: "Vendas Totais", value: "R$ 0", change: 0, icon: DollarSign, tooltip: "Soma de todas as vendas no período." },
  { title: "Ticket Médio", value: "R$ 0", change: 0, icon: ShoppingCart, tooltip: "Valor médio por venda." },
  { title: "Conversão", value: "0%", change: 0, icon: Percent, tooltip: "Percentual de oportunidades que viraram vendas." },
  { title: "Meta vs Realizado", value: "0%", change: 0, icon: Target, tooltip: "Progresso em relação à meta de vendas." },
];

const serviceKpis = [
  { title: "Volume de Chamados", value: "0", change: 0, icon: BookUser, tooltip: "Total de chamados recebidos." },
  { title: "TMA", value: "0m 00s", change: 0, icon: Clock, tooltip: "Tempo médio de atendimento." },
  { title: "SLA (95%)", value: "0%", change: 0, icon: ShieldCheck, tooltip: "Percentual de chamados atendidos dentro do prazo." },
  { title: "Abandono", value: "0%", change: 0, icon: PhoneOff, tooltip: "Percentual de chamadas abandonadas." },
];

const technicalSalesKpis = [
    { title: "Vendas Influenciadas (Téc.)", value: "R$ 0", change: 0, icon: Wrench, tooltip: "Vendas de peças ou serviços geradas a partir de um atendimento técnico." },
    { title: "% Vendas com Interação Téc.", value: "0%", change: 0, icon: FileCog, tooltip: "Percentual do total de vendas que tiveram interação da equipe técnica." },
    { title: "Leads Gerados (Téc.)", value: "0", change: 0, icon: Lightbulb, tooltip: "Novas oportunidades de negócio identificadas e registradas pela equipe técnica." },
    { title: "Upsell/Cross-sell (Téc.)", value: "R$ 0", change: 0, icon: ArrowUpCircle, tooltip: "Valor adicional em vendas gerado por sugestões técnicas durante o atendimento." },
];

const channelData = [
    { name: "Telefone", value: 0, fill: "hsl(var(--chart-1))" },
    { name: "Email", value: 0, fill: "hsl(var(--chart-2))" },
    { name: "Chat", value: 0, fill: "hsl(var(--chart-3))" },
    { name: "Redes Sociais", value: 0, fill: "hsl(var(--chart-4))" },
];

type Kpi = {
  title: string;
  value: string;
  change: number;
  icon: React.ElementType;
  tooltip: string;
  isTMA?: boolean;
  isAbandonment?: boolean;
};

const KpiCard = ({ kpi }: { kpi: Kpi }) => {
  const isPositive = kpi.change >= 0;
  const isGood = (kpi.isTMA || kpi.isAbandonment) ? !isPositive : isPositive;
  const changeColor = kpi.change === 0 ? "text-muted-foreground" : (isGood ? "text-green-500" : "text-destructive");
  const ChangeIcon = isPositive ? ArrowUp : ArrowDown;

  return (
     <Card>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="p-6 cursor-pointer">
              <div className="flex flex-row items-center justify-between space-y-0 pb-2">
                <h3 className="text-sm font-medium tracking-tight">{kpi.title}</h3>
                <kpi.icon className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <div className="text-2xl font-bold">{kpi.value}</div>
                <p className={cn("text-xs flex items-center", changeColor)}>
                  <ChangeIcon className="h-3 w-3 mr-1" />
                  {kpi.change}% em relação ao período anterior
                </p>
              </div>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>{kpi.tooltip}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </Card>
  );
};


export default function DashboardPage() {
  const { appointments, exportAllData } = useSettings();

  const agendaKpis = useMemo(() => {
    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);
    
    const appointmentsThisMonth = appointments.filter(app => {
      const appDate = new Date(app.date);
      return isWithinInterval(appDate, { start: monthStart, end: monthEnd });
    });
    
    const completedThisMonth = appointmentsThisMonth.filter(app => app.status === 'completed');
    
    const total = appointmentsThisMonth.length;
    const completed = completedThisMonth.length;
    const completionRate = total > 0 ? (completed / total) * 100 : 0;
    
    return {
      total,
      completed,
      completionRate,
    };
  }, [appointments]);


  return (
    <div className="flex-1 space-y-6 p-4 pt-6 md:p-8">
      <div className="flex items-center justify-between space-y-2">
        <h1 className="font-headline text-4xl font-bold tracking-tight text-foreground/90">
          Dashboard
        </h1>
      </div>

      <Alert className="bg-amber-500/10 border-amber-500/30 text-amber-500">
        <AlertTriangle className="h-4 w-4 text-amber-500" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 w-full">
            <div>
                <AlertTitle className="font-bold">Lembrete de Segurança</AlertTitle>
                <AlertDescription className="text-xs text-amber-500/80">
                    Seus dados estão salvos <strong>apenas neste computador</strong>. Para não perdê-los ao trocar de máquina ou limpar o navegador, faça um backup regularmente.
                </AlertDescription>
            </div>
            <Button variant="outline" size="sm" className="h-8 gap-2 border-amber-500/30 hover:bg-amber-500/20 text-amber-500" onClick={exportAllData}>
                <Download className="h-3.5 w-3.5" />
                Baixar Backup Agora
            </Button>
        </div>
      </Alert>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className="space-y-4">
            <h2 className="text-xl font-semibold tracking-tight font-headline">KPIs de Vendas</h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {salesKpis.map(kpi => <KpiCard key={kpi.title} kpi={kpi} />)}
            </div>
          </div>
          
          <div className="space-y-4">
            <h2 className="text-xl font-semibold tracking-tight font-headline">KPIs de Atendimento</h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {serviceKpis.map(kpi => <KpiCard key={kpi.title} kpi={{...kpi, isTMA: kpi.title === 'TMA', isAbandonment: kpi.title === 'Abandono'}} />)}
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-xl font-semibold tracking-tight font-headline">KPIs de Suporte Técnico-Comercial</h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {technicalSalesKpis.map(kpi => <KpiCard key={kpi.title} kpi={kpi} />)}
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
             <Card>
                <CardHeader>
                    <CardTitle className="font-headline text-lg">Indicadores da Agenda</CardTitle>
                    <CardDescription>Performance dos agendamentos no mês atual.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="flex items-center">
                        <CalendarPlus className="h-6 w-6 text-primary mr-4"/>
                        <div className="flex-1">
                            <p className="text-sm text-muted-foreground">Agendamentos Realizados</p>
                            <p className="text-2xl font-bold">{agendaKpis.total}</p>
                        </div>
                    </div>
                    <div className="flex items-center">
                        <CalendarCheck className="h-6 w-6 text-green-500 mr-4"/>
                        <div className="flex-1">
                            <div className="flex justify-between items-baseline">
                                <p className="text-sm text-muted-foreground">Taxa de Conclusão</p>
                                <p className="text-lg font-semibold text-green-400">{agendaKpis.completionRate.toFixed(1)}%</p>
                            </div>
                             <Progress value={agendaKpis.completionRate} className="h-2 mt-1 [&>div]:bg-green-500" />
                            <p className="text-xs text-muted-foreground mt-1">{agendaKpis.completed} de {agendaKpis.total} concluídos</p>
                        </div>
                    </div>
                </CardContent>
             </Card>

            <Card className="flex flex-col">
              <CardHeader>
                <CardTitle className="font-headline text-lg">Ranking de Equipes</CardTitle>
                <CardDescription>Performance de vendas por equipe.</CardDescription>
              </CardHeader>
              <CardContent className="flex-1 flex items-center justify-center">
                 <p className="text-sm text-muted-foreground italic">Nenhum dado de vendas registrado.</p>
              </CardContent>
            </Card>

            <Card className="flex flex-col col-span-1 lg:col-span-2">
              <CardHeader>
                <CardTitle className="font-headline text-lg">Análise por Canal de Atendimento</CardTitle>
                <CardDescription>Distribuição do volume de atendimentos por canal.</CardDescription>
              </CardHeader>
              <CardContent className="flex-1 pb-4">
                 <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={channelData} >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))"/>
                        <XAxis dataKey="name" tickLine={false} axisLine={false} />
                        <YAxis hide/>
                        <RechartsTooltip
                          cursor={{ fill: 'hsl(var(--muted))' }}
                          content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            return (
                              <div className="rounded-lg border bg-background p-2 shadow-sm">
                                 <p className="font-bold">{`${payload[0].payload.name}: ${payload[0].value}%`}</p>
                              </div>
                            );
                          }
                          return null;
                        }}
                        />
                        <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                          <LabelList dataKey="value" position="top" offset={4} className="fill-foreground" fontSize={12} formatter={(value: number) => `${value}%`} />
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

          </div>
        </div>

        <div className="space-y-6 lg:col-span-1">
          <OpportunitySuggester />
        </div>

      </div>
    </div>
  );
}
