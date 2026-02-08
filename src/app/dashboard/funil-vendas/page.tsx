'use client';

import { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Phone, Users } from "lucide-react";
import { cn } from '@/lib/utils';

// Mock data based on existing customers, adapted for the sales funnel
const initialOpportunities = [
  {
    id: "opp_1",
    name: "Tech Solutions Ltda.",
    stage: "negotiation", // Etapa do funil
    potential: "high",
    value: 15000,
    responsible: "Ana Silva",
    telefone: "(11) 98765-4321",
  },
  {
    id: "opp_2",
    name: "Inova Corp S.A.",
    stage: "proposal",
    potential: "medium",
    value: 8000,
    responsible: "Carlos Pereira",
    telefone: "(21) 91234-5678",
  },
  {
    id: "opp_3",
    name: "Mercado Central",
    stage: "lost", // Exemplo de perdido
    potential: "low",
    value: 3000,
    responsible: "Ana Silva",
    telefone: "",
  },
  {
    id: "opp_4",
    name: "ConstruBem Materiais",
    stage: "lead",
    potential: "high",
    value: 25000,
    responsible: "Juliana Costa",
    telefone: "(31) 99999-8888",
  },
  {
    id: "opp_5",
    name: "AgroForte Distribuidora",
    stage: "won", // Exemplo de ganho
    potential: "medium",
    value: 12000,
    responsible: "Carlos Pereira",
    telefone: "",
  },
    {
    id: "opp_6",
    name: "New Prospect Inc.",
    stage: "opportunity",
    potential: "high",
    value: 50000,
    responsible: "Juliana Costa",
    telefone: "(41) 98877-6655",
  },
];

type Opportunity = typeof initialOpportunities[0];

const stages = [
  { id: "lead", title: "Lead", headerClass: "bg-chart-5" }, // Yellow/Orange
  { id: "opportunity", title: "Oportunidade", headerClass: "bg-chart-2" }, // Blue
  { id: "proposal", title: "Proposta Enviada", headerClass: "bg-chart-1" }, // Purple
  { id: "negotiation", title: "Em Negociação", headerClass: "bg-chart-3" }, // Pink
  { id: "won", title: "Ganho", headerClass: "bg-chart-4" }, // Green
  { id: "lost", title: "Perdido", headerClass: "bg-destructive" }, // Red
];

const KanbanCard = ({ opportunity }: { opportunity: Opportunity }) => {
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
    e.dataTransfer.setData("opportunityId", opportunity.id);
  };
  
  const potentialColorClass: Record<string, string> = {
    high: "bg-destructive",
    medium: "bg-chart-5",
    low: "bg-chart-2",
  };

  return (
    <Card
      draggable
      onDragStart={handleDragStart}
      className="mb-3 cursor-grab active:cursor-grabbing bg-card hover:bg-card/90 shadow-sm rounded-md"
    >
      <CardContent className="p-3 space-y-3">
        <div className={cn("h-1.5 w-10 rounded-full", potentialColorClass[opportunity.potential])} />
        <p className="font-semibold text-sm leading-tight">{opportunity.name}</p>
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

  return (
    <div className="flex h-full flex-1 flex-col space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight font-headline">Funil de Vendas</h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {stages.map((stage) => (
          <div
            key={stage.id}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, stage.id)}
            className="flex flex-col rounded-lg bg-muted/50"
          >
            <div className={cn("px-3 py-2 text-left rounded-t-lg", stage.headerClass)}>
              <h3 className="font-semibold text-sm text-primary-foreground">{stage.title} ({opportunities.filter(o => o.stage === stage.id).length})</h3>
            </div>
            <div className="p-2 overflow-y-auto flex-1">
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
