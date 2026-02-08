'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users } from "lucide-react";

// Mock data based on existing customers, adapted for the sales funnel
const initialOpportunities = [
  {
    id: "opp_1",
    name: "Tech Solutions Ltda.",
    stage: "negotiation", // Etapa do funil
    potential: "high",
    value: 15000,
    responsible: "Ana Silva",
  },
  {
    id: "opp_2",
    name: "Inova Corp S.A.",
    stage: "proposal",
    potential: "medium",
    value: 8000,
    responsible: "Carlos Pereira",
  },
  {
    id: "opp_3",
    name: "Mercado Central",
    stage: "lost", // Exemplo de perdido
    potential: "low",
    value: 3000,
    responsible: "Ana Silva",
  },
  {
    id: "opp_4",
    name: "ConstruBem Materiais",
    stage: "lead",
    potential: "high",
    value: 25000,
    responsible: "Juliana Costa",
  },
  {
    id: "opp_5",
    name: "AgroForte Distribuidora",
    stage: "won", // Exemplo de ganho
    potential: "medium",
    value: 12000,
    responsible: "Carlos Pereira",
  },
    {
    id: "opp_6",
    name: "New Prospect Inc.",
    stage: "opportunity",
    potential: "high",
    value: 50000,
    responsible: "Juliana Costa",
  },
];

type Opportunity = typeof initialOpportunities[0];

const stages = [
  { id: "lead", title: "Lead" },
  { id: "opportunity", title: "Oportunidade" },
  { id: "proposal", title: "Proposta Enviada" },
  { id: "negotiation", title: "Em Negociação" },
  { id: "won", title: "Ganho" },
  { id: "lost", title: "Perdido" },
];

const potentialMap: Record<string, string> = {
  high: "Alto",
  medium: "Médio",
  low: "Baixo",
};

const KanbanCard = ({ opportunity }: { opportunity: Opportunity }) => {
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
    e.dataTransfer.setData("opportunityId", opportunity.id);
  };

  return (
    <Card
      draggable
      onDragStart={handleDragStart}
      className="mb-4 cursor-grab active:cursor-grabbing bg-card/80 hover:bg-card"
    >
      <CardHeader className="p-4">
        <CardTitle className="text-base font-semibold">{opportunity.name}</CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <div className="flex justify-between items-center text-sm text-muted-foreground">
          <span>Valor:</span>
          <span className="font-bold text-foreground">
            {opportunity.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </span>
        </div>
        <div className="mt-2 flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Potencial:</span>
            <Badge variant={opportunity.potential === 'high' ? 'destructive' : opportunity.potential === 'medium' ? 'secondary' : 'outline'} className="capitalize">
                {potentialMap[opportunity.potential]}
            </Badge>
        </div>
        <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
            <Users className="h-3 w-3" />
            <span>{opportunity.responsible}</span>
        </div>
      </CardContent>
    </Card>
  );
};


export default function FunilVendasPage() {
  const [opportunities, setOpportunities] = useState<Opportunity[]>(initialOpportunities);

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, targetStage: string) => {
    e.preventDefault();
    const opportunityId = e.dataTransfer.getData("opportunityId");

    setOpportunities((prev) =>
      prev.map((opp) =>
        opp.id === opportunityId ? { ...opp, stage: targetStage } : opp
      )
    );
  };
  
  const getStageTotalValue = (stageId: string) => {
    return opportunities
      .filter(opp => opp.stage === stageId)
      .reduce((sum, opp) => sum + opp.value, 0);
  };

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight font-headline">Funil de Vendas</h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 items-start">
        {stages.map((stage) => (
          <div
            key={stage.id}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, stage.id)}
            className="flex flex-col rounded-lg bg-muted/50 h-full"
          >
            <div className="p-4 border-b border-border">
                <div className="flex justify-between items-center">
                    <h3 className="font-semibold text-lg">{stage.title}</h3>
                    <Badge variant="secondary">{opportunities.filter(o => o.stage === stage.id).length}</Badge>
                </div>
                 <p className="text-sm font-bold text-muted-foreground mt-1">
                    {getStageTotalValue(stage.id).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                 </p>
            </div>
            <div className="p-4 overflow-y-auto flex-1 min-h-[400px]">
                {opportunities
                .filter((opp) => opp.stage === stage.id)
                .map((opp) => (
                    <KanbanCard key={opp.id} opportunity={opp} />
                ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
