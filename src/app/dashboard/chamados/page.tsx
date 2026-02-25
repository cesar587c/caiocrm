'use client';

import React, { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useSettings } from '@/contexts/SettingsContext';
import type { ServiceOrder } from '@/lib/types';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
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
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { PlusCircle, User as UserIcon, AlertCircle, Edit } from "lucide-react";
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";


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
  { id: "Aberta", title: "Aberta" },
  { id: "Em andamento", title: "Em Andamento" },
  { id: "Aguardando peça", title: "Aguardando Peça" },
  { id: "Finalizada", title: "Finalizada" },
  { id: "Cancelada", title: "Cancelada" },
];

const statusColors: { [key: string]: string } = {
  'Aberta': 'bg-blue-500 hover:bg-blue-500/90',
  'Em andamento': 'bg-yellow-500 hover:bg-yellow-500/90 text-black',
  'Aguardando peça': 'bg-orange-500 hover:bg-orange-500/90',
  'Finalizada': 'bg-green-500 hover:bg-green-500/90',
  'Cancelada': 'bg-gray-500 hover:bg-gray-500/90'
};

export default function ChamadosPage() {
  const { serviceOrders, addServiceOrder, updateServiceOrder, deleteServiceOrder, users, customers } = useSettings();
  const { toast } = useToast();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<ServiceOrder | null>(null);
  const [deletingOrder, setDeletingOrder] = useState<ServiceOrder | null>(null);
  const [activeTab, setActiveTab] = useState("todos");
  const [technicianFilter, setTechnicianFilter] = useState<string[]>([]);

  const form = useForm<ServiceOrderFormValues>({
    resolver: zodResolver(serviceOrderSchema),
    defaultValues: { 
        status: 'Aberta',
        problemDescription: '',
        technicalDiagnosis: '',
        executedServices: '',
        usedParts: '',
        totalValue: undefined,
        deliveryDate: '',
     },
  });

  const technicians = useMemo(() => users.filter(u => u.sectorIds.includes('sec_3')), [users]);

  const filteredOrders = useMemo(() => {
    return serviceOrders.filter(order => {
        const statusMatch = activeTab === 'todos' || order.status === activeTab;
        const technicianMatch = technicianFilter.length === 0 || technicianFilter.includes(order.technicianId);
        return statusMatch && technicianMatch;
    }).sort((a, b) => new Date(b.openingDate).getTime() - new Date(a.openingDate).getTime());
  }, [serviceOrders, activeTab, technicianFilter]);


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
        totalValue: undefined,
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

  return (
    <>
      <div className="flex h-full flex-1 flex-col space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-between space-y-2">
            <div>
                <h2 className="text-3xl font-bold tracking-tight font-headline">Ordens de Serviço</h2>
                <p className="text-muted-foreground">Gerencie e acompanhe o fluxo de trabalho da sua equipe técnica.</p>
            </div>
        </div>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
                <TabsList className="flex-wrap h-auto">
                    <TabsTrigger value="todos">Todas</TabsTrigger>
                    {stages.map(stage => (
                        <TabsTrigger key={stage.id} value={stage.id}>{stage.title}</TabsTrigger>
                    ))}
                </TabsList>
                <div className="flex items-center gap-2">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline">
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
                    <Button onClick={handleAddNew}>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Nova OS
                    </Button>
                </div>
            </div>
            
            <TabsContent value={activeTab} className="w-full">
                <Card>
                    <CardHeader>
                        <CardTitle>Lista de Ordens de Serviço</CardTitle>
                        <CardDescription>
                            {activeTab === 'todos' ? 'Exibindo todas as ordens de serviço.' : `Exibindo ordens com status "${stages.find(s => s.id === activeTab)?.title}".`}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>OS</TableHead>
                                    <TableHead>Cliente</TableHead>
                                    <TableHead>Técnico</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Abertura</TableHead>
                                    <TableHead>Prazo</TableHead>
                                    <TableHead className="text-right">Ações</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredOrders.length > 0 ? (
                                    filteredOrders.map(order => {
                                        const customer = customers.find(c => c.id === order.clientId);
                                        const technician = users.find(u => u.id === order.technicianId);
                                        const isDelayed = order.deliveryDate && new Date(order.deliveryDate) < new Date() && order.status !== 'Finalizada' && order.status !== 'Cancelada';
                                        return (
                                        <TableRow key={order.id}>
                                            <TableCell className="font-medium">#{order.number}</TableCell>
                                            <TableCell>{customer?.name || 'N/A'}</TableCell>
                                            <TableCell>{technician?.name || 'N/A'}</TableCell>
                                            <TableCell>
                                                <Badge className={cn(statusColors[order.status])}>
                                                    {order.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>{format(parseISO(order.openingDate), 'dd/MM/yyyy', { locale: ptBR })}</TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    {order.deliveryDate || 'N/A'}
                                                    {isDelayed && (
                                                        <TooltipProvider>
                                                            <Tooltip>
                                                                <TooltipTrigger>
                                                                    <AlertCircle className="h-4 w-4 text-destructive"/>
                                                                </TooltipTrigger>
                                                                <TooltipContent>
                                                                    <p>Esta OS está atrasada.</p>
                                                                </TooltipContent>
                                                            </Tooltip>
                                                        </TooltipProvider>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button variant="ghost" size="icon" onClick={() => handleEdit(order)}>
                                                    <Edit className="h-4 w-4"/>
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    )})
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={7} className="h-24 text-center">
                                            Nenhuma ordem de serviço encontrada.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                     <CardFooter>
                        <div className="text-xs text-muted-foreground">
                            Mostrando <strong>{filteredOrders.length}</strong> de <strong>{serviceOrders.length}</strong> ordens de serviço.
                        </div>
                    </CardFooter>
                </Card>
            </TabsContent>
        </Tabs>
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
                <FormField
                    control={form.control}
                    name="totalValue"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Valor Total (R$)</FormLabel>
                        <FormControl>
                            <Input type="number" step="0.01" placeholder="150,00" {...field} value={field.value ?? ''} />
                        </FormControl>
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
