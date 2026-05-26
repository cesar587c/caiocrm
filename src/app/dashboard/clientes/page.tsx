"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import * as XLSX from 'xlsx';
import {
  Calendar as CalendarIcon,
  File,
  ListFilter,
  PlusCircle,
  Search,
  Users,
  Loader2,
  User,
  UserPlus,
  Trash2,
  UserCheck,
  UserX,
  Upload,
  Download,
  FileSpreadsheet,
  AlertCircle,
  Phone,
  Building2,
  MapPin,
  Copy,
  Archive,
  RotateCcw,
  Tags,
  Check,
  ClipboardList,
  XCircle,
  Filter,
  DollarSign,
  Tag,
  Repeat,
  MessageSquare,
  History,
  Clock,
  CalendarPlus,
  Send,
  BellRing,
  CheckCircle2,
  AlertTriangle,
  Mail,
  Pencil
} from "lucide-react";
import { format, startOfDay, endOfDay, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { DateRange } from "react-day-picker";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  DialogTrigger,
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useSettings } from "@/contexts/SettingsContext";
import type { Customer, CustomerStatus, CustomerType, Interaction } from "@/lib/types";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";
import { sendAppointmentNotifications, lookupCnpj } from "@/app/actions";

const statusMap: Record<string, string> = {
  active: "Ativo",
  inactive: "Inativo",
  new: "Novo",
  lead: "Lead",
  discarded: "Descartado",
  won: "Ganho",
  lost: "Perdido",
  opportunity: "Oportunidade",
  proposal: "Proposta",
  negotiation: "Negociação"
};

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
  contactName2: z.string().optional(),
  phone2: z.string().optional(),
  email: z.string().email({ message: "E-mail inválido." }).optional().or(z.literal('')),
  endereco: z.string().optional(),
  cep: z.string().optional(),
  inscricaoEstadual: z.string().optional(),
  isLead: z.boolean().default(false),
  tipoCliente: z.enum(["active_contract", "one_time"]).default("one_time"),
  serviceCategories: z.array(z.string()).default([]),
  observations: z.string().optional(),
  oneTimeValue: z.coerce.number().optional().default(0),
  monthlyValue: z.coerce.number().optional().default(0),
}).refine((data) => data.isLead || !!data.email || !!data.telefone || !!data.phone2, {
    message: "É obrigatório informar pelo menos um telefone ou e-mail.",
    path: ["telefone"],
});

const defaultFormValues = {
  cnpj: "",
  razaoSocial: "",
  nomeFantasia: "",
  contactName: "",
  telefone: "",
  contactName2: "",
  phone2: "",
  email: "",
  endereco: "",
  cep: "",
  inscricaoEstadual: "",
  isLead: false,
  tipoCliente: "one_time" as const,
  serviceCategories: [],
  observations: "",
  oneTimeValue: 0,
  monthlyValue: 0,
};

