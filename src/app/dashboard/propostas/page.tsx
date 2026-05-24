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
  paymentMethod: z.string(),
  installments: z.coerce.number().min(1).max(12),
  firstAsDownPayment: z.boolean(),
  observations: z.string().optional(),
});

type ProposalFormValues = z.infer<typeof proposalSchema>;

export default function PropostasPage() {
  const { companyProfile, customers, products, addProduct, proposals, addProposal, updateProposal, deleteProposal, addCustomer, currentUser } = useSettings();
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
      paymentMethod: 'boleto',
      installments: 1,
      firstAsDownPayment: false,
      observations: '',
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'items',
  });

  const watchItems = useWatch({ control: form.control, name: "items" });
  const watchInstallments = form.watch('installments');
  const watchFirstAsDownPayment = form.watch('firstAsDownPayment');

  const totals = useMemo(() => {
    return (watchItems || []).reduce(
        (acc, item) => {
            const subtotal = (Number(item.quantity) || 0) * (Number(item.price) || 0);
            if (item.isMonthly) acc.monthly += subtotal;
            else acc.oneTime += subtotal;
            return acc;
        },
        { oneTime: 0, monthly: 0 }
    );
  }, [watchItems]);

  const filteredProducts = useMemo(() => {
    if (!productSearch) return products;
    return products.filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase()));
  }, [products, productSearch]);

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
              action: (
                  <ToastAction altText="Cadastrar" onClick={() => {
                      addProduct({ name: itemName, price: itemPrice || 0 });
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
            scale: 2, 
            useCORS: true, 
            backgroundColor: "#ffffff",
            logging: false,
            onclone: (clonedDoc) => {
                const el = clonedDoc.getElementById('proposal-preview');
                if (el) {
                  el.style.width = '210mm';
                  el.style.letterSpacing = "0px";
                  el.style.wordSpacing = "normal";
                  el.style.fontVariantLigatures = "none";
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
            scale: 2, 
            useCORS: true, 
            backgroundColor: "#ffffff"
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
    const currentTotals = data.items.reduce(
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

    if (editingProposal) {
      updateProposal({ 
        ...data, 
        id: editingProposal.id, 
        clientPhone: data.clientPhone?.replace(/\D/g, ''), 
        proposalDate: data.proposalDate.toISOString(), 
        validityDate: data.validityDate.toISOString(), 
        totalOneTime: currentTotals.oneTime, 
        totalMonthly: currentTotals.monthly 
      } as Proposal);
      toast({ title: 'Proposta Atualizada!' });
    } else {
      const newId = proposals.length > 0 ? Math.max(0, ...proposals.map(p => Number(p.id))) + 1 : 1;
      addProposal({ 
        ...data, 
        id: String(newId), 
        clientPhone: data.clientPhone?.replace(/\D/g, ''), 
        proposalDate: data.proposalDate.toISOString(), 
        validityDate: data.validityDate.toISOString(), 
        totalOneTime: currentTotals.oneTime, 
        totalMonthly: currentTotals.monthly 
      } as Proposal);
      toast({ title: 'Proposta Salva!' });
    }
    setEditingProposal(null);
    form.reset();
  };

  return (
    <div className="flex-1 space-y-6 p-8 pt-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight font-headline text-foreground">Gerador de Propostas</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-4">
        <div className="lg:col-span-2 space-y-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} id="proposal-form">
              <Card>
                <CardHeader className="flex flex-row items-start justify-between">
                  <div>
                    <CardTitle>{editingProposal ? `Editando Proposta ${editingProposal.id}` : 'Nova Proposta'}</CardTitle>
                    <CardDescription>Preencha para gerar o documento.</CardDescription>
                  </div>
                  <div className="flex gap-4">
                    <FormField control={form.control} name="proposalDate" render={({ field }) => (
                      <div className="space-y-1">
                        <Label className="text-[10px] uppercase font-bold text-muted-foreground">Emissão</Label>
                        <Popover><PopoverTrigger asChild><Button variant="outline" size="sm" className="w-[120px] h-8 text-xs">{field.value ? format(field.value, "dd/MM/yyyy") : 'Data'}</Button></PopoverTrigger><PopoverContent className="p-0"><Calendar mode="single" selected={field.value} onSelect={field.onChange} /></PopoverContent></Popover>
                      </div>
                    )} />
                    <FormField control={form.control} name="validityDate" render={({ field }) => (
                      <div className="space-y-1">
                        <Label className="text-[10px] uppercase font-bold text-muted-foreground">Validade</Label>
                        <Popover><PopoverTrigger asChild><Button variant="outline" size="sm" className="w-[120px] h-8 text-xs">{field.value ? format(field.value, "dd/MM/yyyy") : 'Data'}</Button></PopoverTrigger><PopoverContent className="p-0"><Calendar mode="single" selected={field.value} onSelect={field.onChange} /></PopoverContent></Popover>
                      </div>
                    )} />
                  </div>
                </CardHeader>
                <CardContent className="border-t pt-6 space-y-6">
                  <div className="flex items-center gap-4">
                    {companyProfile.logoUrl && <img src={companyProfile.logoUrl} alt="Logo" className="h-12 w-auto object-contain" />}
                    <div>
                      <h3 className="font-bold">{companyProfile.name}</h3>
                      <p className="text-xs text-muted-foreground">{companyProfile.email} | {formatPhoneNumber(companyProfile.phone)}</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <Select onValueChange={handleClientSelect} disabled={isQuickAddingClient}>
                          <SelectTrigger><SelectValue placeholder="Selecione um cliente..." /></SelectTrigger>
                          <SelectContent>{customers.map(c => <SelectItem key={c.id} value={c.id}>{c.nomeFantasia || c.name}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <Button type="button" variant="outline" onClick={handleQuickAddClient}><PlusCircle className="mr-2 h-4 w-4" />Novo</Button>
                    </div>

                    {isQuickAddingClient && (
                      <div className="p-4 border rounded-lg bg-muted/20 space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <FormField control={form.control} name="clientName" render={({ field }) => (
                            <FormItem><FormLabel>Empresa / Cliente</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                          )} />
                          <FormField control={form.control} name="contactName" render={({ field }) => (
                            <FormItem><FormLabel>Pessoa de Contato</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                          )} />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField control={form.control} name="clientPhone" render={({ field }) => (
                            <FormItem><FormLabel>Telefone / WhatsApp</FormLabel><FormControl><Input {...field} onChange={(e) => field.onChange(formatPhoneNumber(e.target.value))} /></FormControl></FormItem>
                            )} />
                            <FormField control={form.control} name="contactType" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Cadastrar como</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                        <SelectContent>
                                            <SelectItem value="lead">Lead (Funil)</SelectItem>
                                            <SelectItem value="one_time">Cliente (Venda Única)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </FormItem>
                            )} />
                        </div>
                        <div className="flex items-center justify-between p-3 bg-primary/5 rounded-md">
                          <div>
                            <p className="text-xs font-bold text-primary">Salvar nos meus contatos?</p>
                            <p className="text-[10px] text-muted-foreground">Adiciona à base atual automaticamente.</p>
                          </div>
                          <FormField control={form.control} name="saveToContacts" render={({ field }) => (
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                          )} />
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-4 border-t pt-6">
                    <h4 className="text-sm font-bold">Itens da Proposta</h4>
                    <Table>
                      <TableHeader><TableRow><TableHead>Descrição</TableHead><TableHead className="w-20">Qtd.</TableHead><TableHead className="w-28">Preço</TableHead><TableHead className="w-24">Tipo</TableHead><TableHead className="w-10"></TableHead></TableRow></TableHeader>
                      <TableBody>
                        {fields.map((it, idx) => (
                          <TableRow key={it.id}>
                            <TableCell><Input {...form.register(`items.${idx}.name`)} onBlur={() => handleItemNameBlur(idx)} /></TableCell>
                            <TableCell><Input type="number" {...form.register(`items.${idx}.quantity`)} /></TableCell>
                            <TableCell><Input type="number" step="0.01" {...form.register(`items.${idx}.price`)} /></TableCell>
                            <TableCell>
                              <Controller control={form.control} name={`items.${idx}.isMonthly`} render={({ field }) => (
                                <Select onValueChange={v => field.onChange(v === 'M')} value={field.value ? 'M' : 'U'}>
                                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                                  <SelectContent><SelectItem value="U">Único</SelectItem><SelectItem value="M">Mensal</SelectItem></SelectContent>
                                </Select>
                              )} />
                            </TableCell>
                            <TableCell><Button variant="ghost" size="icon" onClick={() => remove(idx)}><Trash2 className="h-4 w-4 text-destructive" /></Button></TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    <Button type="button" variant="outline" size="sm" onClick={() => append({ name: '', quantity: 1, price: 0, isMonthly: false })}><PlusCircle className="mr-2 h-4 w-4" />Novo Item</Button>
                  </div>

                  <div className="border-t pt-6">
                    <FormField control={form.control} name="observations" render={({ field }) => (
                      <FormItem><FormLabel>Observações e Prazos</FormLabel><FormControl><Textarea rows={3} placeholder="Ex: Prazo de entrega: 5 dias..." {...field} /></FormControl></FormItem>
                    )} />
                  </div>
                </CardContent>
              </Card>
            </form>
          </Form>
        </div>

        <div className="lg:col-span-1 space-y-6">
          <Card>
            <CardHeader><CardTitle>Pagamento e Resumo</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs">Forma de Pagamento</Label>
                <Controller control={form.control} name="paymentMethod" render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="boleto">Boleto</SelectItem><SelectItem value="pix">PIX</SelectItem><SelectItem value="cartao">Cartão</SelectItem></SelectContent>
                  </Select>
                )} />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Parcelas (Venda Única)</Label>
                <Controller control={form.control} name="installments" render={({ field }) => (
                  <Select onValueChange={v => field.onChange(Number(v))} value={String(field.value)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{[...Array(12)].map((_, i) => <SelectItem key={i+1} value={String(i+1)}>{i+1}x de {((totals.oneTime / (i+1)) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</SelectItem>)}</SelectContent>
                  </Select>
                )} />
              </div>
              <div className="flex items-center space-x-2">
                <Controller control={form.control} name="firstAsDownPayment" render={({ field }) => (
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                )} />
                <Label className="text-xs">1ª parcela como entrada?</Label>
              </div>
              <Separator />
              <div className="space-y-2 text-sm">
                <div className="flex justify-between font-bold"><span>Total Único:</span><span className="text-primary">{totals.oneTime.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span></div>
                <div className="flex justify-between font-bold"><span>Total Mensal:</span><span className="text-emerald-500">{totals.monthly.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span></div>
              </div>
            </CardContent>
            <CardFooter><Button type="submit" form="proposal-form" className="w-full">{editingProposal ? 'Atualizar Proposta' : 'Salvar Proposta'}</Button></CardFooter>
          </Card>

          <Card>
            <CardHeader className="p-4"><CardTitle className="text-xs">Produtos Rápidos</CardTitle></CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-60 px-4 pb-4">
                <div className="space-y-1">
                  {filteredProducts.map(p => (
                    <div key={p.id} className="flex items-center justify-between p-2 hover:bg-muted rounded-md cursor-pointer" onClick={() => append({ name: p.name, quantity: 1, price: p.price, isMonthly: false })}>
                      <div className="flex items-center gap-2 truncate">
                        {p.imageUrl ? <img src={p.imageUrl} className="h-8 w-8 rounded object-cover" /> : <div className="h-8 w-8 rounded bg-muted flex items-center justify-center"><ImageIcon className="h-4 w-4 text-muted-foreground" /></div>}
                        <div className="truncate"><p className="text-xs font-bold truncate">{p.name}</p><p className="text-[10px] text-muted-foreground">{p.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p></div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card className="mt-6">
        <CardHeader><CardTitle>Propostas Geradas</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>ID</TableHead><TableHead>Cliente</TableHead><TableHead>Data</TableHead><TableHead>Total</TableHead><TableHead className="text-right">Ações</TableHead></TableRow></TableHeader>
            <TableBody>
              {proposals.map(p => (
                <TableRow key={p.id} className="group">
                  <TableCell className="font-bold">#{p.id}</TableCell>
                  <TableCell>{p.clientName}</TableCell>
                  <TableCell>{format(parseISO(p.proposalDate), 'dd/MM/yyyy')}</TableCell>
                  <TableCell className="text-primary font-bold">{p.totalOneTime.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</TableCell>
                  <TableCell className="text-right flex justify-end gap-1">
                    <Button variant="ghost" size="icon" onClick={() => handleCloneProposalClick(p)} title="Duplicar"><Copy className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => handleEditProposalClick(p)} title="Editar"><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => setSelectedProposal(p)} title="Imprimir"><Printer className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" className="text-destructive" onClick={() => setDeletingProposal(p)} title="Excluir"><Trash2 className="h-4 w-4" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!selectedProposal} onOpenChange={o => !o && setSelectedProposal(null)}>
        <DialogContent className="sm:max-w-[950px] h-[95vh] flex flex-col p-0 overflow-hidden bg-background">
          <DialogHeader className="p-6 pb-0"><DialogTitle>Visualização da Proposta</DialogTitle></DialogHeader>
          <ScrollArea className="flex-1 bg-muted/30 p-8">
            <div 
                id="proposal-preview" 
                className="bg-white text-black mx-auto shadow-md" 
                style={{ 
                    width: '210mm', 
                    minHeight: '297mm', 
                    padding: '25mm',
                    fontFamily: 'Arial, sans-serif',
                    fontSize: '11pt',
                    lineHeight: '1.4',
                    letterSpacing: '0px',
                    wordSpacing: 'normal',
                    fontVariantLigatures: 'none'
                }}
            >
              {/* Cabeçalho Conforme Imagem */}
              <div style={{ marginBottom: '30px', textAlign: 'left' }}>
                <h2 style={{ fontSize: '14pt', fontWeight: 'bold', margin: '0', textTransform: 'uppercase' }}>{companyProfile.name}</h2>
                <p style={{ margin: '5px 0' }}>{companyProfile.email} | {formatPhoneNumber(companyProfile.phone)}</p>
                <p style={{ margin: '5px 0' }}>{companyProfile.address}</p>
              </div>

              {/* Título da Proposta */}
              <div style={{ marginBottom: '20px', textAlign: 'left' }}>
                <p style={{ fontWeight: 'bold', margin: '0', textTransform: 'uppercase' }}>
                    PROPOSTA COMERCIAL DESTINATÁRIO {selectedProposal?.clientName}
                </p>
              </div>

              {/* Detalhes da Proposta */}
              <div style={{ marginBottom: '30px', textAlign: 'left' }}>
                <p style={{ margin: '5px 0' }}>Nº Proposta {selectedProposal?.id}</p>
                <p style={{ margin: '5px 0' }}>Emissão {selectedProposal && format(parseISO(selectedProposal.proposalDate), 'dd/MM/yyyy')}</p>
                <p style={{ margin: '5px 0' }}>Validade {selectedProposal && format(parseISO(selectedProposal.validityDate), 'dd/MM/yyyy')}</p>
                <p style={{ margin: '5px 0', fontWeight: 'bold' }}>
                    A/C: {selectedProposal?.contactName || 'Responsável'} {selectedProposal?.clientPhone && `(${formatPhoneNumber(selectedProposal.clientPhone)})`}
                </p>
              </div>

              {/* Texto Institucional Exato da Imagem */}
              <div style={{ marginBottom: '25px', textAlign: 'left' }}>
                <p style={{ marginBottom: '20px' }}>Temos a satisfação de apresentar nossa proposta comercial desenvolvida com foco total na excelência tecnológica e na eficiência operacional que sua empresa demanda.</p>
                <p style={{ marginBottom: '20px' }}>Com ampla experiência de mercado a {companyProfile.name} combina consultoria especializada e as mais modernas ferramentas de TI para entregar soluções ágeis, seguras e personalizadas.</p>
                <p style={{ marginBottom: '25px' }}>Nosso compromisso é com a qualidade absoluta desde o primeiro contato até o suporte contínuo.</p>
              </div>

              {/* Tabela de Itens Simplificada */}
              <div style={{ marginBottom: '30px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10pt', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #000' }}>
                      <th style={{ padding: '8px 0', fontWeight: 'bold' }}>Item / Descrição</th>
                      <th style={{ padding: '8px 0', textAlign: 'center', width: '60px', fontWeight: 'bold' }}>Qtd.</th>
                      <th style={{ padding: '8px 0', textAlign: 'right', width: '100px', fontWeight: 'bold' }}>Preço</th>
                      <th style={{ padding: '8px 0', textAlign: 'right', width: '100px', fontWeight: 'bold' }}>Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedProposal?.items.map((it, i) => (
                      <tr key={i} style={{ borderBottom: '0.5px solid #eee' }}>
                        <td style={{ padding: '8px 0' }}>{it.name} {it.isMonthly && '(Mensal)'}</td>
                        <td style={{ padding: '8px 0', textAlign: 'center' }}>{it.quantity}</td>
                        <td style={{ padding: '8px 0', textAlign: 'right' }}>{it.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                        <td style={{ padding: '8px 0', textAlign: 'right' }}>{(it.quantity * it.price).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                
                {/* Resumo de Valores */}
                <div style={{ marginTop: '20px', textAlign: 'right' }}>
                    <p style={{ margin: '5px 0', fontSize: '12pt', fontWeight: 'bold' }}>
                        Total Único: {selectedProposal?.totalOneTime.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </p>
                    {selectedProposal && selectedProposal.totalMonthly > 0 && (
                        <p style={{ margin: '5px 0', fontSize: '12pt', fontWeight: 'bold', color: '#059669' }}>
                            Recorrência Mensal: {selectedProposal.totalMonthly.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </p>
                    )}
                </div>
              </div>

              {/* Rodapé: Condições */}
              <div style={{ marginTop: '40px', fontSize: '10pt' }}>
                <p style={{ fontWeight: 'bold', marginBottom: '10px' }}>CONDIÇÕES DE PAGAMENTO:</p>
                <p style={{ margin: '2px 0' }}>Forma: {selectedProposal?.paymentMethod.toUpperCase()}</p>
                <p style={{ margin: '2px 0' }}>Parcelamento: {selectedProposal?.installments}x de {(selectedProposal ? selectedProposal.totalOneTime / selectedProposal.installments : 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                
                {selectedProposal?.observations && (
                    <div style={{ marginTop: '20px' }}>
                        <p style={{ fontWeight: 'bold', marginBottom: '5px' }}>OBSERVAÇÕES:</p>
                        <p style={{ whiteSpace: 'pre-wrap' }}>{selectedProposal.observations}</p>
                    </div>
                )}
              </div>

              {/* Assinaturas Alinhadas */}
              <div style={{ marginTop: '80px', display: 'flex', justifyContent: 'space-between', textAlign: 'center', fontSize: '10pt' }}>
                <div style={{ width: '220px' }}>
                  <div style={{ borderTop: '1px solid #000', marginBottom: '5px' }}></div>
                  <p>{companyProfile.name}</p>
                </div>
                <div style={{ width: '220px' }}>
                  <div style={{ borderTop: '1px solid #000', marginBottom: '5px' }}></div>
                  <p>De acordo do Cliente</p>
                </div>
              </div>
            </div>
          </ScrollArea>
          <DialogFooter className="p-6 border-t gap-2">
            <Button variant="outline" onClick={() => setSelectedProposal(null)}>Fechar</Button>
            <Button variant="secondary" onClick={handleDownloadPdf} disabled={isDownloading}>
                {isDownloading ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : <Printer className="h-4 w-4 mr-2" />} 
                Baixar PDF
            </Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => handleSharePdf(selectedProposal!)} disabled={isSharing}>
                <Share2 className="h-4 w-4 mr-2" /> 
                {isSharing ? 'Processando...' : 'Enviar por WhatsApp'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletingProposal} onOpenChange={o => !o && setDeletingProposal(null)}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Excluir Proposta?</AlertDialogTitle><AlertDialogDescription>Essa ação não pode ser desfeita.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Não</AlertDialogCancel><AlertDialogAction onClick={() => { deleteProposal(deletingProposal!.id); setDeletingProposal(null); }}>Sim, Excluir</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
