
'use client';

import React, { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useSettings } from '@/contexts/SettingsContext';
import type { ServiceOrder, User } from '@/lib/types';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
    DropdownMenuCheckboxItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
  } from "@/components/ui/dropdown-menu";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { DateRange } from 'react-day-picker';
import { BookUser, PlusCircle, ListFilter, Calendar as CalendarIcon, User as UserIcon, AlertCircle } from "lucide-react";
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

const serviceOrderSchema = z.object({
    clientId: z.string().min(1, "O cliente é obrigatório."),
    technicianId: z.string().min(1, "O técnico é obrigatório."),
    status: z.enum(['Aberta', 'Em andamento', 'Aguardando peça', 'Finalizada', 'Cancelada']),
    problemDescription: z.string().min(10, "Descreva o problema com pelo menos 10 caracteres."),
    technicalDiagnosis: z.string().optional(),
    executedServices: z.string().optional(),
    usedParts: z.string().optional(),
    totalValue: z.coerce.number().optional(),
    deliveryDate: z.string().optional(),
});

type ServiceOrderFormValues = z.infer<typeof serviceOrderSchema>;

const stages = [
  { id: "Aberta", title: "Aberta", headerClass: "bg-blue-500" },
  { id: "Em andamento", title: "Em Andamento", headerClass: "bg-yellow-500" },
  { id: "Aguardando peça", title: "Aguardando Peça", headerClass: "bg-orange-500" },
  { id: "Finalizada", title: "Finalizada", headerClass: "bg-green-500" },
  { id: "Cancelada", title: "Cancelada", headerClass: "bg-gray-500" },
];

const statusColors: { [key: string]: string } = {
  'Aberta': 'bg-blue-500',
  'Em andamento': 'bg-yellow-500 text-black',
  'Aguardando peça': 'bg-orange-500',
  'Finalizada': 'bg-green-500',
  'Cancelada': 'bg-gray-500'
};

const ServiceOrderCard = ({ order, onCardClick }: { order: ServiceOrder, onCardClick: (order: ServiceOrder) => void }) => {
  const { users, customers } = useSettings();
  
  const technician = users.find(u => u.id === order.technicianId);
  const customer = customers.find(c => c.id === order.clientId);
  const isDelayed = order.deliveryDate && new Date(order.deliveryDate) < new Date() && order.status !== 'Finalizada' && order.status !== 'Cancelada';

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
    e.dataTransfer.setData("serviceOrderId", order.id);
  };
  
  return (
    <Card
      draggable
      onDragStart={handleDragStart}
      onClick={() => onCardClick(order)}
      className="mb-3 cursor-grab active:cursor-grabbing bg-card hover:bg-card/90 shadow-sm rounded-lg"
    >
      <CardContent className="p-3 space-y-2 text-sm">
        <div className="flex justify-between items-start">
            <p className="font-semibold leading-tight text-base">OS #{order.number}</p>
            {isDelayed && (
              <Badge variant="destructive" className="flex items-center gap-1">
                <AlertCircle className="h-3 w-3"/> Atrasada
              </Badge>
            )}
        </div>
        <p className="text-muted-foreground">{customer?.name || 'Cliente não encontrado'}</p>
        <div className="flex items-center gap-2 text-muted-foreground pt-1">
            <UserIcon className="h-4 w-4" />
            <span>{technician?.name || 'Técnico não atribuído'}</span>
        </div>
      </CardContent>
    </Card>
  );
};


