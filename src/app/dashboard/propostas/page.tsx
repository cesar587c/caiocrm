'use client';

import { useState, useMemo, useEffect } from 'react';
import { useForm, useFieldArray, Controller, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { addDays, format, parseISO } from 'date-fns';
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
  History,
  Eye,
  Search,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

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
  
  const [isQuickAddingClient, setIsQuickAddingClient] = useState(false);
  const [selectedProposal, setSelectedProposal] = useState<Proposal | null>(null);
  const [deletingProposal, setDeletingProposal] = useState<Proposal | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [editingProposal, setEditingProposal] = useState<Proposal | null>(null);
  const [activeTab, setActiveTab] = useState('gerador');
  const [proposalSearch, setProposalSearch] = useState('');

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

  const filteredProposals = useMemo(() => {
    const term = proposalSearch.toLowerCase();
    return (proposals || []).filter(p => 
      p.clientName.toLowerCase().includes(term) || 
      p.id.toLowerCase().includes(term)
    );
  }, [proposals, proposalSearch]);

  const handleClientSelect = (clientId: string) => {
    const client = customers.find(c => c.id === clientId);
    if (client) {
      form.setValue('clientId', client.id);
      form.setValue('clientName', client.nomeFantasia || client.name);
      form.setValue('contactName', client.contactName || '');
      form.setValue('clientPhone', formatPhoneNumber(client.telefone || ''));
      setIsQuickAddingClient(false);
    }
  };

  const handleItemNameBlur = (index: number, isAlt: boolean = false) => {
      const fieldName = isAlt ? `alternativeItems.${index}.name` : `items.${index}.name`;
      const priceName = isAlt ? `alternativeItems.${index}.price` : `items.${index}.price`;
      const itemName = form.getValues(fieldName as any);
      if (!itemName) return;
      const existingProduct = products.find(p => p.name.toLowerCase().trim() === itemName.toLowerCase().trim());
      if (existingProduct) {
          form.setValue(priceName as any, existingProduct.price, { shouldDirty: true, shouldTouch: true });
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
                        // REGRA DE OURO - BLINDADO PARA ESPECIALISTA CONTRA FUSÃO DE PALAVRAS
                        node.style.letterSpacing = '0.3pt';
                        node.style.wordSpacing = 'normal';
                        node.style.fontVariantLigatures = 'none';
                        node.style.webkitFontSmoothing = 'antialiased';
                        node.style.textRendering = 'optimizeLegibility';
                    });
                }
            }
        });
        
        const imgData = canvas.toDataURL('image/png', 1.0);
        const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
        pdf.addImage(imgData, 'PNG', 0, 0, 210, 297);
        pdf.save(`proposta-${selectedProposal.id}.pdf`);
    } catch (e) {
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
                        // REGRA DE OURO - BLINDADO PARA ESPECIALISTA
                        node.style.letterSpacing = '0.3pt';
                        node.style.fontVariantLigatures = 'none';
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
      ...p,
      proposalDate: new Date(p.proposalDate),
      validityDate: new Date(p.validityDate),
      clientPhone: formatPhoneNumber(p.clientPhone || ''),
    });
    setIsQuickAddingClient(!p.clientId);
    setActiveTab('gerador');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCloneProposal = (p: Proposal) => {
    setEditingProposal(null);
    form.reset({
      ...p,
      proposalDate: new Date(),
      validityDate: addDays(new Date(), 10),
      clientPhone: formatPhoneNumber(p.clientPhone || ''),
    });
    setIsQuickAddingClient(!p.clientId);
    setActiveTab('gerador');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    toast({ 
        title: 'Proposta Clonada!', 
        description: 'Os dados foram carregados no gerador. Ajuste o necessário e salve para criar uma nova proposta.' 
    });
  };

  const onSubmit = (data: ProposalFormValues) => {
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
        });
    }

    const proposalData: Proposal = {
        ...data,
        id: editingProposal ? editingProposal.id : String(Date.now()),
        clientPhone: data.clientPhone?.replace(/\D/g, ''),
        proposalDate: data.proposalDate.toISOString(),
        validityDate: data.validityDate.toISOString(),
        totalOneTime: totalsA.oneTime,
        totalMonthly: totalsA.monthly,
        totalOneTimeAlt: data.hasAlternative ? totalsB.oneTime : undefined,
        totalMonthlyAlt: data.hasAlternative ? totalsB.monthly : undefined,
    } as Proposal;

    if (editingProposal) {
      updateProposal(proposalData);
      toast({ title: 'Proposta Atualizada!' });
    } else {
      addProposal(proposalData);
      toast({ title: 'Proposta Salva!' });
    }
    setEditingProposal(null);
    form.reset({
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
    });
    setActiveTab('historico');
  };

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6 bg-background/50">
      <datalist id="proposal-products-list">
        {products.map(p => <option key={p.id} value={p.name} />)}
      </datalist>
      
      <div className="flex items-center justify-between">
        <div>
            <h2 className="text-3xl font-bold tracking-tight font-headline text-foreground">Gerador de Propostas</h2>
            <p className="text-muted-foreground">Crie orçamentos profissionais com alternativas e layout blindado.</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full max-w-[400px] grid-cols-2">
            <TabsTrigger value="gerador" className="gap-2"><LayoutGrid className="h-4 w-4" /> Novo Orçamento</TabsTrigger>
            <TabsTrigger value="historico" className="gap-2"><History className="h-4 w-4" /> Últimas Propostas</TabsTrigger>
        </TabsList>

        <TabsContent value="gerador">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} id="proposal-form">
                    <Card className="shadow-lg border-primary/10">
                        <CardHeader className="flex flex-row items-start justify-between pb-6">
                        <div className="space-y-1">
                            <CardTitle className="text-xl flex items-center gap-2">
                                <FileText className="h-5 w-5 text-primary" />
                                {editingProposal ? `Editar Proposta #${editingProposal.id}` : 'Configurar Orçamento'}
                            </CardTitle>
                        </div>
                        <div className="flex gap-4">
                            <FormField control={form.control} name="proposalDate" render={({ field }) => (
                            <div className="space-y-1">
                                <Label className="text-[10px] uppercase font-bold text-muted-foreground">Emissão</Label>
                                <Popover><PopoverTrigger asChild><Button variant="outline" size="sm" className="w-[125px] h-9 text-xs">{field.value ? format(field.value, "dd/MM/yyyy") : 'Data'}</Button></PopoverTrigger><PopoverContent className="p-0 w-auto"><Calendar mode="single" selected={field.value} onSelect={field.onChange} /></PopoverContent></Popover>
                            </div>
                            )} />
                            <FormField control={form.control} name="validityDate" render={({ field }) => (
                            <div className="space-y-1">
                                <Label className="text-[10px] uppercase font-bold text-muted-foreground">Validade</Label>
                                <Popover><PopoverTrigger asChild><Button variant="outline" size="sm" className="w-[125px] h-9 text-xs">{field.value ? format(field.value, "dd/MM/yyyy") : 'Data'}</Button></PopoverTrigger><PopoverContent className="p-0 w-auto"><Calendar mode="single" selected={field.value} onSelect={field.onChange} /></PopoverContent></Popover>
                            </div>
                            )} />
                        </div>
                        </CardHeader>
                        <CardContent className="border-t pt-8 space-y-8">
                        <div className="flex items-center gap-5 p-4 rounded-xl bg-muted/30 border">
                            {companyProfile.logoUrl && <img src={companyProfile.logoUrl} alt="Logo" className="h-14 w-auto object-contain rounded" />}
                            <div className="space-y-0.5">
                            <h3 className="font-bold text-lg leading-none">{companyProfile.name}</h3>
                            <p className="text-xs text-muted-foreground">{companyProfile.email} | {formatPhoneNumber(companyProfile.phone)}</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-center gap-2"><Label className="text-sm font-semibold">Cliente Destinatário</Label></div>
                            <div className="flex gap-3">
                            <Select onValueChange={handleClientSelect} disabled={isQuickAddingClient}>
                                <SelectTrigger className="flex-1"><SelectValue placeholder="Buscar cliente..." /></SelectTrigger>
                                <SelectContent>{customers.map(c => <SelectItem key={c.id} value={c.id}>{c.nomeFantasia || c.name}</SelectItem>)}</SelectContent>
                            </Select>
                            <Button type="button" variant="secondary" onClick={() => setIsQuickAddingClient(true)} className="gap-2"><PlusCircle className="h-4 w-4" /> Outro</Button>
                            </div>

                            {isQuickAddingClient && (
                            <div className="p-5 border rounded-xl bg-muted/20 space-y-5">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormField control={form.control} name="clientName" render={({ field }) => (<FormItem><FormLabel>Empresa / Cliente</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} />
                                <FormField control={form.control} name="contactName" render={({ field }) => (<FormItem><FormLabel>Pessoa de Contato</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} />
                                </div>
                                <div className="flex items-center justify-between p-3 bg-primary/5 rounded-lg border">
                                <div className="space-y-0.5"><p className="text-xs font-bold text-primary">Salvar nos contatos?</p></div>
                                <FormField control={form.control} name="saveToContacts" render={({ field }) => (<Switch checked={field.value} onCheckedChange={field.onChange} />)} />
                                </div>
                            </div>
                            )}
                        </div>

                        <div className="space-y-4 border-t pt-8">
                            <div className="flex items-center justify-between">
                                <h4 className="text-sm font-bold">Opção Principal (Opção A)</h4>
                                <Button type="button" variant="outline" size="sm" onClick={() => appendA({ name: '', quantity: 1, price: 0, isMonthly: false })} className="gap-2"><PlusCircle className="h-3.5 w-3.5" /> Adicionar Manualmente</Button>
                            </div>
                            <Table>
                                <TableHeader><TableRow><TableHead>Descrição do Item</TableHead><TableHead className="w-20">Qtd.</TableHead><TableHead className="w-28">Preço Unit.</TableHead><TableHead className="w-24">Tipo</TableHead><TableHead className="w-10"></TableHead></TableRow></TableHeader>
                                <TableBody>
                                    {fieldsA.map((it, idx) => (
                                    <TableRow key={it.id}>
                                        <TableCell><Input {...form.register(`items.${idx}.name`)} onBlur={() => handleItemNameBlur(idx, false)} list="proposal-products-list" className="h-8 text-xs" /></TableCell>
                                        <TableCell><Input type="number" {...form.register(`items.${idx}.quantity`)} className="h-8 text-xs" /></TableCell>
                                        <TableCell><Input type="number" step="0.01" {...form.register(`items.${idx}.price`)} className="h-8 text-xs" /></TableCell>
                                        <TableCell>
                                            <Controller control={form.control} name={`items.${idx}.isMonthly`} render={({ field }) => (
                                                <Select onValueChange={v => field.onChange(v === 'M')} value={field.value ? 'M' : 'U'}>
                                                    <SelectTrigger className="h-8 text-[10px]"><SelectValue /></SelectTrigger>
                                                    <SelectContent><SelectItem value="U">Único</SelectItem><SelectItem value="M">Mensal</SelectItem></SelectContent>
                                                </Select>
                                            )} />
                                        </TableCell>
                                        <TableCell><Button type="button" variant="ghost" size="icon" onClick={() => removeA(idx)} className="h-8 w-8 text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button></TableCell>
                                    </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>

                        <div className="p-4 bg-primary/5 rounded-xl border flex items-center justify-between">
                            <Label className="font-bold">Oferecer Alternativa (Opção B)</Label>
                            <FormField control={form.control} name="hasAlternative" render={({ field }) => (<Switch checked={field.value} onCheckedChange={field.onChange} />)} />
                        </div>

                        {watchHasAlternative && (
                            <div className="space-y-4 border-t pt-8">
                                <div className="flex items-center justify-between"><h4 className="text-sm font-bold text-orange-500">Opção Alternativa (Opção B)</h4><Button type="button" variant="outline" size="sm" onClick={() => appendB({ name: '', quantity: 1, price: 0, isMonthly: false })} className="gap-2 text-orange-500"><PlusCircle className="h-3.5 w-3.5" /> Adicionar Manualmente B</Button></div>
                                <Table>
                                    <TableHeader><TableRow><TableHead>Descrição do Item B</TableHead><TableHead className="w-20">Qtd.</TableHead><TableHead className="w-28">Preço Unit.</TableHead><TableHead className="w-24">Tipo</TableHead><TableHead className="w-10"></TableHead></TableRow></TableHeader>
                                    <TableBody>
                                        {fieldsB.map((it, idx) => (
                                        <TableRow key={it.id}>
                                            <TableCell><Input {...form.register(`alternativeItems.${idx}.name` as any)} onBlur={() => handleItemNameBlur(idx, true)} list="proposal-products-list" className="h-8 text-xs" /></TableCell>
                                            <TableCell><Input type="number" {...form.register(`alternativeItems.${idx}.quantity` as any)} className="h-8 text-xs" /></TableCell>
                                            <TableCell><Input type="number" step="0.01" {...form.register(`alternativeItems.${idx}.price` as any)} className="h-8 text-xs" /></TableCell>
                                            <TableCell>
                                                <Controller control={form.control} name={`alternativeItems.${idx}.isMonthly` as any} render={({ field }) => (
                                                    <Select onValueChange={v => field.onChange(v === 'M')} value={field.value ? 'M' : 'U'}>
                                                        <SelectTrigger className="h-8 text-[10px]"><SelectValue /></SelectTrigger>
                                                        <SelectContent><SelectItem value="U">Único</SelectItem><SelectItem value="M">Mensal</SelectItem></SelectContent>
                                                    </Select>
                                                )} />
                                            </TableCell>
                                            <TableCell><Button type="button" variant="ghost" size="icon" onClick={() => removeB(idx)} className="h-8 w-8 text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button></TableCell>
                                        </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        )}

                        <div className="border-t pt-8">
                            <FormField control={form.control} name="observations" render={({ field }) => (
                            <FormItem>
                                <FormLabel className="font-bold flex items-center gap-2">
                                    <FileText className="h-4 w-4 text-primary" /> Condições e Prazos Adicionais
                                </FormLabel>
                                <FormControl><Textarea rows={3} placeholder="Ex: Prazo de entrega: 5 dias úteis..." {...field} className="text-xs" /></FormControl>
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
                <Card className="shadow-lg sticky top-4">
                    <CardHeader className="bg-primary/5 pb-4"><CardTitle className="text-lg">Faturamento</CardTitle></CardHeader>
                    <CardContent className="space-y-6 pt-6">
                    <div className="space-y-2"><Label className="text-xs font-bold text-muted-foreground">Parcelamento (Ref. Opção A)</Label><Controller control={form.control} name="installments" render={({ field }) => (<Select onValueChange={v => field.onChange(Number(v))} value={String(field.value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{[...Array(12)].map((_, i) => <SelectItem key={i+1} value={String(i+1)}>{i+1}x de {((totalsA.oneTime / (i+1)) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</SelectItem>)}</SelectContent></Select>)} /></div>
                    <div className="space-y-4">
                        <div className="p-3 bg-primary/5 rounded-lg border border-primary/10"><span className="text-xs font-bold text-primary">Venda A: {totalsA.oneTime.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span></div>
                        {watchHasAlternative && <div className="p-3 bg-orange-500/5 rounded-lg border border-orange-500/20"><span className="text-xs font-bold text-orange-600">Venda B: {totalsB.oneTime.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span></div>}
                    </div>
                    <Button type="submit" form="proposal-form" className="w-full h-11 font-bold shadow-md">Finalizar e Salvar</Button>
                    </CardContent>
                </Card>
                </div>
            </div>
        </TabsContent>

        <TabsContent value="historico">
            <Card className="shadow-lg">
                <CardHeader>
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <CardTitle className="flex items-center gap-2"><History className="h-5 w-5 text-primary" /> Histórico de Propostas</CardTitle>
                            <CardDescription>Visualize, clone, edite ou exporte orçamentos realizados anteriormente.</CardDescription>
                        </div>
                        <div className="relative w-full md:w-72">
                            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input placeholder="Buscar por cliente ou nº..." className="pl-10" value={proposalSearch} onChange={(e) => setProposalSearch(e.target.value)} />
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Proposta</TableHead>
                                <TableHead>Cliente</TableHead>
                                <TableHead>Data</TableHead>
                                <TableHead>Investimento</TableHead>
                                <TableHead className="text-right">Ações</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredProposals.length > 0 ? (
                                filteredProposals.map(p => (
                                    <TableRow key={p.id}>
                                        <TableCell className="font-bold">#{p.id.slice(-6)}</TableCell>
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span className="font-semibold">{p.clientName}</span>
                                                <span className="text-[10px] text-muted-foreground uppercase">{p.contactName || 'Setor Responsável'}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-xs">{format(parseISO(p.proposalDate), 'dd/MM/yyyy')}</TableCell>
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span className="text-xs font-bold text-primary">{p.totalOneTime.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                                                {p.totalMonthly > 0 && <span className="text-[10px] text-emerald-600 font-semibold">{p.totalMonthly.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}/mês</span>}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-1">
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-primary" onClick={() => setSelectedProposal(p)} title="Visualizar/Imprimir">
                                                    <Eye className="h-4 w-4" />
                                                </Button>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-500" onClick={() => handleCloneProposal(p)} title="Clonar Proposta">
                                                    <Copy className="h-4 w-4" />
                                                </Button>
                                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEditProposalClick(p)} title="Editar">
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeletingProposal(p)} title="Excluir">
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-24 text-center text-muted-foreground italic">Nenhuma proposta encontrada.</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={!!selectedProposal} onOpenChange={o => !o && setSelectedProposal(null)}>
        <DialogContent className="sm:max-w-[950px] h-[95vh] flex flex-col p-0 bg-background border-none shadow-2xl">
          <DialogHeader className="p-6 pb-0 border-b bg-muted/20 flex flex-row items-center justify-between space-y-0">
            <DialogTitle>Visualização da Proposta comercial</DialogTitle>
            <Button variant="ghost" size="icon" onClick={() => setSelectedProposal(null)}><XCircle className="h-5 w-5" /></Button>
          </DialogHeader>
          <ScrollArea className="flex-1 bg-[#F5F5F5] p-10">
            {/* DOCUMENTO BLINDADO PARA ESPECIALISTA: MARGENS 15mm, LOGO 160px, SPACING 0.3pt */}
            <div id="proposal-preview" className="bg-white text-black mx-auto shadow-2xl" style={{ width: '210mm', minHeight: '297mm', padding: '15mm', fontFamily: 'Arial, sans-serif', fontSize: '11pt', lineHeight: '1.4', color: '#000000' }}>
              <table style={{ width: '100%', marginBottom: '35px', borderCollapse: 'collapse' }}>
                <tbody>
                    <tr>
                        <td style={{ width: '5px', backgroundColor: '#000000', padding: '0' }}></td>
                        <td style={{ padding: '0 20px', width: '170px', verticalAlign: 'top' }}>
                            {companyProfile.logoUrl && <img src={companyProfile.logoUrl} alt="Logo" style={{ maxHeight: '160px', width: 'auto', display: 'block' }} />}
                        </td>
                        <td style={{ verticalAlign: 'top', textAlign: 'left' }}>
                            <h2 style={{ fontSize: '16pt', fontWeight: 'bold', margin: '0' }}>{companyProfile.name}</h2>
                            <p style={{ margin: '2px 0', fontSize: '10pt' }}>{companyProfile.email} | {formatPhoneNumber(companyProfile.phone)}</p>
                        </td>
                    </tr>
                </tbody>
              </table>

              <div style={{ marginBottom: '45px', textAlign: 'center' }}>
                <p style={{ fontWeight: 'bold', margin: '0', fontSize: '15pt', borderBottom: '2.5px solid black', display: 'inline-block', paddingBottom: '3px' }}>PROPOSTA COMERCIAL</p>
              </div>

              <table style={{ width: '100%', marginBottom: '40px', borderCollapse: 'collapse' }}>
                <tbody>
                    <tr>
                        <td style={{ verticalAlign: 'top' }}>
                            <p style={{ color: '#666666', fontSize: '8.5pt', fontWeight: 'bold', margin: '0 0 6px 0' }}>DESTINATÁRIO</p>
                            <h1 style={{ fontSize: '15pt', fontWeight: 'bold', margin: '0' }}>{selectedProposal?.clientName}</h1>
                            <p style={{ color: '#4F46E5', fontWeight: 'bold', margin: '6px 0', fontSize: '11.5pt' }}>A/C: {selectedProposal?.contactName?.toUpperCase() || 'SETOR RESPONSÁVEL'}</p>
                            {selectedProposal?.clientPhone && <p style={{ fontSize: '10pt', margin: '0' }}>Tel: {formatPhoneNumber(selectedProposal.clientPhone)}</p>}
                        </td>
                        <td style={{ verticalAlign: 'top', textAlign: 'right', width: '200px' }}>
                            <p><strong>Nº PROPOSTA:</strong> {selectedProposal?.id}</p>
                            <p><strong>EMISSÃO:</strong> {selectedProposal && format(parseISO(selectedProposal.proposalDate), 'dd/MM/yyyy')}</p>
                            <p><strong>VALIDADE:</strong> {selectedProposal && format(parseISO(selectedProposal.validityDate), 'dd/MM/yyyy')}</p>
                        </td>
                    </tr>
                </tbody>
              </table>

              {selectedProposal?.hasAlternative && <p style={{ fontWeight: 'bold', color: '#4F46E5', borderLeft: '4px solid #4F46E5', paddingLeft: '10px', marginBottom: '10px' }}>OPÇÃO 01:</p>}
              <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '15px' }}>
                <thead>
                    <tr style={{ borderBottom: '2px solid #000000' }}>
                        <th style={{ padding: '12px 5px', textAlign: 'left' }}>DESCRIÇÃO</th>
                        <th style={{ textAlign: 'center', width: '60px' }}>QTD.</th>
                        <th style={{ textAlign: 'right', width: '110px' }}>VALOR</th>
                    </tr>
                </thead>
                <tbody>
                    {selectedProposal?.items.map((it, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid #DDDDDD' }}>
                            <td style={{ padding: '10px 5px' }}>{it.name.toUpperCase()}</td>
                            <td style={{ textAlign: 'center' }}>{it.quantity}</td>
                            <td style={{ textAlign: 'right' }}>{it.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                        </tr>
                    ))}
                </tbody>
              </table>
              <div style={{ textAlign: 'right', marginBottom: '30px' }}>
                <p style={{ fontWeight: 'bold', fontSize: '12pt' }}>TOTAL INVESTIMENTO: {selectedProposal?.totalOneTime.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                {selectedProposal?.totalMonthly! > 0 && <p style={{ fontSize: '10pt', color: '#4F46E5' }}>TAXA MENSAL: {selectedProposal?.totalMonthly.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>}
              </div>

              {selectedProposal?.hasAlternative && (
                  <>
                    <div style={{ textAlign: 'center', margin: '40px 0', position: 'relative' }}>
                        <div style={{ borderTop: '1px dashed #A0AEC0', width: '100%', position: 'absolute', top: '50%' }}></div>
                        <span style={{ position: 'relative', backgroundColor: '#FFFFFF', padding: '0 20px', fontWeight: 'bold', fontSize: '14pt', color: '#EF4444' }}>OU</span>
                    </div>
                    <p style={{ fontWeight: 'bold', color: '#4F46E5', borderLeft: '4px solid #4F46E5', paddingLeft: '10px', marginBottom: '10px' }}>OPÇÃO 02:</p>
                    <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '15px' }}>
                        <tbody>
                            {(selectedProposal?.alternativeItems || []).map((it, i) => (
                                <tr key={i} style={{ borderBottom: '1px solid #DDDDDD' }}>
                                    <td style={{ padding: '10px 5px' }}>{it.name.toUpperCase()}</td>
                                    <td style={{ textAlign: 'center' }}>{it.quantity}</td>
                                    <td style={{ textAlign: 'right' }}>{it.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    <div style={{ textAlign: 'right', marginBottom: '30px' }}>
                        <p style={{ fontWeight: 'bold', fontSize: '12pt' }}>TOTAL INVESTIMENTO: {selectedProposal?.totalOneTimeAlt?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                        {selectedProposal?.totalMonthlyAlt! > 0 && <p style={{ fontSize: '10pt', color: '#4F46E5' }}>TAXA MENSAL: {selectedProposal?.totalMonthlyAlt?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>}
                    </div>
                  </>
              )}

              <div style={{ marginTop: '50px', padding: '20px', border: '1.5px solid #000000' }}>
                <p style={{ fontWeight: 'bold', textDecoration: 'underline' }}>CONDIÇÕES DE PAGAMENTO</p>
                <p>• FORMA: {selectedProposal?.paymentMethod.toUpperCase()}</p>
                <p>• CONDIÇÃO: {selectedProposal?.installments}X SEM JUROS.</p>
                {selectedProposal?.observations && <p style={{ marginTop: '10px', fontSize: '10pt', whiteSpace: 'pre-wrap' }}>OBS: {selectedProposal.observations}</p>}
              </div>
            </div>
          </ScrollArea>
          <DialogFooter className="p-6 border-t bg-muted/20 gap-3">
            <Button variant="secondary" onClick={handleDownloadPdf} disabled={isDownloading}>{isDownloading ? <Loader2 className="animate-spin h-4 w-4" /> : <Printer className="h-4 w-4" />} Baixar PDF</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => handleSharePdf(selectedProposal!)} disabled={isSharing}><Share2 className="h-4 w-4 mr-2" /> Enviar WhatsApp</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletingProposal} onOpenChange={o => !o && setDeletingProposal(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Excluir Proposta?</AlertDialogTitle>
                <AlertDialogDescription>Esta ação removerá permanentemente este orçamento do seu histórico.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Voltar</AlertDialogCancel>
                <AlertDialogAction className="bg-destructive" onClick={() => { if(deletingProposal) deleteProposal(deletingProposal.id); setDeletingProposal(null); }}>Confirmar Exclusão</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
