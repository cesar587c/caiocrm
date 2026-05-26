'use client';

import { useState, useMemo, useEffect } from 'react';
import { useForm, useFieldArray, Controller, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { addDays, format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import {
  PlusCircle,
  Trash2,
  Printer,
  Loader2,
  Search,
  Pencil,
  Copy,
  Image as ImageIcon,
  Share2,
  XCircle,
  FileText,
  Calendar as CalendarIcon,
  User,
  Settings,
  CreditCard,
  TrendingUp,
  LayoutGrid,
} from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { useSettings } from '@/contexts/SettingsContext';
import { ToastAction } from '@/components/ui/toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import type { Proposal, Product, Customer } from '@/lib/types';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Badge } from '@/components/ui/badge';

const proposalItemSchema = z.object({
  name: z.string().min(1, 'O nome é obrigatório.'),
  quantity: z.coerce.number().min(1, 'A quantidade deve ser no mínimo 1.'),
  price: z.coerce.number().min(0, 'O preço não pode ser negativo.'),
  isMonthly: z.boolean().default(false),
});

const proposalSchema = z.object({
  clientId: z.string().optional(),
  clientName: z.string().min(1, 'O nome do cliente é obrigatório.'),
  contactName: z.string().optional(),
  clientPhone: z.string().optional(),
  saveToContacts: z.boolean().default(false),
  contactType: z.enum(['lead', 'one_time']).default('lead'),
  proposalDate: z.date(),
  validityDate: z.date(),
  items: z.array(proposalItemSchema).min(1, 'Adicione pelo menos um item.'),
  hasAlternative: z.boolean().default(false),
  alternativeItems: z.array(proposalItemSchema).optional(),
  paymentMethod: z.string(),
  installments: z.coerce.number().min(1).max(12),
  firstAsDownPayment: z.boolean(),
  observations: z.string().optional(),
});

type ProposalFormValues = z.infer<typeof proposalSchema>;

export default function PropostasPage() {
  const { 
    companyProfile, 
    customers, 
    products, 
    addProduct, 
    proposals, 
    addProposal, 
    updateProposal, 
    deleteProposal, 
    addCustomer, 
    currentUser 
  } = useSettings();
  
  const { toast } = useToast();
  
  const [productSearch, setProductSearch] = useState('');
  const [isQuickAddingClient, setIsQuickAddingClient] = useState(false);
  const [selectedProposal, setSelectedProposal] = useState<Proposal | null>(null);
  const [deletingProposal, setDeletingProposal] = useState<Proposal | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [editingProposal, setEditingProposal] = useState<Proposal | null>(null);

  const formatPhoneNumber = (value: string) => {
    if (!value) return "";
    let cleaned = value.replace(/\D/g, "");
    if (cleaned.startsWith("55") && cleaned.length > 10) cleaned = cleaned.substring(2);
    cleaned = cleaned.slice(0, 11);
    const length = cleaned.length;
    if (length <= 2) return length > 0 ? `(${cleaned}` : "";
    if (length <= 6) return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2)}`;
    if (length <= 10) return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 6)}-${cleaned.slice(6)}`;
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7, 11)}`;
  }

  const form = useForm<ProposalFormValues>({
    resolver: zodResolver(proposalSchema),
    defaultValues: {
      clientName: '',
      contactName: '',
      clientPhone: '',
      saveToContacts: false,
      contactType: 'lead',
      proposalDate: new Date(),
      validityDate: addDays(new Date(), 10),
      items: [{ name: '', quantity: 1, price: 0, isMonthly: false }],
      hasAlternative: false,
      alternativeItems: [],
      paymentMethod: 'boleto',
      installments: 1,
      firstAsDownPayment: false,
      observations: '',
    },
  });

  const { fields: fieldsA, append: appendA, remove: removeA } = useFieldArray({
    control: form.control,
    name: 'items',
  });

  const { fields: fieldsB, append: appendB, remove: removeB } = useFieldArray({
    control: form.control,
    name: 'alternativeItems',
  });

  const watchItemsA = useWatch({ control: form.control, name: "items" });
  const watchItemsB = useWatch({ control: form.control, name: "alternativeItems" });
  const watchHasAlternative = form.watch('hasAlternative');

  const totalsA = useMemo(() => {
    return (watchItemsA || []).reduce(
        (acc, item) => {
            const subtotal = (Number(item.quantity) || 0) * (Number(item.price) || 0);
            if (item.isMonthly) acc.monthly += subtotal;
            else acc.oneTime += subtotal;
            return acc;
        },
        { oneTime: 0, monthly: 0 }
    );
  }, [watchItemsA]);

  const totalsB = useMemo(() => {
    if (!watchHasAlternative) return { oneTime: 0, monthly: 0 };
    return (watchItemsB || []).reduce(
        (acc, item) => {
            const subtotal = (Number(item.quantity) || 0) * (Number(item.price) || 0);
            if (item.isMonthly) acc.monthly += subtotal;
            else acc.oneTime += subtotal;
            return acc;
        },
        { oneTime: 0, monthly: 0 }
    );
  }, [watchItemsB, watchHasAlternative]);

  const handleClientSelect = (clientId: string) => {
    const client = customers.find(c => c.id === clientId);
    if (client) {
      form.setValue('clientId', client.id);
      form.setValue('clientName', client.nomeFantasia || client.name);
      form.setValue('contactName', client.contactName || '');
      form.setValue('clientPhone', formatPhoneNumber(client.telefone || client.phone2 || ''));
      setIsQuickAddingClient(false);
    }
  };
  
  const handleQuickAddClient = () => {
    form.setValue('clientId', undefined);
    form.setValue('clientName', '');
    form.setValue('contactName', '');
    form.setValue('clientPhone', '');
    setIsQuickAddingClient(true);
  }

  const handleItemNameBlur = (index: number, isAlt: boolean = false) => {
      const fieldName = isAlt ? `alternativeItems.${index}.name` : `items.${index}.name`;
      const priceName = isAlt ? `alternativeItems.${index}.price` : `items.${index}.price`;
      
      const itemName = form.getValues(fieldName as any);
      if (!itemName) return;
      const existingProduct = products.find(p => p.name.toLowerCase().trim() === itemName.toLowerCase().trim());
      if (existingProduct) {
          form.setValue(priceName as any, existingProduct.price, { shouldDirty: true, shouldTouch: true });
          form.trigger(priceName as any);
      } else {
          const itemPrice = form.getValues(priceName as any);
          toast({
              title: 'Cadastrar Novo Item?',
              description: `Deseja salvar "${itemName}" na sua lista de produtos?`,
              action: (
                  <ToastAction altText="Cadastrar" onClick={() => {
                      addProduct({ name: itemName, price: Number(itemPrice) || 0 });
                      toast({ title: "Item Cadastrado!" });
                  }}>Cadastrar</ToastAction>
              ),
          });
      }
  };

  const handleDownloadPdf = async () => {
    if (!selectedProposal) return;
    setIsDownloading(true);
    try {
        const element = document.getElementById('proposal-preview');
        if (!element) return;
        
        const canvas = await html2canvas(element, { 
            scale: 3, 
            useCORS: true, 
            backgroundColor: "#ffffff",
            logging: false,
            onclone: (clonedDoc) => {
                const el = clonedDoc.getElementById('proposal-preview');
                if (el) {
                    const allElements = el.querySelectorAll('*');
                    allElements.forEach((node: any) => {
                        node.style.letterSpacing = '0.3pt';
                        node.style.wordSpacing = 'normal';
                        node.style.fontVariantLigatures = 'none';
                        node.style.webkitFontSmoothing = 'antialiased';
                    });
                }
            }
        });
        
        const imgData = canvas.toDataURL('image/png', 1.0);
        const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
        pdf.addImage(imgData, 'PNG', 0, 0, 210, 297);
        pdf.save(`proposta-${selectedProposal.id}.pdf`);
    } catch (e) {
        console.error(e);
        toast({ variant: 'destructive', title: 'Erro ao gerar PDF' });
    } finally {
        setIsDownloading(false);
    }
  };

  const handleSharePdf = async (proposal: Proposal) => {
    setIsSharing(true);
    try {
        const element = document.getElementById('proposal-preview');
        if (!element) return;
        const canvas = await html2canvas(element, { 
            scale: 3, 
            useCORS: true, 
            backgroundColor: "#ffffff",
            onclone: (clonedDoc) => {
                const el = clonedDoc.getElementById('proposal-preview');
                if (el) {
                    const allElements = el.querySelectorAll('*');
                    allElements.forEach((node: any) => {
                        node.style.letterSpacing = '0.3pt';
                        node.style.wordSpacing = 'normal';
                        node.style.fontVariantLigatures = 'none';
                        node.style.webkitFontSmoothing = 'antialiased';
                    });
                }
            }
        });
        const imgData = canvas.toDataURL('image/png', 1.0);
        const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
        pdf.addImage(imgData, 'PNG', 0, 0, 210, 297);
        const pdfBlob = pdf.output('blob');
        const file = new File([pdfBlob], `proposta-${proposal.id}.pdf`, { type: 'application/pdf' });

        if (navigator.canShare && navigator.canShare({ files: [file] })) {
            await navigator.share({ files: [file], title: `Proposta #${proposal.id}` });
        } else {
            pdf.save(`proposta-${proposal.id}.pdf`);
            toast({ title: "PDF Baixado" });
        }
    } catch (e) {
        toast({ variant: 'destructive', title: 'Falha ao processar' });
    } finally {
        setIsSharing(false);
    }
  };

  const handleEditProposalClick = (p: Proposal) => {
    setEditingProposal(p);
    form.reset({
      clientId: p.clientId,
      clientName: p.clientName,
      contactName: p.contactName || '',
      clientPhone: formatPhoneNumber(p.clientPhone || ''),
      saveToContacts: false,
      contactType: 'lead',
      proposalDate: new Date(p.proposalDate),
      validityDate: new Date(p.validityDate),
      items: p.items,
      hasAlternative: p.hasAlternative || false,
      alternativeItems: p.alternativeItems || [],
      paymentMethod: p.paymentMethod,
      installments: p.installments,
      firstAsDownPayment: p.firstAsDownPayment,
      observations: p.observations || '',
    });
    setIsQuickAddingClient(!p.clientId);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCloneProposalClick = (p: Proposal) => {
    setEditingProposal(null);
    form.reset({
      ...p,
      proposalDate: new Date(),
      validityDate: addDays(new Date(), 10),
      clientPhone: formatPhoneNumber(p.clientPhone || ''),
    });
    setIsQuickAddingClient(!p.clientId);
    toast({ title: 'Proposta Duplicada!' });
  };

  const onSubmit = (data: ProposalFormValues) => {
    const currentTotalsA = data.items.reduce(
        (acc, item) => {
            const subtotal = (Number(item.quantity) || 0) * (Number(item.price) || 0);
            if (item.isMonthly) acc.monthly += subtotal;
            else acc.oneTime += subtotal;
            return acc;
        }, { oneTime: 0, monthly: 0 }
    );

    const currentTotalsB = (data.alternativeItems || []).reduce(
        (acc, item) => {
            const subtotal = (Number(item.quantity) || 0) * (Number(item.price) || 0);
            if (item.isMonthly) acc.monthly += subtotal;
            else acc.oneTime += subtotal;
            return acc;
        }, { oneTime: 0, monthly: 0 }
    );

    if (isQuickAddingClient && data.saveToContacts && !editingProposal) {
        addCustomer({
            name: data.clientName,
            nomeFantasia: data.clientName,
            contactName: data.contactName,
            telefone: data.clientPhone?.replace(/\D/g, ''),
            email: '',
            status: data.contactType === 'lead' ? 'lead' : 'new',
            type: data.contactType === 'lead' ? 'lead' : 'one_time',
            responsible: currentUser?.name || 'Admin',
            potential: 'medium',
            lastContact: new Date().toISOString(),
            createdAt: new Date().toISOString(),
            interactions: []
        });
    }

    const proposalData: Proposal = {
        ...data,
        id: editingProposal ? editingProposal.id : String(proposals.length > 0 ? Math.max(0, ...proposals.map(p => Number(p.id))) + 1 : 1),
        clientPhone: data.clientPhone?.replace(/\D/g, ''),
        proposalDate: data.proposalDate.toISOString(),
        validityDate: data.validityDate.toISOString(),
        totalOneTime: currentTotalsA.oneTime,
        totalMonthly: currentTotalsA.monthly,
        totalOneTimeAlt: data.hasAlternative ? currentTotalsB.oneTime : undefined,
        totalMonthlyAlt: data.hasAlternative ? currentTotalsB.monthly : undefined,
    } as Proposal;

    if (editingProposal) {
      updateProposal(proposalData);
      toast({ title: 'Proposta Atualizada!' });
    } else {
      addProposal(proposalData);
      toast({ title: 'Proposta Salva!' });
    }
    setEditingProposal(null);
    form.reset();
  };

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6 bg-background/50">
      <datalist id="proposal-products-list">
        {products.map(p => (
          <option key={p.id} value={p.name} />
        ))}
      </datalist>
      
      <div className="flex items-center justify-between">
        <div>
            <h2 className="text-3xl font-bold tracking-tight font-headline text-foreground">Gerador de Propostas</h2>
            <p className="text-muted-foreground">Crie orçamentos profissionais em PDF com layout limpo e opções alternativas.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-4">
        <div className="lg:col-span-2 space-y-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} id="proposal-form">
              <Card className="shadow-lg border-primary/10">
                <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-6">
                  <div className="space-y-1">
                    <CardTitle className="text-xl flex items-center gap-2">
                        <FileText className="h-5 w-5 text-primary" />
                        {editingProposal ? `Editar Proposta #${editingProposal.id}` : 'Configurar Orçamento'}
                    </CardTitle>
                    <CardDescription>Defina as datas e o destinatário da proposta.</CardDescription>
                  </div>
                  <div className="flex gap-4">
                    <FormField control={form.control} name="proposalDate" render={({ field }) => (
                      <div className="space-y-1">
                        <Label className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1">
                            <CalendarIcon className="h-3 w-3" /> Emissão
                        </Label>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="outline" size="sm" className="w-[125px] h-9 text-xs font-medium">
                                    {field.value ? format(field.value, "dd/MM/yyyy") : 'Data'}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="p-0 w-auto" align="end">
                                <Calendar mode="single" selected={field.value} onSelect={field.onChange} />
                            </PopoverContent>
                        </Popover>
                      </div>
                    )} />
                    <FormField control={form.control} name="validityDate" render={({ field }) => (
                      <div className="space-y-1">
                        <Label className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1">
                            <TrendingUp className="h-3 w-3" /> Validade
                        </Label>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="outline" size="sm" className="w-[125px] h-9 text-xs font-medium">
                                    {field.value ? format(field.value, "dd/MM/yyyy") : 'Data'}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="p-0 w-auto" align="end">
                                <Calendar mode="single" selected={field.value} onSelect={field.onChange} />
                            </PopoverContent>
                        </Popover>
                      </div>
                    )} />
                  </div>
                </CardHeader>
                <CardContent className="border-t pt-8 space-y-8">
                  <div className="flex items-center gap-5 p-4 rounded-xl bg-muted/30 border">
                    {companyProfile.logoUrl ? (
                        <img src={companyProfile.logoUrl} alt="Logo" className="h-14 w-auto object-contain rounded" />
                    ) : (
                        <div className="h-14 w-14 rounded bg-primary/10 flex items-center justify-center">
                            <ImageIcon className="h-6 w-6 text-primary" />
                        </div>
                    )}
                    <div className="space-y-0.5">
                      <h3 className="font-bold text-lg leading-none">{companyProfile.name}</h3>
                      <p className="text-xs text-muted-foreground flex items-center gap-2">
                        {companyProfile.email} <span className="text-muted-foreground/30">|</span> {formatPhoneNumber(companyProfile.phone)}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                        <Label className="text-sm font-semibold flex items-center gap-2">
                            <User className="h-4 w-4 text-primary" /> Cliente Destinatário
                        </Label>
                    </div>
                    <div className="flex gap-3">
                      <div className="flex-1">
                        <Select onValueChange={handleClientSelect} disabled={isQuickAddingClient}>
                          <SelectTrigger className="h-10">
                            <SelectValue placeholder="Buscar na minha base de contatos..." />
                          </SelectTrigger>
                          <SelectContent>
                              {customers.map(c => (
                                <SelectItem key={c.id} value={c.id}>
                                    <div className="flex items-center justify-between w-full">
                                        <span>{c.nomeFantasia || c.name}</span>
                                        <Badge variant="outline" className="ml-2 text-[8px] uppercase">{c.type === 'lead' ? 'Lead' : 'Cliente'}</Badge>
                                    </div>
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <Button type="button" variant="secondary" onClick={handleQuickAddClient} className="h-10 gap-2">
                        <PlusCircle className="h-4 w-4" />
                        Outro
                      </Button>
                    </div>

                    {isQuickAddingClient && (
                      <div className="p-5 border rounded-xl bg-muted/20 space-y-5 animate-in fade-in slide-in-from-top-2 duration-300">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField control={form.control} name="clientName" render={({ field }) => (
                            <FormItem><FormLabel>Empresa / Cliente</FormLabel><FormControl><Input placeholder="Nome da empresa" {...field} className="h-9" /></FormControl></FormItem>
                          )} />
                          <FormField control={form.control} name="contactName" render={({ field }) => (
                            <FormItem><FormLabel>Pessoa de Contato</FormLabel><FormControl><Input placeholder="Ex: Sr. Ricardo" {...field} className="h-9" /></FormControl></FormItem>
                          )} />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField control={form.control} name="clientPhone" render={({ field }) => (
                            <FormItem><FormLabel>Telefone / WhatsApp</FormLabel><FormControl><Input placeholder="(00) 00000-0000" {...field} onChange={(e) => field.onChange(formatPhoneNumber(e.target.value))} className="h-9" /></FormControl></FormItem>
                            )} />
                            <FormField control={form.control} name="contactType" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Cadastrar como</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <FormControl><SelectTrigger className="h-9"><SelectValue /></SelectTrigger></FormControl>
                                        <SelectContent>
                                            <SelectItem value="lead">Lead (Para o Funil de Vendas)</SelectItem>
                                            <SelectItem value="one_time">Cliente (Venda Avulsa)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </FormItem>
                            )} />
                        </div>
                        <div className="flex items-center justify-between p-3 bg-primary/5 rounded-lg border border-primary/10">
                          <div className="space-y-0.5">
                            <p className="text-xs font-bold text-primary flex items-center gap-2">
                                <Settings className="h-3 w-3" /> Salvar nos meus contatos?
                            </p>
                            <p className="text-[10px] text-muted-foreground">Isso adicionará os dados à sua base de CRM automaticamente.</p>
                          </div>
                          <FormField control={form.control} name="saveToContacts" render={({ field }) => (
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                          )} />
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-4 border-t pt-8">
                    <div className="flex items-center justify-between">
                        <h4 className="text-sm font-bold flex items-center gap-2">
                            <LayoutGrid className="h-4 w-4 text-primary" /> Opção de Itens Principal (Opção A)
                        </h4>
                        <Button type="button" variant="outline" size="sm" onClick={() => appendA({ name: '', quantity: 1, price: 0, isMonthly: false })} className="h-8 gap-2">
                            <PlusCircle className="h-3.5 w-3.5" /> Adicionar Item
                        </Button>
                    </div>
                    <div className="rounded-xl border overflow-hidden">
                        <Table>
                        <TableHeader className="bg-muted/50">
                            <TableRow>
                                <TableHead className="text-xs">Descrição do Item</TableHead>
                                <TableHead className="w-20 text-xs">Qtd.</TableHead>
                                <TableHead className="w-28 text-xs">Preço Unit.</TableHead>
                                <TableHead className="w-24 text-xs">Faturamento</TableHead>
                                <TableHead className="w-10"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {fieldsA.map((it, idx) => (
                            <TableRow key={it.id} className="hover:bg-transparent">
                                <TableCell className="py-2">
                                    <Input {...form.register(`items.${idx}.name`)} onBlur={() => handleItemNameBlur(idx, false)} list="proposal-products-list" className="h-8 text-xs border-none bg-muted/20 focus-visible:ring-1" />
                                </TableCell>
                                <TableCell className="py-2">
                                    <Input type="number" {...form.register(`items.${idx}.quantity`)} className="h-8 text-xs border-none bg-muted/20 text-center" />
                                </TableCell>
                                <TableCell className="py-2">
                                    <Input type="number" step="0.01" {...form.register(`items.${idx}.price`)} className="h-8 text-xs border-none bg-muted/20 text-right" />
                                </TableCell>
                                <TableCell className="py-2">
                                <Controller control={form.control} name={`items.${idx}.isMonthly`} render={({ field }) => (
                                    <Select onValueChange={v => field.onChange(v === 'M')} value={field.value ? 'M' : 'U'}>
                                    <SelectTrigger className="h-8 text-[10px] uppercase font-bold border-none bg-muted/30"><SelectValue /></SelectTrigger>
                                    <SelectContent><SelectItem value="U">Único</SelectItem><SelectItem value="M">Mensal</SelectItem></SelectContent>
                                    </Select>
                                )} />
                                </TableCell>
                                <TableCell className="py-2 text-right">
                                    <Button type="button" variant="ghost" size="icon" onClick={() => removeA(idx)} className="h-8 w-8 text-destructive/50 hover:text-destructive">
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                </TableCell>
                            </TableRow>
                            ))}
                        </TableBody>
                        </Table>
                    </div>
                  </div>

                  <div className="p-4 bg-primary/5 rounded-xl border border-primary/10 flex items-center justify-between">
                    <div className="space-y-1">
                        <Label className="font-bold flex items-center gap-2 cursor-pointer" htmlFor="has-alt">
                           <Copy className="h-4 w-4 text-primary" /> Oferecer Alternativa (Opção B)
                        </Label>
                        <p className="text-xs text-muted-foreground">Adiciona uma segunda opção completa ("OU") na mesma proposta.</p>
                    </div>
                    <FormField control={form.control} name="hasAlternative" render={({ field }) => (
                        <Switch id="has-alt" checked={field.value} onCheckedChange={field.onChange} />
                    )} />
                  </div>

                  {watchHasAlternative && (
                    <div className="space-y-4 border-t pt-8 animate-in slide-in-from-top-4 duration-300">
                        <div className="flex items-center justify-between">
                            <h4 className="text-sm font-bold flex items-center gap-2 text-orange-500">
                                <LayoutGrid className="h-4 w-4" /> Opção Alternativa (Opção B)
                            </h4>
                            <Button type="button" variant="outline" size="sm" onClick={() => appendB({ name: '', quantity: 1, price: 0, isMonthly: false })} className="h-8 gap-2 border-orange-500/30 text-orange-500">
                                <PlusCircle className="h-3.5 w-3.5" /> Adicionar Item B
                            </Button>
                        </div>
                        <div className="rounded-xl border border-orange-500/20 overflow-hidden">
                            <Table>
                            <TableHeader className="bg-orange-500/5">
                                <TableRow>
                                    <TableHead className="text-xs">Descrição do Item B</TableHead>
                                    <TableHead className="w-20 text-xs">Qtd.</TableHead>
                                    <TableHead className="w-28 text-xs">Preço Unit.</TableHead>
                                    <TableHead className="w-24 text-xs">Faturamento</TableHead>
                                    <TableHead className="w-10"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {fieldsB.map((it, idx) => (
                                <TableRow key={it.id} className="hover:bg-transparent">
                                    <TableCell className="py-2">
                                        <Input {...form.register(`alternativeItems.${idx}.name` as any)} onBlur={() => handleItemNameBlur(idx, true)} list="proposal-products-list" className="h-8 text-xs border-none bg-orange-500/5 focus-visible:ring-1 focus-visible:ring-orange-500/50" />
                                    </TableCell>
                                    <TableCell className="py-2">
                                        <Input type="number" {...form.register(`alternativeItems.${idx}.quantity` as any)} className="h-8 text-xs border-none bg-orange-500/5 text-center" />
                                    </TableCell>
                                    <TableCell className="py-2">
                                        <Input type="number" step="0.01" {...form.register(`alternativeItems.${idx}.price` as any)} className="h-8 text-xs border-none bg-orange-500/5 text-right" />
                                    </TableCell>
                                    <TableCell className="py-2">
                                    <Controller control={form.control} name={`alternativeItems.${idx}.isMonthly` as any} render={({ field }) => (
                                        <Select onValueChange={v => field.onChange(v === 'M')} value={field.value ? 'M' : 'U'}>
                                        <SelectTrigger className="h-8 text-[10px] uppercase font-bold border-none bg-orange-500/10"><SelectValue /></SelectTrigger>
                                        <SelectContent><SelectItem value="U">Único</SelectItem><SelectItem value="M">Mensal</SelectItem></SelectContent>
                                        </Select>
                                    )} />
                                    </TableCell>
                                    <TableCell className="py-2 text-right">
                                        <Button type="button" variant="ghost" size="icon" onClick={() => removeB(idx)} className="h-8 w-8 text-destructive/50 hover:text-destructive">
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                                ))}
                                {fieldsB.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-16 text-center text-xs text-muted-foreground italic">
                                            Nenhum item adicionado na Opção B.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                            </Table>
                        </div>
                    </div>
                  )}

                  <div className="border-t pt-8">
                    <FormField control={form.control} name="observations" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-bold flex items-center gap-2">
                            <FileText className="h-4 w-4 text-primary" /> Condições e Prazos Adicionais
                        </FormLabel>
                        <FormControl>
                            <Textarea rows={3} placeholder="Ex: Prazo de entrega: 5 dias úteis após aprovação..." {...field} className="text-xs resize-none" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                </CardContent>
              </Card>
            </form>
          </Form>
        </div>

        <div className="lg:col-span-1 space-y-6">
          <Card className="shadow-lg border-primary/10 overflow-hidden sticky top-4">
            <CardHeader className="bg-primary/5 pb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                    <CreditCard className="h-5 w-5 text-primary" /> Faturamento
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              <div className="space-y-2">
                <Label className="text-xs uppercase font-bold text-muted-foreground">Meio de Pagamento</Label>
                <Controller control={form.control} name="paymentMethod" render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="boleto">Boleto Bancário</SelectItem>
                        <SelectItem value="pix">Transferência PIX</SelectItem>
                        <SelectItem value="cartao">Até 12x no Cartão</SelectItem>
                        <SelectItem value="faturamento">Faturamento Direto</SelectItem>
                    </SelectContent>
                  </Select>
                )} />
              </div>
              <div className="space-y-2">
                <Label className="text-xs uppercase font-bold text-muted-foreground">Parcelamento (Ref. Opção A)</Label>
                <Controller control={form.control} name="installments" render={({ field }) => (
                  <Select onValueChange={v => field.onChange(Number(v))} value={String(field.value)}>
                    <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                    <SelectContent>
                        {[...Array(12)].map((_, i) => (
                            <SelectItem key={i+1} value={String(i+1)}>
                                {i+1}x de {((totalsA.oneTime / (i+1)) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                )} />
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/40 border">
                <Label className="text-xs font-medium cursor-pointer" htmlFor="down-payment-switch">1ª parcela como entrada?</Label>
                <Controller control={form.control} name="firstAsDownPayment" render={({ field }) => (
                    <Switch id="down-payment-switch" checked={field.value} onCheckedChange={field.onChange} />
                )} />
              </div>
              
              <Separator />
              
              <div className="space-y-4">
                <div className="space-y-2">
                    <p className="text-[10px] uppercase font-bold text-muted-foreground">Resumo Opção A:</p>
                    <div className="flex justify-between items-center bg-primary/5 p-3 rounded-lg border border-primary/10">
                        <span className="text-xs font-bold text-primary">Venda A:</span>
                        <span className="text-sm font-bold text-primary">{totalsA.oneTime.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                    </div>
                    {totalsA.monthly > 0 && (
                        <div className="flex justify-between items-center bg-emerald-500/5 p-2 rounded-lg border border-emerald-500/10">
                            <span className="text-[10px] font-bold text-emerald-600">Mensal A:</span>
                            <span className="text-xs font-bold text-emerald-600">{totalsA.monthly.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                        </div>
                    )}
                </div>

                {watchHasAlternative && (
                    <div className="space-y-2 border-t border-orange-500/20 pt-4">
                        <p className="text-[10px] uppercase font-bold text-orange-500">Resumo Opção B:</p>
                        <div className="flex justify-between items-center bg-orange-500/5 p-3 rounded-lg border border-orange-500/20">
                            <span className="text-xs font-bold text-orange-600">Venda B:</span>
                            <span className="text-sm font-bold text-orange-600">{totalsB.oneTime.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                        </div>
                        {totalsB.monthly > 0 && (
                            <div className="flex justify-between items-center bg-orange-500/5 p-2 rounded-lg border border-orange-500/10">
                                <span className="text-[10px] font-bold text-orange-600">Mensal B:</span>
                                <span className="text-xs font-bold text-orange-600">{totalsB.monthly.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                            </div>
                        )}
                    </div>
                )}
              </div>
            </CardContent>
            <CardFooter className="bg-muted/10 pt-6">
                <Button type="submit" form="proposal-form" className="w-full h-11 font-bold shadow-md">
                    {editingProposal ? 'Atualizar Orçamento' : 'Finalizar e Salvar'}
                </Button>
            </CardFooter>
          </Card>
        </div>
      </div>

      <Card className="shadow-lg mt-8 overflow-hidden">
        <CardHeader className="bg-muted/30">
            <CardTitle className="text-lg">Orçamentos Enviados</CardTitle>
            <CardDescription>Consulte e gerencie as propostas geradas.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
                <TableRow>
                    <TableHead className="w-24 pl-6">Nº ID</TableHead>
                    <TableHead>Cliente Destinatário</TableHead>
                    <TableHead>Data Emissão</TableHead>
                    <TableHead>Modo</TableHead>
                    <TableHead className="text-right pr-6">Investimento (A)</TableHead>
                    <TableHead className="text-right w-40 pr-6">Ações</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
              {proposals.map(p => (
                <TableRow key={p.id} className="group hover:bg-muted/20">
                  <TableCell className="font-mono font-bold pl-6 text-primary">#{p.id}</TableCell>
                  <TableCell className="font-medium">{p.clientName}</TableCell>
                  <TableCell className="text-muted-foreground text-xs">{format(parseISO(p.proposalDate), 'dd/MM/yyyy')}</TableCell>
                  <TableCell>
                    {p.hasAlternative ? (
                        <Badge variant="outline" className="bg-orange-500/10 text-orange-600 border-orange-500/30 text-[9px] font-bold">2 OPÇÕES (OU)</Badge>
                    ) : (
                        <Badge variant="outline" className="text-[9px]">PADRÃO</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right font-bold pr-6">
                    {p.totalOneTime.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </TableCell>
                  <TableCell className="text-right pr-6">
                    <div className="flex justify-end gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleCloneProposalClick(p)} title="Duplicar"><Copy className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEditProposalClick(p)} title="Editar"><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-primary" onClick={() => setSelectedProposal(p)} title="Visualizar PDF"><Printer className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => setDeletingProposal(p)} title="Excluir"><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {proposals.length === 0 && (
                <TableRow><TableCell colSpan={6} className="h-24 text-center text-muted-foreground italic">Nenhuma proposta gerada ainda.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!selectedProposal} onOpenChange={o => !o && setSelectedProposal(null)}>
        <DialogContent className="sm:max-w-[950px] h-[95vh] flex flex-col p-0 overflow-hidden bg-background border-none shadow-2xl">
          <DialogHeader className="p-6 pb-0 border-b bg-muted/20 flex flex-row items-center justify-between space-y-0">
            <DialogTitle className="text-xl">Visualização da Proposta</DialogTitle>
            <Button variant="ghost" size="icon" onClick={() => setSelectedProposal(null)} className="h-8 w-8 rounded-full"><XCircle className="h-5 w-5" /></Button>
          </DialogHeader>
          
          <ScrollArea className="flex-1 bg-[#F5F5F5] p-10">
            <div 
                id="proposal-preview" 
                className="bg-white text-black mx-auto shadow-2xl" 
                style={{ 
                    width: '210mm', 
                    minHeight: '297mm', 
                    padding: '15mm',
                    fontFamily: 'Arial, sans-serif',
                    fontSize: '11pt',
                    lineHeight: '1.4',
                    color: '#000000',
                    letterSpacing: '0.3pt',
                    wordSpacing: 'normal',
                    fontVariantLigatures: 'none'
                }}
            >
              {/* Estrutura de Cabeçalho via Tabela para estabilidade total */}
              <table style={{ width: '100%', marginBottom: '35px', borderCollapse: 'collapse' }}>
                <tbody>
                    <tr>
                        <td style={{ width: '5px', backgroundColor: '#000000', padding: '0' }}></td>
                        <td style={{ padding: '0 20px', width: '170px', verticalAlign: 'top' }}>
                        {companyProfile.logoUrl && (
                            <img 
                            src={companyProfile.logoUrl} 
                            alt="Logo" 
                            style={{ maxHeight: '160px', width: 'auto', display: 'block', objectFit: 'contain' }} 
                            />
                        )}
                        </td>
                        <td style={{ verticalAlign: 'top', textAlign: 'left' }}>
                            <h2 style={{ fontSize: '16pt', fontWeight: 'bold', margin: '0', textTransform: 'uppercase' }}>{companyProfile.name}</h2>
                            <p style={{ margin: '2px 0', fontSize: '10pt', color: '#333' }}>{companyProfile.email} | {formatPhoneNumber(companyProfile.phone)}</p>
                            <p style={{ margin: '0', fontSize: '9.5pt', color: '#555' }}>{companyProfile.address}</p>
                        </td>
                    </tr>
                </tbody>
              </table>

              <div style={{ marginBottom: '45px', textAlign: 'center' }}>
                <p style={{ 
                    fontWeight: 'bold', 
                    margin: '0', 
                    fontSize: '15pt', 
                    textTransform: 'uppercase', 
                    borderBottom: '2.5px solid black', 
                    display: 'inline-block', 
                    paddingBottom: '3px',
                    letterSpacing: '1px'
                }}>
                    PROPOSTA COMERCIAL
                </p>
              </div>

              <table style={{ width: '100%', marginBottom: '40px', borderCollapse: 'collapse' }}>
                <tbody>
                    <tr>
                        <td style={{ verticalAlign: 'top', textAlign: 'left' }}>
                            <p style={{ color: '#666666', fontSize: '8.5pt', fontWeight: 'bold', textTransform: 'uppercase', margin: '0 0 6px 0' }}>DESTINATÁRIO</p>
                            <h1 style={{ fontSize: '15pt', fontWeight: 'bold', margin: '0', textTransform: 'uppercase', lineHeight: '1.2' }}>{selectedProposal?.clientName}</h1>
                            <p style={{ color: '#4F46E5', fontWeight: 'bold', margin: '6px 0 2px 0', fontSize: '11.5pt' }}>A/C: {selectedProposal?.contactName?.toUpperCase() || 'SETOR RESPONSÁVEL'}</p>
                            {selectedProposal?.clientPhone && <p style={{ color: '#666666', margin: '0', fontSize: '10.5pt' }}>{formatPhoneNumber(selectedProposal.clientPhone)}</p>}
                        </td>
                        <td style={{ verticalAlign: 'top', textAlign: 'right', fontSize: '10.5pt', width: '200px' }}>
                            <p style={{ margin: '4px 0' }}><strong>Nº PROPOSTA:</strong> {selectedProposal?.id}</p>
                            <p style={{ margin: '4px 0' }}><strong>EMISSÃO:</strong> {selectedProposal && format(parseISO(selectedProposal.proposalDate), 'dd/MM/yyyy')}</p>
                            <p style={{ margin: '4px 0' }}><strong>VALIDADE:</strong> <span style={{ color: '#EF4444', fontWeight: 'bold' }}>{selectedProposal && format(parseISO(selectedProposal.validityDate), 'dd/MM/yyyy')}</span></p>
                        </td>
                    </tr>
                </tbody>
              </table>

              <div style={{ marginBottom: '35px', textAlign: 'left', fontSize: '11pt', lineHeight: '1.5' }}>
                <p style={{ marginBottom: '20px' }}>Temos a satisfação de apresentar nossa proposta comercial desenvolvida com foco total na excelência tecnológica e na eficiência operacional que sua empresa demanda.</p>
                <p style={{ marginBottom: '20px' }}>Com ampla experiência de mercado a {companyProfile.name} combina consultoria especializada e as mais modernas ferramentas de TI para entregar soluções ágeis, seguras e personalizadas.</p>
              </div>

              {/* OPÇÃO 01 */}
              {selectedProposal?.hasAlternative && (
                  <p style={{ fontWeight: 'bold', marginBottom: '10px', fontSize: '11pt', color: '#4F46E5', borderLeft: '4px solid #4F46E5', paddingLeft: '10px' }}>OPÇÃO 01:</p>
              )}
              
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10.5pt', textAlign: 'left', marginBottom: '15px' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #000000' }}>
                    <th style={{ padding: '12px 5px', fontWeight: 'bold' }}>DESCRIÇÃO DO SERVIÇO OU PRODUTO</th>
                    <th style={{ padding: '12px 5px', textAlign: 'center', width: '60px', fontWeight: 'bold' }}>QTD.</th>
                    <th style={{ padding: '12px 5px', textAlign: 'right', width: '110px', fontWeight: 'bold' }}>PREÇO UNIT.</th>
                    <th style={{ padding: '12px 5px', textAlign: 'right', width: '110px', fontWeight: 'bold' }}>SUBTOTAL</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedProposal?.items.map((it, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #DDDDDD' }}>
                      <td style={{ padding: '10px 5px', fontWeight: 'bold' }}>{it.name.toUpperCase()}</td>
                      <td style={{ padding: '10px 5px', textAlign: 'center' }}>{it.quantity}</td>
                      <td style={{ padding: '10px 5px', textAlign: 'right' }}>{it.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                      <td style={{ padding: '10px 5px', textAlign: 'right', fontWeight: 'bold' }}>{(it.quantity * it.price).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div style={{ textAlign: 'right', marginBottom: selectedProposal?.hasAlternative ? '30px' : '45px' }}>
                <div style={{ 
                    padding: '10px 20px', 
                    backgroundColor: '#F8FAFC', 
                    border: '1.5px solid #E2E8F0', 
                    borderRadius: '6px',
                    display: 'inline-block'
                }}>
                    <span style={{ fontSize: '9pt', fontWeight: 'bold', textTransform: 'uppercase', marginRight: '30px' }}>TOTAL OPÇÃO 01</span>
                    <span style={{ fontSize: '12pt', fontWeight: 'bold', color: '#000000' }}>{selectedProposal?.totalOneTime.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                </div>
              </div>

              {/* DIVISOR "OU" SE HOUVER ALTERNATIVA */}
              {selectedProposal?.hasAlternative && (
                  <>
                    <div style={{ textAlign: 'center', margin: '40px 0', position: 'relative' }}>
                        <div style={{ borderTop: '1px dashed #A0AEC0', width: '100%', position: 'absolute', top: '50%' }}></div>
                        <span style={{ 
                            position: 'relative', 
                            backgroundColor: '#FFFFFF', 
                            padding: '0 20px', 
                            fontWeight: 'bold', 
                            fontSize: '14pt', 
                            color: '#EF4444',
                            zIndex: '1',
                            letterSpacing: '2px'
                        }}>OU</span>
                    </div>

                    <p style={{ fontWeight: 'bold', marginBottom: '10px', fontSize: '11pt', color: '#4F46E5', borderLeft: '4px solid #4F46E5', paddingLeft: '10px' }}>OPÇÃO 02:</p>
                    
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10.5pt', textAlign: 'left', marginBottom: '15px' }}>
                        <thead>
                        <tr style={{ borderBottom: '2px solid #000000' }}>
                            <th style={{ padding: '12px 5px', fontWeight: 'bold' }}>DESCRIÇÃO DO SERVIÇO OU PRODUTO</th>
                            <th style={{ padding: '12px 5px', textAlign: 'center', width: '60px', fontWeight: 'bold' }}>QTD.</th>
                            <th style={{ padding: '12px 5px', textAlign: 'right', width: '110px', fontWeight: 'bold' }}>PREÇO UNIT.</th>
                            <th style={{ padding: '12px 5px', textAlign: 'right', width: '110px', fontWeight: 'bold' }}>SUBTOTAL</th>
                        </tr>
                        </thead>
                        <tbody>
                        {(selectedProposal?.alternativeItems || []).map((it, i) => (
                            <tr key={i} style={{ borderBottom: '1px solid #DDDDDD' }}>
                            <td style={{ padding: '10px 5px', fontWeight: 'bold' }}>{it.name.toUpperCase()}</td>
                            <td style={{ padding: '10px 5px', textAlign: 'center' }}>{it.quantity}</td>
                            <td style={{ padding: '10px 5px', textAlign: 'right' }}>{it.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                            <td style={{ padding: '10px 5px', textAlign: 'right', fontWeight: 'bold' }}>{(it.quantity * it.price).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                            </tr>
                        ))}
                        </tbody>
                    </table>

                    <div style={{ textAlign: 'right', marginBottom: '45px' }}>
                        <div style={{ 
                            padding: '10px 20px', 
                            backgroundColor: '#F8FAFC', 
                            border: '1.5px solid #E2E8F0', 
                            borderRadius: '6px',
                            display: 'inline-block'
                        }}>
                            <span style={{ fontSize: '9pt', fontWeight: 'bold', textTransform: 'uppercase', marginRight: '30px' }}>TOTAL OPÇÃO 02</span>
                            <span style={{ fontSize: '12pt', fontWeight: 'bold', color: '#000000' }}>{selectedProposal?.totalOneTimeAlt?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                        </div>
                    </div>
                  </>
              )}

              <div style={{ padding: '20px', border: '1.5px solid #000000', borderRadius: '5px', marginBottom: '80px' }}>
                <p style={{ fontWeight: 'bold', marginBottom: '12px', fontSize: '11pt', textDecoration: 'underline', textTransform: 'uppercase' }}>CONDIÇÕES DE PAGAMENTO</p>
                <div style={{ fontSize: '10.5pt', lineHeight: '1.5' }}>
                    <p style={{ margin: '4px 0' }}>• FORMA DE PAGAMENTO: {selectedProposal?.paymentMethod.toUpperCase()}</p>
                    <p style={{ margin: '4px 0' }}>• CONDIÇÃO: {selectedProposal?.installments}X SEM JUROS.</p>
                    {selectedProposal?.firstAsDownPayment && <p style={{ margin: '4px 0', fontStyle: 'italic' }}>• PRIMEIRA PARCELA COMO ENTRADA.</p>}
                </div>
                
                {selectedProposal?.observations && (
                    <div style={{ marginTop: '20px', borderTop: '1px solid #DDDDDD', paddingTop: '12px' }}>
                        <p style={{ fontWeight: 'bold', marginBottom: '6px', fontSize: '10.5pt' }}>OBSERVAÇÕES E PRAZOS:</p>
                        <p style={{ fontSize: '10pt', whiteSpace: 'pre-wrap' }}>{selectedProposal.observations}</p>
                    </div>
                )}
              </div>

              <table style={{ width: '100%', textAlign: 'center', fontSize: '9.5pt', borderCollapse: 'collapse' }}>
                <tbody>
                  <tr>
                    <td style={{ width: '230px', padding: '0 20px' }}>
                      <div style={{ borderTop: '1.5px solid #000000', marginBottom: '6px' }}></div>
                      <p style={{ fontWeight: 'bold', margin: '0' }}>{companyProfile.name.toUpperCase()}</p>
                      <p style={{ color: '#666666' }}>EMITENTE RESPONSÁVEL</p>
                    </td>
                    <td></td>
                    <td style={{ width: '230px', padding: '0 20px' }}>
                      <div style={{ borderTop: '1.5px solid #000000', marginBottom: '6px' }}></div>
                      <p style={{ fontWeight: 'bold', margin: '0' }}>{selectedProposal?.clientName.toUpperCase()}</p>
                      <p style={{ color: '#666666' }}>ACEITE DO CLIENTE</p>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </ScrollArea>
          
          <DialogFooter className="p-6 border-t bg-muted/20 gap-3">
            <Button variant="outline" onClick={() => setSelectedProposal(null)}>Cancelar</Button>
            <Button variant="secondary" onClick={handleDownloadPdf} disabled={isDownloading} className="gap-2">
                {isDownloading ? <Loader2 className="animate-spin h-4 w-4" /> : <Printer className="h-4 w-4" />} 
                Baixar PDF
            </Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700 gap-2" onClick={() => handleSharePdf(selectedProposal!)} disabled={isSharing}>
                <Share2 className="h-4 w-4" /> 
                {isSharing ? 'Processando...' : 'Enviar WhatsApp'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletingProposal} onOpenChange={o => !o && setDeletingProposal(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Excluir Proposta?</AlertDialogTitle>
                <AlertDialogDescription>Essa ação não pode ser desfeita.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Voltar</AlertDialogCancel>
                <AlertDialogAction onClick={() => { deleteProposal(deletingProposal!.id); setDeletingProposal(null); }} className="bg-destructive">Confirmar</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
