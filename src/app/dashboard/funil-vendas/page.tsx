'use client';

import { useMemo } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Phone, User as UserIcon } from "lucide-react";
import { cn } from '@/lib/utils';
import { useSettings } from '@/contexts/SettingsContext';
import type { Customer, CustomerStatus } from '@/lib/types';
import { Badge } from '@/components/ui/badge';

const stages: { id: CustomerStatus; title: string; color: string }[] = [
  { id: "lead", title: "Lead", color: "bg-[#EAB308]" }, // Amarelo
  { id: "opportunity", title: "Oportunidade", color: "bg-[#06B6D4]" }, // Ciano
  { id: "proposal", title: "Proposta Enviada", color: "bg-[#8B5CF6]" }, // Roxo
  { id: "negotiation", title: "Em Negociação", color: "bg-[#F43F5E]" }, // Rosa
  { id: "won", title: "Ganho", color: "bg-[#22C55E]" }, // Verde
  { id: "lost", title: "Perdido", color: "bg-[#EF4444]" }, // Vermelho
];

const KanbanCard = ({ customer }: { customer: Customer }) => {
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
    e.dataTransfer.setData("customerId", customer.id);
  };
  
  const potentialColorClass: Record<string, string> = {
    high: "bg-red-500",
    medium: "bg-yellow-500",
    low: "bg-blue-500",
  };

  return (
    <Card
      draggable
      onDragStart={handleDragStart}
      className="mb-3 cursor-grab active:cursor-grabbing bg-card hover:bg-accent/10 border-border transition-colors shadow-sm"
    >
      <CardContent className="p-3 space-y-2 text-sm">
        <div className={cn("h-1.5 w-10 rounded-full", potentialColorClass[customer.potential])} />
        <p className="font-bold text-foreground leading-tight">{customer.name}</p>
        <div className="text-muted-foreground space-y-1 text-xs">
            <div className="flex items-center gap-1.5">
                <UserIcon className="h-3 w-3" />
                <span className="truncate">{customer.responsible}</span>
            </div>
            {customer.telefone && (
                 <div className="flex items-center gap-1.5">
                    <Phone className="h-3 w-3" />
                    <span>{customer.telefone}</span>
                </div>
            )}
        </div>
      </CardContent>
    </Card>
  );
};


export default function FunilVendasPage() {
  const { customers, updateCustomer } = useSettings();

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, targetStage: CustomerStatus) => {
    e.preventDefault();
    const customerId = e.dataTransfer.getData("customerId");
    const customer = customers.find(c => c.id === customerId);

    if (customer && customer.status !== targetStage) {
        updateCustomer({ ...customer, status: targetStage });
    }
  };

  // Mapeia os status antigos para os estágios do funil para garantir que nada suma
  const getCustomerStage = (status: string): CustomerStatus => {
    if (status === 'active' || status === 'won') return 'won';
    if (status === 'discarded' || status === 'lost' || status === 'inactive') return 'lost';
    if (status === 'new' || status === 'opportunity') return 'opportunity';
    if (status === 'proposal') return 'proposal';
    if (status === 'negotiation') return 'negotiation';
    return 'lead';
  };

  return (
    <div className="flex h-full flex-1 flex-col space-y-6 p-4 md:p-8 pt-6 bg-background/50">
      <div className="flex items-center justify-between">
        <h2 className="text-4xl font-bold tracking-tight font-headline text-foreground">
          Funil de Vendas
        </h2>
      </div>

      <div className="grid flex-1 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {stages.map((stage) => {
          const stageCustomers = customers.filter(c => getCustomerStage(c.status) === stage.id);
          
          return (
            <div
              key={stage.id}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, stage.id)}
              className="flex flex-col rounded-xl bg-card border border-border overflow-hidden min-h-[300px]"
            >
              <div className={cn("px-4 py-3 text-left", stage.color)}>
                <h3 className="font-bold text-sm text-white flex justify-between items-center">
                  {stage.title} 
                  <Badge variant="secondary" className="bg-white/20 text-white border-none h-5 px-1.5 min-w-[20px] justify-center">
                    {stageCustomers.length}
                  </Badge>
                </h3>
              </div>
              <div className="p-3 overflow-y-auto flex-1 bg-muted/20">
                {stageCustomers.length > 0 ? (
                    stageCustomers.map((cust) => (
                        <KanbanCard key={cust.id} customer={cust} />
                    ))
                ) : (
                    <div className="h-full flex items-center justify-center border-2 border-dashed border-border/50 rounded-lg p-4">
                        <p className="text-[10px] text-muted-foreground uppercase font-bold text-center">Arraste clientes para aqui</p>
                    </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
