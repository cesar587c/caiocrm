
'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useSettings } from '@/contexts/SettingsContext';
import type { ServiceOrder, Product, ServiceOrderItem, User, ServiceOrderHistoryEntry } from '@/lib/types';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { initialProducts } from '@/lib/mock-data';

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
import { ToastAction } from '@/components/ui/toast';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { format, parseISO, isPast } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { PlusCircle, User as UserIcon, AlertCircle, Edit, Printer, Download, Mail, Send, Loader2, Trash2, Search, History, XCircle, Copy } from "lucide-react";
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";


const serviceOrderItemSchema = z.object({
  name: z.string().min(1, 'O nome é obrigatório.'),
  quantity: z.coerce.number().min(1, 'A quantidade deve ser no mínimo 1.'),
  price: z.coerce.number().min(0, 'O preço não pode ser negativo.'),
});

const serviceOrderSchema = z.object({
    clientId: z.string().min(1, "O cliente é obrigatório."),
    technicianId: z.string().min(1, "O técnico é obrigatório."),
    status: z.enum(['Aberta', 'Em andamento', 'Aguardando peça', 'Finalizada', 'Cancelada']),
    problemDescription: z.string().min(10, "Descreva o problema com pelo menos 10 caracteres."),
    technicalDiagnosis: z.string().optional(),
    executedServices: z.string().optional(),
    items: z.array(serviceOrderItemSchema).optional(),
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
  const { serviceOrders, addServiceOrder, updateServiceOrder, deleteServiceOrder, users, customers, companyProfile, products, addProduct, updateProduct, currentUser } = useSettings();
  const { toast } = useToast();
  
  const [editingOrder, setEditingOrder] = useState<ServiceOrder | null>(null);
  const [deletingOrder, setDeletingOrder] = useState<ServiceOrder | null>(null);
  const [activeTab, setActiveTab] = useState("todos");
  const [technicianFilter, setTechnicianFilter] = useState<string[]>([]);
  const [selectedOrderForPreview, setSelectedOrderForPreview] = useState<ServiceOrder | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [productSearch, setProductSearch] = useState('');

  const [finalizationState, setFinalizationState] = useState<{ isOpen: boolean; values: ServiceOrderFormValues | null }>({ isOpen: false, values: null });
  const [finalizationJustification, setFinalizationJustification] = useState('');
  
  const [reassignmentState, setReassignmentState] = useState<{ isOpen: boolean; values: ServiceOrderFormValues | null; oldTechnicianName: string; newTechnicianName: string; }>({ isOpen: false, values: null, oldTechnicianName: '', newTechnicianName: '' });
  const [reassignmentJustification, setReassignmentJustification] = useState('');

  const form = useForm<ServiceOrderFormValues>({
    resolver: zodResolver(serviceOrderSchema),
    defaultValues: { 
        clientId: '',
        technicianId: '',
        status: 'Aberta',
        problemDescription: '',
        technicalDiagnosis: '',
        executedServices: '',
        items: [],
        deliveryDate: '',
     },
  });
  
  useEffect(() => {
    if (editingOrder) {
      form.reset({
        ...editingOrder,
        items: editingOrder.items || [],
        deliveryDate: editingOrder.deliveryDate || '',
      });
    } else {
      form.reset({
        clientId: '',
        technicianId: '',
        status: 'Aberta',
        problemDescription: '',
        technicalDiagnosis: '',
        executedServices: '',
        items: [],
        deliveryDate: '',
      });
    }
  }, [editingOrder, form]);

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'items',
  });
  
  const watchItems = form.watch('items');
  const total = (watchItems || []).reduce(
    (acc, item) => acc + (Number(item.quantity) || 0) * (Number(item.price) || 0),
    0
  );

  const technicians = useMemo(() => users.filter(u => u.sectorIds.includes('sec_3')), [users]);
  
  const filteredProducts = useMemo(() => {
    if (!productSearch) return products;
    return products.filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase()));
  }, [products, productSearch]);

  const safeFormat = (dateString: string | undefined | null, outputFormat: string) => {
    if (!dateString) return outputFormat === 'yyyy-MM-dd' ? '' : 'N/A';
    try {
        const d = parseISO(dateString);
        if (isNaN(d.getTime())) return outputFormat === 'yyyy-MM-dd' ? '' : 'Data Inválida';
        return format(d, outputFormat, { locale: ptBR });
    } catch (e) {
        return outputFormat === 'yyyy-MM-dd' ? '' : 'Data Inválida';
    }
  }

  const checkDelayed = (order: ServiceOrder) => {
    if (!order.deliveryDate || order.status === 'Finalizada' || order.status === 'Cancelada') {
        return false;
    }
    try {
        const d = parseISO(order.deliveryDate);
        if (isNaN(d.getTime())) return false;
        return isPast(d);
    } catch (e) {
        return false;
    }
  }

  const filteredOrders = useMemo(() => {
    return serviceOrders.filter(order => {
        const statusMatch = activeTab === 'todos' || order.status === activeTab;
        const technicianMatch = technicianFilter.length === 0 || technicianFilter.includes(order.technicianId);
        return statusMatch && technicianMatch;
    }).sort((a, b) => new Date(b.openingDate).getTime() - new Date(a.openingDate).getTime());
  }, [serviceOrders, activeTab, technicianFilter]);

  const generateHistory = (original: ServiceOrder, updated: ServiceOrderFormValues, user: User, finalizationJustification?: string, reassignmentJustification?: string): ServiceOrderHistoryEntry[] => {
    const history: ServiceOrderHistoryEntry[] = [];
    const timestamp = new Date().toISOString();

    const createEntry = (action: string, from?: any, to?: any, details?: string) => ({
        userId: user.id,
        userName: user.name,
        timestamp,
        action,
        from: from ? String(from) : undefined,
        to: to ? String(to) : undefined,
        details,
    });

    if (original.status !== updated.status) {
        history.push(createEntry(
            'alterou o status', 
            original.status, 
            updated.status,
            finalizationJustification
        ));
    }
    if (original.technicianId !== updated.technicianId) {
        const oldTech = users.find(u => u.id === original.technicianId)?.name || 'N/A';
        const newTech = users.find(u => u.id === updated.technicianId)?.name || 'N/A';
        history.push(createEntry('alterou o técnico responsável', oldTech, newTech, reassignmentJustification));
    }
    if (original.technicalDiagnosis !== updated.technicalDiagnosis) {
        history.push(createEntry('atualizou o diagnóstico técnico'));
    }
    if (original.executedServices !== updated.executedServices) {
        history.push(createEntry('atualizou os serviços executados'));
    }

    return history;
  }

  const handleSaveNewProduct = (newProduct: { name: string, price: number }) => {
    const lowerCaseName = newProduct.name.toLowerCase().trim();
    if (!lowerCaseName || products.some(p => p.name.toLowerCase().trim() === lowerCaseName)) return;
    const createdProduct = addProduct(newProduct);
    toast({
        title: "Item Cadastrado!",
        description: `"${createdProduct.name}" foi adicionado à sua lista de produtos.`,
    });
  };

  const handleItemNameBlur = (index: number) => {
      const itemName = form.getValues(`items.${index}.name`);
      if (!itemName) return;
      const existingProduct = products.find(p => p.name.toLowerCase().trim() === itemName.toLowerCase().trim());
      if (existingProduct) {
          form.setValue(`items.${index}.price`, existingProduct.price, { shouldDirty: true, shouldTouch: true });
          form.trigger(`items.${index}.price`);
      } else {
          const itemPrice = form.getValues(`items.${index}.price`);
          toast({
              title: 'Cadastrar Novo Item?',
              description: `Deseja salvar "${itemName}" na sua lista de produtos?`,
              action: <ToastAction altText="Cadastrar" onClick={() => handleSaveNewProduct({ name: itemName, price: itemPrice || 0 })}>Cadastrar</ToastAction>,
          });
      }
  };

  const handleAddProductFromList = (product: Product) => {
    append({ name: product.name, quantity: 1, price: product.price });
    toast({
      title: "Item Adicionado!",
      description: `"${product.name}" foi adicionado à OS.`,
    });
  };

  const handleAddNew = () => {
    setEditingOrder(null);
  };

  const handleEdit = (order: ServiceOrder) => {
    setEditingOrder(order);
  };
  
  const handleCloneClick = (order: ServiceOrder) => {
    const { id, number, openingDate, history, status, deliveryDate, technicalDiagnosis, executedServices, ...rest } = order;
    const clonedOrder: Omit<ServiceOrder, 'id' | 'number' | 'openingDate'> = {
      ...rest,
      status: 'Aberta',
      items: order.items.map(item => ({ ...item })),
      history: [{
          userId: currentUser?.id || 'system',
          userName: currentUser?.name || 'Sistema',
          timestamp: new Date().toISOString(),
          action: `clonou a OS #${order.number}`,
      }]
    };
    addServiceOrder(clonedOrder);
    toast({
        title: "OS Clonada!",
        description: `Uma nova OS foi criada com base na #${order.number}.`,
    });
  };

  const handlePreview = (order: ServiceOrder) => {
    setSelectedOrderForPreview(order);
    setIsPreviewOpen(true);
  };

  const handleDelete = (order: ServiceOrder) => {
    setDeletingOrder(order);
  };

  const confirmDelete = () => {
    if (!deletingOrder) return;
    deleteServiceOrder(deletingOrder.id);
    if (editingOrder?.id === deletingOrder.id) {
        setEditingOrder(null);
    }
    toast({
      title: "Ordem de Serviço Excluída!",
      description: `A OS #${deletingOrder.number} foi removida.`,
      variant: 'destructive'
    });
    setDeletingOrder(null);
  };

  const handleDownloadPdf = async () => {
    const osElement = document.getElementById('os-preview');
    if (!osElement || !selectedOrderForPreview) {
        toast({ variant: 'destructive', title: 'Erro ao gerar PDF' });
        return;
    }
    setIsDownloading(true);
    try {
        const canvas = await html2canvas(osElement, { scale: 2, useCORS: true });
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        const imgProps = pdf.getImageProperties(imgData);
        const imgHeight = (imgProps.height * pdfWidth) / imgProps.width;
        let height = imgHeight;
        let position = 0;
        if (height > pdfHeight) {
            height = pdfHeight;
        }
        pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, height);
        pdf.save(`os-${selectedOrderForPreview.number}.pdf`);
    } catch (error) {
        console.error("Erro ao gerar PDF:", error);
        toast({ variant: 'destructive', title: 'Erro ao gerar PDF' });
    } finally {
        setIsDownloading(false);
    }
  };

  const handleSendEmail = () => {
    if (!selectedOrderForPreview) return;
    const customer = customers.find(c => c.id === selectedOrderForPreview.clientId);
    if (!customer?.email) {
        toast({ variant: 'destructive', title: 'E-mail não encontrado' });
        return;
    }
    const subject = `Ordem de Serviço #${selectedOrderForPreview.number} - ${companyProfile.name}`;
    const body = `Olá ${customer.name},\n\nSegue em anexo a sua Ordem de Serviço de número #${selectedOrderForPreview.number}.\n\nAtenciosamente,\n${companyProfile.name}`;
    window.location.href = `mailto:${customer.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };
  
  const handleSendWhatsApp = () => {
    if (!selectedOrderForPreview) return;
    const customer = customers.find(c => c.id === selectedOrderForPreview.clientId);
    const technician = users.find(u => u.id === selectedOrderForPreview.technicianId);
    
    if (!customer?.telefone) {
        toast({ variant: 'destructive', title: 'Telefone não encontrado' });
        return;
    }

    const message = `*Ordem de Serviço #${selectedOrderForPreview.number}*\n\n*Empresa:* ${companyProfile.name}\n*Cliente:* ${customer.name}\n*Técnico:* ${technician?.name || 'N/A'}\n*Data de Abertura:* ${safeFormat(selectedOrderForPreview.openingDate, 'dd/MM/yyyy')}\n*Status:* ${selectedOrderForPreview.status}\n\n*Problema Relatado:*\n${selectedOrderForPreview.problemDescription}\n\n*Diagnóstico Técnico:*\n${selectedOrderForPreview.technicalDiagnosis || 'Aguardando diagnóstico.'}`;
    const cleanPhone = customer.telefone.replace(/\D/g, '');
    const phoneWithCountryCode = cleanPhone.length > 11 ? cleanPhone : `55${cleanPhone}`;
    const url = `https://web.whatsapp.com/send?phone=${phoneWithCountryCode}&text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  const handleConfirmFinalization = () => {
    if (!finalizationState.values || !finalizationJustification.trim() || !editingOrder || !currentUser) {
        toast({ variant: 'destructive', title: 'Justificativa é obrigatória.' });
        return;
    }

    const values = finalizationState.values;
    const history = generateHistory(editingOrder, values, currentUser, finalizationJustification);

    updateServiceOrder({
        ...editingOrder,
        ...values,
        items: values.items || [],
        history: [...(editingOrder.history || []), ...history]
    });
    
    toast({ title: 'Ordem de Serviço Finalizada!', description: `A OS #${editingOrder.number} foi finalizada.` });
    
    setFinalizationState({ isOpen: false, values: null });
    setFinalizationJustification('');
    setEditingOrder(null);
  }

  const handleConfirmReassignment = () => {
    if (!reassignmentState.values || !reassignmentJustification.trim() || !editingOrder || !currentUser) {
        toast({ variant: 'destructive', title: 'Justificativa é obrigatória.' });
        return;
    }

    const values = reassignmentState.values;
    const history = generateHistory(editingOrder, values, currentUser, undefined, reassignmentJustification);

    updateServiceOrder({
        ...editingOrder,
        ...values,
        items: values.items || [],
        history: [...(editingOrder.history || []), ...history]
    });
    
    toast({ title: 'Técnico Reatribuído!', description: `A OS #${editingOrder.number} foi reatribuída.` });
    
    setReassignmentState({ isOpen: false, values: null, oldTechnicianName: '', newTechnicianName: '' });
    setReassignmentJustification('');
    setEditingOrder(null);
  }

  function onSubmit(values: ServiceOrderFormValues) {
    if (!currentUser) return;

    if (editingOrder) {
      if (values.technicianId !== editingOrder.technicianId) {
          const oldTech = users.find(u => u.id === editingOrder.technicianId)?.name || 'N/A';
          const newTech = users.find(u => u.id === values.technicianId)?.name || 'N/A';
          setReassignmentState({ isOpen: true, values, oldTechnicianName: oldTech, newTechnicianName: newTech });
          return;
      }
      
      if (values.status === 'Finalizada' && editingOrder.status !== 'Finalizada') {
          setFinalizationState({ isOpen: true, values: values });
          return;
      }

      const history = generateHistory(editingOrder, values, currentUser);

      updateServiceOrder({ 
        ...editingOrder, 
        ...values,
        items: values.items || [],
        deliveryDate: values.deliveryDate || undefined,
        history: [...(editingOrder.history || []), ...history]
    });
      toast({ title: 'Ordem de Serviço Atualizada!', description: `A OS #${editingOrder.number} foi salva.` });
    } else {
      const historyEntry: ServiceOrderHistoryEntry = {
        userId: currentUser.id,
        userName: currentUser.name,
        timestamp: new Date().toISOString(),
        action: 'criou a Ordem de Serviço',
      };

      addServiceOrder({...values, items: values.items || [], history: [historyEntry]});
      toast({ title: 'Ordem de Serviço Criada!', description: `Uma nova OS foi aberta.` });
    }
    setEditingOrder(null);
  }

  return (
    <>
      <datalist id="product-datalist">
        {products.map(product => (
          <option key={product.id} value={product.name} />
        ))}
      </datalist>
      <div className="flex h-full flex-1 flex-col space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-between space-y-2">
            <div>
                <h2 className="text-3xl font-bold tracking-tight font-headline">Ordens de Serviço</h2>
                <p className="text-muted-foreground">Gerencie e acompanhe o fluxo de trabalho da sua equipe técnica.</p>
            </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            <div className="lg:col-span-2 space-y-4">
                <Tabs value={activeTab} onValueChange={setActiveTab}>
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
                    
                    <TabsContent value={activeTab} className="w-full mt-4">
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
                                            <TableHead>Prazo</TableHead>
                                            <TableHead className="text-right">Ações</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredOrders.length > 0 ? (
                                            filteredOrders.map(order => {
                                                const customer = customers.find(c => c.id === order.clientId);
                                                const technician = users.find(u => u.id === order.technicianId);
                                                const isDelayed = checkDelayed(order);
                                                return (
                                                <TableRow key={order.id} onClick={() => handleEdit(order)} className={cn("cursor-pointer", editingOrder?.id === order.id && 'bg-muted/50')}>
                                                    <TableCell className="font-medium">#{order.number}</TableCell>
                                                    <TableCell>{customer?.name || 'N/A'}</TableCell>
                                                    <TableCell>{technician?.name || 'N/A'}</TableCell>
                                                    <TableCell>
                                                        <Badge className={cn(statusColors[order.status])}>
                                                            {order.status}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex items-center gap-2">
                                                            {safeFormat(order.deliveryDate, 'dd/MM/yyyy')}
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
                                                        <div className="flex justify-end gap-1">
                                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={(e) => {e.stopPropagation(); handleCloneClick(order)}} title="Clonar OS">
                                                                <Copy className="h-4 w-4"/>
                                                            </Button>
                                                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => {e.stopPropagation(); handlePreview(order)}}>
                                                                <Printer className="h-4 w-4"/>
                                                            </Button>
                                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={(e) => { e.stopPropagation(); handleDelete(order) }}>
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            )})
                                        ) : (
                                            <TableRow>
                                                <TableCell colSpan={6} className="h-24 text-center">
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
            <div className="lg:col-span-1 sticky top-4">
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} id="service-order-form" className="flex flex-col h-full">
                        <Card className="flex flex-col flex-1 max-h-[calc(100vh-5rem)]">
                            <CardHeader className="flex flex-row items-start justify-between">
                                <div>
                                    <CardTitle>{editingOrder ? `Editar OS #${editingOrder.number}` : 'Nova Ordem de Serviço'}</CardTitle>
                                    <CardDescription>
                                    {editingOrder ? 'Altere os dados da OS. O cliente não pode ser modificado.' : 'Preencha os dados para abrir uma nova OS.'}
                                    </CardDescription>
                                </div>
                                {editingOrder && (
                                    <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingOrder(null)}>
                                        <XCircle className="h-5 w-5" />
                                    </Button>
                                )}
                            </CardHeader>
                            <CardContent className="flex-1 overflow-y-auto space-y-4">
                               <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <FormField
                                        control={form.control}
                                        name="clientId"
                                        render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Cliente</FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value} defaultValue={field.value} disabled={!!editingOrder}>
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
                                        <FormControl><Textarea placeholder="Ex: O equipamento não liga..." {...field} rows={3} /></FormControl>
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
                                                    <Input type="date" {...field} value={safeFormat(field.value, 'yyyy-MM-dd')} />
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
                                            <FormLabel>Serviços Executados (Descrição)</FormLabel>
                                            <FormControl><Textarea placeholder="Limpeza, troca de peça, configuração..." {...field} value={field.value || ''}/></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                        )}
                                    />
                                    <Card>
                                        <CardHeader className='p-4'>
                                            <CardTitle className='text-base'>Peças e Serviços Utilizados</CardTitle>
                                        </CardHeader>
                                        <CardContent className='p-4 pt-0'>
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                    <TableHead className="w-[50%]">Descrição</TableHead>
                                                    <TableHead>Qtd.</TableHead>
                                                    <TableHead>Preço Unit.</TableHead>
                                                    <TableHead className="text-right w-10"></TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {fields.map((item, index) => (
                                                    <TableRow key={item.id}>
                                                        <TableCell>
                                                            <Input placeholder="Descrição do item" {...form.register(`items.${index}.name`)} list="product-datalist" onBlur={() => handleItemNameBlur(index)} />
                                                        </TableCell>
                                                        <TableCell>
                                                            <Input type="number" {...form.register(`items.${index}.quantity`)} className="w-16" />
                                                        </TableCell>
                                                        <TableCell>
                                                            <Input type="number" step="0.01" {...form.register(`items.${index}.price`)} className="w-24" />
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                        <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}>
                                                            <Trash2 className="h-4 w-4 text-destructive" />
                                                        </Button>
                                                        </TableCell>
                                                    </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                            <Button type="button" variant="outline" size="sm" className='mt-2' onClick={() => append({ name: '', quantity: 1, price: 0 })}>
                                                <PlusCircle className="mr-2 h-4 w-4" /> Adicionar Item
                                            </Button>
                                        </CardContent>
                                        <CardFooter className='bg-muted/50 p-4 flex justify-end'>
                                            <div className="text-right">
                                                <p className="text-muted-foreground text-sm">Total dos Itens</p>
                                                <p className="text-lg font-bold">{total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                                            </div>
                                        </CardFooter>
                                    </Card>
                                     <Card>
                                        <CardHeader className="p-4">
                                            <CardTitle className="text-base">Adicionar Produtos e Serviços</CardTitle>
                                            <div className="relative pt-2">
                                                <Search className="absolute left-2.5 top-4 h-4 w-4 text-muted-foreground" />
                                                <Input placeholder="Buscar item..." className="pl-8" value={productSearch} onChange={(e) => setProductSearch(e.target.value)} />
                                            </div>
                                        </CardHeader>
                                        <CardContent className="p-4 pt-0">
                                            <ScrollArea className="h-40">
                                                <div className="flex flex-col gap-1 pr-2">
                                                {filteredProducts.map(product => (
                                                    <div key={product.id} className="flex cursor-pointer items-center justify-between rounded-md p-2 hover:bg-muted" onClick={() => handleAddProductFromList(product)}>
                                                        <div className="flex-1 truncate pr-2">
                                                            <p className="font-semibold text-sm truncate">{product.name}</p>
                                                            <p className="text-xs text-muted-foreground">{product.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                                                        </div>
                                                    </div>
                                                ))}
                                                {filteredProducts.length === 0 && <p className="text-sm text-center text-muted-foreground py-4">Nenhum item encontrado.</p>}
                                                </div>
                                            </ScrollArea>
                                        </CardContent>
                                    </Card>
                                    {editingOrder.history && editingOrder.history.length > 0 && (
                                        <div className="space-y-2">
                                            <h4 className="text-sm font-medium text-foreground">Histórico de Alterações</h4>
                                            <ScrollArea className="h-40 rounded-md border p-2">
                                                <div className="space-y-3">
                                                    {editingOrder.history.slice().reverse().map((entry) => (
                                                        <div key={entry.timestamp} className="text-xs text-muted-foreground">
                                                            <p className="flex items-center gap-1.5">
                                                                <span className="font-semibold text-foreground">{entry.userName}</span>
                                                                <span>{entry.action}</span>
                                                                {entry.from && <Badge variant="outline">{entry.from}</Badge>}
                                                                {entry.to && <span>&rarr;</span>}
                                                                {entry.to && <Badge variant="secondary">{entry.to}</Badge>}
                                                            </p>
                                                            <p className="text-xs text-muted-foreground/80 pl-2">{safeFormat(entry.timestamp, 'dd/MM/yyyy HH:mm')}</p>
                                                            {entry.details && <blockquote className="mt-1 ml-2 pl-2 border-l-2 text-foreground/80 italic">"{entry.details}"</blockquote>}
                                                        </div>
                                                    ))}
                                                </div>
                                            </ScrollArea>
                                        </div>
                                    )}
                                    </>
                                )}
                            </CardContent>
                            <CardFooter>
                                <Button type="submit" form="service-order-form" className="w-full">Salvar</Button>
                            </CardFooter>
                        </Card>
                    </form>
                </Form>
            </div>
        </div>
      </div>
      
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

      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="sm:max-w-3xl h-[90vh] flex flex-col">
            <DialogHeader className="print-hide">
            <DialogTitle>Ordem de Serviço #{selectedOrderForPreview?.number}</DialogTitle>
            <DialogDescription>
                Pré-visualização da Ordem de Serviço para impressão ou envio.
            </DialogDescription>
            </DialogHeader>
            {selectedOrderForPreview && (
                <ScrollArea className="flex-1 -mx-6">
                <div id="os-preview" className="bg-white text-black p-8 shadow-lg max-w-2xl mx-auto font-sans my-8">
                    <div className="flex justify-between items-start mb-8">
                        <div>
                            {companyProfile.logoUrl && <img src={companyProfile.logoUrl} alt="Logo" data-ai-hint="logo" className="max-h-16 w-auto mb-4" />}
                            <h1 className="text-xl font-bold">{companyProfile.name}</h1>
                        </div>
                        <div className="text-right text-xs">
                            <p className="font-bold">Ordem de Serviço #{selectedOrderForPreview.number}</p>
                            <p>Abertura: {safeFormat(selectedOrderForPreview.openingDate, 'dd/MM/yyyy')}</p>
                            {selectedOrderForPreview.deliveryDate && <p>Prazo: {safeFormat(selectedOrderForPreview.deliveryDate, 'dd/MM/yyyy')}</p>}
                        </div>
                    </div>
                    
                    <hr className="my-6 border-gray-300" />

                    <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
                        <div>
                            <p className="font-bold text-gray-600">CLIENTE:</p>
                            <p className="font-semibold">{customers.find(c => c.id === selectedOrderForPreview.clientId)?.name}</p>
                            <p>{customers.find(c => c.id === selectedOrderForPreview.clientId)?.email}</p>
                            <p>{customers.find(c => c.id === selectedOrderForPreview.clientId)?.telefone}</p>
                        </div>
                        <div className="text-right">
                             <p className="font-bold text-gray-600">TÉCNICO RESPONSÁVEL:</p>
                            <p className="font-semibold">{users.find(u => u.id === selectedOrderForPreview.technicianId)?.name}</p>
                        </div>
                    </div>

                    <div className="space-y-4 text-sm">
                        <div>
                            <h3 className="font-bold border-b pb-1 mb-2">Problema Relatado</h3>
                            <p className="whitespace-pre-wrap">{selectedOrderForPreview.problemDescription}</p>
                        </div>
                        {selectedOrderForPreview.technicalDiagnosis && <div>
                            <h3 className="font-bold border-b pb-1 mb-2">Diagnóstico Técnico</h3>
                            <p className="whitespace-pre-wrap">{selectedOrderForPreview.technicalDiagnosis}</p>
                        </div>}
                        {selectedOrderForPreview.executedServices && <div>
                            <h3 className="font-bold border-b pb-1 mb-2">Serviços Executados</h3>
                            <p className="whitespace-pre-wrap">{selectedOrderForPreview.executedServices}</p>
                        </div>}
                         {(selectedOrderForPreview.items && selectedOrderForPreview.items.length > 0) && <div>
                            <h3 className="font-bold border-b pb-1 mb-2">Peças e Serviços Utilizados</h3>
                            <table className="w-full text-left text-sm my-4">
                                <thead className="bg-gray-100">
                                    <tr>
                                    <th className="p-2 font-semibold">Item</th>
                                    <th className="p-2 text-center font-semibold">Qtd.</th>
                                    <th className="p-2 text-right font-semibold">Preço Unit.</th>
                                    <th className="p-2 text-right font-semibold">Subtotal</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {selectedOrderForPreview.items.map((item, index) => (
                                    <tr key={index} className="border-b border-gray-200">
                                        <td className="p-2">{item.name}</td>
                                        <td className="p-2 text-center">{item.quantity}</td>
                                        <td className="p-2 text-right">{(Number(item.price) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                                        <td className="p-2 text-right">{((Number(item.quantity) || 0) * (Number(item.price) || 0)).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                                    </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>}
                    </div>

                     <hr className="my-6 border-gray-300" />
                     <div className="flex justify-end mb-8">
                        <div className="w-1/2 text-right">
                             {(selectedOrderForPreview.items && selectedOrderForPreview.items.length > 0) && (
                                 <div className="flex justify-between text-lg">
                                    <span className="font-bold">Total:</span>
                                    <span className="font-bold">{(selectedOrderForPreview.items.reduce((acc, item) => acc + item.quantity * item.price, 0)).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                                </div>
                             )}
                        </div>
                    </div>

                    <div className="mt-24 grid grid-cols-2 gap-8 text-center text-sm">
                        <div>
                            <hr className="border-gray-400 mb-1" />
                            <p>{users.find(u => u.id === selectedOrderForPreview.technicianId)?.name}</p>
                            <p className="text-xs text-gray-600">Assinatura do Técnico</p>
                        </div>
                         <div>
                            <hr className="border-gray-400 mb-1" />
                            <p>{customers.find(c => c.id === selectedOrderForPreview.clientId)?.name}</p>
                             <p className="text-xs text-gray-600">Assinatura do Cliente</p>
                        </div>
                    </div>

                </div>
                </ScrollArea>
            )}
            <DialogFooter className="print-hide">
                <Button type="button" variant="outline" onClick={() => setIsPreviewOpen(false)}>Cancelar</Button>
                <Button type="button" variant="secondary" onClick={handleDownloadPdf} disabled={isDownloading}>
                    {isDownloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                    Baixar PDF
                </Button>
                <Button type="button" onClick={handleSendEmail}>
                    <Mail className="mr-2 h-4 w-4" /> Enviar por E-mail
                </Button>
                <Button type="button" onClick={handleSendWhatsApp}>
                    <Send className="mr-2 h-4 w-4" /> Enviar por WhatsApp
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Dialog open={finalizationState.isOpen} onOpenChange={(open) => !open && setFinalizationState({isOpen: false, values: null})}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Finalizar Ordem de Serviço</DialogTitle>
                <DialogDescription>
                    Para finalizar a OS, por favor, adicione um breve comentário sobre a resolução do problema.
                </DialogDescription>
            </DialogHeader>
            <div className="py-4">
                <Textarea 
                    placeholder="Ex: Peça substituída e equipamento funcionando normalmente."
                    value={finalizationJustification}
                    onChange={(e) => setFinalizationJustification(e.target.value)}
                    rows={4}
                />
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={() => { setFinalizationState({isOpen: false, values: null}); setFinalizationJustification(''); }}>Cancelar</Button>
                <Button onClick={handleConfirmFinalization}>Confirmar Finalização</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={reassignmentState.isOpen} onOpenChange={(open) => !open && setReassignmentState({ isOpen: false, values: null, oldTechnicianName: '', newTechnicianName: '' })}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Justificar Reatribuição de Técnico</DialogTitle>
                <DialogDescription>
                    Você está reatribuindo a OS de <span className="font-medium">{reassignmentState.oldTechnicianName}</span> para <span className="font-medium">{reassignmentState.newTechnicianName}</span>. Por favor, adicione um breve comentário sobre o motivo.
                </DialogDescription>
            </DialogHeader>
            <div className="py-4">
                <Textarea 
                    placeholder="Ex: Mudança de turno, especialidade necessária, etc."
                    value={reassignmentJustification}
                    onChange={(e) => setReassignmentJustification(e.target.value)}
                    rows={4}
                />
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={() => { setReassignmentState({ isOpen: false, values: null, oldTechnicianName: '', newTechnicianName: '' }); setReassignmentJustification(''); }}>Cancelar</Button>
                <Button onClick={handleConfirmReassignment}>Confirmar Reatribuição</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
