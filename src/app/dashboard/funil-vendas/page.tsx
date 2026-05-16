'use client';

import { useMemo, useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Phone, User as UserIcon, CheckCircle2, FileText, Users, XCircle, DollarSign, Tag, Repeat } from "lucide-react";
import { cn } from '@/lib/utils';
import { useSettings } from '@/contexts/SettingsContext';
import type { Customer, CustomerStatus } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import {
    AlertDialog,
    AlertDialogContent,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

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
        <div className="flex justify-between items-start">
            <div className={cn("h-1.5 w-10 rounded-full", potentialColorClass[customer.potential])} />
            <div className="flex flex-col items-end gap-1">
                {customer.oneTimeValue ? (
                    <div className="flex items-center gap-1 text-[9px] font-bold text-primary bg-primary/5 px-1 rounded border border-primary/20">
                        <Tag className="h-2 w-2" />
                        <span>V: {customer.oneTimeValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                    </div>
                ) : null}
                {customer.monthlyValue ? (
                    <div className="flex items-center gap-1 text-[9px] font-bold text-emerald-500 bg-emerald-500/5 px-1 rounded border border-emerald-500/20">
                        <Repeat className="h-2 w-2" />
                        <span>M: {customer.monthlyValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                    </div>
                ) : null}
            </div>
        </div>
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
  const { toast } = useToast();
  const [convertingCustomer, setConvertingCustomer] = useState<Customer | null>(null);

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, targetStage: CustomerStatus) => {
    e.preventDefault();
    const customerId = e.dataTransfer.getData("customerId");
    const customer = customers.find(c => c.id === customerId);

    if (customer) {
        if (targetStage === 'won') {
            setConvertingCustomer(customer);
        } else if (customer.status !== targetStage) {
            updateCustomer({ ...customer, status: targetStage });
        }
    }
  };

  const handleConfirmConvert = (type: "active_contract" | "one_time") => {
    if (!convertingCustomer) return;
    updateCustomer({ ...convertingCustomer, status: 'won', type: type });
    toast({ 
        title: "Lead Convertido!", 
        description: `${convertingCustomer.name} agora é um cliente oficial e foi removido do funil.` 
    });
    setConvertingCustomer(null);
  };

  // Exibe apenas registros que são do tipo LEAD e não estão marcados como ganhos/ativos
  const funnelLeads = useMemo(() => {
      return customers.filter(c => c.type === 'lead');
  }, [customers]);

  const getCustomerStage = (status: string): CustomerStatus => {
    if (status === 'proposal') return 'proposal';
    if (status === 'negotiation') return 'negotiation';
    if (status === 'won' || status === 'active') return 'won';
    if (status === 'lost' || status === 'discarded' || status === 'inactive') return 'lost';
    if (status === 'opportunity' || status === 'new') return 'opportunity';
    return 'lead';
  };

  return (
    <>
    <div className="flex h-full flex-1 flex-col space-y-6 p-4 md:p-8 pt-6 bg-background/50">
      <div className="flex items-center justify-between">
        <div>
            <h2 className="text-4xl font-bold tracking-tight font-headline text-foreground">
            Funil de Vendas
            </h2>
            <p className="text-muted-foreground">Gerencie seus leads e prospectos com valores estimados de venda e mensalidade.</p>
        </div>
      </div>

      <div className="grid flex-1 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {stages.map((stage) => {
          const stageCustomers = funnelLeads.filter(c => getCustomerStage(c.status) === stage.id);
          const totalOneTime = stageCustomers.reduce((acc, curr) => acc + (curr.oneTimeValue || 0), 0);
          const totalMonthly = stageCustomers.reduce((acc, curr) => acc + (curr.monthlyValue || 0), 0);
          
          return (
            <div
              key={stage.id}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, stage.id)}
              className="flex flex-col rounded-xl bg-card border border-border overflow-hidden min-h-[400px]"
            >
              <div className={cn("px-4 py-3 text-left", stage.color)}>
                <div className="flex justify-between items-center mb-1">
                    <h3 className="font-bold text-xs uppercase tracking-wider text-white">
                    {stage.title} 
                    </h3>
                    <Badge variant="secondary" className="bg-white/20 text-white border-none h-5 px-1.5 min-w-[20px] justify-center text-[10px]">
                        {stageCustomers.length}
                    </Badge>
                </div>
                <div className="flex flex-col gap-0.5 mt-2">
                    {totalOneTime > 0 && (
                        <p className="text-white/90 text-[10px] font-bold flex items-center gap-1 bg-black/10 px-1 rounded w-fit">
                            <Tag className="h-2.5 w-2.5" />
                            Venda: {totalOneTime.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </p>
                    )}
                    {totalMonthly > 0 && (
                        <p className="text-white/90 text-[10px] font-bold flex items-center gap-1 bg-black/10 px-1 rounded w-fit">
                            <Repeat className="h-2.5 w-2.5" />
                            Mensal: {totalMonthly.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </p>
                    )}
                </div>
              </div>
              <div className="p-3 overflow-y-auto flex-1 bg-muted/20">
                {stageCustomers.length > 0 ? (
                    stageCustomers.map((cust) => (
                        <KanbanCard key={cust.id} customer={cust} />
                    ))
                ) : (
                    <div className="h-full flex items-center justify-center border-2 border-dashed border-border/50 rounded-lg p-4">
                        <p className="text-[10px] text-muted-foreground uppercase font-bold text-center">Vazio</p>
                    </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>

    <AlertDialog open={!!convertingCustomer} onOpenChange={(open) => !open && setConvertingCustomer(null)}>
        <AlertDialogContent onOpenAutoFocus={(e) => e.preventDefault()}>
            <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                    Parabéns pela Venda!
                </AlertDialogTitle>
                <div className="text-sm text-muted-foreground space-y-1">
                    <p>Você está convertendo <strong>{convertingCustomer?.name}</strong> em cliente.</p>
                    <div className="flex flex-col gap-1 p-2 bg-muted rounded-md mt-2">
                        {convertingCustomer?.oneTimeValue ? (
                            <div className="flex justify-between text-xs">
                                <span>Valor de Venda:</span>
                                <span className="font-bold text-primary">{convertingCustomer.oneTimeValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                            </div>
                        ) : null}
                        {convertingCustomer?.monthlyValue ? (
                            <div className="flex justify-between text-xs">
                                <span>Valor Mensal:</span>
                                <span className="font-bold text-emerald-500">{convertingCustomer.monthlyValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                            </div>
                        ) : null}
                    </div>
                </div>
            </AlertDialogHeader>
            <div className="grid grid-cols-2 gap-4 py-6">
                <Button 
                    variant="outline" 
                    className="h-auto flex-col gap-3 p-6 hover:border-primary hover:bg-primary/5 transition-all" 
                    onClick={() => handleConfirmConvert('one_time')}
                >
                    <Users className="h-8 w-8 text-blue-500" />
                    <div className="text-center">
                        <p className="font-bold">Cliente Avulso</p>
                        <p className="text-[10px] text-muted-foreground">Sem mensalidade fixa</p>
                    </div>
                </Button>
                <Button 
                    variant="outline" 
                    className="h-auto flex-col gap-3 p-6 hover:border-primary hover:bg-primary/5 transition-all" 
                    onClick={() => handleConfirmConvert('active_contract')}
                >
                    <FileText className="h-8 w-8 text-purple-500" />
                    <div className="text-center">
                        <p className="font-bold">Contrato</p>
                        <p className="text-[10px] text-muted-foreground">Faturamento recorrente</p>
                    </div>
                </Button>
            </div>
            <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setConvertingCustomer(null)}>
                    <XCircle className="mr-2 h-4 w-4" />
                    Cancelar
                </AlertDialogCancel>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
