'use client';

import { useState, useMemo, useEffect } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { addDays, format } from 'date-fns';
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
  Building,
  Calendar as CalendarIcon,
  Download,
  Mail,
  PlusCircle,
  Trash2,
  Send,
  History,
  Printer,
  ListChecks,
  Loader2,
  Search,
  Pencil,
  Repeat,
  Tag,
  XCircle,
} from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { Calendar } from '@/components/ui/calendar';
import { useSettings } from '@/contexts/SettingsContext';
import { ToastAction } from '@/components/ui/toast';
import { Badge } from '@/components/ui/badge';
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
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import type { Product } from '@/lib/types';
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
  clientPhone: z.string().optional(),
  proposalDate: z.date(),
  validityDate: z.date(),
  items: z.array(proposalItemSchema).min(1, 'Adicione pelo menos um item.'),
  paymentMethod: z.string(),
  installments: z.coerce.number().min(1).max(6),
  firstAsDownPayment: z.boolean(),
});

type ProposalFormValues = z.infer<typeof proposalSchema>;
type Proposal = ProposalFormValues & { 
    id: string; 
    totalOneTime: number;
    totalMonthly: number;
};


const productFormSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'O nome do produto é obrigatório.'),
  price: z.coerce.number().min(0, 'O preço não pode ser negativo.'),
});

type ProductFormValues = z.infer<typeof productFormSchema>;


