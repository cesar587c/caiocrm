'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { addDays, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

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
  BrainCircuit,
  Building,
  Calendar as CalendarIcon,
  Download,
  Mail,
  PlusCircle,
  Trash2,
  Send,
  Upload,
  Cog,
  Loader2,
} from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { Calendar } from '@/components/ui/calendar';
import { companyProfile } from '@/lib/company-profile';

// Mock data - Em um app real, isso viria de uma API
const initialCustomers = [
  { id: 'cust_1', name: 'Tech Solutions Ltda.', telefone: '(11) 98765-4321' },
  { id: 'cust_2', name: 'Inova Corp S.A.', telefone: '(21) 91234-5678' },
  { id: 'cust_4', name: 'ConstruBem Materiais', telefone: '(31) 99999-8888'},
];

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

export default function PropostasPage() {
  const { toast } = useToast();
  const [customers, setCustomers] = useState(initialCustomers);
  const [isQuickAddingClient, setIsQuickAddingClient] = useState(false);
  const [proposalId, setProposalId] = useState('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [templateFile, setTemplateFile] = useState<File | null>(null);
  const [isProcessingTemplate, setIsProcessingTemplate] = useState(false);

  useEffect(() => {
    // Generate ID on the client after hydration to avoid mismatch
    setProposalId(`PROP-${String(Date.now()).slice(-5)}`);
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

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'items',
  });

  const watchItems = form.watch('items');
  const watchInstallments = form.watch('installments');
  const watchFirstAsDownPayment = form.watch('firstAsDownPayment');

  const { subtotal, total } = useMemo(() => {
    const sub = watchItems.reduce(
      (acc, item) => acc + item.quantity * item.price,
      0
    );
    // Adicionar lógica de desconto/taxas se necessário
    return { subtotal: sub, total: sub };
  }, [watchItems]);

  const installmentValue = useMemo(() => {
    if (watchInstallments === 0) return 0;
    return total / watchInstallments;
  }, [total, watchInstallments]);

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

  const onSubmit = (data: ProposalFormValues) => {
    console.log(data);
    toast({
      title: 'Proposta Salva!',
      description: 'A proposta foi salva com sucesso no sistema.',
    });
  };

  const handleGeneratePdf = () => {
    toast({
      title: "PDF Gerado",
      description: "O PDF da proposta foi gerado para download.",
    });
  }

  const handleSendEmail = () => {
     toast({
      title: "E-mail Enviado",
      description: "A proposta foi enviada para o e-mail do cliente.",
    });
  }

  const handleSendWhatsApp = () => {
     toast({
      title: "Enviado para WhatsApp",
      description: "A proposta está pronta para ser enviada via WhatsApp.",
    });
  }
  
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (
        file.type === 'application/msword' ||
        file.type ===
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        file.type === 'application/pdf'
      ) {
        setTemplateFile(file);
        toast({
          title: 'Modelo selecionado',
          description: `Arquivo ${file.name} carregado.`,
        });
      } else {
        toast({
          variant: 'destructive',
          title: 'Formato de arquivo inválido',
          description:
            'Por favor, selecione um arquivo Word (.doc, .docx) ou PDF.',
        });
      }
    }
  };

  const handleProcessTemplate = () => {
    if (!templateFile) return;
    setIsProcessingTemplate(true);
    toast({
      title: 'Processando modelo...',
      description: `O arquivo ${templateFile.name} está sendo analisado.`,
    });
    // Simulate processing
    setTimeout(() => {
      setIsProcessingTemplate(false);
      toast({
        title: 'Modelo Processado!',
        description:
          'Os campos dinâmicos foram identificados. Você já pode gerar a proposta.',
      });
    }, 2000);
  };

  const handleRemoveTemplate = () => {
    setTemplateFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };


  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight font-headline">Gerador de Propostas</h2>
        <Button onClick={form.handleSubmit(onSubmit)}>Salvar Proposta</Button>
      </div>

    <form>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Coluna Principal (Esquerda) */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
                <CardHeader className="flex flex-row items-start justify-between">
                    <div>
                        <CardTitle>Proposta Comercial</CardTitle>
                        <CardDescription>#{proposalId}</CardDescription>
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
                                            variant={"outline"}
                                            className={cn("w-[180px] justify-start text-left font-normal", !field.value && "text-muted-foreground")}
                                        >
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {field.value ? format(field.value, "dd/MM/yyyy") : <span>Selecione a data</span>}
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
                                            variant={"outline"}
                                            className={cn("w-[180px] justify-start text-left font-normal", !field.value && "text-muted-foreground")}
                                        >
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {field.value ? format(field.value, "dd/MM/yyyy") : <span>Selecione a data</span>}
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
                     <Building className="h-16 w-16 text-muted-foreground" />
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
                <CardDescription>Selecione um cliente existente ou cadastre um novo.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
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
                    <Button variant="outline" className="mt-auto" onClick={handleQuickAddClient}>
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
                    {fields.map((item, index) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <Textarea
                            placeholder="Descrição do produto ou serviço"
                            {...form.register(`items.${index}.name`)}
                            className="min-h-0 h-10"
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
                          <Input
                            type="number"
                            step="0.01"
                            {...form.register(`items.${index}.price`)}
                            className="w-28"
                          />
                        </TableCell>
                        <TableCell className="font-medium">
                          {(watchItems[index].quantity * watchItems[index].price).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" onClick={() => remove(index)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                 {form.formState.errors.items && (
                    <p className="text-destructive text-sm mt-2">{form.formState.errors.items.message || form.formState.errors.items.root?.message}</p>
                 )}
              </CardContent>
              <CardFooter className="justify-between">
                <Button variant="outline" onClick={() => append({ name: '', quantity: 1, price: 0 })}>
                    <PlusCircle className="mr-2 h-4 w-4" /> Adicionar Item
                </Button>
                <div className="text-right">
                    <p className="text-muted-foreground">Total dos Itens</p>
                    <p className="text-2xl font-bold">{total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                </div>
              </CardFooter>
            </Card>
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
                         <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                        <Select onValueChange={field.onChange} defaultValue={String(field.value)}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                            {[...Array(6)].map((_, i) => (
                                <SelectItem key={i + 1} value={String(i + 1)}>
                                {i + 1}x de { (total / (i + 1)).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) }
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
                    <div className="flex justify-between"><span>Parcelas:</span> <span className="font-medium">{watchInstallments}x de {installmentValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span></div>
                    <div className="flex justify-between"><span>Entrada:</span> <span className="font-medium">{watchFirstAsDownPayment ? 'Sim' : 'Não'}</span></div>
                </div>
              </CardFooter>
            </Card>

             <Card>
                <CardHeader>
                    <CardTitle>Ações e Envio</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 gap-2">
                    <Button variant="secondary" onClick={handleGeneratePdf}><Download className="mr-2 h-4 w-4" />Gerar PDF</Button>
                    <Button variant="secondary" onClick={handleSendEmail}><Mail className="mr-2 h-4 w-4" />Enviar por E-mail</Button>
                    <Button variant="secondary" onClick={handleSendWhatsApp}><Send className="mr-2 h-4 w-4" />Enviar por WhatsApp</Button>
                </CardContent>
             </Card>

            <Card>
                <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <BrainCircuit className="h-5 w-5 text-primary" /> Motor de
                    Documentos
                </CardTitle>
                <CardDescription>
                    Faça upload de um modelo Word ou PDF para preencher automaticamente.
                </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                <Input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    onChange={handleFileSelect}
                    accept=".doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,.pdf"
                />
                <Button
                    variant="outline"
                    className="w-full justify-start text-left"
                    onClick={() => fileInputRef.current?.click()}
                >
                    <Upload className="mr-2 h-4 w-4" />
                    <span className="truncate">
                    {templateFile
                        ? templateFile.name
                        : 'Fazer Upload de Modelo...'}
                    </span>
                </Button>

                {templateFile && (
                    <div className="flex items-center gap-2">
                    <Button
                        className="w-full"
                        onClick={handleProcessTemplate}
                        disabled={isProcessingTemplate}
                    >
                        {isProcessingTemplate ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Analisando...
                        </>
                        ) : (
                        <>
                            <Cog className="mr-2 h-4 w-4" />
                            Analisar Modelo
                        </>
                        )}
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleRemoveTemplate}
                        aria-label="Remover modelo"
                    >
                        <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                    </div>
                )}

                <p className="text-xs text-muted-foreground text-center pt-2">
                    Campos dinâmicos: {'{cliente}'}, {'{valor}'}, {'{data}'}, etc.
                </p>
                </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </div>
  );
}
