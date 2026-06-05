
"use client";

import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  ArrowUpCircle,
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
  Target,
  Wrench,
  Calendar as CalendarIcon,
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
import React, { useMemo, useState } from "react";
import { useSettings } from "@/contexts/SettingsContext";
import { 
  startOfMonth, 
  endOfMonth, 
  isWithinInterval, 
  parseISO, 
  subDays, 
  startOfYear, 
  format,
  startOfDay,
  endOfDay
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { DateRange } from "react-day-picker";

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
     <Card className="hover:border-primary/50 transition-colors">
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
  const { appointments, exportAllData, proposals, serviceOrders } = useSettings();
  const [dateFilter, setDateFilter] = useState<string>("month");
  const [customRange, setCustomRange] = useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });

  const dateRange = useMemo(() => {
    const now = new Date();
    switch (dateFilter) {
      case "month":
        return { start: startOfMonth(now), end: endOfMonth(now) };
      case "30days":
        return { start: startOfDay(subDays(now, 30)), end: endOfDay(now) };
      case "year":
        return { start: startOfYear(now), end: endOfMonth(now) };
      case "custom":
        return { 
          start: customRange?.from ? startOfDay(customRange.from) : startOfMonth(now), 
          end: customRange?.to ? endOfDay(customRange.to) : endOfMonth(now) 
        };
      default:
        return { start: startOfMonth(now), end: endOfMonth(now) };
    }
  }, [dateFilter, customRange]);

  // Cálculos de Vendas Reais (Pedidos)
  const salesStats = useMemo(() => {
    const pedidos = proposals.filter(p => 
      p.documentType === 'pedido' && 
      isWithinInterval(parseISO(p.proposalDate), dateRange)
    );
    
    const propostasTotais = proposals.filter(p => 
      isWithinInterval(parseISO(p.proposalDate), dateRange)
    ).length;

    const faturamentoTotal = pedidos.reduce((acc, curr) => acc + curr.totalOneTime, 0);
    const ticketMedio = pedidos.length > 0 ? faturamentoTotal / pedidos.length : 0;
    const conversao = propostasTotais > 0 ? (pedidos.length / propostasTotais) * 100 : 0;
    
    const metaMensal = 50000;
    const metaAtingida = (faturamentoTotal / metaMensal) * 100;

    return [
      { 
        title: "Vendas Totais", 
        value: faturamentoTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), 
        change: 0, 
        icon: DollarSign, 
        tooltip: "Soma de todos os Pedidos de Venda no período selecionado." 
      },
      { 
        title: "Ticket Médio", 
        value: ticketMedio.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), 
        change: 0, 
        icon: ShoppingCart, 
        tooltip: "Valor médio por cada pedido fechado." 
      },
      { 
        title: "Conversão", 
        value: `${conversao.toFixed(1)}%`, 
        change: 0, 
        icon: Percent, 
        tooltip: "Procentagem de Propostas que viraram Pedidos." 
      },
      { 
        title: "Meta vs Realizado", 
        value: `${Math.min(metaAtingida, 100).toFixed(1)}%`, 
        change: 0, 
        icon: Target, 
        tooltip: "Progresso em relação à meta de faturamento definida." 
      },
    ];
  }, [proposals, dateRange]);

  const serviceStats = useMemo(() => {
    const chamados = serviceOrders.filter(os => 
      isWithinInterval(parseISO(os.openingDate), dateRange)
    );

    return [
      { 
        title: "Volume de Chamados", 
        value: chamados.length.toString(), 
        change: 0, 
        icon: BookUser, 
        tooltip: "Total de Ordens de Serviço abertas no período." 
      },
      { 
        title: "TMA", 
        value: "0m 00s", 
        change: 0, 
        icon: Clock, 
        tooltip: "Tempo médio de atendimento (em implementação)." 
      },
      { 
        title: "SLA (95%)", 
        value: "100%", 
        change: 0, 
        icon: ShieldCheck, 
        tooltip: "Percentual de chamados atendidos dentro do prazo." 
      },
      { 
        title: "Abandono", 
        value: "0%", 
        change: 0, 
        icon: PhoneOff, 
        tooltip: "Percentual de solicitações não atendidas." 
      },
    ];
  }, [serviceOrders, dateRange]);

  const agendaKpis = useMemo(() => {
    const appointmentsInPeriod = appointments.filter(app => {
      const appDate = parseISO(app.date);
      return isWithinInterval(appDate, dateRange);
    });
    
    const completedInPeriod = appointmentsInPeriod.filter(app => app.status === 'completed');
    
    const total = appointmentsInPeriod.length;
    const completed = completedInPeriod.length;
    const completionRate = total > 0 ? (completed / total) * 100 : 0;
    
    return { total, completed, completionRate };
  }, [appointments, dateRange]);

  return (
    <div className="flex-1 space-y-6 p-4 pt-6 md:p-8 bg-background/50">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-headline text-4xl font-bold tracking-tight text-foreground/90">
            Dashboard
          </h1>
          <p className="text-muted-foreground">Monitoramento em tempo real dos Pedidos e OS.</p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            {dateFilter === 'custom' && (
                <Popover>
                    <PopoverTrigger asChild>
                        <Button variant="outline" className="h-11 gap-2 bg-card border-primary/20 hover:border-primary/50">
                            <CalendarIcon className="h-4 w-4 text-primary" />
                            {customRange?.from ? (
                                customRange.to ? (
                                    <>
                                        {format(customRange.from, "dd/MM/yy")} - {format(customRange.to, "dd/MM/yy")}
                                    </>
                                ) : (
                                    format(customRange.from, "dd/MM/yy")
                                )
                            ) : (
                                <span>Selecionar Período</span>
                            )}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="end">
                        <Calendar
                            initialFocus
                            mode="range"
                            defaultMonth={customRange?.from}
                            selected={customRange}
                            onSelect={setCustomRange}
                            numberOfMonths={2}
                            locale={ptBR}
                        />
                    </PopoverContent>
                </Popover>
            )}

            <div className="flex items-center gap-3 bg-card p-1.5 rounded-lg border shadow-sm h-11">
                <CalendarIcon className="h-4 w-4 text-primary ml-2" />
                <Select value={dateFilter} onValueChange={setDateFilter}>
                    <SelectTrigger className="w-[180px] border-none shadow-none focus:ring-0 h-8">
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
      </div>

      <Alert className="bg-amber-500/10 border-amber-500/30 text-amber-500">
        <AlertTriangle className="h-4 w-4 text-amber-500" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 w-full">
            <div>
                <AlertTitle className="font-bold">Lembrete de Segurança (SALVAR)</AlertTitle>
                <AlertDescription className="text-xs text-amber-500/80">
                    Seus dados estão salvos <strong>apenas neste computador</strong>. Faça um backup regularmente para evitar perdas.
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
            <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                <h2 className="text-xl font-semibold tracking-tight font-headline">Indicadores de Vendas (Pedidos)</h2>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {salesStats.map(kpi => <KpiCard key={kpi.title} kpi={kpi} />)}
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-blue-500" />
                <h2 className="text-xl font-semibold tracking-tight font-headline">Indicadores de Atendimento</h2>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {serviceStats.map(kpi => <KpiCard key={kpi.title} kpi={{...kpi, isTMA: kpi.title === 'TMA', isAbandonment: kpi.title === 'Abandono'}} />)}
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
             <Card className="border-primary/20">
                <CardHeader>
                    <CardTitle className="font-headline text-lg flex items-center gap-2">
                        <CalendarPlus className="h-5 w-5 text-primary"/>
                        Performance da Agenda
                    </CardTitle>
                    <CardDescription>Visitas e retornos no período selecionado.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-muted-foreground">Agendamentos Totais</p>
                            <p className="text-3xl font-bold">{agendaKpis.total}</p>
                        </div>
                        <div className="text-right">
                             <p className="text-sm text-muted-foreground">Concluídos</p>
                             <p className="text-3xl font-bold text-green-500">{agendaKpis.completed}</p>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <div className="flex justify-between items-baseline text-xs font-bold uppercase tracking-wider">
                            <span className="text-muted-foreground">Taxa de Sucesso</span>
                            <span className="text-green-400">{agendaKpis.completionRate.toFixed(1)}%</span>
                        </div>
                        <Progress value={agendaKpis.completionRate} className="h-2 [&>div]:bg-green-500" />
                    </div>
                </CardContent>
             </Card>

            <Card className="flex flex-col border-dashed">
              <CardHeader>
                <CardTitle className="font-headline text-lg flex items-center gap-2">
                    <ArrowUpCircle className="h-5 w-5 text-orange-500" />
                    Ranking por Técnico
                </CardTitle>
                <CardDescription>Pedidos influenciados pela equipe técnica.</CardDescription>
              </CardHeader>
              <CardContent className="flex-1 flex items-center justify-center">
                 <p className="text-sm text-muted-foreground italic text-center px-8">Dados de influência técnica em processamento...</p>
              </CardContent>
            </Card>

            <Card className="flex flex-col col-span-1 lg:col-span-2">
              <CardHeader>
                <CardTitle className="font-headline text-lg">Volume Operacional</CardTitle>
                <CardDescription>Comparativo de movimentação entre Documentos e OS.</CardDescription>
              </CardHeader>
              <CardContent className="flex-1 pb-4">
                 <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={[
                        { name: "Pedidos", valor: proposals.filter(p => p.documentType === 'pedido' && isWithinInterval(parseISO(p.proposalDate), dateRange)).length, fill: "hsl(var(--primary))" },
                        { name: "Propostas", valor: proposals.filter(p => p.documentType === 'proposta' && isWithinInterval(parseISO(p.proposalDate), dateRange)).length, fill: "hsl(var(--chart-2))" },
                        { name: "O.S.", valor: serviceOrders.filter(o => isWithinInterval(parseISO(o.openingDate), dateRange)).length, fill: "hsl(var(--chart-4))" }
                    ]} >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))"/>
                        <XAxis dataKey="name" tickLine={false} axisLine={false} />
                        <YAxis hide/>
                        <RechartsTooltip cursor={{ fill: 'transparent' }} />
                        <Bar dataKey="valor" radius={[4, 4, 0, 0]}>
                          <LabelList dataKey="valor" position="top" offset={4} className="fill-foreground font-bold" fontSize={12} />
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