export default function PropostasPage() {
  const { companyProfile, customers, products, addProduct, updateProduct, deleteProduct } = useSettings();
  const { toast } = useToast();
  const [productSearch, setProductSearch] = useState('');
  const [isQuickAddingClient, setIsQuickAddingClient] = useState(false);
  const [savedProposals, setSavedProposals] = useState<Proposal[]>([]);
  const [selectedProposal, setSelectedProposal] = useState<Proposal | null>(null);
  const [deletingProposal, setDeletingProposal] = useState<Proposal | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [editingProposal, setEditingProposal] = useState<Proposal | null>(null);

  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);
  const [isProductFormOpen, setIsProductFormOpen] = useState(false);
  
  const [isClient, setIsClient] = useState(false);
  useEffect(() => {
    setIsClient(true);
  }, []);

  const form = useForm<ProposalFormValues>({
    resolver: zodResolver(proposalSchema),
    defaultValues: {
      clientName: '',
      clientPhone: '',
      proposalDate: new Date(),
      validityDate: addDays(new Date(), 10),
      items: [{ name: '', quantity: 1, price: 0, isMonthly: false }],
      paymentMethod: 'boleto',
      installments: 1,
      firstAsDownPayment: false,
    },
  });

  const productForm = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      name: '',
      price: 0,
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'items',
  });

  const watchItems = form.watch('items');
  const watchInstallments = form.watch('installments');

  const totals = useMemo(() => {
    return (watchItems || []).reduce(
        (acc, item) => {
            const subtotal = (Number(item.quantity) || 0) * (Number(item.price) || 0);
            if (item.isMonthly) {
                acc.monthly += subtotal;
            } else {
                acc.oneTime += subtotal;
            }
            return acc;
        },
        { oneTime: 0, monthly: 0 }
    );
  }, [watchItems]);

  const filteredProducts = useMemo(() => {
    if (!productSearch) {
      return products;
    }
    return products.filter(p =>
      p.name.toLowerCase().includes(productSearch.toLowerCase())
    );
  }, [products, productSearch]);

  const handleClientSelect = (clientId: string) => {
    const client = customers.find(c => c.id === clientId);
    if (client) {
      form.setValue('clientId', client.id);
      form.setValue('clientName', client.name);
      form.setValue('clientPhone', client.telefone);
      setIsQuickAddingClient(false);
    }
  };
  
  const handleQuickAddClient = () => {
    form.reset({
      ...form.getValues(),
      clientId: undefined,
      clientName: '',
      clientPhone: '',
    });
    setIsQuickAddingClient(true);
  }
  
  const handleSaveNewProduct = (newProduct: { name: string, price: number }) => {
    const lowerCaseName = newProduct.name.toLowerCase().trim();
    if (!lowerCaseName || products.some(p => p.name.toLowerCase().trim() === lowerCaseName)) {
        return;
    }
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
              action: (
                  <ToastAction altText="Cadastrar" onClick={() => handleSaveNewProduct({ name: itemName, price: itemPrice || 0 })}>
                      Cadastrar
                  </ToastAction>
              ),
          });
      }
  };

  const handleSendEmail = (proposal: Proposal) => {
    const itemsText = proposal.items
      .map(
        (item) =>
          `- ${item.name} ${item.isMonthly ? '(mensal)' : ''} (Qtd: ${item.quantity}, Valor Unit.: ${item.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })})`
      )
      .join('\n');

    const subject = `Proposta Comercial da ${companyProfile.name} - Nº ${proposal.id}`;
    
    const body = `Olá, ${proposal.clientName}!
    
Segue a sua proposta comercial da ${companyProfile.name}, conforme solicitado.

-----------------------------------
DETALHES DA PROPOSTA
-----------------------------------
Proposta: ${proposal.id}
Data: ${format(proposal.proposalDate, 'dd/MM/yyyy')}
Validade: ${format(proposal.validityDate, 'dd/MM/yyyy')}

-----------------------------------
ITENS
-----------------------------------
${itemsText}

-----------------------------------
TOTAIS
-----------------------------------
Total Único (Investimento): ${proposal.totalOneTime.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
Total Mensal (Recorrente): ${proposal.totalMonthly.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}

-----------------------------------
CONDIÇÕES DE PAGAMENTO (VALOR ÚNICO)
-----------------------------------
- Forma: ${proposal.paymentMethod.replace('cartao', 'Cartão de Crédito').replace('boleto', 'Boleto Bancário').replace('pix', 'PIX')}
- Parcelas: ${proposal.installments}x de ${(proposal.totalOneTime / proposal.installments).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}

Agradecemos a oportunidade e ficamos à disposição para quaisquer esclarecimentos.

Atenciosamente,
${companyProfile.name}
${companyProfile.phone}
${companyProfile.email}
    `;

    const encodedSubject = encodeURIComponent(subject);
    const encodedBody = encodeURIComponent(body);
    const mailtoUrl = `mailto:?subject=${encodedSubject}&body=${encodedBody}`;
    window.location.href = mailtoUrl;
    toast({ title: "E-mail Pronto", description: "Seu cliente de e-mail foi aberto." });
  };

  const handleSendWhatsApp = (proposal: Proposal) => {
    const itemsText = proposal.items
      .map(
        (item) =>
          `- ${item.name} ${item.isMonthly ? '*(mensal)*' : ''} (Qtd: ${item.quantity}, Valor Unit.: ${item.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })})`
      )
      .join('\n');

    const message = `Olá, ${proposal.clientName}! 👋
Segue a sua proposta comercial da ${companyProfile.name}.

*Proposta:* ${proposal.id}
*Data:* ${format(proposal.proposalDate, 'dd/MM/yyyy')}

*Itens:*
${itemsText}

*Total Único:* *${proposal.totalOneTime.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}*
*Total Mensal:* *${proposal.totalMonthly.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}*

*Condições de Pagamento (Valor Único):*
- *Forma:* ${proposal.paymentMethod.replace('cartao', 'Cartão de Crédito').replace('boleto', 'Boleto Bancário').replace('pix', 'PIX')}
- *Parcelas:* ${proposal.installments}x de ${(proposal.totalOneTime / proposal.installments).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}

Agradecemos a oportunidade e ficamos à disposição!

${companyProfile.name}
${companyProfile.phone}`;

    const cleanPhone = proposal.clientPhone?.replace(/\D/g, '') || '';
    if (cleanPhone.length < 10) {
         toast({ title: "Número Inválido", description: "O cliente não possui um telefone válido.", variant: "destructive" });
        return;
    }
    const phoneWithCountryCode = cleanPhone.length > 11 ? cleanPhone : `55${cleanPhone}`;
    const url = `https://wa.me/${phoneWithCountryCode}?text=${encodeURIComponent(message)}`;
    window.open(url, 'vendaspro_whatsapp');
  };

  const handleDownloadPdf = async () => {
    const proposalElement = document.getElementById('proposal-preview');
    if (!proposalElement || !selectedProposal) {
        toast({ variant: 'destructive', title: 'Erro ao gerar PDF' });
        return;
    }
    setIsDownloading(true);
    try {
        const canvas = await html2canvas(proposalElement, { scale: 2, useCORS: true });
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        const canvasWidth = canvas.width;
        const canvasHeight = canvas.height;
        const canvasAspectRatio = canvasWidth / canvasHeight;
        let finalPdfWidth = pdfWidth;
        let finalPdfHeight = pdfWidth / canvasAspectRatio;
        if (finalPdfHeight > pdfHeight) {
            finalPdfHeight = pdfHeight;
            finalPdfWidth = pdfHeight * canvasAspectRatio;
        }
        const xOffset = (pdfWidth - finalPdfWidth) / 2;
        const yOffset = (pdfHeight - finalPdfHeight) / 2;
        pdf.addImage(imgData, 'PNG', xOffset, yOffset, finalPdfWidth, finalPdfHeight);
        pdf.save(`proposta-${selectedProposal.id}.pdf`);
    } catch (error) {
        console.error(error);
        toast({ variant: 'destructive', title: 'Erro ao gerar PDF' });
    } finally {
        setIsDownloading(false);
    }
  };

  const confirmDeleteAction = () => {
    if (!deletingProposal) return;
    setSavedProposals(prev => prev.filter(p => p.id !== deletingProposal.id));
    toast({ title: "Proposta Excluída" });
    setDeletingProposal(null);
  };
  
  const handleAddProductFromList = (product: Product) => {
    append({ name: product.name, quantity: 1, price: product.price, isMonthly: false });
    toast({ title: "Item Adicionado!", description: `"${product.name}" foi adicionado à proposta.` });
  };

  const handleEditProposalClick = (proposal: Proposal) => {
    setEditingProposal(proposal);
    form.reset({
      clientId: proposal.clientId,
      clientName: proposal.clientName,
      clientPhone: proposal.clientPhone,
      proposalDate: proposal.proposalDate,
      validityDate: proposal.validityDate,
      items: proposal.items,
      paymentMethod: proposal.paymentMethod,
      installments: proposal.installments,
      firstAsDownPayment: proposal.firstAsDownPayment,
    });
    setIsQuickAddingClient(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingProposal(null);
    form.reset({
      clientName: '',
      clientPhone: '',
      proposalDate: new Date(),
      validityDate: addDays(new Date(), 10),
      items: [{ name: '', quantity: 1, price: 0, isMonthly: false }],
      paymentMethod: 'boleto',
      installments: 1,
      firstAsDownPayment: false,
    });
    setIsQuickAddingClient(false);
  };

  const onSubmit = (data: ProposalFormValues) => {
    const currentTotals = data.items.reduce(
        (acc, item) => {
            const subtotal = (Number(item.quantity) || 0) * (Number(item.price) || 0);
            if (item.isMonthly) acc.monthly += subtotal;
            else acc.oneTime += subtotal;
            return acc;
        },
        { oneTime: 0, monthly: 0 }
    );
    
    if (editingProposal) {
      const updatedProposal: Proposal = {
        ...data,
        id: editingProposal.id,
        totalOneTime: currentTotals.oneTime,
        totalMonthly: currentTotals.monthly,
      };
      setSavedProposals(prev => prev.map(p => p.id === editingProposal.id ? updatedProposal : p));
      toast({ title: 'Proposta Atualizada!' });
    } else {
      const newId = savedProposals.length > 0 ? Math.max(0, ...savedProposals.map(p => Number(p.id))) + 1 : 1;
      const newProposal: Proposal = {
        ...data,
        id: String(newId),
        totalOneTime: currentTotals.oneTime,
        totalMonthly: currentTotals.monthly,
      };
      setSavedProposals(prev => [newProposal, ...prev]);
      toast({ title: 'Proposta Salva!' });
    }

    handleCancelEdit();
  };

  const onProductSubmit = (values: ProductFormValues) => {
    if (!editingProduct) return;
    updateProduct({
        ...editingProduct,
        name: values.name,
        price: values.price,
        priceHistory: values.price !== editingProduct.price ? [values.price, ...editingProduct.priceHistory] : editingProduct.priceHistory,
    });
    setIsProductFormOpen(false);
    setEditingProduct(null);
    toast({ title: "Produto Atualizado" });
  };

  const confirmDeleteProductAction = () => {
    if (!deletingProduct) return;
    deleteProduct(deletingProduct.id);
    toast({ title: "Produto Removido" });
    setDeletingProduct(null);
  };

  return (
    <div className="flex-1 space-y-6 p-8 pt-6">
      <datalist id="product-datalist">
        {products.map(product => <option key={product.id} value={product.name} />)}
      </datalist>
      
        <div className="flex items-center justify-between">
            <h2 className="text-3xl font-bold tracking-tight font-headline">Gerador de Propostas</h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-4">
        <div className="lg:col-span-2 space-y-6">
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} id="proposal-form">
                    <Card>
                        <CardHeader className="flex flex-row items-start justify-between">
                            <div>
                                <CardTitle>{editingProposal ? `Editando Proposta ${editingProposal.id}` : 'Nova Proposta Comercial'}</CardTitle>
                                <CardDescription>{editingProposal ? 'Altere os itens e condições de pagamento.' : 'Preencha os dados para gerar uma nova proposta'}</CardDescription>
                            </div>
                            <div className="flex items-center gap-4">
                                <FormField
                                    control={form.control}
                                    name="proposalDate"
                                    render={({ field }) => (
                                        <div className="space-y-1 text-right">
                                            <Label className="text-xs uppercase font-bold text-muted-foreground">Emissão</Label>
                                            <Popover>
                                                <PopoverTrigger asChild>
                                                <Button type="button" variant="outline" className={cn("w-[140px] justify-start text-left font-normal h-8 text-xs", !field.value && "text-muted-foreground")}>
                                                    <CalendarIcon className="mr-2 h-3 w-3" />
                                                    {isClient && field.value ? format(field.value, "dd/MM/yyyy") : <span>Data</span>}
                                                </Button>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value} onSelect={field.onChange} locale={ptBR}/></PopoverContent>
                                            </Popover>
                                        </div>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="validityDate"
                                    render={({ field }) => (
                                        <div className="space-y-1 text-right">
                                            <Label className="text-xs uppercase font-bold text-muted-foreground">Validade</Label>
                                            <Popover>
                                                <PopoverTrigger asChild>
                                                <Button type="button" variant="outline" className={cn("w-[140px] justify-start text-left font-normal h-8 text-xs", !field.value && "text-muted-foreground")}>
                                                    <CalendarIcon className="mr-2 h-3 w-3" />
                                                    {isClient && field.value ? format(field.value, "dd/MM/yyyy") : <span>Data</span>}
                                                </Button>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value} onSelect={field.onChange} locale={ptBR}/></PopoverContent>
                                            </Popover>
                                        </div>
                                    )}
                                />
                            </div>
                        </CardHeader>
                        <CardContent className="flex items-center gap-4 border-t pt-6">
                            {companyProfile.logoUrl ? <img src={companyProfile.logoUrl} alt="Logo" data-ai-hint="logo" className="h-16 w-24 object-contain" /> : <Building className="h-16 w-16 text-muted-foreground" />}
                            <div>
                                <h3 className="font-bold text-lg">{companyProfile.name}</h3>
                                <p className="text-sm text-muted-foreground">{companyProfile.email} | {companyProfile.phone}</p>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="mt-6">
                        <CardHeader>
                            <CardTitle>Dados do Cliente</CardTitle>
                            <CardDescription>Selecione um cliente ou preencha manualmente.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {!editingProposal ? (
                                <>
                                    <div className="flex gap-2">
                                        <div className="flex-1">
                                            <Select onValueChange={handleClientSelect} disabled={isQuickAddingClient}>
                                                <SelectTrigger><SelectValue placeholder="Selecione um cliente..." /></SelectTrigger>
                                                <SelectContent>{customers.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                                            </Select>
                                        </div>
                                        <Button type="button" variant="outline" onClick={handleQuickAddClient}><PlusCircle className="mr-2 h-4 w-4" />Avulso</Button>
                                    </div>
                                    {isQuickAddingClient && (
                                        <div className="grid sm:grid-cols-2 gap-4 p-4 border rounded-md bg-muted/20">
                                            <div className="space-y-2">
                                                <Label>Nome do Cliente</Label>
                                                <Input {...form.register('clientName')} placeholder="Nome completo" />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Telefone</Label>
                                                <Input {...form.register('clientPhone')} placeholder="(00) 00000-0000" />
                                            </div>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className="grid sm:grid-cols-2 gap-4 p-4 border rounded-md bg-muted/50">
                                    <div><span className="font-semibold">Cliente:</span> {form.getValues('clientName')}</div>
                                    <div><span className="font-semibold">Telefone:</span> {form.getValues('clientPhone')}</div>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <Card className="mt-6">
                        <CardHeader><CardTitle>Itens da Proposta</CardTitle></CardHeader>
                        <CardContent>
                            <Table>
                            <TableHeader>
                                <TableRow>
                                <TableHead className="w-[40%]">Descrição</TableHead>
                                <TableHead>Qtd.</TableHead>
                                <TableHead>Recorrência</TableHead>
                                <TableHead>Preço Unit.</TableHead>
                                <TableHead>Subtotal</TableHead>
                                <TableHead className="text-right w-10"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {fields.map((item, index) => {
                                const currentItemName = watchItems[index]?.name;
                                const currentProduct = products.find(p => p.name.toLowerCase() === currentItemName?.toLowerCase());
                                return (
                                <TableRow key={item.id}>
                                    <TableCell><Textarea placeholder="Descrição..." {...form.register(`items.${index}.name`)} className="min-h-0 h-10 py-1" list="product-datalist" onBlur={() => handleItemNameBlur(index)} /></TableCell>
                                    <TableCell><Input type="number" {...form.register(`items.${index}.quantity`)} className="w-16 h-8" /></TableCell>
                                    <TableCell>
                                        <Controller
                                            control={form.control}
                                            name={`items.${index}.isMonthly`}
                                            render={({ field }) => (
                                                <Select onValueChange={(val) => field.onChange(val === 'monthly')} value={field.value ? 'monthly' : 'onetime'}>
                                                    <SelectTrigger className="w-24 h-8 text-xs"><SelectValue /></SelectTrigger>
                                                    <SelectContent><SelectItem value="onetime">Único</SelectItem><SelectItem value="monthly">Mensal</SelectItem></SelectContent>
                                                </Select>
                                            )}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <div className="relative flex items-center">
                                            <Input type="number" step="0.01" {...form.register(`items.${index}.price`)} className={cn("w-24 h-8 pr-6", !currentProduct && 'pr-2')} />
                                            {currentProduct && (
                                                <Popover>
                                                    <PopoverTrigger asChild><Button type="button" variant="ghost" size="icon" className="absolute right-0 h-8 w-6 text-muted-foreground"><History className="h-3 w-3" /></Button></PopoverTrigger>
                                                    <PopoverContent className="w-auto p-2"><p className="font-bold text-xs mb-1">Histórico</p><div className="flex flex-col gap-1">{currentProduct.priceHistory.map((p, i) => <Button key={i} variant="ghost" className="h-6 text-[10px] justify-start" onClick={() => { form.setValue(`items.${index}.price`, p); form.trigger(`items.${index}.price`); }}>{p.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</Button>)}</div></PopoverContent>
                                                </Popover>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell className="font-medium text-xs">{((Number(watchItems[index]?.quantity) || 0) * (Number(watchItems[index]?.price) || 0)).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</TableCell>
                                    <TableCell className="text-right"><Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => remove(index)}><Trash2 className="h-4 w-4" /></Button></TableCell>
                                </TableRow>
                                )})}
                            </TableBody>
                            </Table>
                        </CardContent>
                        <CardFooter className="justify-between border-t pt-6">
                            <Button type="button" variant="outline" size="sm" onClick={() => append({ name: '', quantity: 1, price: 0, isMonthly: false })}><PlusCircle className="mr-2 h-4 w-4" />Adicionar Item</Button>
                            <div className="text-right space-y-1">
                                <div className="flex items-center justify-end gap-2 text-primary font-bold"><Tag className="h-4 w-4" /><span>Investimento: {totals.oneTime.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span></div>
                                <div className="flex items-center justify-end gap-2 text-emerald-500 font-bold"><Repeat className="h-4 w-4" /><span>Mensal: {totals.monthly.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span></div>
                            </div>
                        </CardFooter>
                    </Card>
                </form>
            </Form>
        </div>

        <div className="lg:col-span-1 space-y-6">
          <Card>
            <CardHeader><CardTitle>Pagamento e Resumo</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Forma (Venda Única)</Label>
                <Controller
                  control={form.control}
                  name="paymentMethod"
                  render={({ field }) => (
                       <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent><SelectItem value="boleto">Boleto</SelectItem><SelectItem value="pix">PIX</SelectItem><SelectItem value="cartao">Cartão</SelectItem></SelectContent>
                      </Select>
                  )}
                />
              </div>
              <div className="space-y-2">
                <Label>Parcelas</Label>
                 <Controller
                  control={form.control}
                  name="installments"
                  render={({ field }) => (
                      <Select onValueChange={field.onChange} value={String(field.value)}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>{[...Array(6)].map((_, i) => <SelectItem key={i + 1} value={String(i + 1)}>{i + 1}x de { (totals.oneTime / (i + 1) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) }</SelectItem>)}</SelectContent>
                      </Select>
                  )}
                />
              </div>
              <div className="flex items-center space-x-2">
                  <Controller control={form.control} name="firstAsDownPayment" render={({ field }) => <Switch checked={field.value} onCheckedChange={field.onChange} />} />
                  <Label className="text-xs">1ª parcela como entrada?</Label>
              </div>
              <Separator />
              <div className="space-y-1 text-sm">
                  <div className="flex justify-between font-bold"><span>Total Único:</span> <span className="text-primary">{totals.oneTime.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span></div>
                  <div className="flex justify-between font-bold"><span>Total Mensal:</span> <span className="text-emerald-500">{totals.monthly.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span></div>
                  <div className="flex justify-between text-xs text-muted-foreground italic"><span>({watchInstallments}x de { (totals.oneTime / watchInstallments || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) } no investimento)</span></div>
              </div>
            </CardContent>
            <CardFooter><Button type="submit" form="proposal-form" className="w-full">{editingProposal ? 'Atualizar' : 'Salvar Proposta'}</Button></CardFooter>
          </Card>
          
          <Card>
            <CardHeader className="p-4"><CardTitle className="text-sm">Produtos Rápidos</CardTitle>
                <div className="relative mt-2"><Search className="absolute left-2 top-2.5 h-3 w-3 text-muted-foreground" /><Input placeholder="Buscar..." className="pl-7 h-8 text-xs" value={productSearch} onChange={(e) => setProductSearch(e.target.value)} /></div>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-64">
                <div className="px-4 pb-4 space-y-1">
                  {filteredProducts.map(p => (
                     <div key={p.id} className="group flex cursor-pointer items-center justify-between rounded-md p-2 hover:bg-muted" onClick={() => handleAddProductFromList(p)}>
                      <div className="flex-1 truncate"><p className="font-semibold text-xs truncate">{p.name}</p><p className="text-[10px] text-muted-foreground">{p.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p></div>
                      <div className="flex items-center opacity-0 group-hover:opacity-100"><Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); setEditingProduct(p); productForm.reset({ id: p.id, name: p.name, price: p.price }); setIsProductFormOpen(true); }}><Pencil className="h-3 w-3" /></Button><Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={(e) => { e.stopPropagation(); setDeletingProduct(p); }}><Trash2 className="h-3 w-3" /></Button></div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>
      
      <Card className="mt-6">
        <CardHeader><CardTitle className="flex items-center gap-2"><ListChecks className="h-5 w-5"/>Propostas Geradas</CardTitle></CardHeader>
        <CardContent>
            <Table>
                <TableHeader><TableRow><TableHead>ID</TableHead><TableHead>Cliente</TableHead><TableHead>Data</TableHead><TableHead>Investimento</TableHead><TableHead>Mensal</TableHead><TableHead className="text-right">Ações</TableHead></TableRow></TableHeader>
                <TableBody>
                    {savedProposals.length === 0 ? <TableRow><TableCell colSpan={6} className="text-center h-20 text-muted-foreground">Vazio</TableCell></TableRow> : savedProposals.map(p => (
                        <TableRow key={p.id}>
                            <TableCell className="font-bold">#{p.id}</TableCell>
                            <TableCell>{p.clientName}</TableCell>
                            <TableCell>{format(p.proposalDate, 'dd/MM/yyyy')}</TableCell>
                            <TableCell className="text-primary font-medium">{p.totalOneTime.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</TableCell>
                            <TableCell className="text-emerald-500 font-medium">{p.totalMonthly.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</TableCell>
                            <TableCell className="text-right">
                                <div className="flex justify-end gap-1">
                                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => handleEditProposalClick(p)}><Pencil className="h-4 w-4" /></Button>
                                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setSelectedProposal(p)}><Printer className="h-4 w-4" /></Button>
                                    <Button variant="outline" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeletingProposal(p)}><Trash2 className="h-4 w-4" /></Button>
                                </div>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </CardContent>
      </Card>

        <Dialog open={!!selectedProposal} onOpenChange={(open) => !open && setSelectedProposal(null)}>
            <DialogContent className="sm:max-w-4xl h-[90vh] flex flex-col">
                <DialogHeader className="print-hide"><DialogTitle>Pré-visualização da Proposta</DialogTitle></DialogHeader>
                {selectedProposal && (
                <ScrollArea className="flex-1 -mx-6 px-6">
                    <div id="proposal-preview" className="bg-white text-black p-12 shadow-lg max-w-2xl mx-auto font-sans my-8">
                        <div className="flex justify-between items-start mb-8">
                            <div><h1 className="text-2xl font-bold">{companyProfile.name}</h1>{ companyProfile.logoUrl && <img src={companyProfile.logoUrl} alt="Logo" className="mt-2 max-h-12" /> }</div>
                            <div className="text-right text-xs"><p>{companyProfile.address}</p><p>{companyProfile.email}</p><p>{companyProfile.phone}</p></div>
                        </div>
                        <hr className="my-8" />
                        <h2 className="text-xl font-bold mb-4">Proposta Comercial #{selectedProposal.id}</h2>
                        <div className="grid grid-cols-2 gap-4 mb-8 text-sm">
                            <div><p className="font-bold text-gray-500 uppercase text-xs">Para:</p><p className="font-bold">{selectedProposal.clientName}</p><p>{selectedProposal.clientPhone}</p></div>
                            <div className="text-right"><p><span className="font-bold">Emissão:</span> {format(selectedProposal.proposalDate, 'dd/MM/yyyy')}</p><p><span className="font-bold">Validade:</span> {format(selectedProposal.validityDate, 'dd/MM/yyyy')}</p></div>
                        </div>
                        <table className="w-full text-left text-sm mb-8">
                            <thead className="bg-gray-100"><tr><th className="p-2">Item</th><th className="p-2 text-center">Qtd.</th><th className="p-2 text-right">Preço Unit.</th><th className="p-2 text-right">Subtotal</th></tr></thead>
                            <tbody>{selectedProposal.items.map((it, i) => (
                                <tr key={i} className="border-b"><td className="p-2">{it.name} {it.isMonthly && <span className="text-[10px] font-bold text-emerald-600">(mensal)</span>}</td><td className="p-2 text-center">{it.quantity}</td><td className="p-2 text-right">{it.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td><td className="p-2 text-right">{(it.quantity * it.price).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td></tr>
                            ))}</tbody>
                        </table>
                        <div className="flex justify-end mb-8"><div className="w-1/2 space-y-1"><div className="flex justify-between text-sm"><span>Total Único:</span> <span className="font-bold">{selectedProposal.totalOneTime.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span></div><div className="flex justify-between text-sm text-emerald-700 pt-1 border-t"><span>Total Mensal:</span> <span className="font-bold">{selectedProposal.totalMonthly.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span></div></div></div>
                        <div className="bg-gray-50 p-4 rounded text-sm"><h3 className="font-bold mb-1">Pagamento (Investimento Único)</h3><p>Forma: {selectedProposal.paymentMethod.toUpperCase()} | Parcelas: {selectedProposal.installments}x de {(selectedProposal.totalOneTime / selectedProposal.installments).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p></div>
                        <div className="mt-12 text-center text-[10px] text-gray-400"><p>Atenciosamente, {companyProfile.name}</p></div>
                    </div>
                </ScrollArea>
                )}
                <DialogFooter className="print-hide border-t pt-4">
                    <Button variant="outline" onClick={() => setSelectedProposal(null)}>Fechar</Button>
                    <Button variant="secondary" onClick={handleDownloadPdf} disabled={isDownloading}>{isDownloading ? <Loader2 className="animate-spin h-4 w-4" /> : <Download className="h-4 w-4" />} PDF</Button>
                    <Button onClick={() => handleSendWhatsApp(selectedProposal!)}><Send className="h-4 w-4" /> WhatsApp</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
        
        <AlertDialog open={!!deletingProposal} onOpenChange={(open) => !open && setDeletingProposal(null)}>
            <AlertDialogContent>
                <AlertDialogHeader><AlertDialogTitle>Excluir Proposta?</AlertDialogTitle><AlertDialogDescription>Essa ação não pode ser desfeita.</AlertDialogDescription></AlertDialogHeader>
                <AlertDialogFooter><AlertDialogCancel>Não</AlertDialogCancel><AlertDialogAction onClick={confirmDeleteAction}>Sim, Excluir</AlertDialogAction></AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

        <Dialog open={isProductFormOpen} onOpenChange={setIsProductFormOpen}>
            <DialogContent className="sm:max-w-[400px]">
                <Form {...productForm}>
                    <form onSubmit={productForm.handleSubmit(onProductSubmit)}>
                        <DialogHeader><DialogTitle>Editar Produto</DialogTitle></DialogHeader>
                        <div className="grid gap-4 py-4">
                            <FormField control={productForm.control} name="name" render={({ field }) => (
                                <FormItem><FormLabel>Nome</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                            )} />
                            <FormField control={productForm.control} name="price" render={({ field }) => (
                                <FormItem><FormLabel>Preço Base</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>
                            )} />
                        </div>
                        <DialogFooter><Button type="button" variant="outline" onClick={() => setIsProductFormOpen(false)}>Cancelar</Button><Button type="submit">Salvar</Button></DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>

        <AlertDialog open={!!deletingProduct} onOpenChange={(open) => !open && setDeletingProduct(null)}>
            <AlertDialogContent>
                <AlertDialogHeader><AlertDialogTitle>Remover Produto?</AlertDialogTitle></AlertDialogHeader>
                <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={confirmDeleteProductAction}>Remover</AlertDialogAction></AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    </div>
  );
}
