'use client';

import { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Phone, Users } from "lucide-react";
import { cn } from '@/lib/utils';

// Mock data cleared for fresh start
const initialOpportunities: any[] = [];

type Opportunity = any;

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
      <CardContent className="p-3 space-y-2 text-sm">
        <div className={cn("h-1.5 w-10 rounded-full", potentialColorClass[opportunity.potential])} />
        <p className="font-semibold leading-tight">{opportunity.name}</p>
        <div className="text-muted-foreground space-y-1">
            <div className="flex items-center gap-2">
                <Users className="h-3 w-3" />
                <span>{opportunity.responsible}</span>
            </div>
            {opportunity.telefone && (
                 <div className="flex items-center gap-2">
                    <Phone className="h-3 w-3" />
                    <span>{opportunity.telefone}</span>
                </div>
            )}
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

  return (
    <div className="flex h-full flex-1 flex-col space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight font-headline">Funil de Vendas</h2>
      </div>
      <div className="grid flex-1 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
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
