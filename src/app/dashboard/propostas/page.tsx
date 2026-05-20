'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
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
  Share2,
  Image as ImageIcon,
  UploadCloud,
  Camera,
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
import type { Product, Proposal } from '@/lib/types';
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
  installments: z.coerce.number().min(1).max(12),
  firstAsDownPayment: z.boolean(),
  observations: z.string().optional(),
});

type ProposalFormValues = z.infer<typeof proposalSchema>;

const productFormSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'O nome do produto é obrigatório.'),
  price: z.coerce.number().min(0, 'O preço não pode ser negativo.'),
  imageUrl: z.string().optional(),
});

type ProductFormValues = z.infer<typeof productFormSchema>;

export default function PropostasPage() {
  const { companyProfile, customers, products, addProduct, updateProduct, deleteProduct, proposals, addProposal, updateProposal, deleteProposal } = useSettings();
  const { toast } = useToast();
  const [productSearch, setProductSearch] = useState('');
  const [isQuickAddingClient, setIsQuickAddingClient] = useState(false);
  const [selectedProposal, setSelectedProposal] = useState<Proposal | null>(null);
  const [deletingProposal, setDeletingProposal] = useState<Proposal | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [editingProposal, setEditingProposal] = useState<Proposal | null>(null);

  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);
  const [isProductFormOpen, setIsProductFormOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
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
      observations: '',
    },
  });

  const productForm = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      name: '',
      price: 0,
      imageUrl: '',
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'items',
  });

  const watchItems = useWatch({
    control: form.control,
    name: "items",
  });
  
  const watchInstallments = form.watch('installments');
  const watchFirstAsDownPayment = form.watch('firstAsDownPayment');
  const productImageUrl = productForm.watch('imageUrl');

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
      form.setValue('clientName', client.nomeFantasia || client.name);
      form.setValue('clientPhone', client.telefone || client.phone2 || '');
      setIsQuickAddingClient(false);
    }
  };
  
  const handleQuickAddClient = () => {
    form.setValue('clientId', undefined);
    form.setValue('clientName', '');
    form.setValue('clientPhone', '');
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

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 1 * 1024 * 1024) {
        toast({ variant: "destructive", title: "Arquivo muito grande", description: "Por favor, selecione uma imagem com menos de 1MB." });
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        productForm.setValue('imageUrl', reader.result as string, { shouldDirty: true });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSendWhatsAppText = (proposal: Proposal) => {
    const itemsText = proposal.items
      .map(
        (item) =>
          `- ${item.name} ${item.isMonthly ? '*(mensal)*' : ''} (Qtd: ${item.quantity}, Valor Unit.: ${item.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })})`
      )
      .join('\n');

    const installmentsDetail = proposal.installments > 1 && proposal.firstAsDownPayment 
        ? ` (sendo a 1ª como entrada)` 
        : '';

    const message = `Olá, ${proposal.clientName}! 👋
Segue a sua proposta comercial da ${companyProfile.name}.

*Proposta:* ${proposal.id}
*Data:* ${format(parseISO(proposal.proposalDate), 'dd/MM/yyyy')}

*Itens:*
${itemsText}

*Total Único:* *${proposal.totalOneTime.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}*
*Total Mensal:* *${proposal.totalMonthly.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}*

*Condições de Pagamento (Valor Único):*
- *Forma:* ${proposal.paymentMethod.replace('cartao', 'Cartão de Crédito').replace('boleto', 'Boleto Bancário').replace('pix', 'PIX')}
- *Parcelas:* ${proposal.installments}x de ${(proposal.totalOneTime / proposal.installments).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}${installmentsDetail}

${proposal.observations ? `\n*Observações:*\n${proposal.observations}` : ''}

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

  const handleSharePdf = async (proposal: Proposal) => {
    const proposalElement = document.getElementById('proposal-preview');
    if (!proposalElement) {
        toast({ variant: 'destructive', title: 'Erro ao gerar documento' });
        return;
    }

    setIsSharing(true);
    try {
        const canvas = await html2canvas(proposalElement, { 
            scale: 2, 
            useCORS: true,
            logging: false,
            allowTaint: true,
        });
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
        
        const pdfBlob = pdf.output('blob');
        const file = new File([pdfBlob], `proposta-${proposal.id}.pdf`, { type: 'application/pdf' });

        if (navigator.canShare && navigator.canShare({ files: [file] })) {
            await navigator.share({
                files: [file],
                title: `Proposta Comercial #${proposal.id}`,
                text: `Segue proposta da ${companyProfile.name} para ${proposal.clientName}.`,
            });
        } else {
            pdf.save(`proposta-${proposal.id}.pdf`);
            toast({
                title: "PDF Baixado",
                description: "Seu navegador não suporta envio direto. O PDF foi baixado para que você possa anexar no WhatsApp manualmente.",
            });
        }
    } catch (error) {
        console.error(error);
        toast({ variant: 'destructive', title: 'Falha ao compartilhar proposta' });
    } finally {
        setIsSharing(false);
    }
  };

  const handleDownloadPdf = async () => {
    const proposalElement = document.getElementById('proposal-preview');
    if (!proposalElement || !selectedProposal) {
        toast({ variant: 'destructive', title: 'Erro ao gerar PDF' });
        return;
    }
    setIsDownloading(true);
    try {
        const canvas = await html2canvas(proposalElement, { 
            scale: 2, 
            useCORS: true,
            logging: false,
        });
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
    deleteProposal(deletingProposal.id);
    toast({ title: "Proposta Excluída" });
    setDeletingProposal(null);
  };

  const confirmDeleteProductAction = () => {
    if (!deletingProduct) return;
    deleteProduct(deletingProduct.id);
    toast({ title: "Produto Removido" });
    setDeletingProduct(null);
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
      proposalDate: new Date(proposal.proposalDate),
      validityDate: new Date(proposal.validityDate),
      items: proposal.items,
      paymentMethod: proposal.paymentMethod,
      installments: proposal.installments,
      firstAsDownPayment: proposal.firstAsDownPayment,
      observations: proposal.observations || '',
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
      observations: '',
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
      const updatedP: Proposal = {
        ...data,
        id: editingProposal.id,
        proposalDate: data.proposalDate.toISOString(),
        validityDate: data.validityDate.toISOString(),
        totalOneTime: currentTotals.oneTime,
        totalMonthly: currentTotals.monthly,
      };
      updateProposal(updatedP);
      toast({ title: 'Proposta Atualizada!' });
    } else {
      const newId = proposals.length > 0 ? Math.max(0, ...proposals.map(p => Number(p.id))) + 1 : 1;
      const newP: Proposal = {
        ...data,
        id: String(newId),
        proposalDate: data.proposalDate.toISOString(),
        validityDate: data.validityDate.toISOString(),
        totalOneTime: currentTotals.oneTime,
        totalMonthly: currentTotals.monthly,
      };
      addProposal(newP);
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
        imageUrl: values.imageUrl,
        priceHistory: values.price !== editingProduct.price ? [values.price, ...editingProduct.priceHistory] : editingProduct.priceHistory,
    });
    setIsProductFormOpen(false);
    setEditingProduct(null);
    toast({ title: "Produto Atualizado" });
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
                                                    {field.value ? format(field.value, "dd/MM/yyyy") : <span>Data</span>}
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
                                                    {field.value ? format(field.value, "dd/MM/yyyy") : <span>Data</span>}
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
                                                <SelectContent>{customers.map(c => <SelectItem key={c.id} value={c.id}>{c.nomeFantasia || c.name}</SelectItem>)}</SelectContent>
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
                                const currentItemName = watchItems && watchItems[index]?.name;
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
                                    <TableCell className="font-medium text-xs">{((Number(watchItems && watchItems[index]?.quantity) || 0) * (Number(watchItems && watchItems[index]?.price) || 0)).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</TableCell>
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

                    <Card className="mt-6">
                        <CardHeader>
                            <CardTitle>Observações e Condições Gerais</CardTitle>
                            <CardDescription>Adicione prazos de entrega, garantias ou notas adicionais.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <FormField
                                control={form.control}
                                name="observations"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormControl>
                                            <Textarea 
                                                placeholder="Ex: Prazo de entrega: 5 dias úteis. Garantia: 12 meses contra defeitos de fabricação." 
                                                className="min-h-[100px]" 
                                                {...field} 
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
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
                          <SelectContent>{[...Array(12)].map((_, i) => <SelectItem key={i + 1} value={String(i + 1)}>{i + 1}x de { (totals.oneTime / (i + 1) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) }</SelectItem>)}</SelectContent>
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
                  <div className="flex justify-between text-xs text-muted-foreground italic">
                      <span>({watchInstallments}x de { (totals.oneTime / watchInstallments || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) } no investimento{watchFirstAsDownPayment && watchInstallments > 1 ? ', sendo a 1ª como entrada' : ''})</span>
                  </div>
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
                      <div className="flex items-center gap-3 flex-1 truncate">
                        {p.imageUrl ? (
                           <img src={p.imageUrl} alt={p.name} className="h-8 w-8 rounded object-cover border bg-white" />
                        ) : (
                           <div className="h-8 w-8 rounded bg-primary/5 flex items-center justify-center border border-primary/20">
                             <ImageIcon className="h-4 w-4 text-primary" />
                           </div>
                        )}
                        <div className="flex-1 truncate">
                            <p className="font-semibold text-xs truncate">{p.name}</p>
                            <p className="text-[10px] text-muted-foreground">{p.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                        </div>
                      </div>
                      <div className="flex items-center opacity-0 group-hover:opacity-100">
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); setEditingProduct(p); productForm.reset({ id: p.id, name: p.name, price: p.price, imageUrl: p.imageUrl || '' }); setIsProductFormOpen(true); }}><Pencil className="h-3 w-3" /></Button>
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={(e) => { e.stopPropagation(); setDeletingProduct(p); }}><Trash2 className="h-3 w-3" /></Button>
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
        <CardHeader><CardTitle className="flex items-center gap-2"><ListChecks className="h-5 w-5"/>Propostas Geradas</CardTitle></CardHeader>
        <CardContent>
            <Table>
                <TableHeader><TableRow><TableHead>ID</TableHead><TableHead>Cliente</TableHead><TableHead>Data</TableHead><TableHead>Investimento</TableHead><TableHead>Mensal</TableHead><TableHead className="text-right">Ações</TableHead></TableRow></TableHeader>
                <TableBody>
                    {proposals.length === 0 ? <TableRow><TableCell colSpan={6} className="text-center h-20 text-muted-foreground">Vazio</TableCell></TableRow> : proposals.map(p => (
                        <TableRow key={p.id}>
                            <TableCell className="font-bold">#{p.id}</TableCell>
                            <TableCell>{p.clientName}</TableCell>
                            <TableCell>{format(parseISO(p.proposalDate), 'dd/MM/yyyy')}</TableCell>
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
                    <div id="proposal-preview" className="bg-white text-black p-12 shadow-lg max-w-2xl mx-auto my-8 border" style={{ fontFamily: 'Arial, sans-serif', letterSpacing: '0.01em' }}>
                        <div className="flex justify-between items-start mb-6" style={{ minHeight: '80px' }}>
                            <div className="flex items-center gap-5">
                                {companyProfile.logoUrl && <img src={companyProfile.logoUrl} alt="Logo" className="max-h-16 w-auto" />}
                                <div>
                                    <h1 className="text-2xl font-bold uppercase leading-none" style={{ margin: '0' }}>{companyProfile.name}</h1>
                                </div>
                            </div>
                            <div className="text-right text-[10px] leading-relaxed text-gray-500">
                                <p>{companyProfile.address}</p>
                                <p>{companyProfile.email}</p>
                                <p>{companyProfile.phone}</p>
                            </div>
                        </div>
                        
                        <div className="w-full h-px bg-gray-300 my-6"></div>
                        
                        <div className="text-center mb-10">
                            <h2 className="text-2xl font-bold uppercase tracking-widest border-b-2 border-black pb-2 inline-block">Proposta Comercial</h2>
                        </div>

                        <div className="grid grid-cols-2 gap-8 mb-10 text-sm">
                            <div>
                                <p className="font-bold text-gray-500 uppercase text-[10px] mb-1">Para:</p>
                                <p className="font-bold text-lg leading-tight mb-1">{selectedProposal.clientName}</p>
                                <p className="text-gray-600">{selectedProposal.clientPhone}</p>
                            </div>
                            <div className="text-right flex flex-col justify-end space-y-1">
                                <p className="leading-none"><span className="font-bold">Nº Proposta:</span> #{selectedProposal.id}</p>
                                <p className="leading-none"><span className="font-bold">Emissão:</span> {format(parseISO(selectedProposal.proposalDate), 'dd/MM/yyyy')}</p>
                                <p className="leading-none"><span className="font-bold">Validade:</span> {format(parseISO(selectedProposal.validityDate), 'dd/MM/yyyy')}</p>
                            </div>
                        </div>

                        <div className="space-y-4 text-sm mb-10 leading-relaxed text-justify">
                            <p>Com mais de 18 anos de experiência, somos a junção de Soluções especializada em tecnologia.</p>
                            <p>Na área de Consultoria da Tecnologia dispomos das mais modernas ferramentas e profissionais altamente qualificados.</p>
                            <p>A Active Representações conta hoje com a parceria de grandes empresas para atender seus clientes de forma ágil e com grande qualidade profissional no mínimo de tempo e passa por rigor de análise em vários critérios, a começar pelo atendimento ao cliente.</p>
                        </div>

                        <table className="w-full text-left text-sm mb-10 border-collapse">
                            <thead className="bg-gray-100">
                                <tr>
                                    <th className="p-3 font-bold border-b border-gray-300">Item</th>
                                    <th className="p-3 text-center font-bold border-b border-gray-300">Qtd.</th>
                                    <th className="p-3 text-right font-bold border-b border-gray-300">Preço Unit.</th>
                                    <th className="p-3 text-right font-bold border-b border-gray-300">Subtotal</th>
                                </tr>
                            </thead>
                            <tbody>
                                {selectedProposal.items.map((it, i) => (
                                    <tr key={i} className="border-b border-gray-200">
                                        <td className="p-3">{it.name} {it.isMonthly && <span className="text-[10px] font-bold text-emerald-600">(mensal)</span>}</td>
                                        <td className="p-3 text-center">{it.quantity}</td>
                                        <td className="p-3 text-right">{(Number(it.price) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                                        <td className="p-3 text-right font-medium">{(it.quantity * it.price).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        
                        <div className="flex justify-end mb-10">
                            <div className="w-1/2 space-y-2">
                                <div className="flex justify-between text-sm py-1 border-b border-gray-100">
                                    <span className="font-medium">Total Único:</span> 
                                    <span className="font-bold text-lg">{selectedProposal.totalOneTime.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                                </div>
                                <div className="flex justify-between text-sm text-emerald-700 py-1">
                                    <span className="font-medium">Total Mensal:</span> 
                                    <span className="font-bold text-lg">{selectedProposal.totalMonthly.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
                            <div className="bg-gray-50 p-5 rounded-lg text-sm border border-gray-200 h-full">
                                <h3 className="font-bold mb-4 uppercase text-[10px] text-gray-500 tracking-wider">Condições de Pagamento</h3>
                                <div className="space-y-2">
                                    <p className="flex items-baseline gap-2">
                                        <span className="font-bold text-gray-700">Forma:</span> 
                                        <span className="uppercase">{selectedProposal.paymentMethod}</span>
                                    </p>
                                    <p className="flex items-baseline gap-2 flex-wrap">
                                        <span className="font-bold text-gray-700">Parcelas:</span> 
                                        <span>{selectedProposal.installments}x de {(selectedProposal.totalOneTime / selectedProposal.installments).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                                        {selectedProposal.firstAsDownPayment && selectedProposal.installments > 1 && (
                                            <span className="text-[10px] font-bold text-primary">(Sendo a 1ª como entrada)</span>
                                        )}
                                    </p>
                                </div>
                            </div>
                            
                            {selectedProposal.observations && (
                                <div className="bg-gray-50 p-5 rounded-lg text-sm border border-gray-200 h-full">
                                    <h3 className="font-bold mb-4 uppercase text-[10px] text-gray-500 tracking-wider">Observações Gerais</h3>
                                    <p className="whitespace-pre-wrap italic text-gray-700 leading-relaxed text-xs">{selectedProposal.observations}</p>
                                </div>
                            )}
                        </div>

                        <div className="mt-20 text-center">
                            <div className="w-1/2 h-px bg-gray-300 mx-auto mb-2"></div>
                            <p className="text-[11px] text-gray-400 font-bold uppercase tracking-widest">{companyProfile.name}</p>
                        </div>
                    </div>
                </ScrollArea>
                )}
                <DialogFooter className="print-hide border-t pt-4 flex-wrap gap-2">
                    <Button variant="outline" onClick={() => setSelectedProposal(null)}>Fechar</Button>
                    <Button variant="secondary" onClick={handleDownloadPdf} disabled={isDownloading}>{isDownloading ? <Loader2 className="animate-spin h-4 w-4" /> : <Download className="h-4 w-4" />} PDF</Button>
                    <Button variant="outline" className="gap-2" onClick={() => handleSendWhatsAppText(selectedProposal!)} title="Enviar resumo como texto">
                        <Send className="h-4 w-4" /> WhatsApp (Texto)
                    </Button>
                    <Button className="gap-2 bg-emerald-600 hover:bg-emerald-700" onClick={() => handleSharePdf(selectedProposal!)} disabled={isSharing}>
                        {isSharing ? <Loader2 className="animate-spin h-4 w-4" /> : <Share2 className="h-4 w-4" />} 
                        Enviar PDF (WhatsApp)
                    </Button>
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
            <DialogContent className="sm:max-w-[450px]">
                <Form {...productForm}>
                    <form onSubmit={productForm.handleSubmit(onProductSubmit)}>
                        <DialogHeader><DialogTitle>Gerenciar Produto</DialogTitle></DialogHeader>
                        <div className="grid gap-6 py-4">
                            <div className="flex flex-col items-center gap-4">
                                <div 
                                    className="relative group h-32 w-32 rounded-lg border-2 border-dashed border-primary/20 bg-primary/5 flex items-center justify-center cursor-pointer overflow-hidden hover:bg-primary/10 transition-colors"
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    {productImageUrl ? (
                                        <img src={productImageUrl} alt="Preview" className="h-full w-full object-cover" />
                                    ) : (
                                        <div className="flex flex-col items-center gap-1 text-muted-foreground">
                                            <UploadCloud className="h-8 w-8" />
                                            <span className="text-[10px] font-medium">Add Foto</span>
                                        </div>
                                    )}
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                        <Camera className="h-6 w-6 text-white" />
                                    </div>
                                    <input 
                                        type="file" 
                                        ref={fileInputRef} 
                                        className="hidden" 
                                        accept="image/*" 
                                        onChange={handleFileChange} 
                                    />
                                </div>
                                {productImageUrl && (
                                    <Button type="button" variant="ghost" size="sm" className="h-6 text-xs text-destructive" onClick={() => productForm.setValue('imageUrl', '')}>
                                        Remover Foto
                                    </Button>
                                )}
                            </div>

                            <FormField control={productForm.control} name="name" render={({ field }) => (
                                <FormItem><FormLabel>Nome do Produto</FormLabel><FormControl><Input placeholder="Nome do produto ou serviço" {...field} /></FormControl><FormMessage /></FormItem>
                            )} />
                            <FormField control={productForm.control} name="price" render={({ field }) => (
                                <FormItem><FormLabel>Preço Base</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>
                            )} />
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsProductFormOpen(false)}>Cancelar</Button>
                            <Button type="submit">Salvar</Button>
                        </DialogFooter>
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