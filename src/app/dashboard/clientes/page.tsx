"use client";

import { useState, useMemo, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  PlusCircle,
  Search,
  Loader2,
  Trash2,
  Phone,
  Pencil,
  FileText,
  Tag,
  Repeat,
  UserCheck,
  Briefcase,
  Layers,
  DollarSign,
  User,
  Eye,
  EyeOff,
  XCircle,
  MessageSquare
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useSettings } from "@/contexts/SettingsContext";
import type { Customer, CustomerType } from "@/lib/types";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { lookupCnpj } from "@/app/actions";
import { Checkbox } from "@/components/ui/checkbox";

const SERVICE_CATEGORIES = [
  { id: "ponto", label: "Ponto", color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  { id: "manutencao", label: "Manut. PC", color: "bg-orange-500/20 text-orange-400 border-orange-500/30" },
  { id: "gestao", label: "Gestão", color: "bg-purple-500/20 text-purple-400 border-purple-500/30" },
  { id: "acesso", label: "Acesso", color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" },
  { id: "catraca", label: "Catraca", color: "bg-pink-500/20 text-pink-400 border-pink-500/30" },
];

const formSchema = z.object({
  cnpj: z.string().optional(),
  razaoSocial: z.string().min(1, "O nome ou Razão Social é obrigatória."),
  nomeFantasia: z.string().optional(),
  contactName: z.string().optional(),
  telefone: z.string().optional(),
  email: z.string().email({ message: "E-mail inválido." }).optional().or(z.literal('')),
  endereco: z.string().optional(),
  isLead: z.boolean().default(false),
  tipoCliente: z.enum(["active_contract", "one_time"]).default("one_time"),
  serviceCategories: z.array(z.string()).default([]),
  observations: z.string().optional(),
  oneTimeValue: z.coerce.number().optional().default(0),
  monthlyValue: z.coerce.number().optional().default(0),
});

export default function ClientesPage() {
  const { customers, addCustomer, updateCustomer, deleteCustomer, currentUser } = useSettings();
  const [isCnpjLoading, setIsCnpjLoading] = useState(false);
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [deletingCustomer, setDeletingCustomer] = useState<Customer | null>(null);
  const [searchTermTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [showFinancials, setShowFinancials] = useState(false);

  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      cnpj: "",
      razaoSocial: "",
      nomeFantasia: "",
      contactName: "",
      telefone: "",
      email: "",
      endereco: "",
      isLead: false,
      tipoCliente: "one_time",
      serviceCategories: [],
      observations: "",
      oneTimeValue: 0,
      monthlyValue: 0,
    },
  });

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
  
  const formatDocument = (value: string) => {
    if (!value) return "";
    const cleaned = value.replace(/\D/g, "");
    if (cleaned.length <= 11) {
        const cpf = cleaned.padStart(11, '0').slice(0, 11);
        return `${cpf.slice(0, 3)}.${cpf.slice(3, 6)}.${cpf.slice(6, 9)}-${cpf.slice(9, 11)}`;
    }
    const cnpj = cleaned.padStart(14, '0').slice(0, 14);
    return `${cnpj.slice(0, 2)}.${cnpj.slice(2, 5)}.${cnpj.slice(5, 8)}/${cnpj.slice(8, 12)}-${cnpj.slice(12, 14)}`;
  }

  const displayedCustomers = useMemo(() => {
    const term = searchTermTerm.toLowerCase();
    let filtered = customers.filter(c =>
        searchTermTerm === "" ||
        c.name.toLowerCase().includes(term) ||
        (c.nomeFantasia && c.nomeFantasia.toLowerCase().includes(term)) ||
        (c.cnpj && c.cnpj.includes(term))
    );

    switch (activeTab) {
        case 'leads': filtered = filtered.filter(c => c.type === 'lead'); break;
        case 'contracts': filtered = filtered.filter(c => c.type === 'active_contract'); break;
        case 'one_time': filtered = filtered.filter(c => c.type === 'one_time'); break;
        case 'inactive': filtered = filtered.filter(c => c.status === 'inactive'); break;
    }
    return filtered.sort((a, b) => a.name.localeCompare(b.name));
  }, [customers, searchTermTerm, activeTab]);

  const handleCnpjLookup = async () => {
    const cnpjValue = form.getValues("cnpj");
    if (!cnpjValue) return;
    const cleaned = cnpjValue.replace(/\D/g, "");
    if (cleaned.length !== 14) return;
    setIsCnpjLoading(true);
    try {
        const result = await lookupCnpj(cleaned);
        if (result.success) {
            const data = result.success;
            form.setValue("razaoSocial", data.razao_social || "");
            form.setValue("nomeFantasia", data.nome_fantasia || data.razao_social || "");
            form.setValue("email", data.email || "");
            if (data.ddd_telefone_1) form.setValue("telefone", formatPhoneNumber(data.ddd_telefone_1));
            toast({ title: "CNPJ Consultado!" });
        }
    } catch (e) {
        toast({ variant: "destructive", title: "Erro na consulta" });
    } finally { setIsCnpjLoading(false); }
  };

  const handleEditClick = (customer: Customer) => {
    setEditingCustomer(customer);
    form.reset({
        razaoSocial: customer.name,
        nomeFantasia: customer.nomeFantasia || "",
        contactName: customer.contactName || "",
        telefone: customer.telefone ? formatPhoneNumber(customer.telefone) : '',
        email: customer.email,
        isLead: customer.type === "lead",
        tipoCliente: customer.type === "active_contract" ? "active_contract" : "one_time",
        cnpj: customer.cnpj ? formatDocument(customer.cnpj) : '', 
        endereco: customer.endereco || '',
        serviceCategories: customer.serviceCategories || [],
        observations: customer.observations || "",
        oneTimeValue: customer.oneTimeValue || 0,
        monthlyValue: customer.monthlyValue || 0,
    });
    setIsFormDialogOpen(true);
  };

  const handleOpenNew = () => {
    setEditingCustomer(null);
    form.reset({
      cnpj: "",
      razaoSocial: "",
      nomeFantasia: "",
      contactName: "",
      telefone: "",
      email: "",
      endereco: "",
      isLead: false,
      tipoCliente: "one_time",
      serviceCategories: [],
      observations: "",
      oneTimeValue: 0,
      monthlyValue: 0,
    });
    setIsFormDialogOpen(true);
  };

  function onSubmit(values: z.infer<typeof formSchema>) {
    const payload = {
        name: values.razaoSocial,
        nomeFantasia: values.nomeFantasia,
        contactName: values.contactName,
        telefone: values.telefone?.replace(/\D/g, ''),
        email: values.email || '',
        endereco: values.endereco,
        cnpj: values.cnpj?.replace(/\D/g, ''),
        type: values.isLead ? 'lead' as CustomerType : values.tipoCliente as CustomerType,
        serviceCategories: values.serviceCategories,
        observations: values.observations,
        oneTimeValue: values.oneTimeValue,
        monthlyValue: values.monthlyValue,
        status: (values.isLead ? 'lead' : editingCustomer?.status || 'new') as any,
        responsible: currentUser?.name || 'Admin',
        potential: 'medium' as any,
        lastContact: new Date().toISOString(),
        createdAt: editingCustomer?.createdAt || new Date().toISOString(),
    };

    if (editingCustomer) {
      updateCustomer({ ...editingCustomer, ...payload });
      toast({ title: "Cadastro Atualizado!" });
    } else {
      addCustomer(payload);
      toast({ title: "Cliente Cadastrado!" });
    }
    setIsFormDialogOpen(false);
    setEditingCustomer(null);
  }

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6 bg-background/50">
      <div className="flex items-center justify-between">
        <div>
            <h2 className="text-3xl font-bold tracking-tight font-headline">Clientes e Leads</h2>
            <p className="text-muted-foreground">Gestão SALVAR: Privacidade e Segmentos em foco.</p>
        </div>
        <div className="flex gap-2">
            <Button variant="outline" size="icon" onClick={() => setShowFinancials(!showFinancials)} title={showFinancials ? "Ocultar Valores" : "Mostrar Valores"}>
                {showFinancials ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
            <Button className="gap-2 shadow-md" onClick={handleOpenNew}>
                <PlusCircle className="h-4 w-4" /> Novo Registro
            </Button>
        </div>
      </div>

      <Tabs defaultValue="all" onValueChange={setActiveTab} className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <TabsList className="bg-muted/50 p-1">
            <TabsTrigger value="all">Todos</TabsTrigger>
            <TabsTrigger value="leads">Funil (Leads)</TabsTrigger>
            <TabsTrigger value="contracts">Contratos</TabsTrigger>
            <TabsTrigger value="one_time">Avulsos</TabsTrigger>
          </TabsList>
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar cliente..." className="pl-10" value={searchTermTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
        </div>

        <Card className="shadow-lg border-primary/10 overflow-hidden">
            <CardContent className="p-0">
                <Table>
                    <TableHeader className="bg-muted/20">
                        <TableRow>
                            <TableHead className="pl-6">Identificação / Cliente</TableHead>
                            <TableHead>Modalidade</TableHead>
                            <TableHead>Segmentos / Serviços</TableHead>
                            <TableHead className="text-right pr-6">Ações</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {displayedCustomers.map((customer) => (
                            <TableRow key={customer.id} onClick={() => handleEditClick(customer)} className="cursor-pointer hover:bg-muted/40 transition-colors">
                                <TableCell className="pl-6 py-4">
                                    <div className="flex flex-col">
                                        <span className="font-bold text-base leading-tight">{customer.nomeFantasia || customer.name}</span>
                                        {customer.contactName && (
                                            <span className="text-[11px] text-primary font-semibold flex items-center gap-1 mt-0.5">
                                                <User className="h-3 w-3" /> Contato: {customer.contactName}
                                            </span>
                                        )}
                                        <span className="text-[10px] text-muted-foreground uppercase mt-1">{customer.name}</span>
                                        <div className="flex items-center gap-3 mt-1.5">
                                            {customer.telefone && <span className="text-[10px] flex items-center gap-1"><Phone className="h-3 w-3" /> {formatPhoneNumber(customer.telefone)}</span>}
                                            {customer.cnpj && <span className="text-[10px] font-mono">{formatDocument(customer.cnpj)}</span>}
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <div className="flex flex-col gap-1.5">
                                        {customer.type === 'lead' && <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/30 gap-1 w-fit"><Tag className="h-3 w-3" /> Lead</Badge>}
                                        {customer.type === 'active_contract' && <Badge variant="outline" className="bg-purple-500/10 text-purple-600 border-purple-500/30 gap-1 w-fit"><FileText className="h-3 w-3" /> Contrato</Badge>}
                                        {customer.type === 'one_time' && <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/30 gap-1 w-fit"><UserCheck className="h-3 w-3" /> Avulso</Badge>}
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <div className="flex flex-col gap-2">
                                        <div className="flex flex-wrap gap-1">
                                            {customer.serviceCategories?.length ? (
                                                customer.serviceCategories.map(catId => {
                                                    const cat = SERVICE_CATEGORIES.find(s => s.id === catId);
                                                    return cat ? <span key={catId} className={cn("text-[9px] px-1.5 rounded-sm font-bold uppercase", cat.color)}>{cat.label}</span> : null;
                                                })
                                            ) : (
                                                <span className="text-[10px] text-muted-foreground italic">Nenhum segmento</span>
                                            )}
                                        </div>
                                        
                                        <div className="flex flex-col gap-0.5 mt-1 border-t border-muted pt-1">
                                            {!showFinancials ? (
                                                <span className="text-[9px] text-muted-foreground italic flex items-center gap-1">
                                                    <DollarSign className="h-2.5 w-2.5" /> R$ ****
                                                </span>
                                            ) : (
                                                <div className="flex gap-3">
                                                    {customer.monthlyValue ? (
                                                        <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1">
                                                            <Repeat className="h-2.5 w-2.5" /> {customer.monthlyValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}/mês
                                                        </span>
                                                    ) : null}
                                                    {customer.oneTimeValue ? (
                                                        <span className="text-[10px] text-primary font-bold flex items-center gap-1">
                                                            <DollarSign className="h-2.5 w-2.5" /> {customer.oneTimeValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                                        </span>
                                                    ) : null}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell className="text-right pr-6 py-4">
                                    <div className="flex justify-end gap-1 opacity-20 hover:opacity-100 transition-opacity">
                                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); handleEditClick(customer); }}><Pencil className="h-4 w-4" /></Button>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={(e) => { e.stopPropagation(); setDeletingCustomer(customer); }}><Trash2 className="h-4 w-4" /></Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
      </Tabs>

      <Dialog open={isFormDialogOpen} onOpenChange={(o) => { if(!o) { setEditingCustomer(null); setIsFormDialogOpen(false); } }}>
        <DialogContent className="sm:max-w-[800px] p-0 overflow-hidden">
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col max-h-[90vh]">
                    <DialogHeader className="p-6 border-b bg-muted/20">
                        <DialogTitle>{editingCustomer ? 'Editar Cadastro' : 'Novo Cadastro'}</DialogTitle>
                        <DialogDescription>Diferencie entre Leads e Clientes com contrato ou venda única.</DialogDescription>
                    </DialogHeader>
                    <ScrollArea className="flex-1 p-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-6">
                                <h3 className="text-xs font-bold uppercase tracking-widest text-primary flex items-center gap-2">
                                    <Briefcase className="h-4 w-4" /> Identificação e Tipo
                                </h3>
                                <div className="grid gap-4 p-4 border rounded-xl bg-muted/10">
                                    <FormField control={form.control} name="isLead" render={({ field }) => (
                                        <div className="flex items-center justify-between p-2 rounded-lg bg-yellow-500/5 border border-yellow-500/20">
                                            <div className="space-y-0.5">
                                                <FormLabel className="text-xs font-bold text-yellow-600">Registro é um LEAD?</FormLabel>
                                                <p className="text-[10px] text-muted-foreground">Marque se for apenas uma prospecção ativa.</p>
                                            </div>
                                            <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                                        </div>
                                    )} />
                                    {!form.watch('isLead') && (
                                        <FormField control={form.control} name="tipoCliente" render={({ field }) => (
                                            <FormItem className="space-y-3">
                                                <FormLabel className="text-xs font-bold">Modalidade de Cliente</FormLabel>
                                                <FormControl>
                                                    <RadioGroup onValueChange={field.onChange} value={field.value} className="flex gap-4">
                                                        <FormItem className="flex items-center space-x-2 space-y-0">
                                                            <FormControl><RadioGroupItem value="active_contract" /></FormControl>
                                                            <FormLabel className="font-normal text-xs">Contrato Fixo</FormLabel>
                                                        </FormItem>
                                                        <FormItem className="flex items-center space-x-2 space-y-0">
                                                            <FormControl><RadioGroupItem value="one_time" /></FormControl>
                                                            <FormLabel className="font-normal text-xs">Venda Avulsa</FormLabel>
                                                        </FormItem>
                                                    </RadioGroup>
                                                </FormControl>
                                            </FormItem>
                                        )} />
                                    )}
                                </div>
                                <div className="grid gap-4">
                                    <FormField control={form.control} name="cnpj" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>CNPJ / CPF</FormLabel>
                                            <div className="flex gap-2">
                                                <FormControl><Input placeholder="00.000.000/0000-00" {...field} onChange={e => field.onChange(formatDocument(e.target.value))} /></FormControl>
                                                <Button type="button" variant="secondary" size="icon" onClick={handleCnpjLookup} disabled={isCnpjLoading}>
                                                    {isCnpjLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                                                </Button>
                                            </div>
                                        </FormItem>
                                    )} />
                                    <FormField control={form.control} name="razaoSocial" render={({ field }) => (
                                        <FormItem><FormLabel>Razão Social / Nome</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                                    )} />
                                    <FormField control={form.control} name="nomeFantasia" render={({ field }) => (
                                        <FormItem><FormLabel>Nome Fantasia (Opcional)</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                                    )} />
                                    <FormField control={form.control} name="contactName" render={({ field }) => (
                                        <FormItem><FormLabel>Pessoa de Contato Principal</FormLabel><FormControl><Input placeholder="Ex: Sr. Carlos" {...field} /></FormControl></FormItem>
                                    )} />
                                </div>
                            </div>

                            <div className="space-y-6">
                                <h3 className="text-xs font-bold uppercase tracking-widest text-primary flex items-center gap-2">
                                    <Layers className="h-4 w-4" /> Categorias e Valores
                                </h3>
                                <div className="grid gap-4">
                                    <FormItem>
                                        <FormLabel className="text-xs font-bold">Segmentos de Atendimento</FormLabel>
                                        <div className="flex flex-wrap gap-2 pt-1">
                                            {SERVICE_CATEGORIES.map((cat) => (
                                                <FormField key={cat.id} control={form.control} name="serviceCategories" render={({ field }) => (
                                                    <div key={cat.id} className={cn("flex items-center gap-2 px-3 py-1.5 rounded-full border cursor-pointer transition-all", field.value?.includes(cat.id) ? cat.color : "bg-muted/50")} onClick={() => {
                                                        const current = field.value || [];
                                                        field.onChange(current.includes(cat.id) ? current.filter(v => v !== cat.id) : [...current, cat.id]);
                                                    }}>
                                                        <Checkbox checked={field.value?.includes(cat.id)} className="sr-only" />
                                                        <span className="text-[10px] font-bold uppercase">{cat.label}</span>
                                                    </div>
                                                )} />
                                            ))}
                                        </div>
                                    </FormItem>
                                    <div className="grid grid-cols-2 gap-4 p-3 bg-primary/5 rounded-lg border border-primary/10">
                                        <FormField control={form.control} name="oneTimeValue" render={({ field }) => (
                                            <FormItem><FormLabel className="text-primary font-bold">Vlr. Venda (R$)</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem>
                                        )} />
                                        <FormField control={form.control} name="monthlyValue" render={({ field }) => (
                                            <FormItem><FormLabel className="text-emerald-600 font-bold">Vlr. Mensal (R$)</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem>
                                        )} />
                                    </div>
                                    <FormField control={form.control} name="telefone" render={({ field }) => (
                                        <FormItem><FormLabel>WhatsApp de Contato</FormLabel><FormControl><Input placeholder="(00) 00000-0000" {...field} onChange={e => field.onChange(formatPhoneNumber(e.target.value))} /></FormControl></FormItem>
                                    )} />
                                    <FormField control={form.control} name="email" render={({ field }) => (
                                        <FormItem><FormLabel>E-mail Comercial</FormLabel><FormControl><Input type="email" {...field} /></FormControl></FormItem>
                                    )} />
                                    <FormField control={form.control} name="endereco" render={({ field }) => (
                                        <FormItem><FormLabel>Endereço Completo</FormLabel><FormControl><Textarea {...field} /></FormControl></FormItem>
                                    )} />
                                </div>
                            </div>
                        </div>

                        <div className="mt-8 border-t pt-8">
                            <h3 className="text-xs font-bold uppercase tracking-widest text-primary flex items-center gap-2 mb-4">
                                <MessageSquare className="h-4 w-4" /> Serviços Prestados e Observações
                            </h3>
                            <FormField control={form.control} name="observations" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Serviços, Sistemas e Produtos (Descrição)</FormLabel>
                                    <FormControl>
                                        <Textarea 
                                            placeholder="Descreva aqui quais serviços são prestados, qual sistema é utilizado (se houver) e quais produtos foram fornecidos ao cliente..." 
                                            className="min-h-[120px] resize-none"
                                            {...field} 
                                        />
                                    </FormControl>
                                    <FormDescription>Utilize este espaço para documentar a infraestrutura técnica do cliente.</FormDescription>
                                </FormItem>
                            )} />
                        </div>
                    </ScrollArea>
                    <DialogFooter className="p-6 border-t bg-muted/20">
                        <Button variant="ghost" type="button" onClick={() => setIsFormDialogOpen(false)}>Cancelar</Button>
                        <Button type="submit" className="font-bold px-8 shadow-md">Salvar Registro</Button>
                    </DialogFooter>
                </form>
            </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletingCustomer} onOpenChange={o => !o && setDeletingCustomer(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Excluir Registro?</AlertDialogTitle>
                <AlertDialogDescription>Esta ação removerá permanentemente o cliente da sua base.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Voltar</AlertDialogCancel>
                <AlertDialogAction className="bg-destructive" onClick={() => { if(deletingCustomer) deleteCustomer(deletingCustomer.id); setDeletingCustomer(null); }}>Confirmar Exclusão</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}