export default function ChamadosPage() {
  const { serviceOrders, addServiceOrder, updateServiceOrder, deleteServiceOrder, users, customers } = useSettings();
  const { toast } = useToast();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<ServiceOrder | null>(null);
  const [deletingOrder, setDeletingOrder] = useState<ServiceOrder | null>(null);

  const [technicianFilter, setTechnicianFilter] = useState<string[]>([]);
  const [customerFilter, setCustomerFilter] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [dateFilter, setDateFilter] = useState<DateRange | undefined>(undefined);


  const form = useForm<ServiceOrderFormValues>({
    resolver: zodResolver(serviceOrderSchema),
    defaultValues: { 
        status: 'Aberta',
        problemDescription: '',
        technicalDiagnosis: '',
        executedServices: '',
        usedParts: '',
        deliveryDate: '',
     },
  });

  const technicians = useMemo(() => users.filter(u => u.sectorIds.includes('sec_3')), [users]);

  const filteredOrders = useMemo(() => {
    return serviceOrders.filter(order => {
        const technicianMatch = technicianFilter.length === 0 || technicianFilter.includes(order.technicianId);
        const customerMatch = customerFilter.length === 0 || customerFilter.includes(order.clientId);
        const statusMatch = statusFilter.length === 0 || statusFilter.includes(order.status);
        const dateMatch = !dateFilter?.from || (
            new Date(order.openingDate) >= dateFilter.from &&
            new Date(order.openingDate) <= (dateFilter.to || dateFilter.from)
        );
        return technicianMatch && customerMatch && statusMatch && dateMatch;
    });
  }, [serviceOrders, technicianFilter, customerFilter, statusFilter, dateFilter]);


  const handleAddNew = () => {
    setEditingOrder(null);
    form.reset({
        clientId: '',
        technicianId: '',
        status: 'Aberta',
        problemDescription: '',
        technicalDiagnosis: '',
        executedServices: '',
        usedParts: '',
        deliveryDate: '',
    });
    setIsDialogOpen(true);
  };

  const handleEdit = (order: ServiceOrder) => {
    setEditingOrder(order);
    form.reset({
      ...order,
      deliveryDate: order.deliveryDate || '',
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (order: ServiceOrder) => {
    setDeletingOrder(order);
  };

  const confirmDelete = () => {
    if (!deletingOrder) return;
    deleteServiceOrder(deletingOrder.id);
    toast({
      title: "Ordem de Serviço Excluída!",
      description: `A OS #${deletingOrder.number} foi removida.`,
      variant: 'destructive'
    });
    setDeletingOrder(null);
  };

  function onSubmit(values: ServiceOrderFormValues) {
    if (editingOrder) {
      updateServiceOrder({ 
        ...editingOrder, 
        ...values,
        deliveryDate: values.deliveryDate || undefined,
    });
      toast({ title: 'Ordem de Serviço Atualizada!', description: `A OS #${editingOrder.number} foi salva.` });
    } else {
      addServiceOrder(values);
      toast({ title: 'Ordem de Serviço Criada!', description: `Uma nova OS foi aberta.` });
    }
    setIsDialogOpen(false);
  }

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, targetStage: string) => {
    e.preventDefault();
    const serviceOrderId = e.dataTransfer.getData("serviceOrderId");
    const order = serviceOrders.find(o => o.id === serviceOrderId);
    if(order) {
        updateServiceOrder({ ...order, status: targetStage as ServiceOrder['status']});
        toast({
            title: 'Status Atualizado!',
            description: `OS #${order.number} movida para "${targetStage}".`
        });
    }
  };

  return (
    <>
      <div className="flex h-full flex-1 flex-col space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-between space-y-2">
            <div>
                <h2 className="text-3xl font-bold tracking-tight font-headline">Ordens de Serviço</h2>
                <p className="text-muted-foreground">Gerencie e acompanhe o fluxo de trabalho da sua equipe técnica.</p>
            </div>
          <Button onClick={handleAddNew}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Nova OS
          </Button>
        </div>
        
        {/* Filter Bar */}
        <Card>
            <CardContent className="pt-6 flex flex-wrap items-center gap-2">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="flex-1 min-w-[150px] sm:flex-none">
                            <ListFilter className="mr-2 h-4 w-4" />
                            Status ({statusFilter.length > 0 ? statusFilter.length : 'Todos'})
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                        {stages.map(stage => (
                            <DropdownMenuCheckboxItem key={stage.id} checked={statusFilter.includes(stage.id)} onCheckedChange={(checked) => {
                                setStatusFilter(prev => checked ? [...prev, stage.id] : prev.filter(s => s !== stage.id))
                            }}>{stage.title}</DropdownMenuCheckboxItem>
                        ))}
                    </DropdownMenuContent>
                </DropdownMenu>

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="flex-1 min-w-[150px] sm:flex-none">
                            <UserIcon className="mr-2 h-4 w-4" />
                            Técnico ({technicianFilter.length > 0 ? technicianFilter.length : 'Todos'})
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                        {technicians.map(tech => (
                            <DropdownMenuCheckboxItem key={tech.id} checked={technicianFilter.includes(tech.id)} onCheckedChange={(checked) => {
                                setTechnicianFilter(prev => checked ? [...prev, tech.id] : prev.filter(t => t !== tech.id))
                            }}>{tech.name}</DropdownMenuCheckboxItem>
                        ))}
                    </DropdownMenuContent>
                </DropdownMenu>
                
                <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-full sm:w-auto justify-start text-left font-normal flex-1 min-w-[150px]",
                          !dateFilter && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dateFilter?.from ? format(dateFilter.from, "dd/MM/yy") : <span>Data Abertura</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar mode="single" selected={dateFilter?.from} onSelect={(day) => setDateFilter(day ? { from: day, to: day } : undefined)} locale={ptBR}/>
                    </PopoverContent>
                </Popover>

            </CardContent>
        </Card>

        <div className="grid flex-1 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {stages.map((stage) => (
            <div
              key={stage.id}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, stage.id)}
              className="flex flex-col rounded-lg bg-muted/50"
            >
              <div className={cn("px-3 py-2 text-left rounded-t-lg text-primary-foreground", stage.headerClass)}>
                <h3 className="font-semibold text-sm">{stage.title} ({filteredOrders.filter(o => o.status === stage.id).length})</h3>
              </div>
              <ScrollArea className="p-2 overflow-y-auto flex-1 h-96">
                  {filteredOrders
                  .filter((order) => order.status === stage.id)
                  .map((order) => (
                      <ServiceOrderCard key={order.id} order={order} onCardClick={handleEdit} />
                  ))}
              </ScrollArea>
            </div>
          ))}
        </div>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingOrder ? `Editar OS #${editingOrder.number}` : 'Nova Ordem de Serviço'}</DialogTitle>
            <DialogDescription>
              {editingOrder ? 'Altere os dados da Ordem de Serviço.' : 'Preencha os dados para abrir uma nova OS.'}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
            <ScrollArea className="max-h-[60vh] p-1">
              <div className="space-y-4 px-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                    control={form.control}
                    name="clientId"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Cliente</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value} defaultValue={field.value}>
                            <FormControl>
                            <SelectTrigger>
                                <SelectValue placeholder="Selecione um cliente" />
                            </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                {customers.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="technicianId"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Técnico Responsável</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value} defaultValue={field.value}>
                            <FormControl>
                            <SelectTrigger>
                                <SelectValue placeholder="Selecione um técnico" />
                            </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                {technicians.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        <FormMessage />
                    </FormItem>
                    )}
                />
              </div>

              <FormField
                control={form.control}
                name="problemDescription"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descrição do Problema (Relatado pelo Cliente)</FormLabel>
                    <FormControl><Textarea placeholder="Ex: O equipamento não liga..." {...field} rows={4} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Status</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value} defaultValue={field.value}>
                            <FormControl>
                            <SelectTrigger>
                                <SelectValue placeholder="Selecione o status" />
                            </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                {stages.map(s => <SelectItem key={s.id} value={s.id}>{s.title}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="deliveryDate"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Prazo de Entrega</FormLabel>
                                <FormControl>
                                  <Input placeholder="dd/mm/aaaa ou texto livre" {...field} value={field.value || ''}/>
                                </FormControl>
                             <FormMessage />
                        </FormItem>
                    )}
                />
              </div>

              {editingOrder && (
                <>
                 <FormField
                    control={form.control}
                    name="technicalDiagnosis"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Diagnóstico Técnico</FormLabel>
                        <FormControl><Textarea placeholder="Causa provável do problema..." {...field} value={field.value || ''}/></FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                 <FormField
                    control={form.control}
                    name="executedServices"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Serviços Executados</FormLabel>
                        <FormControl><Textarea placeholder="Limpeza, troca de peça..." {...field} value={field.value || ''}/></FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="usedParts"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Peças Utilizadas</FormLabel>
                        <FormControl><Textarea placeholder="Lista de peças e códigos..." {...field} value={field.value || ''}/></FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                </>
              )}
              </div>
            </ScrollArea>
              <DialogFooter>
                {editingOrder && (
                    <Button type="button" variant="destructive" className="mr-auto" onClick={() => handleDelete(editingOrder)}>Excluir</Button>
                )}
                <Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                <Button type="submit">Salvar</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      <AlertDialog open={!!deletingOrder} onOpenChange={(open) => !open && setDeletingOrder(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Essa ação não pode ser desfeita. Isso excluirá permanentemente a OS <span className="font-medium">#{deletingOrder?.number}</span>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Confirmar Exclusão</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
