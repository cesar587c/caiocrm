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
} from '@/components/ui/alert-dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { initialCustomers, initialProducts } from '@/lib/mock-data';
import type { Product } from '@/lib/mock-data';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { sendWhatsappAction } from '@/app/actions';


const proposalItemSchema = z.object({
  name: z.string().min(1, 'O nome é obrigatório.'),
  quantity: z.coerce.number().min(1, 'A quantidade deve ser no mínimo 1.'),
  price: z.coerce.number().min(0, 'O preço não pode ser negativo.'),
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
type Proposal = ProposalFormValues & { id: string; total: number };


const productFormSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'O nome do produto é obrigatório.'),
  price: z.coerce.number().min(0, 'O preço não pode ser negativo.'),
});

type ProductFormValues = z.infer<typeof productFormSchema>;


export default function PropostasPage() {
  const { companyProfile } = useSettings();
  const { toast } = useToast();
  const [customers, setCustomers] = useState(initialCustomers);
  const [products, setProducts] = useState<Product[]>(initialProducts);
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
      items: [{ name: '', quantity: 1, price: 0 }],
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

  const { watch } = form;
  const watchItems = watch('items');
  const watchInstallments = form.watch('installments');
  const watchFirstAsDownPayment = form.watch('firstAsDownPayment');

  const total = (watchItems || []).reduce(
    (acc, item) => acc + (Number(item.quantity) || 0) * (Number(item.price) || 0),
    0
  );


  const filteredProducts = useMemo(() => {
    if (!productSearch) {
      return products;
    }
    return products.filter(p =>
      p.name.toLowerCase().includes(productSearch.toLowerCase())
    );
  }, [products, productSearch]);

  const selectedProposalInstallmentValue = useMemo(() => {
    if (!selectedProposal || !selectedProposal.installments || selectedProposal.total === 0) return 0;
    return selectedProposal.total / selectedProposal.installments;
  }, [selectedProposal]);

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
    const newProductWithId: Product = { ...newProduct, id: `prod_${Date.now()}`, priceHistory: [newProduct.price] };
    setProducts(prevProducts => [newProductWithId, ...prevProducts]);
    toast({
        title: "Item Cadastrado!",
        description: `"${newProduct.name}" foi adicionado à sua lista de produtos.`,
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
          `- ${item.name} (Qtd: ${item.quantity}, Valor Unit.: ${item.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })})`
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
TOTAL: ${proposal.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
-----------------------------------

-----------------------------------
CONDIÇÕES DE PAGAMENTO
-----------------------------------
- Forma: ${proposal.paymentMethod.replace('cartao', 'Cartão de Crédito').replace('boleto', 'Boleto Bancário').replace('pix', 'PIX')}
- Parcelas: ${proposal.installments}x de ${(proposal.total / proposal.installments).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}

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

    toast({
      title: "E-mail Pronto para Envio",
      description: "Seu cliente de e-mail foi aberto com a proposta.",
    });
  };

  const handleSendWhatsApp = async (proposal: Proposal) => {
    const itemsText = proposal.items
      .map(
        (item) =>
          `- ${item.name} (Qtd: ${item.quantity}, Valor Unit.: ${item.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })})`
      )
      .join('\n');

    const message = `Olá, ${proposal.clientName}! 👋
Segue a sua proposta comercial da ${companyProfile.name}.

*Proposta:* ${proposal.id}
*Data:* ${format(proposal.proposalDate, 'dd/MM/yyyy')}

*Itens:*
${itemsText}

*Total:* *${proposal.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}*

*Condições de Pagamento:*
- *Forma:* ${proposal.paymentMethod.replace('cartao', 'Cartão de Crédito').replace('boleto', 'Boleto Bancário').replace('pix', 'PIX')}
- *Parcelas:* ${proposal.installments}x de ${(proposal.total / proposal.installments).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}

Agradecemos a oportunidade e ficamos à disposição!

${companyProfile.name}
${companyProfile.phone}`;

    const cleanPhone = proposal.clientPhone?.replace(/\D/g, '') || '';
    if (cleanPhone.length < 10) { // Basic validation for DDD + number
         toast({
            title: "Número de Cliente Inválido",
            description: `O cliente ${proposal.clientName} não possui um número de telefone válido.`,
            variant: "destructive",
        });
        return;
    }
    const phoneWithCountryCode = cleanPhone.length > 11 ? cleanPhone : `55${cleanPhone}`;
    
    toast({
        title: "Enviando Proposta...",
        description: `Enviando proposta para ${proposal.clientName} via WhatsApp.`,
    });

    const response = await sendWhatsappAction({
        to: phoneWithCountryCode,
        message: message,
    });

    if (response.error) {
        toast({
            title: "Falha no Envio",
            description: `Não foi possível enviar a proposta para ${proposal.clientName}. Detalhe: ${response.error}`,
            variant: 'destructive',
        });
    } else {
        toast({
            title: "Proposta Enviada!",
            description: `A mensagem para ${proposal.clientName} foi enviada com sucesso.`,
        });
    }
  };


  const handleDownloadPdf = async () => {
    const proposalElement = document.getElementById('proposal-preview');
    if (!proposalElement) {
        toast({
            variant: 'destructive',
            title: 'Erro ao gerar PDF',
            description: 'Não foi possível encontrar o conteúdo da proposta.'
        });
        return;
    }
    if (!selectedProposal) return;

    setIsDownloading(true);

    try {
        const canvas = await html2canvas(proposalElement, {
            scale: 2, // Aumenta a resolução para melhor qualidade
            useCORS: true,
            backgroundColor: null,
            windowWidth: proposalElement.scrollWidth,
            windowHeight: proposalElement.scrollHeight,
        });
        
        const imgData = canvas.toDataURL('image/png');
        
        // A4 page dimensions in mm: 210 x 297
        const pdf = new jsPDF({
            orientation: 'p',
            unit: 'mm',
            format: 'a4',
        });
        
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        const canvasWidth = canvas.width;
        const canvasHeight = canvas.height;
        const canvasAspectRatio = canvasWidth / canvasHeight;
        
        let finalPdfWidth = pdfWidth;
        let finalPdfHeight = pdfWidth / canvasAspectRatio;

        // Se a altura calculada for maior que a página, ajustamos pela altura
        if (finalPdfHeight > pdfHeight) {
            finalPdfHeight = pdfHeight;
            finalPdfWidth = pdfHeight * canvasAspectRatio;
        }

        // Centraliza a imagem
        const xOffset = (pdfWidth - finalPdfWidth) / 2;
        const yOffset = (pdfHeight - finalPdfHeight) / 2;
        
        pdf.addImage(imgData, 'PNG', xOffset, yOffset, finalPdfWidth, finalPdfHeight);
        pdf.save(`proposta-${selectedProposal.id}.pdf`);

        toast({
            title: 'Download Iniciado',
            description: `O download da proposta ${selectedProposal.id} começou.`,
        });

    } catch (error) {
        console.error("Erro ao gerar PDF:", error);
        toast({
            variant: 'destructive',
            title: 'Erro ao gerar PDF',
            description: 'Ocorreu um erro inesperado. Tente novamente.',
        });
    } finally {
        setIsDownloading(false);
    }
  };

  const confirmDeleteAction = () => {
    if (!deletingProposal) return;
    setSavedProposals(proposals => proposals.filter(p => p.id !== deletingProposal.id));
    toast({
      title: "Proposta Excluída",
      description: `A proposta ${deletingProposal.id} foi removida com sucesso.`,
    });
    setDeletingProposal(null);
  };
  
  const handleCancelPreview = () => {
    setSelectedProposal(null);
  };

  const handleAddProductFromList = (product: Product) => {
    append({ name: product.name, quantity: 1, price: product.price });
    toast({
      title: "Item Adicionado!",
      description: `"${product.name}" foi adicionado à proposta.`,
    });
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
    toast({
        title: "Modo de Edição",
        description: `Alterando a proposta ${proposal.id}. O cliente não pode ser modificado.`,
    });
  };

  const handleCancelEdit = () => {
    setEditingProposal(null);
    form.reset({
      clientId: undefined,
      clientName: '',
      clientPhone: '',
      proposalDate: new Date(),
      validityDate: addDays(new Date(), 10),
      items: [{ name: '', quantity: 1, price: 0 }],
      paymentMethod: 'boleto',
      installments: 1,
      firstAsDownPayment: false,
    });
    setIsQuickAddingClient(false);
    toast({
        title: "Edição Cancelada",
    });
  };

  const onSubmit = (data: ProposalFormValues) => {
    const currentTotal = data.items.reduce(
        (acc, item) => acc + (Number(item.quantity) || 0) * (Number(item.price) || 0),
        0
    );
    
    // Shared logic for product price updates
    const updatedProducts = [...products];
    const productMap = new Map(updatedProducts.map(p => [p.name.toLowerCase().trim(), p]));

    data.items.forEach(item => {
        const lowerCaseName = item.name.toLowerCase().trim();
        const newPrice = Number(item.price);
        const existingProduct = productMap.get(lowerCaseName);

        if (existingProduct && existingProduct.price !== newPrice) {
            const updatedPriceHistory = [newPrice, ...existingProduct.priceHistory.filter(p => p !== newPrice)];
            productMap.set(lowerCaseName, {
                ...existingProduct,
                price: newPrice,
                priceHistory: updatedPriceHistory,
            });
        }
    });

    setProducts(Array.from(productMap.values()));


    if (editingProposal) {
      const updatedProposal: Proposal = {
        // Preserve from editingProposal
        id: editingProposal.id,
        clientId: editingProposal.clientId,
        clientName: editingProposal.clientName,
        clientPhone: editingProposal.clientPhone,
        // Update from form data
        proposalDate: data.proposalDate,
        validityDate: data.validityDate,
        items: data.items,
        paymentMethod: data.paymentMethod,
        installments: data.installments,
        firstAsDownPayment: data.firstAsDownPayment,
        // Recalculate
        total: currentTotal,
      };

      setSavedProposals(prev => prev.map(p => p.id === editingProposal.id ? updatedProposal : p));
      toast({
        title: 'Proposta Atualizada!',
        description: `A proposta ${editingProposal.id} foi atualizada com sucesso.`,
      });

    } else {
      // Create new proposal
      const newId = savedProposals.length > 0
        ? Math.max(0, ...savedProposals.map(p => Number(p.id))) + 1
        : 1;

      const newProposalData: Proposal = {
        ...data,
        id: String(newId),
        total: currentTotal,
      };
      setSavedProposals(prev => [newProposalData, ...prev]);

      toast({
        title: 'Proposta Salva!',
        description: `A proposta ${newProposalData.id} foi salva com sucesso e adicionada à lista abaixo.`,
      });
    }

    // Reset form and state for both cases
    form.reset({
      clientId: undefined,
      clientName: '',
      clientPhone: '',
      proposalDate: new Date(),
      validityDate: addDays(new Date(), 10),
      items: [{ name: '', quantity: 1, price: 0 }],
      paymentMethod: 'boleto',
      installments: 1,
      firstAsDownPayment: false,
    });
    setIsQuickAddingClient(false);
    setEditingProposal(null);
  };

  const handleEditProductClick = (e: React.MouseEvent, product: Product) => {
    e.stopPropagation();
    setEditingProduct(product);
    productForm.reset({
      id: product.id,
      name: product.name,
      price: product.price,
    });
    setIsProductFormOpen(true);
  };

  const handleDeleteProductClick = (e: React.MouseEvent, product: Product) => {
    e.stopPropagation();
    setDeletingProduct(product);
  };

  const confirmDeleteProductAction = () => {
    if (!deletingProduct) return;
    setProducts(products => products.filter(p => p.id !== deletingProduct.id));
    toast({
      title: "Produto Excluído",
      description: `"${deletingProduct.name}" foi removido com sucesso.`,
    });
    setDeletingProduct(null);
  };

  const onProductSubmit = (values: ProductFormValues) => {
    if (!editingProduct) return;

    setProducts(prevProducts =>
      prevProducts.map(p => {
        if (p.id === editingProduct.id) {
          const newPrice = values.price;
          const oldPrice = p.price;
          let newPriceHistory = p.priceHistory;

          if (newPrice !== oldPrice) {
            newPriceHistory = [newPrice, ...p.priceHistory.filter(price => price !== newPrice)];
          }

          return {
            ...p,
            name: values.name,
            price: newPrice,
            priceHistory: newPriceHistory,
          };
        }
        return p;
      })
    );

    toast({
      title: "Produto Atualizado",
      description: `"${values.name}" foi atualizado com sucesso.`
    });
    setIsProductFormOpen(false);
    setEditingProduct(null);
  };

  return (
    <div className="flex-1 space-y-6 p-8 pt-6">
      <datalist id="product-datalist">
        {products.map(product => (
          <option key={product.id} value={product.name} />
        ))}
      </datalist>
      
        <div className="flex items-center justify-between">
            <h2 className="text-3xl font-bold tracking-tight font-headline">Gerador de Propostas</h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-4">
        {/* Coluna Principal (Esquerda) */}
        <div className="lg:col-span-2 space-y-6">
            <form onSubmit={form.handleSubmit(onSubmit)} id="proposal-form">
            <Card>
                <CardHeader className="flex flex-row items-start justify-between">
                    <div>
                        <CardTitle>{editingProposal ? `Editando Proposta ${editingProposal.id}` : 'Nova Proposta Comercial'}</CardTitle>
                        <CardDescription>{editingProposal ? 'Altere os itens e condições de pagamento.' : 'Preencha os dados para gerar uma nova proposta'}</CardDescription>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="space-y-1 text-right">
                            <Label htmlFor="proposalDate">Data de Emissão</Label>
                            <Controller
                                control={form.control}
                                name="proposalDate"
                                render={({ field }) => (
                                    <Popover>
                                        <PopoverTrigger asChild>
                                        <Button
                                            type="button"
                                            variant={"outline"}
                                            className={cn("w-[180px] justify-start text-left font-normal", !field.value && "text-muted-foreground")}
                                        >
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {isClient && field.value ? format(field.value, "dd/MM/yyyy") : <span>Selecione a data</span>}
                                        </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0">
                                        <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus locale={ptBR}/>
                                        </PopoverContent>
                                    </Popover>
                                )}
                            />
                        </div>
                        <div className="space-y-1 text-right">
                            <Label htmlFor="validityDate">Data de Validade</Label>
                            <Controller
                                control={form.control}
                                name="validityDate"
                                render={({ field }) => (
                                    <Popover>
                                        <PopoverTrigger asChild>
                                        <Button
                                            type="button"
                                            variant={"outline"}
                                            className={cn("w-[180px] justify-start text-left font-normal", !field.value && "text-muted-foreground")}
                                        >
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {isClient && field.value ? format(field.value, "dd/MM/yyyy") : <span>Selecione a data</span>}
                                        </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0">
                                        <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus locale={ptBR}/>
                                        </PopoverContent>
                                    </Popover>
                                )}
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="flex items-center gap-4">
                    {companyProfile.logoUrl ? (
                        <img
                        src={companyProfile.logoUrl}
                        alt="Logo"
                        data-ai-hint="logo"
                        className="h-16 w-24 object-contain"
                        />
                    ) : (
                        <Building className="h-16 w-16 text-muted-foreground" />
                    )}
                    <div>
                        <h3 className="font-bold text-lg">{companyProfile.name}</h3>
                        <p className="text-sm text-muted-foreground">{companyProfile.email}</p>
                        <p className="text-sm text-muted-foreground">{companyProfile.phone}</p>
                        <p className="text-sm text-muted-foreground">{companyProfile.address}</p>
                    </div>
                </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Dados do Cliente</CardTitle>
                  {editingProposal ? (
                      <CardDescription>O cliente não pode ser alterado durante a edição.</CardDescription>
                  ) : (
                      <CardDescription>Selecione um cliente existente ou cadastre um novo.</CardDescription>
                  )}
              </CardHeader>
              <CardContent className="space-y-4">
                  {editingProposal ? (
                       <div className="grid sm:grid-cols-2 gap-4 p-4 border rounded-md bg-muted/50">
                           <div><span className="font-semibold">Cliente:</span> {editingProposal.clientName}</div>
                           <div><span className="font-semibold">Telefone:</span> {editingProposal.clientPhone}</div>
                       </div>
                  ) : (
                      <>
                          <div className="flex gap-2">
                              <div className="flex-1">
                                  <Label>Selecionar Cliente</Label>
                                  <Select onValueChange={handleClientSelect} disabled={isQuickAddingClient}>
                                  <SelectTrigger>
                                      <SelectValue placeholder="Selecione um cliente existente..." />
                                  </SelectTrigger>
                                  <SelectContent>
                                      {customers.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                                  </SelectContent>
                                  </Select>
                              </div>
                              <Button type="button" variant="outline" className="mt-auto" onClick={handleQuickAddClient}>
                                  <PlusCircle className="mr-2 h-4 w-4" />
                                  Cadastro Rápido
                              </Button>
                          </div>

                          {isQuickAddingClient && (
                              <div className="grid sm:grid-cols-2 gap-4 p-4 border rounded-md bg-muted/20">
                                  <div>
                                      <Label htmlFor="clientName">Nome do Cliente</Label>
                                      <Input id="clientName" {...form.register('clientName')} placeholder="Nome completo ou Razão Social" />
                                      {form.formState.errors.clientName && <p className="text-destructive text-sm mt-1">{form.formState.errors.clientName.message}</p>}
                                  </div>
                                  <div>
                                      <Label htmlFor="clientPhone">Telefone</Label>
                                      <Input id="clientPhone" {...form.register('clientPhone')} placeholder="(00) 00000-0000" />
                                  </div>
                              </div>
                          )}
                          
                          {form.getValues('clientId') && !isQuickAddingClient && (
                              <div className="grid sm:grid-cols-2 gap-4 p-4 border rounded-md">
                                  <div><span className="font-semibold">Cliente:</span> {form.getValues('clientName')}</div>
                                  <div><span className="font-semibold">Telefone:</span> {form.getValues('clientPhone')}</div>
                              </div>
                          )}
                      </>
                  )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Itens da Proposta</CardTitle>
                <CardDescription>Adicione os produtos ou serviços que fazem parte desta proposta.</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50%]">Descrição</TableHead>
                      <TableHead>Qtd.</TableHead>
                      <TableHead>Preço Unit.</TableHead>
                      <TableHead>Subtotal</TableHead>
                      <TableHead className="text-right">Ação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fields.map((item, index) => {
                      const currentItemName = watchItems[index]?.name;
                      const currentProduct = products.find(p => p.name.toLowerCase() === currentItemName?.toLowerCase());

                      return (
                      <TableRow key={item.id}>
                        <TableCell>
                          <Textarea
                            placeholder="Descrição do produto ou serviço"
                            {...form.register(`items.${index}.name`)}
                            className="min-h-0 h-10"
                            list="product-datalist"
                            onBlur={() => handleItemNameBlur(index)}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            {...form.register(`items.${index}.quantity`)}
                            className="w-20"
                          />
                        </TableCell>
                        <TableCell>
                          <div className="relative flex items-center">
                            <Input
                              type="number"
                              step="0.01"
                              {...form.register(`items.${index}.price`)}
                              className={cn("w-32", currentProduct && 'pr-8')}
                            />
                            {currentProduct && (
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="absolute right-0 h-full w-8 text-muted-foreground hover:bg-transparent"
                                    aria-label="Ver histórico de preços"
                                  >
                                    <History className="h-4 w-4" />
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto max-w-xs p-2">
                                  <div className="space-y-1">
                                    <p className="font-semibold text-sm px-1.5">Histórico de Preços</p>
                                    <div className="flex flex-col gap-1 max-h-48 overflow-y-auto">
                                      {currentProduct.priceHistory.length > 0 ? (
                                        currentProduct.priceHistory.map((price, idx) => (
                                          <Button
                                            key={`${price}-${idx}`}
                                            type="button"
                                            variant="ghost"
                                            className="h-auto justify-between p-1.5 text-xs font-normal gap-2"
                                            onClick={() => {
                                              form.setValue(`items.${index}.price`, price, { shouldDirty: true });
                                              form.trigger(`items.${index}.price`);
                                            }}
                                          >
                                            <span>{price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                                            {price === currentProduct.price && <Badge variant="secondary">Recente</Badge>}
                                          </Button>
                                        ))
                                      ) : (
                                        <p className="text-xs text-muted-foreground p-1.5">Nenhum histórico.</p>
                                      )}
                                    </div>
                                  </div>
                                </PopoverContent>
                              </Popover>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">
                          {((Number(watchItems[index]?.quantity) || 0) * (Number(watchItems[index]?.price) || 0)).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    )})}
                  </TableBody>
                </Table>
                {form.formState.errors.items && (
                    <p className="text-destructive text-sm mt-2">{form.formState.errors.items.message || form.formState.errors.items.root?.message}</p>
                )}
              </CardContent>
              <CardFooter className="justify-between">
                <Button type="button" variant="outline" onClick={() => append({ name: '', quantity: 1, price: 0 })}>
                    <PlusCircle className="mr-2 h-4 w-4" /> Adicionar Item
                </Button>
                <div className="text-right">
                    <p className="text-muted-foreground">Total da Proposta</p>
                    <p className="text-2xl font-bold">{total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                </div>
              </CardFooter>
            </Card>
            </form>
        </div>

        {/* Coluna Lateral (Direita) */}
        <div className="lg:col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Condições de Pagamento</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Forma de Pagamento</Label>
                <Controller
                  control={form.control}
                  name="paymentMethod"
                  render={({ field }) => (
                       <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                              <SelectItem value="boleto">Boleto Bancário</SelectItem>
                              <SelectItem value="pix">PIX</SelectItem>
                              <SelectItem value="cartao">Cartão de Crédito</SelectItem>
                          </SelectContent>
                      </Select>
                  )}
                />
              </div>
              <div>
                <Label>Parcelamento</Label>
                 <Controller
                  control={form.control}
                  name="installments"
                  render={({ field }) => (
                      <Select onValueChange={field.onChange} value={String(field.value)}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                          {[...Array(6)].map((_, i) => (
                              <SelectItem key={i + 1} value={String(i + 1)}>
                              {i + 1}x de { (total / (i + 1) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) }
                              </SelectItem>
                          ))}
                          </SelectContent>
                      </Select>
                  )}
                />
              </div>
              <Controller
                  control={form.control}
                  name="firstAsDownPayment"
                  render={({ field }) => (
                      <div className="flex items-center space-x-2">
                          <Switch id="firstAsDownPayment" checked={field.value} onCheckedChange={field.onChange} />
                          <Label htmlFor="firstAsDownPayment">Considerar 1ª parcela como entrada?</Label>
                      </div>
                  )}
              />
            </CardContent>
            <CardFooter className="flex-col items-start space-y-2">
              <p className="font-bold text-lg">Resumo</p>
              <div className="w-full text-sm space-y-1">
                  <div className="flex justify-between"><span>Valor Total:</span> <span className="font-medium">{total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span></div>
                  <div className="flex justify-between"><span>Parcelas:</span> <span className="font-medium">{watchInstallments}x de { (total / watchInstallments || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) }</span></div>
                  <div className="flex justify-between"><span>Entrada:</span> <span className="font-medium">{watchFirstAsDownPayment ? 'Sim' : 'Não'}</span></div>
              </div>
            </CardFooter>
          </Card>
          <div className="flex flex-col gap-2">
            {editingProposal && (
                <Button type="button" variant="outline" size="lg" onClick={handleCancelEdit}>Cancelar Edição</Button>
            )}
            <Button type="submit" size="lg" form="proposal-form">
                {editingProposal ? 'Atualizar Proposta' : 'Salvar Proposta'}
            </Button>
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Produtos Cadastrados</CardTitle>
              <CardDescription>Clique em um item para adicioná-lo à proposta.</CardDescription>
               <div className="relative pt-2">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground mt-2" />
                  <Input 
                    placeholder="Buscar produto..." 
                    className="pl-8" 
                    value={productSearch} 
                    onChange={(e) => setProductSearch(e.target.value)} 
                  />
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-72">
                <div className="flex flex-col gap-1 pr-2">
                  {filteredProducts.map(product => (
                     <div
                      key={product.id}
                      className="group flex cursor-pointer items-center justify-between rounded-md p-2 hover:bg-muted"
                      onClick={() => handleAddProductFromList(product)}
                    >
                      <div className="flex-1 truncate pr-2">
                        <p className="font-semibold text-sm truncate">{product.name}</p>
                        <p className="text-xs text-muted-foreground">{product.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                      </div>
                      <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={(e) => handleEditProductClick(e, product)}
                          aria-label="Editar produto"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={(e) => handleDeleteProductClick(e, product)}
                          aria-label="Excluir produto"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                   {filteredProducts.length === 0 && (
                      <p className="text-sm text-center text-muted-foreground py-4">Nenhum produto encontrado.</p>
                   )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

        </div>
      </div>
      
      <Card className="mt-6">
        <CardHeader>
            <CardTitle className="flex items-center gap-2">
                <ListChecks className="h-5 w-5"/>
                Propostas Salvas
            </CardTitle>
            <CardDescription>Gerencie e acompanhe as propostas que você já criou.</CardDescription>
        </CardHeader>
        <CardContent>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Proposta</TableHead>
                        <TableHead>Cliente</TableHead>
                        <TableHead>Data</TableHead>
                        <TableHead>Valor</TableHead>
                        <TableHead className="text-right w-[180px]">Ações</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {savedProposals.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                                Nenhuma proposta salva ainda.
                            </TableCell>
                        </TableRow>
                    ) : (
                        savedProposals.map(proposal => (
                            <TableRow key={proposal.id}>
                                <TableCell className="font-medium">{proposal.id}</TableCell>
                                <TableCell>{proposal.clientName}</TableCell>
                                <TableCell>{isClient ? format(proposal.proposalDate, 'dd/MM/yyyy') : ''}</TableCell>
                                <TableCell>{proposal.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</TableCell>
                                <TableCell className="text-right">
                                    <div className="flex justify-end gap-2">
                                        <Button type="button" variant="outline" size="icon" onClick={() => handleEditProposalClick(proposal)}>
                                            <Pencil className="h-4 w-4" />
                                            <span className="sr-only">Editar</span>
                                        </Button>
                                        <Button type="button" variant="outline" size="icon" onClick={() => setSelectedProposal(proposal)}>
                                            <Printer className="h-4 w-4" />
                                            <span className="sr-only">Visualizar e Imprimir</span>
                                        </Button>
                                        <Button type="button" variant="outline" size="icon" onClick={() => setDeletingProposal(proposal)}>
                                            <Trash2 className="h-4 w-4 text-destructive" />
                                            <span className="sr-only">Excluir</span>
                                        </Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>
        </CardContent>
      </Card>


        <Dialog open={!!selectedProposal} onOpenChange={(isOpen) => !isOpen && setSelectedProposal(null)}>
            <DialogContent className="sm:max-w-4xl h-[90vh] flex flex-col">
                <DialogHeader className="print-hide">
                <DialogTitle>Pré-visualização da Proposta</DialogTitle>
                <DialogDescription>
                    Confira como o documento final será gerado. Após a confirmação, você poderá enviá-lo ao cliente.
                </DialogDescription>
                </DialogHeader>
                {selectedProposal && (
                <div id="print-container" className="flex-1 border rounded-md bg-muted/30 overflow-y-auto p-8">
                    <div id="proposal-preview" className="bg-white text-black p-12 shadow-lg max-w-2xl mx-auto font-sans">
                        <div className="flex justify-between items-start mb-8">
                            <div>
                                <h1 className="text-2xl font-bold">{companyProfile.name}</h1>
                                { companyProfile.logoUrl && <img src={companyProfile.logoUrl} alt="Logo" data-ai-hint="logo" className="mt-2 max-h-12 w-auto" /> }
                            </div>
                            <div className="text-right text-sm">
                                <p>{companyProfile.address}</p>
                                <p>{companyProfile.email}</p>
                                <p>{companyProfile.phone}</p>
                            </div>
                        </div>
                        
                        <hr className="my-8 border-gray-300" />

                        <h2 className="text-xl font-bold mb-4">Proposta Comercial {selectedProposal.id}</h2>
                        
                        <div className="grid grid-cols-2 gap-4 mb-8 text-sm">
                        <div>
                            <p className="font-bold text-gray-600">PARA:</p>
                            <p className="font-semibold">{selectedProposal.clientName}</p>
                            <p>{selectedProposal.clientPhone}</p>
                        </div>
                        <div className="text-right">
                            <p><span className="font-bold text-gray-600">Data da Proposta:</span> {isClient ? format(selectedProposal.proposalDate, 'dd/MM/yyyy') : ''}</p>
                            <p><span className="font-bold text-gray-600">Validade:</span> {isClient ? format(selectedProposal.validityDate, 'dd/MM/yyyy') : ''}</p>
                        </div>
                        </div>

                        <p className="text-sm mb-4">Prezado(a) {selectedProposal.clientName.split(' ')[0]},</p>
                        <p className="text-sm mb-4">É com grande prazer que apresentamos nossa proposta comercial para os serviços solicitados. Acreditamos que nossa solução trará grande valor para sua empresa.</p>

                        <table className="w-full text-left text-sm mb-8">
                        <thead className="bg-gray-100">
                            <tr>
                            <th className="p-2 font-semibold">Item</th>
                            <th className="p-2 text-center font-semibold">Qtd.</th>
                            <th className="p-2 text-right font-semibold">Preço Unit.</th>
                            <th className="p-2 text-right font-semibold">Subtotal</th>
                            </tr>
                        </thead>
                        <tbody>
                            {selectedProposal.items.map((item, index) => (
                            <tr key={index} className="border-b border-gray-200">
                                <td className="p-2">{item.name}</td>
                                <td className="p-2 text-center">{item.quantity}</td>
                                <td className="p-2 text-right">{(Number(item.price) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                                <td className="p-2 text-right">{((Number(item.quantity) || 0) * (Number(item.price) || 0)).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                            </tr>
                            ))}
                        </tbody>
                        </table>
                        
                        <div className="flex justify-end mb-8">
                        <div className="w-1/2">
                            <div className="flex justify-between text-lg">
                            <span className="font-bold">Total:</span>
                            <span className="font-bold">{selectedProposal.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                            </div>
                        </div>
                        </div>

                        <div className="bg-gray-50 p-4 rounded-md text-sm">
                        <h3 className="font-bold mb-2">Condições de Pagamento</h3>
                        <p className="capitalize"><span className="font-semibold">Forma:</span> {selectedProposal.paymentMethod.replace('cartao', 'Cartão de Crédito')}</p>
                        <p><span className="font-semibold">Parcelamento:</span> {selectedProposal.installments}x de {selectedProposalInstallmentValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                        {selectedProposal.firstAsDownPayment && <p>A primeira parcela deverá ser paga como entrada.</p>}
                        </div>

                        <div className="mt-12 text-xs text-gray-500 text-center">
                            <p>Agradecemos a oportunidade e ficamos à disposição para quaisquer esclarecimentos.</p>
                            <p>Atenciosamente, {companyProfile.name}</p>
                        </div>
                    </div>
                </div>
                )}
                <DialogFooter className="print-hide">
                    <Button type="button" variant="outline" onClick={handleCancelPreview}>Cancelar</Button>
                    <Button type="button" variant="secondary" onClick={handleDownloadPdf} disabled={isDownloading}>
                        {isDownloading ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                            <Download className="mr-2 h-4 w-4" />
                        )}
                        Baixar PDF
                    </Button>
                    {selectedProposal && (
                        <>
                        <Button type="button" onClick={() => {
                            handleSendEmail(selectedProposal);
                        }}>
                          <Mail className="mr-2 h-4 w-4" /> Enviar por E-mail
                        </Button>
                        <Button type="button" onClick={() => handleSendWhatsApp(selectedProposal)}>
                          <Send className="mr-2 h-4 w-4" /> Enviar por WhatsApp
                        </Button>
                        </>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
        
        <AlertDialog open={!!deletingProposal} onOpenChange={(open) => !open && setDeletingProposal(null)}>
            <AlertDialogContent onOpenAutoFocus={(e) => e.preventDefault()}>
                <AlertDialogHeader>
                <AlertDialogTitle>Você tem certeza absoluta?</AlertDialogTitle>
                <AlertDialogDescription>
                    Essa ação não pode ser desfeita. Isso excluirá permanentemente a
                    proposta <span className="font-semibold">{deletingProposal?.id}</span> para o cliente <span className="font-semibold">{deletingProposal?.clientName}</span>.
                </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={confirmDeleteAction}>Confirmar Exclusão</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

        <Dialog open={isProductFormOpen} onOpenChange={setIsProductFormOpen}>
            <DialogContent className="sm:max-w-[425px]">
                <Form {...productForm}>
                <form onSubmit={productForm.handleSubmit(onProductSubmit)}>
                    <DialogHeader>
                    <DialogTitle>Editar Produto</DialogTitle>
                    <DialogDescription>
                        Altere os dados do produto abaixo. As alterações serão refletidas em futuras propostas.
                    </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                    <FormField
                        control={productForm.control}
                        name="name"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Nome do Produto</FormLabel>
                            <FormControl>
                            <Input placeholder="Nome do produto ou serviço" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                    <FormField
                        control={productForm.control}
                        name="price"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Preço</FormLabel>
                            <FormControl>
                            <Input type="number" step="0.01" placeholder="0,00" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                    </div>
                    <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setIsProductFormOpen(false)}>Cancelar</Button>
                    <Button type="submit">Salvar Alterações</Button>
                    </DialogFooter>
                </form>
                </Form>
            </DialogContent>
        </Dialog>

        <AlertDialog open={!!deletingProduct} onOpenChange={(open) => !open && setDeletingProduct(null)}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                    <AlertDialogDescription>
                        Essa ação não pode ser desfeita. Isso excluirá permanentemente o produto <span className="font-semibold">{deletingProduct?.name}</span>.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={confirmDeleteProductAction}>Confirmar Exclusão</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    </div>
  );
}