export default function ClientesPage() {
  const { customers, addCustomer, addCustomers, updateCustomer, deleteCustomer, addAppointment, currentUser, companyProfile, users } = useSettings();
  const [isCnpjLoading, setIsCnpjLoading] = useState(false);
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [deletingCustomer, setDeletingCustomer] = useState<Customer | null>(null);
  const [convertingCustomer, setConvertingCustomer] = useState<Customer | null>(null);
  const [searchTermTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [date, setDate] = useState<DateRange | undefined>(undefined);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [interactionSummary, setInteractionSummary] = useState("");
  const [interactionNextDate, setInteractionNextDate] = useState<string>("");
  const [interactionNextTime, setInteractionNextTime] = useState<string>("");

  const [notificationState, setNotificationState] = useState<{
    isOpen: boolean;
    isLoading: boolean;
    isSimulated: boolean;
    details: any[];
  }>({ isOpen: false, isLoading: false, isSimulated: false, details: [] });
  const [sentMessageIndexes, setSentMessages] = useState<number[]>([]);

  const { toast } = useToast();

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

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: defaultFormValues,
  });

  const displayedCustomers = useMemo(() => {
    const lowercasedSearchTerm = searchTermTerm.toLowerCase();
    let filtered = customers.filter(c =>
        searchTermTerm === "" ||
        c.name.toLowerCase().includes(lowercasedSearchTerm) ||
        (c.nomeFantasia && c.nomeFantasia.toLowerCase().includes(lowercasedSearchTerm)) ||
        (c.contactName && c.contactName.toLowerCase().includes(lowercasedSearchTerm)) ||
        c.email.toLowerCase().includes(lowercasedSearchTerm) ||
        (c.cnpj && c.cnpj.replace(/\D/g, "").includes(lowercasedSearchTerm))
    );
    if (selectedServices.length > 0) {
      filtered = filtered.filter(c => c.serviceCategories?.some(catId => selectedServices.includes(catId)));
    }
    switch (activeTab) {
        case 'inactive': filtered = filtered.filter(c => c.status === 'inactive' || c.status === 'discarded' || c.status === 'lost'); break;
        case 'all': filtered = filtered.filter(c => c.status !== 'inactive' && c.status !== 'discarded' && c.status !== 'lead' && c.status !== 'lost' && c.status !== 'opportunity' && c.status !== 'proposal' && c.status !== 'negotiation'); break;
        case 'leads': filtered = filtered.filter(c => (c.status === 'lead' || c.status === 'opportunity' || c.status === 'proposal' || c.status === 'negotiation') && c.status !== 'inactive'); break;
        case 'new': filtered = filtered.filter(c => c.status === 'new' && c.status !== 'inactive'); break;
        default: filtered = filtered.filter(c => c.status !== 'inactive' && c.status !== 'discarded' && c.status !== 'lost');
    }
    return filtered.sort((a, b) => (a.nomeFantasia || a.name).localeCompare((b.nomeFantasia || b.name), 'pt-BR'));
  }, [customers, searchTermTerm, activeTab, selectedServices]);

  const handleCnpjLookup = async () => {
    const cnpjValue = form.getValues("cnpj");
    if (!cnpjValue) { toast({ variant: "destructive", title: "CNPJ Inválido" }); return; }
    const cleanedCnpj = cnpjValue.replace(/\D/g, "");
    if (cleanedCnpj.length !== 14) { toast({ variant: "destructive", title: "CNPJ Inválido" }); return; }
    setIsCnpjLoading(true);
    try {
        const result = await lookupCnpj(cleanedCnpj);
        if (result.error) throw new Error(result.error);
        const data = result.success;
        form.setValue("razaoSocial", data.razao_social || "");
        form.setValue("nomeFantasia", data.nome_fantasia || data.razao_social || "");
        form.setValue("email", data.email || "");
        const phone = data.ddd_telefone_1 || data.ddd_telefone_2 || "";
        if (phone) form.setValue("telefone", formatPhoneNumber(phone));
        if (data.logradouro) {
          const addressParts = [data.logradouro, data.numero ? data.numero : 'S/N', data.complemento, data.bairro, data.municipio, data.uf].filter(Boolean);
          form.setValue("endereco", addressParts.join(', '));
          form.setValue("cep", data.cep || "");
        }
        toast({ title: "CNPJ Consultado!" });
    } catch (error: any) {
        toast({ variant: "destructive", title: "Erro na Consulta", description: error.message });
    } finally { setIsCnpjLoading(false); }
  };
  
  const handleAddNewClick = () => {
    setEditingCustomer(null);
    form.reset(defaultFormValues);
    setIsFormDialogOpen(true);
  };

  const handleEditClick = (customer: Customer) => {
    setEditingCustomer(customer);
    form.reset({
        razaoSocial: customer.name,
        nomeFantasia: customer.nomeFantasia || "",
        contactName: customer.contactName || "",
        telefone: customer.telefone ? formatPhoneNumber(customer.telefone) : '',
        contactName2: customer.contactName2 || "",
        phone2: customer.phone2 ? formatPhoneNumber(customer.phone2) : '',
        email: customer.email,
        isLead: customer.type === "lead",
        tipoCliente: customer.type === "active_contract" ? "active_contract" : "one_time",
        cnpj: customer.cnpj ? formatDocument(customer.cnpj) : '', 
        endereco: customer.endereco || '',
        cep: customer.cep || '',
        serviceCategories: customer.serviceCategories || [],
        observations: customer.observations || "",
        oneTimeValue: customer.oneTimeValue || 0,
        monthlyValue: customer.monthlyValue || 0,
    });
    setIsFormDialogOpen(true);
  };

  function onSubmit(values: z.infer<typeof formSchema>) {
    if (editingCustomer) {
      updateCustomer({ 
        ...editingCustomer, 
        name: values.razaoSocial, 
        nomeFantasia: values.nomeFantasia || "", 
        contactName: values.contactName, 
        telefone: values.telefone ? values.telefone.replace(/\D/g, '') : '', 
        email: values.email || '', 
        endereco: values.endereco, 
        type: values.isLead ? "lead" : (values.tipoCliente as CustomerType), 
        serviceCategories: values.serviceCategories, 
        observations: values.observations, 
        oneTimeValue: values.oneTimeValue, 
        monthlyValue: values.monthlyValue 
      });
      toast({ title: "Dados Atualizados!" });
    } else {
      const newCustomerData: Omit<Customer, 'id'> = { 
        name: values.razaoSocial, 
        nomeFantasia: values.nomeFantasia || "", 
        contactName: values.contactName, 
        telefone: values.telefone ? values.telefone.replace(/\D/g, '') : '', 
        email: values.email || '', 
        endereco: values.endereco, 
        status: values.isLead ? "lead" : "new", 
        responsible: currentUser?.name || "Admin", 
        potential: "medium", 
        lastContact: new Date().toISOString(), 
        createdAt: new Date().toISOString(), 
        type: values.isLead ? "lead" : (values.tipoCliente as CustomerType), 
        serviceCategories: values.serviceCategories, 
        observations: values.observations, 
        oneTimeValue: values.oneTimeValue, 
        monthlyValue: values.monthlyValue, 
        interactions: [] 
      };
      addCustomer(newCustomerData);
      toast({ title: "Cliente Salvo!" });
    }
    setIsFormDialogOpen(false); 
    setEditingCustomer(null);
  }

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6 bg-background/50">
      <div className="flex items-center justify-between">
        <div>
            <h2 className="text-3xl font-bold tracking-tight font-headline text-foreground">Clientes e Leads</h2>
            <p className="text-muted-foreground">Gerencie sua carteira de clientes e o histórico do CRM.</p>
        </div>
        <div className="flex items-center gap-2">
            <Badge variant="secondary" className="px-3 py-1.5 text-xs font-semibold shadow-sm">
                {displayedCustomers.length} Registros
            </Badge>
        </div>
      </div>

      <Tabs defaultValue="all" onValueChange={(value) => setActiveTab(value)} className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <TabsList className="bg-muted/50 p-1">
            <TabsTrigger value="all">Todos</TabsTrigger>
            <TabsTrigger value="leads">Funil / Leads</TabsTrigger>
            <TabsTrigger value="new">Novos</TabsTrigger>
            <TabsTrigger value="inactive">Inativos</TabsTrigger>
          </TabsList>
          <div className="flex items-center gap-2">
            <Dialog open={isFormDialogOpen} onOpenChange={(open) => { if (!open) setEditingCustomer(null); setIsFormDialogOpen(open); }}>
              <Button size="sm" className="h-9 gap-2 shadow-md bg-primary hover:bg-primary/90" onClick={handleAddNewClick}>
                <PlusCircle className="h-4 w-4" />
                <span>Novo Registro</span>
              </Button>
              <DialogContent className="sm:max-w-[900px] p-0 overflow-hidden">
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col max-h-[90vh]">
                    <DialogHeader className="p-6 bg-muted/30 border-b">
                        <DialogTitle>{editingCustomer ? 'Editar Cliente' : 'Novo Cliente'}</DialogTitle>
                        <DialogDescription>Preencha os campos abaixo de forma organizada.</DialogDescription>
                    </DialogHeader>
                    
                    <ScrollArea className="flex-1 p-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-6">
                                <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Identificação</h3>
                                <div className="grid gap-4">
                                    <FormField control={form.control} name="cnpj" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>CNPJ / CPF</FormLabel>
                                            <div className="flex gap-2">
                                                <FormControl><Input placeholder="00.000.000/0000-00" {...field} onChange={(e) => field.onChange(formatDocument(e.target.value))} /></FormControl>
                                                <Button type="button" variant="secondary" size="icon" onClick={handleCnpjLookup} disabled={isCnpjLoading}>
                                                    {isCnpjLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                                                </Button>
                                            </div>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                    <FormField control={form.control} name="razaoSocial" render={({ field }) => (
                                        <FormItem><FormLabel>Razão Social / Nome</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                                    )} />
                                    <FormField control={form.control} name="email" render={({ field }) => (
                                        <FormItem><FormLabel>E-mail</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem>
                                    )} />
                                </div>
                            </div>

                            <div className="space-y-6">
                                <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Contato e Localização</h3>
                                <div className="grid gap-4">
                                    <FormField control={form.control} name="contactName" render={({ field }) => (
                                        <FormItem><FormLabel>Pessoa de Contato</FormLabel><FormControl><Input {...field} value={field.value || ''} /></FormControl></FormItem>
                                    )} />
                                    <FormField control={form.control} name="telefone" render={({ field }) => (
                                        <FormItem><FormLabel>WhatsApp</FormLabel><FormControl><Input placeholder="(00) 00000-0000" {...field} onChange={(e) => field.onChange(formatPhoneNumber(e.target.value))} value={field.value || ''} /></FormControl></FormItem>
                                    )} />
                                    <FormField control={form.control} name="endereco" render={({ field }) => (
                                        <FormItem><FormLabel>Endereço Completo</FormLabel><FormControl><Input {...field} value={field.value || ''} /></FormControl></FormItem>
                                    )} />
                                </div>
                            </div>
                        </div>
                    </ScrollArea>

                    <DialogFooter className="p-6 bg-muted/30 border-t">
                        <Button variant="ghost" type="button" onClick={() => setIsFormDialogOpen(false)}>Cancelar</Button>
                        <Button type="submit" className="px-8 font-bold shadow-md">{editingCustomer ? 'Salvar Alterações' : 'Cadastrar'}</Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <TabsContent value="all" className="mt-0">
            <Card className="shadow-lg border-primary/10 overflow-hidden">
                <CardHeader className="bg-muted/30 pb-6 border-b">
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <Input placeholder="Buscar por nome, fantasia ou CNPJ..." className="pl-10 h-10 shadow-sm" value={searchTermTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/20">
                                <TableHead className="pl-6 h-12 font-bold text-xs uppercase tracking-wider text-muted-foreground">Cliente / Identificação</TableHead>
                                <TableHead className="h-12 font-bold text-xs uppercase tracking-wider text-muted-foreground">Contato</TableHead>
                                <TableHead className="h-12 font-bold text-xs uppercase tracking-wider text-muted-foreground">Status / Faturamento</TableHead>
                                <TableHead className="text-right pr-6 h-12 font-bold text-xs uppercase tracking-wider text-muted-foreground">Ações</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {displayedCustomers.length > 0 ? ( 
                                displayedCustomers.map((customer) => ( 
                                    <TableRow key={customer.id} onClick={() => handleEditClick(customer)} className="cursor-pointer hover:bg-muted/40 transition-colors">
                                        <TableCell className="pl-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="font-bold text-base">{customer.nomeFantasia || customer.name}</span>
                                                <span className="text-[10px] text-muted-foreground uppercase">{customer.name}</span>
                                                {customer.cnpj && <span className="text-[9px] font-mono mt-1">{formatDocument(customer.cnpj)}</span>}
                                            </div>
                                        </TableCell>
                                        <TableCell className="py-4">
                                            <div className="flex flex-col gap-1">
                                                <span className="text-xs font-bold">{customer.contactName || 'N/A'}</span>
                                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                                    <Phone className="h-3 w-3" /> {formatPhoneNumber(customer.telefone || '')}
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="py-4">
                                            <div className="flex flex-col gap-2">
                                                <Badge variant="outline" className="w-fit text-[10px] py-0">{statusMap[customer.status]}</Badge>
                                                <div className="flex flex-col gap-0.5">
                                                    {customer.oneTimeValue ? <span className="text-[10px] font-bold text-primary">Venda: {customer.oneTimeValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span> : null}
                                                    {customer.monthlyValue ? <span className="text-[10px] font-bold text-emerald-600">Mensal: {customer.monthlyValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span> : null}
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right pr-6 py-4">
                                            <div className="flex justify-end gap-1 opacity-20 hover:opacity-100 transition-opacity">
                                                <Button variant="ghost" size="icon" className="h-8 w-8"><Pencil className="h-4 w-4" /></Button>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive"><Trash2 className="h-4 w-4" /></Button>
                                            </div>
                                        </TableCell>
                                    </TableRow> 
                                )) 
                            ) : ( 
                                <TableRow><TableCell colSpan={4} className="h-32 text-center text-muted-foreground italic">Nenhum registro encontrado.</TableCell></TableRow> 
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
