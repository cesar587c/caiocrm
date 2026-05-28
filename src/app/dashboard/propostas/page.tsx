
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
  Share2,
  XCircle,
  FileText,
  LayoutGrid,
  History,
  Eye,
  Search,
} from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { useSettings } from '@/contexts/SettingsContext';
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
import type { Proposal, ProposalItem } from '@/lib/types';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
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
  firstAsDownPayment: z.boolean().default(false),
  observations: z.string().optional(),
});

type ProposalFormValues = z.infer<typeof proposalSchema>;

export default function PropostasPage() {
  const { 
    companyProfile, 
    customers, 
    products, 
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

  // Observação explícita para garantir a soma correta
  const watchItemsA = useWatch({
    control: form.control,
    name: 'items',
  });

  const totalsA = useMemo(() => {
    const items = watchItemsA || [];
    return items.reduce(
      (acc, item) => {
        const qty = Number(item.quantity) || 0;
        const prc = Number(item.price) || 0;
        const subtotal = qty * prc;
        if (item.isMonthly) acc.monthly += subtotal;
        else acc.oneTime += subtotal;
        return acc;
      },
      { oneTime: 0, monthly: 0 }
    );
  }, [watchItemsA]);

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

  const handleItemNameBlur = (index: number) => {
      const itemName = form.getValues(`items.${index}.name`);
      if (!itemName) return;
      const existingProduct = products.find(p => p.name.toLowerCase().trim() === itemName.toLowerCase().trim());
      if (existingProduct) {
          form.setValue(`items.${index}.price`, existingProduct.price, { shouldDirty: true, shouldTouch: true });
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

        const phone = proposal.clientPhone?.replace(/\D/g, '');
        const whatsappUrl = phone ? `https://wa.me/55${phone}` : null;

        if (navigator.canShare && navigator.canShare({ files: [file] })) {
            await navigator.share({ files: [file], title: `Proposta #${proposal.id}` });
        } else if (whatsappUrl) {
            window.open(whatsappUrl, '_blank');
            pdf.save(`proposta-${proposal.id}.pdf`);
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
    toast({ title: 'Proposta Clonada!', description: 'Dados carregados para nova proposta.' });
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
        id: editingProposal ? editingProposal.id : String(Date.now()).slice(-6),
        clientPhone: data.clientPhone?.replace(/\D/g, ''),
        proposalDate: data.proposalDate.toISOString(),
        validityDate: data.validityDate.toISOString(),
        totalOneTime: totalsA.oneTime,
        totalMonthly: totalsA.monthly,
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
            <p className="text-muted-foreground">Protocolo SALVAR: Blindagem de Especialista Ativada.</p>
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
                            <CardTitle className="text-xl flex items-center gap-2">
                                <FileText className="h-5 w-5 text-primary" />
                                {editingProposal ? `Editar Proposta #${editingProposal.id}` : 'Configurar Orçamento'}
                            </CardTitle>
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
                            <div className="space-y-4">
                                <Label className="text-sm font-semibold">Selecione o Cliente</Label>
                                <div className="flex gap-3">
                                <Select onValueChange={handleClientSelect} disabled={isQuickAddingClient}>
                                    <SelectTrigger className="flex-1"><SelectValue placeholder="Buscar na base..." /></SelectTrigger>
                                    <SelectContent>{customers.map(c => <SelectItem key={c.id} value={c.id}>{c.nomeFantasia || c.name}</SelectItem>)}</SelectContent>
                                </Select>
                                <Button type="button" variant="secondary" onClick={() => setIsQuickAddingClient(true)} className="gap-2"><PlusCircle className="h-4 w-4" /> Digitar Novo</Button>
                                </div>

                                {isQuickAddingClient && (
                                <div className="p-5 border rounded-xl bg-muted/20 space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <FormField control={form.control} name="clientName" render={({ field }) => (<FormItem><FormLabel>Empresa / Cliente</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} />
                                    <FormField control={form.control} name="contactName" render={({ field }) => (<FormItem><FormLabel>A/C (Contato)</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} />
                                    </div>
                                    <FormField control={form.control} name="clientPhone" render={({ field }) => (<FormItem><FormLabel>Telefone</FormLabel><FormControl><Input {...field} onChange={e => field.onChange(formatPhoneNumber(e.target.value))} /></FormControl></FormItem>)} />
                                    <div className="flex items-center justify-between p-3 bg-primary/5 rounded-lg border">
                                    <div className="space-y-0.5"><p className="text-xs font-bold text-primary">Salvar na base de contatos?</p></div>
                                    <FormField control={form.control} name="saveToContacts" render={({ field }) => (<Switch checked={field.value} onCheckedChange={field.onChange} />)} />
                                    </div>
                                </div>
                                )}
                            </div>

                            <div className="space-y-4 border-t pt-8">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-sm font-bold">Itens da Proposta</h4>
                                    <Button type="button" variant="outline" size="sm" onClick={() => appendA({ name: '', quantity: 1, price: 0, isMonthly: false })} className="gap-2"><PlusCircle className="h-3.5 w-3.5" /> Item</Button>
                                </div>
                                <Table>
                                    <TableHeader><TableRow><TableHead>Descrição</TableHead><TableHead className="w-16">Qtd</TableHead><TableHead className="w-28">Preço</TableHead><TableHead className="w-10">Rec.</TableHead><TableHead className="w-10"></TableHead></TableRow></TableHeader>
                                    <TableBody>
                                        {fieldsA.map((it, idx) => (
                                        <TableRow key={it.id}>
                                            <TableCell><Input {...form.register(`items.${idx}.name`)} onBlur={() => handleItemNameBlur(idx)} list="proposal-products-list" className="h-8 text-xs" /></TableCell>
                                            <TableCell><Input type="number" {...form.register(`items.${idx}.quantity`)} className="h-8 text-xs" /></TableCell>
                                            <TableCell><Input type="number" step="0.01" {...form.register(`items.${idx}.price`)} className="h-8 text-xs" /></TableCell>
                                            <TableCell><FormField control={form.control} name={`items.${idx}.isMonthly`} render={({ field }) => (<Checkbox checked={field.value} onCheckedChange={field.onChange} className="h-4 w-4" />)} /></TableCell>
                                            <TableCell><Button type="button" variant="ghost" size="icon" onClick={() => removeA(idx)} className="h-8 w-8 text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button></TableCell>
                                        </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>

                            <div className="border-t pt-8">
                                <FormField control={form.control} name="observations" render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="font-bold">Observações e Prazos</FormLabel>
                                    <FormControl><Textarea rows={3} placeholder="Ex: Prazo de entrega 10 dias úteis..." {...field} className="text-xs" /></FormControl>
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
                        <CardHeader className="bg-primary/5 pb-4"><CardTitle className="text-lg">Finalização</CardTitle></CardHeader>
                        <CardContent className="space-y-6 pt-6">
                        <div className="space-y-2">
                            <Label className="text-xs font-bold text-muted-foreground">Parcelas</Label>
                            <Controller control={form.control} name="installments" render={({ field }) => (<Select onValueChange={v => field.onChange(Number(v))} value={String(field.value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{[...Array(12)].map((_, i) => <SelectItem key={i+1} value={String(i+1)}>{i+1}x</SelectItem>)}</SelectContent></Select>)} />
                        </div>
                        <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border">
                            <div className="space-y-0.5"><Label className="text-xs font-bold">Primeira como Entrada?</Label></div>
                            <FormField control={form.control} name="firstAsDownPayment" render={({ field }) => (<Switch checked={field.value} onCheckedChange={field.onChange} />)} />
                        </div>
                        <div className="space-y-2 p-3 bg-primary/5 rounded-lg border border-primary/10">
                            <p className="text-xs font-bold text-primary">Venda: {totalsA.oneTime.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                            {totalsA.monthly > 0 && <p className="text-xs font-bold text-emerald-500">Mensal: {totalsA.monthly.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>}
                        </div>
                        <Button type="submit" form="proposal-form" className="w-full h-11 font-bold shadow-md">FINALIZAR E SALVAR</Button>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </TabsContent>

        <TabsContent value="historico">
            <Card className="shadow-lg">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle>Histórico de Orçamentos</CardTitle>
                        <div className="relative w-72">
                            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input placeholder="Buscar..." className="pl-10" value={proposalSearch} onChange={(e) => setProposalSearch(e.target.value)} />
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader><TableRow><TableHead>Nº</TableHead><TableHead>Cliente</TableHead><TableHead>Data</TableHead><TableHead>Venda</TableHead><TableHead className="text-right">Ações</TableHead></TableRow></TableHeader>
                        <TableBody>
                            {filteredProposals.map(p => (
                                <TableRow key={p.id}>
                                    <TableCell className="font-bold">#{p.id}</TableCell>
                                    <TableCell>{p.clientName}</TableCell>
                                    <TableCell className="text-xs">{format(parseISO(p.proposalDate), 'dd/MM/yyyy')}</TableCell>
                                    <TableCell className="font-bold">{p.totalOneTime.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-1">
                                            <Button variant="ghost" size="icon" onClick={() => setSelectedProposal(p)} title="Ver PDF"><Eye className="h-4 w-4" /></Button>
                                            <Button variant="ghost" size="icon" onClick={() => handleCloneProposal(p)} title="Clonar"><Copy className="h-4 w-4" /></Button>
                                            <Button variant="ghost" size="icon" onClick={() => handleEditProposalClick(p)} title="Editar"><Pencil className="h-4 w-4" /></Button>
                                            <Button variant="ghost" size="icon" onClick={() => setDeletingProposal(p)} className="text-destructive"><Trash2 className="h-4 w-4" /></Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={!!selectedProposal} onOpenChange={o => !o && setSelectedProposal(null)}>
        <DialogContent className="sm:max-w-[950px] h-[95vh] flex flex-col p-0 bg-background border-none shadow-2xl">
          <DialogHeader className="p-6 border-b bg-muted/20 flex flex-row items-center justify-between space-y-0">
            <DialogTitle>Visualização Blindada (SALVAR)</DialogTitle>
            <Button variant="ghost" size="icon" onClick={() => setSelectedProposal(null)}><XCircle className="h-5 w-5" /></Button>
          </DialogHeader>
          <ScrollArea className="flex-1 bg-[#F5F5F5] p-10">
            <div id="proposal-preview" className="bg-white text-black mx-auto shadow-2xl" style={{ width: '210mm', minHeight: '297mm', padding: '15mm', fontFamily: 'Arial, sans-serif', fontSize: '11pt', lineHeight: '1.4', color: '#000000' }}>
              
              {/* HEADER TÉCNICO MODELO 2 */}
              <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: '40px' }}>
                <div style={{ width: '4px', height: '160px', backgroundColor: '#000000', marginRight: '15px' }}></div>
                <div style={{ marginRight: '20px' }}>
                    {companyProfile.logoUrl && <img src={companyProfile.logoUrl} alt="Logo" style={{ height: '160px', width: 'auto', display: 'block' }} />}
                </div>
                <div style={{ flex: 1, paddingTop: '10px' }}>
                    <h2 style={{ fontSize: '14pt', fontWeight: 'bold', margin: '0', textTransform: 'uppercase' }}>{companyProfile.name}</h2>
                    <p style={{ fontSize: '9pt', margin: '4px 0', color: '#333' }}>{companyProfile.email}</p>
                    <p style={{ fontSize: '9pt', margin: '4px 0', color: '#333' }}>{formatPhoneNumber(companyProfile.phone)}</p>
                    <p style={{ fontSize: '9pt', margin: '0', color: '#333' }}>{companyProfile.address}</p>
                </div>
              </div>

              {/* TITULO CENTRALIZADO */}
              <div style={{ textAlign: 'center', marginBottom: '40px' }}>
                <span style={{ fontSize: '13pt', fontWeight: 'bold', borderBottom: '2px solid black', paddingBottom: '2px', textTransform: 'uppercase' }}>
                    PROPOSTA COMERCIAL
                </span>
              </div>

              {/* DESTINATÁRIO */}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '35px' }}>
                <div style={{ flex: 1 }}>
                    <p style={{ fontSize: '8pt', color: '#666', fontWeight: 'bold', margin: '0 0 4px 0', textTransform: 'uppercase' }}>DESTINATÁRIO</p>
                    <h1 style={{ fontSize: '13pt', fontWeight: 'bold', margin: '0', textTransform: 'uppercase' }}>{selectedProposal?.clientName}</h1>
                    <p style={{ fontSize: '10pt', color: '#4F46E5', fontWeight: 'bold', margin: '4px 0' }}>A/C: {selectedProposal?.contactName?.toUpperCase() || 'SETOR RESPONSÁVEL'}</p>
                    {selectedProposal?.clientPhone && <p style={{ fontSize: '9pt', margin: '0' }}>{formatPhoneNumber(selectedProposal.clientPhone)}</p>}
                </div>
                <div style={{ textAlign: 'right', minWidth: '180px' }}>
                    <p style={{ margin: '0', fontSize: '9.5pt' }}><strong>Nº PROPOSTA:</strong> {selectedProposal?.id}</p>
                    <p style={{ margin: '2px 0', fontSize: '9.5pt' }}><strong>EMISSÃO:</strong> {selectedProposal && format(parseISO(selectedProposal.proposalDate), 'dd/MM/yyyy')}</p>
                    <p style={{ margin: '0', fontSize: '9.5pt' }}><strong>VALIDADE:</strong> <span style={{ color: '#E11D48', fontWeight: 'bold' }}>{selectedProposal && format(parseISO(selectedProposal.validityDate), 'dd/MM/yyyy')}</span></p>
                </div>
              </div>

              {/* INTRODUÇÃO */}
              <div style={{ marginBottom: '35px', fontSize: '10.5pt', textAlign: 'justify' }}>
                <p style={{ margin: '0 0 12px 0' }}>Temos a satisfação de apresentar nossa proposta comercial desenvolvida com foco total na excelência tecnológica e na eficiência operacional que sua empresa demanda.</p>
                <p style={{ margin: '0' }}>Com ampla experiência de mercado, a {companyProfile.name.toUpperCase()} combina consultoria especializada e as mais modernas ferramentas para entregar soluções ágeis, seguras e personalizadas.</p>
              </div>

              {/* TABELA DE ITENS */}
              <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '25px' }}>
                <thead>
                    <tr style={{ borderBottom: '1.5px solid #000' }}>
                        <th style={{ textAlign: 'left', padding: '10px 5px', fontSize: '9.5pt', fontWeight: 'bold', textTransform: 'uppercase' }}>DESCRIÇÃO DO SERVIÇO OU PRODUTO</th>
                        <th style={{ textAlign: 'center', width: '50px', padding: '10px 5px', fontSize: '9.5pt', fontWeight: 'bold', textTransform: 'uppercase' }}>QTD.</th>
                        <th style={{ textAlign: 'right', width: '100px', padding: '10px 5px', fontSize: '9.5pt', fontWeight: 'bold', textTransform: 'uppercase' }}>UNITÁRIO</th>
                        <th style={{ textAlign: 'right', width: '110px', padding: '10px 5px', fontSize: '9.5pt', fontWeight: 'bold', textTransform: 'uppercase' }}>SUBTOTAL</th>
                    </tr>
                </thead>
                <tbody>
                    {selectedProposal?.items.map((it, i) => (
                        <tr key={i} style={{ borderBottom: '0.5px solid #eee' }}>
                            <td style={{ padding: '12px 5px', fontSize: '9.5pt', textTransform: 'uppercase' }}>{it.name} {it.isMonthly ? '(MENSAL)' : ''}</td>
                            <td style={{ textAlign: 'center', padding: '12px 5px', fontSize: '9.5pt' }}>{it.quantity}</td>
                            <td style={{ textAlign: 'right', padding: '12px 5px', fontSize: '9.5pt' }}>{it.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                            <td style={{ textAlign: 'right', padding: '12px 5px', fontSize: '9.5pt', fontWeight: 'bold' }}>{(it.quantity * it.price).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                        </tr>
                    ))}
                </tbody>
              </table>
              
              {/* TOTAIS À DIREITA */}
              <div style={{ textAlign: 'right', marginBottom: '40px', paddingRight: '10px' }}>
                <div style={{ backgroundColor: '#F8FAFC', display: 'inline-block', padding: '15px 30px', borderRadius: '6px', border: '1px solid #E2E8F0' }}>
                    <div style={{ marginBottom: '5px' }}>
                        <span style={{ fontSize: '10pt', fontWeight: 'bold', textTransform: 'uppercase', marginRight: '20px' }}>TOTAL INVESTIMENTO:</span>
                        <span style={{ fontSize: '13pt', fontWeight: 'bold' }}>{selectedProposal?.totalOneTime.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                    </div>
                    {selectedProposal?.totalMonthly > 0 && (
                        <div>
                            <span style={{ fontSize: '9pt', fontWeight: 'bold', textTransform: 'uppercase', marginRight: '20px', color: '#4F46E5' }}>TAXA MENSAL (SUPORTE):</span>
                            <span style={{ fontSize: '11pt', fontWeight: 'bold', color: '#4F46E5' }}>{selectedProposal?.totalMonthly.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                        </div>
                    )}
                </div>
              </div>

              {/* CONDIÇÕES DE PAGAMENTO BLINDADAS */}
              <div style={{ border: '1.5px solid #000', padding: '20px', borderRadius: '4px', marginBottom: '60px' }}>
                <p style={{ fontWeight: 'bold', fontSize: '11pt', margin: '0 0 15px 0', textTransform: 'uppercase', borderBottom: '1px solid #000', display: 'inline-block' }}>CONDIÇÕES DE PAGAMENTO</p>
                <div style={{ fontSize: '10pt', lineHeight: '1.8' }}>
                    <p style={{ margin: '0' }}>• FORMA DE PAGAMENTO: {selectedProposal?.paymentMethod.toUpperCase()}</p>
                    <p style={{ margin: '0' }}>• CONDIÇÃO: {selectedProposal?.firstAsDownPayment ? 'ENTRADA + ' : ''}{selectedProposal?.installments}X DE {((selectedProposal?.totalOneTime || 0) / (selectedProposal?.installments || 1)).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                </div>
                
                <div style={{ marginTop: '20px', paddingTop: '15px', borderTop: '1.5px solid #DDD' }}>
                    <p style={{ fontWeight: 'bold', fontSize: '9pt', margin: '0 0 5px 0', textTransform: 'uppercase' }}>OBSERVAÇÕES E PRAZOS:</p>
                    <p style={{ fontSize: '9.5pt', margin: '0', textTransform: 'uppercase' }}>{selectedProposal?.observations || 'SEM OBSERVAÇÕES ADICIONAIS.'}</p>
                </div>
              </div>

              {/* ASSINATURAS */}
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '60px', marginTop: 'auto', paddingTop: '40px' }}>
                <div style={{ flex: 1, textAlign: 'center' }}>
                    <div style={{ borderTop: '1px solid #000', width: '100%', marginBottom: '6px' }}></div>
                    <p style={{ fontSize: '9pt', fontWeight: 'bold', margin: '0', textTransform: 'uppercase' }}>{companyProfile.name}</p>
                    <p style={{ fontSize: '7.5pt', color: '#777', margin: '0', textTransform: 'uppercase' }}>EMITENTE RESPONSÁVEL</p>
                </div>
                <div style={{ flex: 1, textAlign: 'center' }}>
                    <div style={{ borderTop: '1px solid #000', width: '100%', marginBottom: '6px' }}></div>
                    <p style={{ fontSize: '9pt', fontWeight: 'bold', margin: '0', textTransform: 'uppercase' }}>{selectedProposal?.clientName}</p>
                    <p style={{ fontSize: '7.5pt', color: '#777', margin: '0', textTransform: 'uppercase' }}>ACEITE DO CLIENTE</p>
                </div>
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
            <AlertDialogHeader><AlertDialogTitle>Excluir Proposta?</AlertDialogTitle><AlertDialogDescription>Ação irreversível.</AlertDialogDescription></AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Voltar</AlertDialogCancel>
                <AlertDialogAction className="bg-destructive" onClick={() => { if(deletingProposal) deleteProposal(deletingProposal.id); setDeletingProposal(null); }}>Confirmar Exclusão</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
