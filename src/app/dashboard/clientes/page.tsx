
"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@radix-ui/resolvers/zod";
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
  Repeat
} from "lucide-react";
import { format, startOfDay, endOfDay } from "date-fns";
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
import type { Customer, CustomerStatus, CustomerType } from "@/lib/types";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

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
  email: z.string().email({ message: "E-mail inválido." }).optional().or(z.literal('')),
  telefone: z.string().optional(),
  endereco: z.string().optional(),
  cep: z.string().optional(),
  inscricaoEstadual: z.string().optional(),
  isLead: z.boolean().default(false),
  tipoCliente: z.enum(["active_contract", "one_time"]).default("one_time"),
  serviceCategories: z.array(z.string()).default([]),
  observations: z.string().optional(),
  oneTimeValue: z.coerce.number().optional().default(0),
  monthlyValue: z.coerce.number().optional().default(0),
}).refine((data) => data.isLead || !!data.email || !!data.telefone, {
    message: "Para clientes, é obrigatório informar um e-mail ou telefone.",
    path: ["telefone"],
});

const defaultFormValues = {
  cnpj: "",
  razaoSocial: "",
  nomeFantasia: "",
  contactName: "",
  email: "",
  telefone: "",
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
  const { customers, addCustomer, addCustomers, updateCustomer, deleteCustomer, currentUser } = useSettings();
  const [isCnpjLoading, setIsCnpjLoading] = useState(false);
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [deletingCustomer, setDeletingCustomer] = useState<Customer | null>(null);
  const [convertingCustomer, setConvertingCustomer] = useState<Customer | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [date, setDate] = useState<DateRange | undefined>(undefined);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { toast } = useToast();

  useEffect(() => {
    const anyModalOpen = isFormDialogOpen || isImportDialogOpen || !!deletingCustomer || !!convertingCustomer;
    if (!anyModalOpen) {
      document.body.style.pointerEvents = 'auto';
      document.body.style.overflow = 'auto';
    }
  }, [isFormDialogOpen, isImportDialogOpen, deletingCustomer, convertingCustomer]);

  const formatPhoneNumber = (value: string) => {
    if (!value) return "";
    const cleaned = value.replace(/\D/g, "");
    const length = cleaned.length;
    if (length <= 2) return `(${cleaned}`;
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
    const lowercasedSearchTerm = searchTerm.toLowerCase();

    let filtered = customers.filter(c =>
        searchTerm === "" ||
        c.name.toLowerCase().includes(lowercasedSearchTerm) ||
        (c.nomeFantasia && c.nomeFantasia.toLowerCase().includes(lowercasedSearchTerm)) ||
        (c.contactName && c.contactName.toLowerCase().includes(lowercasedSearchTerm)) ||
        c.email.toLowerCase().includes(lowercasedSearchTerm) ||
        (c.cnpj && c.cnpj.replace(/\D/g, "").includes(lowercasedSearchTerm))
    );

    if (selectedServices.length > 0) {
      filtered = filtered.filter(c => 
        c.serviceCategories?.some(catId => selectedServices.includes(catId))
      );
    }

    switch (activeTab) {
        case 'inactive':
            filtered = filtered.filter(c => c.status === 'inactive' || c.status === 'discarded' || c.status === 'lost');
            break;
        case 'all':
            filtered = filtered.filter(c => c.status !== 'inactive' && c.status !== 'discarded' && c.status !== 'lead' && c.status !== 'lost');
            break;
        case 'active_contract':
            filtered = filtered.filter(c => c.type === 'active_contract' && c.status !== 'lead' && c.status !== 'inactive' && c.status !== 'lost');
            break;
        case 'one_time':
            filtered = filtered.filter(c => c.type === 'one_time' && c.status !== 'lead' && c.status !== 'inactive' && c.status !== 'lost');
            break;
        case 'leads':
            filtered = filtered.filter(c => (c.status === 'lead' || c.status === 'opportunity' || c.status === 'proposal' || c.status === 'negotiation') && c.status !== 'inactive');
            break;
        case 'new':
            filtered = filtered.filter(c => c.status === 'new' && c.status !== 'inactive');
            break;
        default:
            filtered = filtered.filter(c => c.status !== 'inactive' && c.status !== 'discarded' && c.status !== 'lost');
    }
    
    if (date?.from) {
      const fromDate = startOfDay(date.from);
      const toDate = endOfDay(date.to || date.from);
      filtered = filtered.filter(c => {
          const createdAt = new Date(c.createdAt);
          return createdAt >= fromDate && createdAt <= toDate;
      });
    }

    return filtered.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));

  }, [customers, searchTerm, activeTab, selectedServices, date]);


  const handleCnpjLookup = async () => {
    const cnpj = form.getValues("cnpj");
    if (!cnpj) {
      toast({ variant: "destructive", title: "CNPJ Inválido", description: "Por favor, insira um CNPJ para consultar." });
      return;
    }
    const cleanedCnpj = cnpj.replace(/\D/g, "");
    if (cleanedCnpj.length !== 14) {
        toast({ variant: "destructive", title: "CNPJ Inválido", description: "O CNPJ deve conter 14 dígitos." });
        return;
    }
    setIsCnpjLoading(true);
    try {
        const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cleanedCnpj}`);
        if (!response.ok) {
            if (response.status === 404) throw new Error('CNPJ não encontrado.');
            throw new Error(`A consulta falhou.`);
        }
        const data = await response.json();
        form.setValue("razaoSocial", data.razao_social || "");
        form.setValue("nomeFantasia", data.nome_fantasia || data.razao_social || "");
        form.setValue("email", data.email || "");
        form.setValue("telefone", data.ddd_telefone_1 || data.ddd_telefone_2 || "");
        if (data.logradouro) {
          const fullAddress = `${data.logradouro}${data.numero ? `, ${data.numero}` : ''}${data.complemento ? ` - ${data.complemento}` : ''} - ${data.bairro}, ${data.municipio} - ${data.uf}`;
          form.setValue("endereco", fullAddress);
          form.setValue("cep", data.cep || "");
        }
        toast({ title: "CNPJ Consultado!", description: "Os dados foram preenchidos." });
    } catch (error) {
        toast({ variant: "destructive", title: "Erro na Consulta", description: "Não foi possível obter os dados do CNPJ." });
    } finally {
        setIsCnpjLoading(false);
    }
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
        email: customer.email,
        isLead: customer.status === "lead" || customer.status === "opportunity" || customer.status === "proposal" || customer.status === "negotiation",
        tipoCliente: customer.type === "active_contract" ? "active_contract" : "one_time",
        cnpj: customer.cnpj ? formatDocument(customer.cnpj) : '', 
        telefone: customer.telefone ? formatPhoneNumber(customer.telefone) : '',
        endereco: customer.endereco || '',
        cep: customer.cep || '',
        inscricaoEstadual: '',
        serviceCategories: customer.serviceCategories || [],
        observations: customer.observations || "",
        oneTimeValue: customer.oneTimeValue || 0,
        monthlyValue: customer.monthlyValue || 0,
    });
    setIsFormDialogOpen(true);
  };
  
  const handleCloneClick = (customer: Customer) => {
    const { id, createdAt, lastContact, ...rest } = customer;
    const clonedCustomer: Omit<Customer, 'id'> = {
      ...rest,
      name: `${customer.name} (Cópia)`,
      createdAt: new Date().toISOString(),
      lastContact: new Date().toISOString(),
      status: 'new',
      serviceCategories: customer.serviceCategories ? [...customer.serviceCategories] : [],
      observations: customer.observations || "",
    };
    addCustomer(clonedCustomer);
    toast({
        title: "Cliente Clonado!",
        description: `O registro de "${customer.name}" foi duplicado.`,
    });
  };

  const handleInactivateClick = (customer: Customer) => {
    updateCustomer({ ...customer, status: 'inactive' });
    toast({ title: "Cliente Inativado", description: `${customer.name} foi movido para a aba de Inativos.` });
  };

  const handleReactivateClick = (customer: Customer) => {
    updateCustomer({ ...customer, status: 'new' });
    toast({ title: "Cliente Reativado!", description: `${customer.name} retornou à carteira ativa.` });
  };

  const handleDiscardClick = (customer: Customer) => {
    updateCustomer({ ...customer, status: 'lost' });
    toast({ title: "Lead Descartado", description: `${customer.name} foi movido para inativos.` });
  };

  const handleOpenConvertDialog = (customer: Customer) => {
    setConvertingCustomer(customer);
  };

  const handleConfirmConvert = (type: "active_contract" | "one_time") => {
    if (!convertingCustomer) return;
    updateCustomer({ ...convertingCustomer, status: 'won', type: type });
    toast({ title: "Lead Convertido!", description: `${convertingCustomer.name} agora é um cliente.` });
    setConvertingCustomer(null);
  };

  const handleDeleteClick = (customer: Customer) => {
    setIsFormDialogOpen(false);
    setTimeout(() => {
        setDeletingCustomer(customer);
    }, 150);
  };

  const confirmDeleteAction = () => {
    if (!deletingCustomer) return;
    deleteCustomer(deletingCustomer.id);
    toast({ title: "Cliente Excluído", description: `${deletingCustomer.name} foi removido.` });
    setDeletingCustomer(null);
    setEditingCustomer(null);
  };

  const handleDownloadTemplate = () => {
    const data = [
      {
        "Razão Social": "Exemplo Empresa LTDA",
        "Nome Fantasia": "Exemplo Fantasia",
        "CNPJ/CPF": "00.000.000/0000-00",
        "Contato": "João Silva",
        "E-mail": "contato@exemplo.com",
        "Telefone": "11999999999",
        "Endereço": "Rua das Flores, 123",
        "CEP": "01001-000",
        "Tipo": "Contrato",
        "Valor Venda": 500,
        "Valor Mensal": 150.50,
        "Observações": "Descreva detalhes técnicos aqui..."
      }
    ];
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.book_append_sheet(workbook, worksheet, "Importação");
    XLSX.writeFile(workbook, "modelo_importacao.xlsx");
  };

  const handleExportExcel = () => {
    const dataToExport = displayedCustomers.map(c => ({
      "Razão Social": c.name,
      "Nome Fantasia": c.nomeFantasia || "",
      "CNPJ/CPF": c.cnpj ? formatDocument(c.cnpj) : "",
      "Contato": c.contactName || "",
      "E-mail": c.email,
      "Telefone": c.telefone ? formatPhoneNumber(c.telefone) : "",
      "Endereço": c.endereco || "",
      "CEP": c.cep || "",
      "Status": statusMap[c.status],
      "Tipo": c.type === 'active_contract' ? 'Contrato Ativo' : (c.type === 'one_time' ? 'Avulso' : 'Lead'),
      "Valor Venda": c.oneTimeValue || 0,
      "Valor Mensal": c.monthlyValue || 0,
      "Categorias": (c.serviceCategories || []).map(catId => SERVICE_CATEGORIES.find(s => s.id === catId)?.label).join(", "),
      "Observações": c.observations || "",
      "Data de Cadastro": format(new Date(c.createdAt), 'dd/MM/yyyy HH:mm'),
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.book_append_sheet(workbook, worksheet, "Clientes");
    XLSX.writeFile(workbook, `clientes_vendaspro_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
    
    toast({
        title: "Exportação Concluída",
        description: `${dataToExport.length} registros exportados para Excel.`
    });
  };

  const handleImportFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = new Uint8Array(e.target?.result as ArrayBuffer);
            const workbook = XLSX.read(data, { type: 'array' });
            const worksheet = workbook.Sheets[workbook.SheetNames[0]];
            const rawData = XLSX.utils.sheet_to_json<any>(worksheet);
            if (rawData.length === 0) {
                toast({ variant: 'destructive', title: 'Arquivo Vazio' });
                return;
            }
            const importedCustomers: Omit<Customer, 'id'>[] = [];
            rawData.forEach((row: any) => {
                const findValue = (keys: string[]) => {
                    const key = Object.keys(row).find(k => keys.some(sk => k.trim().toLowerCase().includes(sk)));
                    return key ? String(row[key]).trim() : '';
                };
                const razaoSocial = findValue(['razão social', 'razao social', 'nome', 'empresa', 'cliente']);
                if (!razaoSocial) return;
                importedCustomers.push({
                    name: razaoSocial,
                    nomeFantasia: findValue(['nome fantasia', 'fantasia']) || razaoSocial,
                    contactName: findValue(['contato', 'responsável']),
                    email: findValue(['e-mail', 'email']),
                    telefone: findValue(['telefone', 'celular', 'whatsapp']),
                    cnpj: findValue(['cnpj', 'cpf', 'documento', 'identificação', 'cadastro', 'cnpj/cpf']).replace(/\D/g, ''),
                    endereco: findValue(['endereço', 'endereco', 'rua', 'logradouro']),
                    cep: findValue(['cep', 'postal', 'código postal']),
                    status: 'new',
                    responsible: currentUser?.name || "Admin",
                    potential: "medium",
                    lastContact: new Date().toISOString(),
                    createdAt: new Date().toISOString(),
                    type: findValue(['tipo']).toLowerCase().includes('contrato') ? 'active_contract' : 'one_time',
                    serviceCategories: [],
                    observations: findValue(['observações', 'observacoes', 'obs', 'detalhes']),
                    oneTimeValue: Number(findValue(['valor venda', 'venda'])) || 0,
                    monthlyValue: Number(findValue(['valor mensal', 'mensal'])) || 0,
                });
            });
            if (importedCustomers.length > 0) {
                addCustomers(importedCustomers);
                toast({ title: "Importação Concluída!", description: `${importedCustomers.length} registros importados.` });
                setIsImportDialogOpen(false);
            }
        } catch (error) {
            toast({ variant: 'destructive', title: 'Erro no Processamento' });
        }
    };
    reader.readAsArrayBuffer(file);
  };
  
  function onSubmit(values: z.infer<typeof formSchema>) {
    if (editingCustomer) {
      let nextStatus = editingCustomer.status;
      if (values.isLead) {
          if (editingCustomer.status === "new" || editingCustomer.status === "active" || editingCustomer.status === "won") {
            nextStatus = "lead";
          }
      } else {
          if (editingCustomer.status === "lead" || editingCustomer.status === "new" || editingCustomer.status === "opportunity") {
              nextStatus = "won";
          }
      }
      updateCustomer({
        ...editingCustomer,
        name: values.razaoSocial,
        nomeFantasia: values.nomeFantasia || "",
        contactName: values.contactName,
        cnpj: values.cnpj ? values.cnpj.replace(/\D/g, '') : '',
        email: values.email || '',
        telefone: values.telefone ? values.telefone.replace(/\D/g, '') : '',
        endereco: values.endereco,
        cep: values.cep,
        status: nextStatus,
        type: values.isLead ? "lead" : (values.tipoCliente as CustomerType),
        serviceCategories: values.serviceCategories,
        observations: values.observations,
        oneTimeValue: values.oneTimeValue,
        monthlyValue: values.monthlyValue,
      });
      toast({ title: "Dados Atualizados!" });
    } else {
      const newCustomerData: Omit<Customer, 'id'> = {
        name: values.razaoSocial,
        nomeFantasia: values.nomeFantasia || "",
        contactName: values.contactName,
        cnpj: values.cnpj ? values.cnpj.replace(/\D/g, '') : '',
        email: values.email || '',
        telefone: values.telefone ? values.telefone.replace(/\D/g, '') : '',
        endereco: values.endereco,
        cep: values.cep,
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
      };
      addCustomer(newCustomerData);
      toast({ title: "Cliente Salvo!" });
    }
    setIsFormDialogOpen(false);
    setEditingCustomer(null);
  }

  const isLead = form.watch("isLead");

  return (
    <>
    <TooltipProvider>
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight font-headline">Gestão de Clientes e Leads</h2>
        <div className="flex items-center gap-2">
            <Badge variant="secondary" className="px-3 py-1 text-sm font-medium">
                {displayedCustomers.length} Registro(s) encontrado(s)
            </Badge>
        </div>
      </div>
      <Tabs defaultValue="all" onValueChange={(value) => setActiveTab(value)}>
        <div className="flex items-center">
          <TabsList>
            <TabsTrigger value="all">Clientes</TabsTrigger>
            <TabsTrigger value="active_contract">Contratos Ativos</TabsTrigger>
            <TabsTrigger value="one_time">Avulsos</TabsTrigger>
            <TabsTrigger value="leads">Leads / Funil</TabsTrigger>
            <TabsTrigger value="new">Novos</TabsTrigger>
            <TabsTrigger value="inactive">Inativos</TabsTrigger>
          </TabsList>
          <div className="ml-auto flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-8 gap-1" onClick={handleExportExcel}>
                <Download className="h-3.5 w-3.5" />
                <span>Exportar</span>
            </Button>
            
            <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 gap-1"><Upload className="h-3.5 w-3.5" /><span>Importar</span></Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]" onOpenAutoFocus={(e) => e.preventDefault()}>
                <DialogHeader>
                  <DialogTitle>Importar Clientes (Excel / CSV)</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <Alert variant="default" className="bg-primary/5 border-primary/20">
                    <div className="flex justify-between items-center w-full">
                      <AlertTitle className="flex items-center gap-2"><FileSpreadsheet className="h-4 w-4" />Formato Aceito</AlertTitle>
                      <Button variant="outline" size="sm" onClick={handleDownloadTemplate} className="h-8 gap-1"><Download className="h-3 v-3" />Modelo</Button>
                    </div>
                  </Alert>
                  <div className="flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-10 hover:bg-muted/50 cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                    <Upload className="h-10 w-10 text-muted-foreground mb-2" />
                    <p className="text-sm font-medium">Selecione seu arquivo .xlsx ou .csv</p>
                    <input type="file" ref={fileInputRef} className="hidden" accept=".xlsx, .xls, .csv" onChange={handleImportFile} />
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={isFormDialogOpen} onOpenChange={(open) => {
                if (!open) { setEditingCustomer(null); form.reset(defaultFormValues); }
                setIsFormDialogOpen(open);
            }}>
              <Button size="sm" className="h-8 gap-1" onClick={handleAddNewClick}><PlusCircle className="h-3.5 w-3.5" /><span>Novo</span></Button>
              <DialogContent 
                className="sm:max-w-[700px]" 
                onOpenAutoFocus={(e) => e.preventDefault()}
                onCloseAutoFocus={(e) => e.preventDefault()}
              >
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)}>
                    <DialogHeader>
                      <div className="flex items-center justify-between">
                        <DialogTitle>{editingCustomer ? 'Editar Registro' : 'Cadastrar Novo'}</DialogTitle>
                        <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => setIsFormDialogOpen(false)}>
                            <XCircle className="h-5 w-5" />
                        </Button>
                      </div>
                    </DialogHeader>
                    <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto px-1">
                        <div className="space-y-4 bg-primary/5 p-4 rounded-lg">
                            <FormField
                                control={form.control}
                                name="isLead"
                                render={({ field }) => (
                                <FormItem className="flex items-center justify-between">
                                    <div className="space-y-0.5"><FormLabel>Tipo de Registro</FormLabel></div>
                                    <div className="flex items-center space-x-2">
                                        <span className={cn("text-xs", !field.value && "text-primary font-bold")}>Cliente</span>
                                        <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                                        <span className={cn("text-xs", field.value && "text-primary font-bold")}>Lead</span>
                                    </div>
                                </FormItem>
                                )}
                            />
                            
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="oneTimeValue"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="flex items-center gap-2">
                                                <Tag className="h-3.5 w-3.5 text-primary" />
                                                Valor de Venda (Única)
                                            </FormLabel>
                                            <FormControl>
                                                <Input type="number" step="0.01" placeholder="0,00" {...field} />
                                            </FormControl>
                                            <FormDescription>Peças ou serviço avulso.</FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="monthlyValue"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="flex items-center gap-2">
                                                <Repeat className="h-3.5 w-3.5 text-primary" />
                                                Valor do Contrato (Mensal)
                                            </FormLabel>
                                            <FormControl>
                                                <Input type="number" step="0.01" placeholder="0,00" {...field} />
                                            </FormControl>
                                            <FormDescription>Recorrência mensal.</FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            {!isLead && (
                                <>
                                <Separator className="bg-primary/10" />
                                <FormField
                                    control={form.control}
                                    name="tipoCliente"
                                    render={({ field }) => (
                                        <FormItem className="space-y-3">
                                            <FormLabel>Classificação do Cliente</FormLabel>
                                            <FormControl>
                                                <RadioGroup
                                                    onValueChange={field.onChange}
                                                    defaultValue={field.value}
                                                    className="flex flex-row space-x-4"
                                                >
                                                    <FormItem className="flex items-center space-x-2 space-y-0">
                                                        <FormControl>
                                                            <RadioGroupItem value="one_time" />
                                                        </FormControl>
                                                        <FormLabel className="font-normal cursor-pointer">
                                                            Avulso
                                                        </FormLabel>
                                                    </FormItem>
                                                    <FormItem className="flex items-center space-x-2 space-y-0">
                                                        <FormControl>
                                                            <RadioGroupItem value="active_contract" />
                                                        </FormControl>
                                                        <FormLabel className="font-normal cursor-pointer">
                                                            Contrato Ativo
                                                        </FormLabel>
                                                    </FormItem>
                                                </RadioGroup>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                </>
                            )}
                        </div>

                        <div className="space-y-4 mt-2">
                          <h3 className="text-sm font-semibold flex items-center gap-2"><ClipboardList className="h-4 w-4" /> Observações de Serviço</h3>
                          <Separator />
                          <FormField
                            control={form.control}
                            name="observations"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Detalhes Técnicos / Notas Internas</FormLabel>
                                <FormControl>
                                  <Textarea 
                                    placeholder="Ex: 5 PCs, 2 Impressoras HP, todos com Win 11. Manutenção preventiva mensal..." 
                                    className="min-h-[100px]"
                                    {...field} 
                                    value={field.value || ''}
                                  />
                                </FormControl>
                                <FormDescription>Especifique os equipamentos e particularidades do serviço.</FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        {!isLead && (
                          <div className="space-y-4 mt-2">
                            <h3 className="text-sm font-semibold flex items-center gap-2"><Tags className="h-4 w-4" /> Serviços Contratados</h3>
                            <Separator />
                            <FormField
                              control={form.control}
                              name="serviceCategories"
                              render={() => (
                                <FormItem>
                                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    {SERVICE_CATEGORIES.map((category) => (
                                      <FormField
                                        key={category.id}
                                        control={form.control}
                                        name="serviceCategories"
                                        render={({ field }) => {
                                          return (
                                            <FormItem
                                              key={category.id}
                                              className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 bg-muted/20"
                                            >
                                              <FormControl>
                                                <Checkbox
                                                  checked={field.value?.includes(category.id)}
                                                  onCheckedChange={(checked) => {
                                                    return checked
                                                      ? field.onChange([...field.value, category.id])
                                                      : field.onChange(
                                                          field.value?.filter(
                                                            (value) => value !== category.id
                                                          )
                                                        )
                                                  }}
                                                />
                                              </FormControl>
                                              <FormLabel className="font-normal cursor-pointer">
                                                {category.label}
                                              </FormLabel>
                                            </FormItem>
                                          )
                                        }}
                                      />
                                    ))}
                                  </div>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        )}

                        <div className="space-y-4 mt-2">
                          <h3 className="text-sm font-semibold flex items-center gap-2"><Building2 className="h-4 w-4" /> Dados {isLead ? 'do Lead' : 'Gerais'}</h3>
                          <Separator />
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {!isLead && (
                              <FormField
                                control={form.control}
                                name="cnpj"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>CNPJ/CPF</FormLabel>
                                    <div className="flex items-center gap-2">
                                      <FormControl><Input placeholder="00.000.000/0000-00" {...field} onChange={(e) => field.onChange(formatDocument(e.target.value))} /></FormControl>
                                      <Button type="button" variant="secondary" size="icon" onClick={handleCnpjLookup} disabled={isCnpjLoading}>
                                        {isCnpjLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                                      </Button>
                                    </div>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            )}
                            <FormField 
                              control={form.control} 
                              name="razaoSocial" 
                              render={({ field }) => (
                                <FormItem className={cn(isLead && "md:col-span-2")}>
                                  <FormLabel>{isLead ? 'Nome do Lead / Empresa' : 'Razão Social'}</FormLabel>
                                  <FormControl><Input placeholder={isLead ? 'Ex: Tech Solutions' : ''} {...field} /></FormControl>
                                  <FormMessage />
                                </FormItem>
                              )} 
                            />
                            {!isLead && (
                              <FormField control={form.control} name="nomeFantasia" render={({ field }) => (<FormItem><FormLabel>Nome Fantasia</FormLabel><FormControl><Input {...field} value={field.value || ''}/></FormControl></FormItem>)} />
                            )}
                            <FormField control={form.control} name="contactName" render={({ field }) => (<FormItem className={cn(isLead && "md:col-span-2")}><FormLabel>Nome do Contato</FormLabel><FormControl><Input placeholder="Pessoa principal de contato" {...field} value={field.value || ''} /></FormControl></FormItem>)} />
                          </div>
                        </div>

                        <div className="space-y-4 mt-2">
                          <h3 className="text-sm font-semibold flex items-center gap-2"><Phone className="h-4 w-4" /> Comunicação</h3>
                          <Separator />
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField control={form.control} name="email" render={({ field }) => (<FormItem><FormLabel>E-mail</FormLabel><FormControl><Input type="email" placeholder="contato@empresa.com" {...field} /></FormControl><FormMessage /></FormItem>)} />
                            <FormField control={form.control} name="telefone" render={({ field }) => (<FormItem><FormLabel>Telefone (WhatsApp)</FormLabel><FormControl><Input placeholder="(00) 00000-0000" {...field} onChange={(e) => field.onChange(formatPhoneNumber(e.target.value))} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
                          </div>
                        </div>
                        <div className="space-y-4 mt-2">
                          <h3 className="text-sm font-semibold flex items-center gap-2"><MapPin className="h-4 w-4" /> Localização {isLead && '(Se houver)'}</h3>
                          <Separator />
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <FormField control={form.control} name="cep" render={({ field }) => (<FormItem><FormLabel>CEP</FormLabel><FormControl><Input placeholder="00000-000" {...field} value={field.value || ''} /></FormControl></FormItem>)} />
                            <FormField control={form.control} name="endereco" render={({ field }) => (<FormItem className="md:col-span-3"><FormLabel>Endereço</FormLabel><FormControl><Input placeholder="Logradouro, número, bairro..." {...field} value={field.value || ''} /></FormControl></FormItem>)} />
                          </div>
                        </div>
                    </div>
                    <DialogFooter className="gap-2">
                      {editingCustomer && (
                        <>
                          <Button type="button" variant="destructive" className="mr-auto" onClick={() => handleDeleteClick(editingCustomer)}>Excluir</Button>
                          {editingCustomer.status !== 'inactive' && (
                             <Button type="button" variant="outline" className="text-yellow-600 border-yellow-600/30" onClick={() => { handleInactivateClick(editingCustomer); setIsFormDialogOpen(false); }}>Inativar</Button>
                          )}
                        </>
                      )}
                      <Button variant="ghost" type="button" onClick={() => setIsFormDialogOpen(false)}>Cancelar</Button>
                      <Button type="submit">{editingCustomer ? 'Salvar' : 'Cadastrar'}</Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
        <TabsContent value="all" forceMount className="mt-4">
            <Card>
                <CardHeader>
                    <div className="flex flex-col md:flex-row gap-4">
                      <div className="relative flex-1">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input placeholder="Buscar cliente..." className="pl-8" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                      </div>
                      
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" className="gap-2">
                            <Filter className="h-4 w-4" />
                            Serviços {selectedServices.length > 0 && `(${selectedServices.length})`}
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56">
                          <DropdownMenuLabel>Filtrar por Serviço</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          {SERVICE_CATEGORIES.map((cat) => (
                            <DropdownMenuCheckboxItem
                              key={cat.id}
                              checked={selectedServices.includes(cat.id)}
                              onCheckedChange={(checked) => {
                                setSelectedServices(prev => 
                                  checked ? [...prev, cat.id] : prev.filter(id => id !== cat.id)
                                );
                              }}
                              onSelect={(e) => e.preventDefault()}
                            >
                              {cat.label}
                            </DropdownMenuCheckboxItem>
                          ))}
                          {selectedServices.length > 0 && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                className="justify-center text-primary font-medium"
                                onClick={() => setSelectedServices([])}
                              >
                                Limpar Filtros
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                </CardHeader>
                <CardContent>
                <Table>
                    <TableHeader>
                    <TableRow>
                        <TableHead>Nome / Contato</TableHead>
                        <TableHead>Status / Valores</TableHead>
                        <TableHead className="hidden md:table-cell">Localização</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                    </TableHeader>
                    <TableBody>
                    {displayedCustomers.length > 0 ? (
                        displayedCustomers.map((customer) => (
                        <TableRow key={customer.id} onClick={() => handleEditClick(customer)} className="cursor-pointer">
                        <TableCell>
                            <div className="flex flex-col">
                                <div className="flex items-center gap-2 flex-wrap mb-1">
                                    <span className="font-medium text-base">{customer.name}</span>
                                    <div className="flex gap-1">
                                        {(customer.serviceCategories || []).map(catId => {
                                            const cat = SERVICE_CATEGORIES.find(c => c.id === catId);
                                            if (!cat) return null;
                                            return (
                                                <Badge key={catId} variant="outline" className={cn("text-[8px] h-4 leading-none uppercase font-bold px-1 py-0", cat.color)}>
                                                    {cat.label}
                                                </Badge>
                                            );
                                        })}
                                    </div>
                                </div>
                                <div className="text-xs text-muted-foreground">{customer.email}</div>
                                <div className="flex flex-wrap gap-2 mt-2">
                                    {customer.cnpj && <div className="text-[10px] bg-muted px-1.5 py-0.5 rounded flex items-center gap-1 border"><Building2 className="h-3 w-3" /><span>{formatDocument(customer.cnpj)}</span></div>}
                                    {customer.telefone && <div className="text-[10px] bg-muted px-1.5 py-0.5 rounded flex items-center gap-1 border"><Phone className="h-3 w-3" /><span>{formatPhoneNumber(customer.telefone)}</span></div>}
                                </div>
                            </div>
                        </TableCell>
                        <TableCell>
                            <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-2">
                                    <Badge variant={customer.status === 'active' || customer.status === 'won' ? 'default' : 'secondary'}>{statusMap[customer.status]}</Badge>
                                </div>
                                <div className="flex flex-col text-[10px] gap-0.5 mt-1">
                                    {customer.oneTimeValue ? (
                                        <div className="flex items-center gap-1 text-primary font-bold">
                                            <Tag className="h-2.5 w-2.5" />
                                            <span>Venda: {customer.oneTimeValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                                        </div>
                                    ) : null}
                                    {customer.monthlyValue ? (
                                        <div className="flex items-center gap-1 text-emerald-500 font-bold">
                                            <Repeat className="h-2.5 w-2.5" />
                                            <span>Mensal: {customer.monthlyValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                                        </div>
                                    ) : null}
                                </div>
                                {customer.status !== 'lead' && customer.status !== 'inactive' && customer.status !== 'discarded' && customer.status !== 'lost' && (
                                    <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-tight">
                                        {customer.type === 'active_contract' ? 'Contrato Ativo' : 'Avulso'}
                                    </span>
                                )}
                            </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell max-w-[200px]">
                            {customer.endereco ? <div className="text-xs truncate"><MapPin className="h-3 w-3 inline mr-1" />{customer.endereco}</div> : <span className="text-xs text-muted-foreground italic">N/A</span>}
                        </TableCell>
                        <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={(e) => { e.stopPropagation(); handleCloneClick(customer); }}>
                                            <Copy className="h-4 w-4" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Clonar Registro</TooltipContent>
                                </Tooltip>
                                
                                {customer.status !== 'inactive' && customer.status !== 'discarded' && customer.status !== 'lost' ? (
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-yellow-600" onClick={(e) => { e.stopPropagation(); handleInactivateClick(customer); }}>
                                                <Archive className="h-4 w-4" />
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>Inativar Cliente</TooltipContent>
                                    </Tooltip>
                                ) : (
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-green-600" onClick={(e) => { e.stopPropagation(); handleReactivateClick(customer); }}>
                                                <RotateCcw className="h-4 w-4" />
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>Reativar Cliente</TooltipContent>
                                    </Tooltip>
                                )}

                                {(customer.status === 'lead' || customer.status === 'opportunity' || customer.status === 'proposal' || customer.status === 'negotiation') && (
                                    <>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-green-500" onClick={(e) => { e.stopPropagation(); handleOpenConvertDialog(customer); }}>
                                                    <UserCheck className="h-4 w-4" />
                                                </Button>
                                            </TooltipTrigger>
                                            <TooltipContent>Converter em Cliente (Venda Ganha)</TooltipContent>
                                        </Tooltip>
                                        
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={(e) => { e.stopPropagation(); handleDiscardClick(customer); }}>
                                                    <UserX className="h-4 w-4" />
                                                </Button>
                                            </TooltipTrigger>
                                            <TooltipContent>Descartar Lead (Venda Perdida)</TooltipContent>
                                        </Tooltip>
                                    </>
                                )}
                            </div>
                        </TableCell>
                        </TableRow>
                    ))
                    ) : (
                        <TableRow><TableCell colSpan={4} className="h-32 text-center text-muted-foreground">Nenhum registro encontrado.</TableCell></TableRow>
                    )}
                    </TableBody>
                </Table>
                </CardContent>
                <CardFooter className="justify-center border-t py-4">
                  <p className="text-sm text-muted-foreground">
                    Mostrando <strong>{displayedCustomers.length}</strong> registro(s) de um total de <strong>{customers.length}</strong> cadastrados.
                  </p>
                </CardFooter>
            </Card>
        </TabsContent>
      </Tabs>
    </div>
    </TooltipProvider>

    <AlertDialog open={!!deletingCustomer} onOpenChange={(open) => !open && setDeletingCustomer(null)}>
        <AlertDialogContent onOpenAutoFocus={(e) => e.preventDefault()} onCloseAutoFocus={(e) => e.preventDefault()}>
            <AlertDialogHeader>
            <AlertDialogTitle>Excluir permanentemente?</AlertDialogTitle>
            <AlertDialogDescription>Essa ação não pode ser desfeita. Isso excluirá <span className="font-semibold">{deletingCustomer?.name}</span>.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeletingCustomer(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteAction}>Excluir</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>

    <AlertDialog open={!!convertingCustomer} onOpenChange={(open) => !open && setConvertingCustomer(null)}>
        <AlertDialogContent onOpenAutoFocus={(e) => e.preventDefault()} onCloseAutoFocus={(e) => e.preventDefault()}>
            <AlertDialogHeader><AlertDialogTitle>Converter Lead</AlertDialogTitle></AlertDialogHeader>
            <div className="grid grid-cols-2 gap-4 py-4">
                <Button variant="outline" className="h-auto flex-col gap-2 p-4" onClick={() => handleConfirmConvert('one_time')}><Users className="h-6 w-6" /><span>Avulso</span></Button>
                <Button variant="outline" className="h-auto flex-col gap-2 p-4" onClick={() => handleConfirmConvert('active_contract')}><File className="h-6 w-6" /><span>Contrato</span></Button>
            </div>
            <AlertDialogFooter><AlertDialogCancel onClick={() => setConvertingCustomer(null)}>Cancelar</AlertDialogCancel></AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
