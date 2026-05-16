'use client';

import React, { useMemo } from 'react';
import { useSettings } from '@/contexts/SettingsContext';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Pie,
  PieChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  Legend,
} from "recharts";
import { 
  Users, 
  FileText, 
  UserCheck, 
  UserX, 
  Activity, 
  TrendingUp, 
  CheckCircle2, 
  Briefcase,
  Layers,
  PieChart as PieChartIcon
} from "lucide-react";
import { Badge } from '@/components/ui/badge';

const SERVICE_CATEGORIES = [
  { id: "ponto", label: "Ponto", color: "hsl(var(--chart-1))" },
  { id: "manutencao", label: "Manut. PC", color: "hsl(var(--chart-2))" },
  { id: "gestao", label: "Gestão", color: "hsl(var(--chart-3))" },
  { id: "acesso", label: "Acesso", color: "hsl(var(--chart-4))" },
  { id: "catraca", label: "Catraca", color: "hsl(var(--chart-5))" },
];

export default function RelatoriosPage() {
  const { customers, serviceOrders, appointments } = useSettings();

  const stats = useMemo(() => {
    const total = customers.length;
    const active = customers.filter(c => c.status === 'active' || c.status === 'new').length;
    const leads = customers.filter(c => c.status === 'lead').length;
    const inactive = customers.filter(c => c.status === 'inactive' || c.status === 'discarded').length;
    
    const contracts = customers.filter(c => c.type === 'active_contract' && c.status !== 'inactive').length;
    const oneTime = customers.filter(c => c.type === 'one_time' && c.status !== 'inactive').length;

    // Distribuição por Serviço
    const servicesData = SERVICE_CATEGORIES.map(cat => ({
      name: cat.label,
      count: customers.filter(c => c.serviceCategories?.includes(cat.id)).length,
      fill: cat.color
    })).sort((a, b) => b.count - a.count);

    // Dados para Gráfico de Pizza (Status)
    const statusData = [
      { name: 'Ativos/Novos', value: active, fill: 'hsl(var(--chart-1))' },
      { name: 'Leads', value: leads, fill: 'hsl(var(--chart-4))' },
      { name: 'Inativos', value: inactive, fill: 'hsl(var(--muted))' },
    ].filter(d => d.value > 0);

    // Dados para Gráfico de Tipo (Contrato vs Avulso)
    const typeData = [
      { name: 'Contrato', value: contracts, fill: 'hsl(var(--primary))' },
      { name: 'Serviço Avulso', value: oneTime, fill: 'hsl(var(--secondary))' },
    ].filter(d => d.value > 0);

    return {
      total,
      active,
      leads,
      inactive,
      contracts,
      oneTime,
      servicesData,
      statusData,
      typeData
    };
  }, [customers]);

  return (
    <div className="flex-1 space-y-6 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight font-headline">Dashboards e Relatórios</h2>
          <p className="text-muted-foreground">Visão geral da sua carteira de clientes e desempenho.</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Clientes</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">Registrados no sistema</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Contratos</CardTitle>
            <FileText className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.contracts}</div>
            <p className="text-xs text-muted-foreground">Faturamento recorrente</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Leads Qualificados</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.leads}</div>
            <p className="text-xs text-muted-foreground">Em prospecção</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Serviços Avulsos</CardTitle>
            <Activity className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.oneTime}</div>
            <p className="text-xs text-muted-foreground">Clientes ocasionais</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Layers className="h-5 w-5" />
              Distribuição por Tipo de Serviço
            </CardTitle>
            <CardDescription>Quantidade de clientes atendidos por cada categoria.</CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={stats.servicesData} layout="vertical" margin={{ left: 30, right: 30 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" hide />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  tickLine={false} 
                  axisLine={false} 
                  fontSize={12}
                  width={80}
                />
                <RechartsTooltip 
                  cursor={{ fill: 'transparent' }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="rounded-lg border bg-background p-2 shadow-sm">
                          <p className="text-sm font-bold">{payload[0].payload.name}</p>
                          <p className="text-sm text-primary">{payload[0].value} Clientes</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                  {stats.servicesData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                  <LabelList dataKey="count" position="right" className="fill-foreground" fontSize={12} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="col-span-3">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChartIcon className="h-5 w-5" />
              Modalidade Contratual
            </CardTitle>
            <CardDescription>Proporção entre contratos e avulsos.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center">
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={stats.typeData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {stats.typeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <RechartsTooltip />
                <Legend verticalAlign="bottom" height={36}/>
              </PieChart>
            </ResponsiveContainer>
             <div className="mt-4 w-full space-y-2">
                <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground font-medium">Contratos</span>
                    <span className="font-bold">{stats.contracts}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground font-medium">Serviços Avulsos</span>
                    <span className="font-bold">{stats.oneTime}</span>
                </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
         <Card>
           <CardHeader>
             <CardTitle className="text-lg">Resumo por Categoria</CardTitle>
           </CardHeader>
           <CardContent>
             <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {stats.servicesData.map((cat) => (
                  <div key={cat.name} className="flex flex-col gap-1 p-3 rounded-lg border bg-muted/20">
                    <span className="text-xs text-muted-foreground font-medium uppercase">{cat.name}</span>
                    <span className="text-2xl font-bold">{cat.count}</span>
                    <Badge variant="outline" className="w-fit text-[10px] py-0">Clientes</Badge>
                  </div>
                ))}
             </div>
           </CardContent>
         </Card>

         <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserCheck className="h-5 w-5" />
                Status da Carteira
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between border-b pb-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-500/10">
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Clientes Ativos</p>
                    <p className="text-xs text-muted-foreground">Já tiveram interação comercial</p>
                  </div>
                </div>
                <div className="text-right font-bold text-xl">{stats.active}</div>
              </div>
              <div className="flex items-center justify-between border-b pb-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500/10">
                    <TrendingUp className="h-5 w-5 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Leads</p>
                    <p className="text-xs text-muted-foreground">Oportunidades em aberto</p>
                  </div>
                </div>
                <div className="text-right font-bold text-xl">{stats.leads}</div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                    <UserX className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Inativos / Descartados</p>
                    <p className="text-xs text-muted-foreground">Fora da carteira atual</p>
                  </div>
                </div>
                <div className="text-right font-bold text-xl">{stats.inactive}</div>
              </div>
            </CardContent>
         </Card>
      </div>
    </div>
  );
}
