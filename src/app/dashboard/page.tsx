
"use client";

import {
  ArrowDown,
  ArrowUp,
  BookUser,
  Clock,
  Crown,
  DollarSign,
  Percent,
  PhoneOff,
  ShoppingCart,
  ShieldCheck,
  Target,
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { OpportunitySuggester } from "@/components/features/opportunity-suggester";
import { cn } from "@/lib/utils";
import React from "react";

// Mock Data
const salesKpis = [
  { title: "Vendas Totais", value: "R$ 1.2M", change: 12.5, icon: DollarSign, tooltip: "Soma de todas as vendas no período." },
  { title: "Ticket Médio", value: "R$ 4.5k", change: 2.1, icon: ShoppingCart, tooltip: "Valor médio por venda." },
  { title: "Conversão", value: "25.4%", change: -1.8, icon: Percent, tooltip: "Percentual de oportunidades que viraram vendas." },
  { title: "Meta vs Realizado", value: "105%", change: 5, icon: Target, tooltip: "Progresso em relação à meta de vendas." },
];

const serviceKpis = [
  { title: "Volume de Chamados", value: "8,921", change: 5.2, icon: BookUser, tooltip: "Total de chamados recebidos." },
  { title: "TMA", value: "4m 32s", change: -3.5, icon: Clock, tooltip: "Tempo médio de atendimento. Variação negativa é positiva." },
  { title: "SLA (95%)", value: "98.2%", change: 1.2, icon: ShieldCheck, tooltip: "Percentual de chamados atendidos dentro do prazo." },
  { title: "Abandono", value: "3.1%", change: -0.5, icon: PhoneOff, tooltip: "Percentual de chamadas abandonadas. Variação negativa é positiva." },
];

const funnelData = [
  { name: "Visitantes", value: 10000, fill: "hsl(var(--chart-5))" },
  { name: "Leads", value: 7500, fill: "hsl(var(--chart-4))" },
  { name: "Oportunidades", value: 3000, fill: "hsl(var(--chart-3))" },
  { name: "Negociações", value: 1500, fill: "hsl(var(--chart-2))" },
  { name: "Vendas", value: 750, fill: "hsl(var(--chart-1))" },
].reverse(); // Reverse for top-to-bottom display in vertical bar chart

const teamRankingData = [
  { rank: 1, team: "Equipe Alpha", sales: "R$ 350k", conversion: "32%" },
  { rank: 2, team: "Equipe Bravo", sales: "R$ 280k", conversion: "28%" },
  { rank: 3, team: "Equipe Charlie", sales: "R$ 250k", conversion: "25%" },
  { rank: 4, team: "Equipe Delta", sales: "R$ 190k", conversion: "22%" },
  { rank: 5, team: "Equipe Echo", sales: "R$ 175k", conversion: "21%" },
];

const channelData = [
    { name: "Telefone", value: 45, fill: "hsl(var(--chart-1))" },
    { name: "Email", value: 25, fill: "hsl(var(--chart-2))" },
    { name: "Chat", value: 20, fill: "hsl(var(--chart-3))" },
    { name: "Redes Sociais", value: 10, fill: "hsl(var(--chart-4))" },
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
  // For TMA and Abandonment, a negative change is good.
  const isGood = (kpi.isTMA || kpi.isAbandonment) ? !isPositive : isPositive;
  const changeColor = isGood ? "text-emerald-500" : "text-red-500";
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
                <p className={cn("text-xs text-muted-foreground flex items-center", changeColor)}>
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
  return (
    <div className="flex-1 space-y-6 p-4 pt-6 md:p-8">
      <div className="flex items-center justify-between space-y-2">
        <h1 className="font-headline text-3xl font-bold tracking-tight">
          Dashboard Executivo
        </h1>
      </div>

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

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle className="font-headline text-lg">Funil de Vendas e Atendimento</CardTitle>
            <CardDescription>Visualização das etapas desde o visitante até a venda.</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 -ml-4">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={funnelData} layout="vertical" margin={{ top: 5, right: 50, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} width={80} />
                <RechartsTooltip
                  cursor={{ fill: 'hsl(var(--muted))' }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="rounded-lg border bg-background p-2 shadow-sm">
                          <div className="grid grid-cols-2 gap-2">
                            <div className="flex flex-col">
                              <span className="text-[0.70rem] uppercase text-muted-foreground">
                                Etapa
                              </span>
                              <span className="font-bold text-muted-foreground">
                                {payload[0].payload.name}
                              </span>
                            </div>
                            <div className="flex flex-col">
                              <span className="text-[0.70rem] uppercase text-muted-foreground">
                                Volume
                              </span>
                              <span className="font-bold">
                                {payload[0].value?.toLocaleString()}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="value" background={{ fill: 'hsl(var(--muted))', radius: 4 }}>
                  <LabelList dataKey="value" position="right" offset={8} className="fill-foreground" fontSize={12} formatter={(value: number) => value.toLocaleString()} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="font-headline text-lg">Ranking de Equipes</CardTitle>
            <CardDescription>Melhores equipes por performance de vendas.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px] text-center">Rank</TableHead>
                  <TableHead>Equipe</TableHead>
                  <TableHead className="text-right">Vendas</TableHead>
                  <TableHead className="text-right">Conversão</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {teamRankingData.map((team) => (
                  <TableRow key={team.rank}>
                    <TableCell className="font-medium">
                      <div className="flex items-center justify-center">
                        {team.rank === 1 ? <Crown className="h-5 w-5 text-yellow-500" /> : team.rank}
                      </div>
                    </TableCell>
                    <TableCell>{team.team}</TableCell>
                    <TableCell className="text-right">{team.sales}</TableCell>
                    <TableCell className="text-right">{team.conversion}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
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
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
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

      <div className="pt-6">
        <OpportunitySuggester />
      </div>

    </div>
  );
}
