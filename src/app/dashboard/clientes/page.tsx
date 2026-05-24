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
  Mail
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

  useEffect(() => {
    const isAnyBlockingElementOpen = isFormDialogOpen || isImportDialogOpen || !!deletingCustomer || !!convertingCustomer || notificationState.isOpen;
    if (!isAnyBlockingElementOpen) {
      const forceRelease = () => {
        document.body.style.pointerEvents = 'auto';
        document.body.style.overflow = 'auto';
        document.documentElement.style.pointerEvents = 'auto';
      };
      forceRelease();
      const timer = setTimeout(forceRelease, 300);
      return () => clearTimeout(timer);
    }
  }, [isFormDialogOpen, isImportDialogOpen, deletingCustomer, convertingCustomer, notificationState.isOpen]);

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
        (c.contactName2 && c.contactName2.toLowerCase().includes(lowercasedSearchTerm)) ||
        c.email.toLowerCase().includes(lowercasedSearchTerm) ||
        (c.cnpj && c.cnpj.replace(/\D/g, "").includes(lowercasedSearchTerm))
    );
    if (selectedServices.length > 0) {
      filtered = filtered.filter(c => c.serviceCategories?.some(catId => selectedServices.includes(catId)));
    }
    switch (activeTab) {
        case 'inactive': filtered = filtered.filter(c => c.status === 'inactive' || c.status === 'discarded' || c.status === 'lost'); break;
        case 'all': filtered = filtered.filter(c => c.status !== 'inactive' && c.status !== 'discarded' && c.status !== 'lead' && c.status !== 'lost' && c.status !== 'opportunity' && c.status !== 'proposal' && c.status !== 'negotiation'); break;
        case 'active_contract': filtered = filtered.filter(c => c.type === 'active_contract' && c.status !== 'lead' && c.status !== 'inactive' && c.status !== 'lost' && c.status !== 'opportunity' && c.status !== 'proposal' && c.status !== 'negotiation'); break;
        case 'one_time': filtered = filtered.filter(c => c.type === 'one_time' && c.status !== 'lead' && c.status !== 'inactive' && c.status !== 'lost' && c.status !== 'opportunity' && c.status !== 'proposal' && c.status !== 'negotiation'); break;
        case 'leads': filtered = filtered.filter(c => (c.status === 'lead' || c.status === 'opportunity' || c.status === 'proposal' || c.status === 'negotiation') && c.status !== 'inactive'); break;
        case 'new': filtered = filtered.filter(c => c.status === 'new' && c.status !== 'inactive'); break;
        default: filtered = filtered.filter(c => c.status !== 'inactive' && c.status !== 'discarded' && c.status !== 'lost');
    }
    if (date?.from) {
      const fromDate = startOfDay(date.from);
      const toDate = endOfDay(date.to || date.from);
      filtered = filtered.filter(c => {
          const createdAt = new Date(c.createdAt);
          return createdAt >= fromDate && createdAt <= toDate;
      });
    }
    return filtered.sort((a, b) => (a.nomeFantasia || a.name).localeCompare((b.nomeFantasia || b.name), 'pt-BR'));
  }, [customers, searchTermTerm, activeTab, selectedServices, date]);

  const handleCnpjLookup = async () => {
    const cnpjValue = form.getValues("cnpj");
    if (!cnpjValue) { toast({ variant: "destructive", title: "CNPJ Inválido", description: "Por favor, insira um CNPJ para consultar." }); return; }
    const cleanedCnpj = cnpjValue.replace(/\D/g, "");
    if (cleanedCnpj.length !== 14) { toast({ variant: "destructive", title: "CNPJ Inválido", description: "O CNPJ deve conter 14 dígitos." }); return; }
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
        toast({ title: "CNPJ Consultado!", description: "Os dados foram preenchidos automaticamente." });
    } catch (error: any) {
        toast({ variant: "destructive", title: "Erro na Consulta", description: error.message || "Não foi possível obter os dados do CNPJ no momento." });
    } finally { setIsCnpjLoading(false); }
  };
  
  const handleAddNewClick = () => {
    setEditingCustomer(null);
    form.reset(defaultFormValues);
    form.clearErrors();
    setInteractionSummary("");
    setInteractionNextDate("");
    setInteractionNextTime("");
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
        isLead: customer.type === "lead" || customer.status === "lead" || customer.status === "opportunity" || customer.status === "proposal" || customer.status === "negotiation",
        tipoCliente: customer.type === "active_contract" ? "active_contract" : "one_time",
        cnpj: customer.cnpj ? formatDocument(customer.cnpj) : '', 
        endereco: customer.endereco || '',
        cep: customer.cep || '',
        inscricaoEstadual: '',
        serviceCategories: customer.serviceCategories || [],
        observations: customer.observations || "",
        oneTimeValue: customer.oneTimeValue || 0,
        monthlyValue: customer.monthlyValue || 0,
    });
    setInteractionSummary("");
    setInteractionNextDate("");
    setInteractionNextTime("");
    setIsFormDialogOpen(true);
  };
  
  const handleCloneClick = (customer: Customer) => {
    const { id, createdAt, lastContact, interactions, status, ...rest } = customer;
    const isLeadStatus = ['lead', 'opportunity', 'proposal', 'negotiation'].includes(status);
    const clonedStatus = isLeadStatus ? status : 'new';
    const clonedCustomer: Omit<Customer, 'id'> = {
      ...rest,
      status: clonedStatus,
      name: `${customer.name} (Cópia)`,
      nomeFantasia: customer.nomeFantasia ? `${customer.nomeFantasia} (Cópia)` : undefined,
      createdAt: new Date().toISOString(),
      lastContact: new Date().toISOString(),
      serviceCategories: customer.serviceCategories ? [...customer.serviceCategories] : [],
      observations: customer.observations || "",
      interactions: [],
    };
    addCustomer(clonedCustomer);
    toast({ title: "Registro Clonado!", description: `O registro de "${customer.nomeFantasia || customer.name}" foi duplicado com sucesso.` });
  };

  const handleInactivateClick = (customer: Customer) => {
    updateCustomer({ ...customer, status: 'inactive' });
    toast({ title: "Cliente Inativado", description: `${customer.nomeFantasia || customer.name} foi movido para a aba de Inativos.` });
  };

  const handleReactivateClick = (customer: Customer) => {
    updateCustomer({ ...customer, status: 'new' });
    toast({ title: "Cliente Reativado!", description: `${customer.nomeFantasia || customer.name} retornou à carteira ativa.` });
  };

  const handleDiscardClick = (customer: Customer) => {
    updateCustomer({ ...customer, status: 'lost' });
    toast({ title: "Lead Descartado", description: `${customer.nomeFantasia || customer.name} foi movido para inativos.` });
  };

  const handleOpenConvertDialog = (customer: Customer) => { setConvertingCustomer(customer); };

  const handleConfirmConvert = (type: "active_contract" | "one_time") => {
    if (!convertingCustomer) return;
    updateCustomer({ ...convertingCustomer, status: 'won', type: type });
    toast({ title: "Lead Convertido!", description: `${convertingCustomer.nomeFantasia || convertingCustomer.name} agora é um cliente.` });
    setConvertingCustomer(null);
  };

  const handleDeleteClick = (customer: Customer) => {
    setIsFormDialogOpen(false);
    setTimeout(() => { setDeletingCustomer(customer); }, 150);
  };

  const confirmDeleteAction = () => {
    if (!deletingCustomer) return;
    deleteCustomer(deletingCustomer.id);
    toast({ title: "Cliente Excluído", description: `${deletingCustomer.nomeFantasia || deletingCustomer.name} foi removido.` });
    setDeletingCustomer(null);
    setEditingCustomer(null);
  };

  const triggerNotifications = async (appointment: any) => {
    setNotificationState(prev => ({ ...prev, isOpen: true, isLoading: true }));
    setSentMessages([]);
    const technicians = users.filter(u => appointment.assignedTo.includes(`user:${u.id}`));
    try {
        const response = await sendAppointmentNotifications({ appointment, companyName: companyProfile.name, technicians, customMessageTemplate: companyProfile.whatsappReminderMessage });
        if (response.success) {
            setNotificationState({ isOpen: true, isLoading: false, isSimulated: !!response.isSimulated, details: response.details || [] });
            if (!response.isSimulated) toast({ title: "Notificações Enviadas", description: "O lembrete foi enviado via WhatsApp." });
        } else { throw new Error("Falha no envio"); }
    } catch (error) {
        setNotificationState(prev => ({ ...prev, isOpen: false, isLoading: false }));
        toast({ variant: "destructive", title: "Erro nas Notificações", description: "Não foi possível enviar os avisos agora." });
    }
  };

  const handleAddInteraction = () => {
    if (!interactionSummary.trim() || !editingCustomer || !currentUser) return;
    const newInteraction: Interaction = { id: `int_${Date.now()}`, timestamp: new Date().toISOString(), summary: interactionSummary, nextContactDate: interactionNextDate || undefined, nextContactTime: interactionNextTime || undefined, userId: currentUser.id, userName: currentUser.name };
    const updatedInteractions = [...(editingCustomer.interactions || []), newInteraction];
    updateCustomer({ ...editingCustomer, interactions: updatedInteractions, lastContact: new Date().toISOString() });
    if (interactionNextDate && interactionNextTime) {
        const appointmentData = { date: interactionNextDate, time: interactionNextTime, clientName: editingCustomer.nomeFantasia || editingCustomer.name, address: editingCustomer.endereco || "N/A", phone: editingCustomer.telefone, contact: editingCustomer.contactName || editingCustomer.nomeFantasia || editingCustomer.name, assignedTo: [`user:${currentUser.id}`], summary: `Retorno CRM: ${interactionSummary.substring(0, 50)}...`, status: 'scheduled' as const };
        addAppointment(appointmentData);
        toast({ title: "Agendamento Criado", description: "O próximo contato foi adicionado à sua agenda." });
        triggerNotifications(appointmentData);
    }
    setInteractionSummary(""); setInteractionNextDate(""); setInteractionNextTime("");
    toast({ title: "Interação Registrada", description: "O histórico do cliente foi atualizado." });
  };

  const sendManualWhatsApp = (detail: any, index: number) => {
    const cleanPhone = detail.phone.replace(/\D/g, '');
    const phoneWithCountryCode = cleanPhone.length > 11 ? cleanPhone : `55${cleanPhone}`;
    const url = `https://wa.me/${phoneWithCountryCode}?text=${encodeURIComponent(detail.message)}`;
    window.open(url, 'vendaspro_whatsapp');
    setSentMessages(prev => prev.includes(index) ? prev : [...prev, index]);
  };

  const handleDownloadTemplate = () => {
    const data = [{ "Nome": "Exemplo Empresa LTDA", "CPF/CNPJ": "00.000.000/0000-00", "E-mail": "contato@exemplo.com", "Telefone": "11999999999", "Celular": "11988888888", "Endereço": "Rua das Flores", "Número": "123", "Bairro": "Centro", "Cidade": "São Paulo", "UF": "SP", "CEP": "01001-000", "Valor Venda": 500, "Valor Mensal": 150.50, "Observações": "Descreva detalhes técnicos aqui..." }];
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.book_append_sheet(workbook, worksheet, "Importação");
    XLSX.writeFile(workbook, "modelo_importacao_vendaspro.xlsx");
  };

  const handleExportExcel = () => {
    const dataToExport = displayedCustomers.map(c => ({ "Razão Social": c.name, "Nome Fantasia": c.nomeFantasia || "", "CNPJ/CPF": c.cnpj ? formatDocument(c.cnpj) : "", "Contato 1": c.contactName || "", "Telefone 1": c.telefone ? formatPhoneNumber(c.telefone) : "", "Contato 2": c.contactName2 || "", "Telefone 2": c.phone2 ? formatPhoneNumber(c.phone2) : "", "E-mail": c.email, "Endereço": c.endereco || "", "CEP": c.cep || "", "Status": statusMap[c.status], "Tipo": c.type === 'active_contract' ? 'Contrato' : (c.type === 'one_time' ? 'Avulso' : 'Lead'), "Valor Venda": c.oneTimeValue || 0, "Valor Mensal": c.monthlyValue || 0, "Categorias": (c.serviceCategories || []).map(catId => SERVICE_CATEGORIES.find(s => s.id === catId)?.label).join(", "), "Observações": c.observations || "", "Data de Cadastro": format(new Date(c.createdAt), 'dd/MM/yyyy HH:mm') }));
    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.book_append_sheet(workbook, worksheet, "Clientes");
    XLSX.writeFile(workbook, `clientes_vendaspro_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
    toast({ title: "Exportação Concluída", description: `${dataToExport.length} registros exportados para Excel.` });
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
            if (rawData.length === 0) { toast({ variant: 'destructive', title: 'Arquivo Vazio' }); return; }
            const importedCustomers: Omit<Customer, 'id'>[] = [];
            rawData.forEach((row: any) => {
                const findValue = (keys: string[]) => { const key = Object.keys(row).find(k => keys.some(sk => k.trim().toLowerCase() === sk.toLowerCase() || k.trim().toLowerCase().includes(sk.toLowerCase()))); return key ? String(row[key]).trim() : ''; };
                const razaoSocial = findValue(['nome', 'razão social', 'razao social', 'empresa', 'cliente']);
                if (!razaoSocial) return;
                const rua = findValue(['endereço', 'endereco', 'logradouro', 'rua']);
                const numero = findValue(['número', 'numero', 'nº', 'num']);
                const bairro = findValue(['bairro']);
                const cidade = findValue(['cidade', 'município', 'municipio']);
                const uf = findValue(['uf', 'estado']);
                let compositeAddress = rua;
                if (numero && !rua.includes(numero)) compositeAddress += `, ${numero}`;
                if (bairro) compositeAddress += ` - ${bairro}`;
                if (cidade) compositeAddress += `, ${cidade}`;
                if (uf) compositeAddress += `/${uf}`;
                importedCustomers.push({ name: razaoSocial, nomeFantasia: findValue(['nome fantasia', 'fantasia']) || razaoSocial, contactName: findValue(['contato 1', 'contato', 'responsável', 'responsavel']), telefone: findValue(['telefone 1', 'telefone', 'fone', 'tel']).replace(/\D/g, ''), contactName2: findValue(['contato 2']), phone2: findValue(['celular', 'whatsapp', 'telefone 2']).replace(/\D/g, ''), email: findValue(['e-mail', 'email']), cnpj: findValue(['cpf/cnpj', 'cnpj', 'cpf', 'documento', 'identificação', 'identificacao', 'cadastro']).replace(/\D/g, ''), endereco: compositeAddress, cep: findValue(['cep', 'postal', 'código postal', 'codigo postal']).replace(/\D/g, ''), status: 'new', responsible: currentUser?.name || "Admin", potential: "medium", lastContact: new Date().toISOString(), createdAt: new Date().toISOString(), type: findValue(['tipo']).toLowerCase().includes('contrato') ? 'active_contract' : 'one_time', serviceCategories: [], observations: findValue(['observações', 'observacoes', 'obs', 'detalhes']), oneTimeValue: Number(findValue(['valor venda', 'venda', 'investimento'])) || 0, monthlyValue: Number(findValue(['valor mensal', 'mensal', 'recorrência', 'recorrencia'])) || 0, interactions: [] });
            });
            if (importedCustomers.length > 0) { addCustomers(importedCustomers); toast({ title: "Importação Concluída!", description: `${importedCustomers.length} registros importados com sucesso.` }); setIsImportDialogOpen(false); }
        } catch (error) { console.error(error); toast({ variant: 'destructive', title: 'Erro no Processamento', description: 'Verifique se o arquivo está no formato correto.' }); }
    };
    reader.readAsArrayBuffer(file);
  };
  
  function onSubmit(values: z.infer<typeof formSchema>) {
    if (editingCustomer) {
      let nextStatus = editingCustomer.status;
      if (values.isLead) { if (editingCustomer.status === "new" || editingCustomer.status === "active" || editingCustomer.status === "won") { nextStatus = "lead"; } } 
      else { if (editingCustomer.status === "lead" || editingCustomer.status === "new" || editingCustomer.status === "opportunity" || editingCustomer.status === "proposal" || editingCustomer.status === "negotiation") { nextStatus = "won"; } }
      updateCustomer({ ...editingCustomer, name: values.razaoSocial, nomeFantasia: values.nomeFantasia || "", contactName: values.contactName, telefone: values.telefone ? values.telefone.replace(/\D/g, '') : '', contactName2: values.contactName2, phone2: values.phone2 ? values.phone2.replace(/\D/g, '') : '', cnpj: values.cnpj ? values.cnpj.replace(/\D/g, '') : '', email: values.email || '', endereco: values.endereco, cep: values.cep, status: nextStatus, type: values.isLead ? "lead" : (values.tipoCliente as CustomerType), serviceCategories: values.serviceCategories, observations: values.observations, oneTimeValue: values.oneTimeValue, monthlyValue: values.monthlyValue });
      toast({ title: "Dados Atualizados!" });
    } else {
      const newCustomerData: Omit<Customer, 'id'> = { name: values.razaoSocial, nomeFantasia: values.nomeFantasia || "", contactName: values.contactName, telefone: values.telefone ? values.telefone.replace(/\D/g, '') : '', contactName2: values.contactName2, phone2: values.phone2 ? values.phone2.replace(/\D/g, '') : '', cnpj: values.cnpj ? values.cnpj.replace(/\D/g, '') : '', email: values.email || '', endereco: values.endereco, cep: values.cep, status: values.isLead ? "lead" : "new", responsible: currentUser?.name || "Admin", potential: "medium", lastContact: new Date().toISOString(), createdAt: new Date().toISOString(), type: values.isLead ? "lead" : (values.tipoCliente as CustomerType), serviceCategories: values.serviceCategories, observations: values.observations, oneTimeValue: values.oneTimeValue, monthlyValue: values.monthlyValue, interactions: [] };
      addCustomer(newCustomerData);
      toast({ title: "Cliente Salvo!" });
    }
    setIsFormDialogOpen(false); setEditingCustomer(null);
  }

  const isLead = form.watch("isLead");

  return (
    <>
    <TooltipProvider>
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6 bg-background/50">
      <div className="flex items-center justify-between">
        <div>
            <h2 className="text-3xl font-bold tracking-tight font-headline text-foreground">Gestão de Clientes e Leads</h2>
            <p className="text-muted-foreground">Gerencie sua carteira de clientes, leads e o histórico do CRM.</p>
        </div>
        <div className="flex items-center gap-2">
            <Badge variant="secondary" className="px-3 py-1.5 text-xs font-semibold shadow-sm border-primary/10">
                {displayedCustomers.length} Registro(s) Encontrado(s)
            </Badge>
        </div>
      </div>

      <Tabs defaultValue="all" onValueChange={(value) => setActiveTab(value)} className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <TabsList className="bg-muted/50 p-1">
            <TabsTrigger value="all">Todos Clientes</TabsTrigger>
            <TabsTrigger value="active_contract">Contratos</TabsTrigger>
            <TabsTrigger value="one_time">Avulsos</TabsTrigger>
            <TabsTrigger value="leads">Funil / Leads</TabsTrigger>
            <TabsTrigger value="new">Novos</TabsTrigger>
            <TabsTrigger value="inactive">Inativos</TabsTrigger>
          </TabsList>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-9 gap-2 shadow-sm" onClick={handleExportExcel}><Download className="h-4 w-4" /><span>Exportar</span></Button>
            <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
              <DialogTrigger asChild><Button variant="outline" size="sm" className="h-9 gap-2 shadow-sm"><Upload className="h-4 w-4" /><span>Importar</span></Button></DialogTrigger>
              <DialogContent className="sm:max-w-[500px]" onOpenAutoFocus={(e) => e.preventDefault()}>
                <DialogHeader><DialogTitle>Importar Clientes (Excel / CSV)</DialogTitle></DialogHeader>
                <div className="space-y-4 py-4">
                  <Alert variant="default" className="bg-primary/5 border-primary/20"><div className="flex justify-between items-center w-full"><AlertTitle className="flex items-center gap-2 font-bold"><FileSpreadsheet className="h-4 w-4" />Formato Aceito</AlertTitle><Button variant="outline" size="sm" onClick={handleDownloadTemplate} className="h-8 gap-1"><Download className="h-3 w-3" />Baixar Modelo</Button></div></Alert>
                  <div className="flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-12 hover:bg-muted/50 cursor-pointer transition-all" onClick={() => fileInputRef.current?.click()}><Upload className="h-10 w-10 text-muted-foreground mb-4 opacity-50" /><p className="text-sm font-medium">Arraste seu arquivo .xlsx ou .csv aqui</p><p className="text-xs text-muted-foreground mt-1">Ou clique para selecionar</p><input type="file" ref={fileInputRef} className="hidden" accept=".xlsx, .xls, .csv" onChange={handleImportFile} /></div>
                </div>
              </DialogContent>
            </Dialog>
            <Dialog open={isFormDialogOpen} onOpenChange={(open) => { if (!open) { setEditingCustomer(null); form.reset(defaultFormValues); } setIsFormDialogOpen(open); }}>
              <Button size="sm" className="h-9 gap-2 shadow-md bg-primary hover:bg-primary/90" onClick={handleAddNewClick}><PlusCircle className="h-4 w-4" /><span>Novo Registro</span></Button>
              <DialogContent className="sm:max-w-[950px] p-0 overflow-hidden" onOpenAutoFocus={(e) => e.preventDefault()} onCloseAutoFocus={(e) => e.preventDefault()}>
                <Form {...form}><form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col max-h-[90vh]">
                    <DialogHeader className="p-6 bg-muted/30 border-b flex flex-row items-center justify-between space-y-0">
                        <div className="space-y-1">
                            <DialogTitle className="text-xl">{editingCustomer ? 'Ficha do Cliente' : 'Cadastrar Novo Registro'}</DialogTitle>
                            <DialogDescription>{editingCustomer ? `Editando dados de ${editingCustomer.nomeFantasia || editingCustomer.name}.` : 'Preencha os campos abaixo para adicionar à base.'}</DialogDescription>
                        </div>
                        <Button type="button" variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => setIsFormDialogOpen(false)}><XCircle className="h-5 w-5" /></Button>
                    </DialogHeader>
                    
                    <div className="grid grid-cols-1 lg:grid-cols-5 gap-0 overflow-hidden flex-1">
                        <div className="lg:col-span-3 overflow-y-auto p-6 space-y-8 border-r">
                            <div className="space-y-4 p-5 rounded-xl bg-primary/5 border border-primary/10">
                                <FormField control={form.control} name="isLead" render={({ field }) => ( <FormItem className="flex items-center justify-between"><div className="space-y-0.5"><FormLabel className="text-xs uppercase font-bold text-muted-foreground">Classificação Principal</FormLabel></div><div className="flex items-center space-x-3"><span className={cn("text-[10px] font-bold uppercase", !field.value ? "text-primary" : "text-muted-foreground")}>Cliente Efetivo</span><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl><span className={cn("text-[10px] font-bold uppercase", field.value ? "text-primary" : "text-muted-foreground")}>Lead / Prospecto</span></div></FormItem> )} />
                                <Separator className="bg-primary/10" />
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                    <FormField control={form.control} name="oneTimeValue" render={({ field }) => ( <FormItem><FormLabel className="flex items-center gap-2 text-xs font-bold"><Tag className="h-3.5 w-3.5 text-primary" />Valor de Venda (Única)</FormLabel><FormControl><Input type="number" step="0.01" placeholder="0,00" {...field} className="h-10" /></FormControl><FormDescription className="text-[10px]">Serviços pontuais ou venda de peças.</FormDescription><FormMessage /></FormItem> )} />
                                    <FormField control={form.control} name="monthlyValue" render={({ field }) => ( <FormItem><FormLabel className="flex items-center gap-2 text-xs font-bold"><Repeat className="h-3.5 w-3.5 text-primary" />Valor de Recorrência (Mensal)</FormLabel><FormControl><Input type="number" step="0.01" placeholder="0,00" {...field} className="h-10" /></FormControl><FormDescription className="text-[10px]">Contratos de manutenção mensal.</FormDescription><FormMessage /></FormItem> )} />
                                </div>
                                {!isLead && ( <> <Separator className="bg-primary/10" /> <FormField control={form.control} name="tipoCliente" render={({ field }) => ( <FormItem className="space-y-3"><FormLabel className="text-xs uppercase font-bold text-muted-foreground">Tipo de Contrato</FormLabel><FormControl><RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex flex-row space-x-6"><FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="one_time" /></FormControl><FormLabel className="font-medium cursor-pointer text-sm">Avulso</FormLabel></FormItem><FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="active_contract" /></FormControl><FormLabel className="font-medium cursor-pointer text-sm">Mensalista</FormLabel></FormItem></RadioGroup></FormControl><FormMessage /></FormItem> )} /> </> )}
                            </div>

                            <div className="space-y-4">
                              <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2"><Building2 className="h-4 w-4" /> Identificação Corporativa</h3>
                              <Separator />
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {!isLead && ( <FormField control={form.control} name="cnpj" render={({ field }) => ( <FormItem><FormLabel>CNPJ ou CPF</FormLabel><div className="flex items-center gap-2"><FormControl><Input placeholder="00.000.000/0000-00" {...field} onChange={(e) => field.onChange(formatDocument(e.target.value))} className="h-9" /></FormControl><Button type="button" variant="secondary" size="icon" onClick={handleCnpjLookup} disabled={isCnpjLoading} className="h-9 w-9 shrink-0">{isCnpjLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}</Button></div><FormMessage /></FormItem> )} /> )}
                                <FormField control={form.control} name="razaoSocial" render={({ field }) => (<FormItem className={cn(isLead && "md:col-span-2")}><FormLabel>{isLead ? 'Nome da Empresa / Lead' : 'Razão Social'}</FormLabel><FormControl><Input placeholder={isLead ? 'Ex: Tech Solutions' : 'Razão Social Completa'} {...field} className="h-9" /></FormControl><FormMessage /></FormItem>)} />
                                {!isLead && ( <FormField control={form.control} name="nomeFantasia" render={({ field }) => (<FormItem><FormLabel>Nome Fantasia</FormLabel><FormControl><Input placeholder="Como a empresa é conhecida" {...field} value={field.value || ''} className="h-9" /></FormControl></FormItem>)} /> )}
                                <FormField control={form.control} name="email" render={({ field }) => (<FormItem className={cn(isLead && "md:col-span-2")}><FormLabel>E-mail Comercial</FormLabel><FormControl><Input type="email" placeholder="contato@empresa.com" {...field} className="h-9" /></FormControl><FormMessage /></FormItem>)} />
                              </div>
                            </div>

                            <div className="space-y-4">
                              <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2"><User className="h-4 w-4" /> Contatos Diretos</h3>
                              <Separator />
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-4 p-4 rounded-lg bg-muted/20 border">
                                    <Label className="text-[10px] font-bold uppercase text-primary">Contato Principal</Label>
                                    <FormField control={form.control} name="contactName" render={({ field }) => (<FormItem><FormLabel className="text-xs">Nome</FormLabel><FormControl><Input placeholder="Nome da pessoa" {...field} value={field.value || ''} className="h-8" /></FormControl></FormItem>)} />
                                    <FormField control={form.control} name="telefone" render={({ field }) => (<FormItem><FormLabel className="text-xs">WhatsApp</FormLabel><FormControl><Input placeholder="(00) 00000-0000" {...field} onChange={(e) => field.onChange(formatPhoneNumber(e.target.value))} value={field.value || ''} className="h-8" /></FormControl><FormMessage /></FormItem>)} />
                                </div>
                                <div className="space-y-4 p-4 rounded-lg bg-muted/20 border">
                                    <Label className="text-[10px] font-bold uppercase text-muted-foreground">Contato Reserva</Label>
                                    <FormField control={form.control} name="contactName2" render={({ field }) => (<FormItem><FormLabel className="text-xs">Nome</FormLabel><FormControl><Input placeholder="Nome da pessoa" {...field} value={field.value || ''} className="h-8" /></FormControl></FormItem>)} />
                                    <FormField control={form.control} name="phone2" render={({ field }) => (<FormItem><FormLabel className="text-xs">WhatsApp</FormLabel><FormControl><Input placeholder="(00) 00000-0000" {...field} onChange={(e) => field.onChange(formatPhoneNumber(e.target.value))} value={field.value || ''} className="h-8" /></FormControl><FormMessage /></FormItem>)} />
                                </div>
                              </div>
                            </div>

                            <div className="space-y-4">
                              <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2"><MapPin className="h-4 w-4" /> Localização</h3>
                              <Separator />
                              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <FormField control={form.control} name="cep" render={({ field }) => (<FormItem><FormLabel>CEP</FormLabel><FormControl><Input placeholder="00000-000" {...field} value={field.value || ''} className="h-9" /></FormControl></FormItem>)} />
                                <FormField control={form.control} name="endereco" render={({ field }) => (<FormItem className="md:col-span-3"><FormLabel>Endereço Completo</FormLabel><FormControl><Input placeholder="Rua, número, bairro, cidade - UF" {...field} value={field.value || ''} className="h-9" /></FormControl></FormItem>)} />
                              </div>
                            </div>
                        </div>

                        <div className="lg:col-span-2 bg-muted/30 overflow-y-auto p-6 space-y-8">
                            <div className="space-y-4">
                                <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2"><ClipboardList className="h-4 w-4" /> Detalhes do Ambiente</h3>
                                <Separator />
                                <FormField control={form.control} name="observations" render={({ field }) => ( <FormItem><FormControl><Textarea placeholder="Descreva equipamentos instalados, logins, senhas, particularidades técnicas..." className="min-h-[120px] text-xs resize-none shadow-sm" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem> )} />
                            </div>

                            <div className="space-y-4">
                                <h3 className="text-xs font-bold uppercase tracking-widest text-primary flex items-center gap-2"><MessageSquare className="h-4 w-4" /> Linha do Tempo (CRM)</h3>
                                <div className="space-y-4 bg-background p-4 rounded-xl border shadow-sm">
                                    <div className="space-y-2">
                                        <Label className="text-[10px] uppercase font-bold text-muted-foreground">Nova Interação / Resumo</Label>
                                        <Textarea placeholder="Descreva o que foi conversado hoje..." className="text-xs h-24 resize-none" value={interactionSummary} onChange={(e) => setInteractionSummary(e.target.value)} />
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-1.5">
                                            <Label className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" /> Retorno em</Label>
                                            <Input type="date" className="text-xs h-9" value={interactionNextDate} onChange={(e) => setInteractionNextDate(e.target.value)} />
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" /> Horário</Label>
                                            <Input type="time" className="text-xs h-9" value={interactionNextTime} onChange={(e) => setInteractionNextTime(e.target.value)} />
                                        </div>
                                    </div>
                                    <Button type="button" size="sm" className="w-full h-10 text-xs font-bold gap-2" disabled={!interactionSummary.trim() || !editingCustomer} onClick={handleAddInteraction}><Check className="h-4 w-4" /> Registrar No Histórico</Button>
                                    {!editingCustomer && <p className="text-[10px] text-center text-destructive font-medium">Salve o cadastro primeiro para habilitar o CRM.</p>}
                                </div>

                                <ScrollArea className="h-[350px] pr-4 mt-4">
                                    <div className="space-y-6 relative before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-muted-foreground/10">
                                        {editingCustomer?.interactions && editingCustomer.interactions.length > 0 ? ( 
                                            editingCustomer.interactions.slice().reverse().map((int) => ( 
                                                <div key={int.id} className="relative pl-8">
                                                    <div className="absolute left-0 top-1 h-4 w-4 rounded-full bg-primary border-4 border-background shadow-sm" />
                                                    <div className="flex flex-col gap-2">
                                                        <div className="flex justify-between items-center">
                                                            <span className="text-[10px] font-bold text-primary uppercase">{int.userName}</span>
                                                            <span className="text-[10px] text-muted-foreground">{format(parseISO(int.timestamp), 'dd/MM/yyyy HH:mm')}</span>
                                                        </div>
                                                        <div className="bg-background border p-3 rounded-lg text-xs leading-relaxed shadow-sm">
                                                            {int.summary}
                                                            {int.nextContactDate && ( 
                                                                <div className="flex items-center gap-2 text-[10px] text-emerald-600 font-bold mt-3 border-t pt-2">
                                                                    <BellRing className="h-3 w-3" />
                                                                    <span>Retorno agendado: {format(parseISO(int.nextContactDate), 'dd/MM/yyyy')} às {int.nextContactTime}</span>
                                                                </div> 
                                                            )}
                                                        </div>
                                                    </div>
                                                </div> 
                                            )) 
                                        ) : ( 
                                            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground opacity-40 text-center">
                                                <History className="h-10 w-10 mb-3" />
                                                <p className="text-xs italic">Sem registros no histórico.</p>
                                            </div> 
                                        )}
                                    </div>
                                </ScrollArea>
                            </div>
                        </div>
                    </div>

                    <DialogFooter className="p-6 bg-muted/30 border-t flex flex-row items-center gap-3">
                        {editingCustomer && ( 
                            <> 
                                <Button type="button" variant="destructive" className="mr-auto h-10 px-6 font-bold" onClick={() => handleDeleteClick(editingCustomer)}><Trash2 className="h-4 w-4 mr-2" />Excluir</Button>
                                {editingCustomer.status !== 'inactive' && ( 
                                    <Button type="button" variant="outline" className="h-10 px-6 border-yellow-600/30 text-yellow-600 hover:bg-yellow-600/5 font-bold" onClick={() => { handleInactivateClick(editingCustomer); setIsFormDialogOpen(false); }}>Inativar</Button> 
                                )} 
                            </> 
                        )} 
                        <Button variant="ghost" type="button" onClick={() => setIsFormDialogOpen(false)} className="h-10 px-6">Cancelar</Button>
                        <Button type="submit" className="h-10 px-8 font-bold shadow-md">{editingCustomer ? 'Atualizar Dados' : 'Criar Cadastro'}</Button>
                    </DialogFooter>
                  </form></Form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <TabsContent value="all" forceMount className="mt-0">
            <Card className="shadow-lg border-primary/10 overflow-hidden">
                <CardHeader className="bg-muted/30 pb-6">
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <Input placeholder="Buscar por Nome, Fantasia, CNPJ, E-mail ou Contato..." className="pl-10 h-10 border-muted-foreground/20 focus-visible:ring-primary shadow-sm" value={searchTermTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                        </div>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" className="h-10 gap-2 font-medium border-muted-foreground/20 shadow-sm"><Filter className="h-4 w-4" />Filtrar Serviços {selectedServices.length > 0 && `(${selectedServices.length})`}</Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-64 p-2 shadow-xl">
                                <DropdownMenuLabel className="text-xs uppercase font-bold text-muted-foreground px-2 py-2">Categorias de Atuação</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                {SERVICE_CATEGORIES.map((cat) => ( 
                                    <DropdownMenuCheckboxItem key={cat.id} checked={selectedServices.includes(cat.id)} onCheckedChange={(checked) => { setSelectedServices(prev => checked ? [...prev, cat.id] : prev.filter(id => id !== cat.id)); }} onSelect={(e) => e.preventDefault()} className="rounded-md py-2">{cat.label}</DropdownMenuCheckboxItem> 
                                ))}
                                {selectedServices.length > 0 && ( 
                                    <> 
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem className="justify-center text-primary font-bold py-2 hover:bg-primary/10" onClick={() => setSelectedServices([])}>Limpar Todos os Filtros</DropdownMenuItem> 
                                    </> 
                                )}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow className="hover:bg-transparent bg-muted/20">
                                <TableHead className="pl-6 h-12 font-bold text-xs uppercase tracking-wider text-muted-foreground">Cliente / Identificação</TableHead>
                                <TableHead className="h-12 font-bold text-xs uppercase tracking-wider text-muted-foreground">Canais de Contato</TableHead>
                                <TableHead className="h-12 font-bold text-xs uppercase tracking-wider text-muted-foreground">Status / Faturamento</TableHead>
                                <TableHead className="hidden md:table-cell h-12 font-bold text-xs uppercase tracking-wider text-muted-foreground">Última Atividade</TableHead>
                                <TableHead className="text-right pr-6 h-12 font-bold text-xs uppercase tracking-wider text-muted-foreground">Ações</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {displayedCustomers.length > 0 ? ( 
                                displayedCustomers.map((customer) => ( 
                                    <TableRow key={customer.id} onClick={() => handleEditClick(customer)} className="cursor-pointer group hover:bg-muted/40 transition-colors">
                                        <TableCell className="pl-6 py-4">
                                            <div className="flex flex-col space-y-1">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className="font-bold text-base text-foreground group-hover:text-primary transition-colors leading-tight">{customer.nomeFantasia || customer.name}</span>
                                                    <div className="flex gap-1">
                                                        {(customer.serviceCategories || []).map(catId => { 
                                                            const cat = SERVICE_CATEGORIES.find(c => c.id === catId); 
                                                            if (!cat) return null; 
                                                            return ( <Badge key={catId} variant="outline" className={cn("text-[8px] h-4 leading-none uppercase font-extrabold px-1.5 py-0 border-none shadow-sm", cat.color)}>{cat.label}</Badge> ); 
                                                        })}
                                                    </div>
                                                </div>
                                                {(customer.nomeFantasia && customer.nomeFantasia !== customer.name) && ( 
                                                    <div className="text-[10px] uppercase font-bold text-muted-foreground/60 tracking-tight leading-none">{customer.name}</div> 
                                                )}
                                                <div className="text-xs text-muted-foreground/80 flex items-center gap-1.5 pt-0.5">
                                                    <Mail className="h-3 w-3 opacity-50" /> {customer.email}
                                                </div>
                                                {customer.cnpj && (
                                                    <div className="text-[9px] font-bold bg-muted w-fit mt-1 px-2 py-0.5 rounded-full border flex items-center gap-1 text-muted-foreground uppercase">
                                                        <Building2 className="h-2.5 w-2.5" /> <span>{formatDocument(customer.cnpj)}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell className="py-4">
                                            <div className="flex flex-col gap-3">
                                                {customer.contactName && ( 
                                                    <div className="flex flex-col">
                                                        <span className="text-xs font-bold leading-tight">{customer.contactName}</span>
                                                        <span className="text-[10px] text-muted-foreground flex items-center gap-1.5 mt-0.5">
                                                            <Phone className="h-3 w-3 text-primary/60" /> {formatPhoneNumber(customer.telefone || '')}
                                                        </span>
                                                    </div> 
                                                )}
                                                {customer.contactName2 && ( 
                                                    <div className="flex flex-col border-t pt-1.5 border-muted-foreground/10">
                                                        <span className="text-xs font-bold leading-tight text-muted-foreground">{customer.contactName2}</span>
                                                        <span className="text-[10px] text-muted-foreground/70 flex items-center gap-1.5 mt-0.5">
                                                            <Phone className="h-3 w-3" /> {formatPhoneNumber(customer.phone2 || '')}
                                                        </span>
                                                    </div> 
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell className="py-4">
                                            <div className="flex flex-col gap-2">
                                                <Badge variant={customer.status === 'active' || customer.status === 'won' ? 'default' : 'secondary'} className="w-fit text-[10px] px-2 py-0">
                                                    {statusMap[customer.status]}
                                                </Badge>
                                                <div className="flex flex-col gap-1">
                                                    {customer.oneTimeValue ? ( 
                                                        <div className="flex items-center gap-1.5 text-[10px] text-primary font-bold bg-primary/5 px-2 py-0.5 rounded-md w-fit border border-primary/10">
                                                            <Tag className="h-2.5 w-2.5" /> <span>Venda: {customer.oneTimeValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                                                        </div> 
                                                    ) : null}
                                                    {customer.monthlyValue ? ( 
                                                        <div className="flex items-center gap-1.5 text-[10px] text-emerald-600 font-bold bg-emerald-500/5 px-2 py-0.5 rounded-md w-fit border border-emerald-500/10">
                                                            <Repeat className="h-2.5 w-2.5" /> <span>Mensal: {customer.monthlyValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                                                        </div> 
                                                    ) : null}
                                                </div>
                                                {customer.status !== 'lead' && customer.status !== 'inactive' && customer.status !== 'discarded' && customer.status !== 'lost' && customer.status !== 'opportunity' && customer.status !== 'proposal' && customer.status !== 'negotiation' && ( 
                                                    <span className="text-[9px] text-muted-foreground font-extrabold uppercase tracking-widest">{customer.type === 'active_contract' ? 'Modalidade: Contrato' : 'Modalidade: Avulso'}</span> 
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell className="hidden md:table-cell py-4">
                                            <div className="flex flex-col gap-1">
                                                <div className="flex items-center gap-2 text-xs font-semibold">
                                                    <Clock className="h-3 w-3 text-muted-foreground" />
                                                    {format(parseISO(customer.lastContact), 'dd/MM/yyyy')}
                                                </div>
                                                <span className="text-[10px] text-muted-foreground ml-5">{format(parseISO(customer.lastContact), 'HH:mm')}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right pr-6 py-4">
                                            <div className="flex justify-end gap-1 opacity-20 group-hover:opacity-100 transition-opacity">
                                                <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={(e) => { e.stopPropagation(); handleCloneClick(customer); }}><Copy className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>Clonar Cadastro</TooltipContent></Tooltip>
                                                {customer.status !== 'inactive' && customer.status !== 'discarded' && customer.status !== 'lost' ? ( 
                                                    <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 text-yellow-600/70 hover:text-yellow-600" onClick={(e) => { e.stopPropagation(); handleInactivateClick(customer); }}><Archive className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>Mover para Inativos</TooltipContent></Tooltip> 
                                                ) : ( 
                                                    <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 text-green-600/70 hover:text-green-600" onClick={(e) => { e.stopPropagation(); handleReactivateClick(customer); }}><RotateCcw className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>Reativar Cliente</TooltipContent></Tooltip> 
                                                )}
                                                <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 text-destructive/40 hover:text-destructive" onClick={(e) => { e.stopPropagation(); handleDeleteClick(customer); }}><Trash2 className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>Remover permanentemente</TooltipContent></Tooltip>
                                                {(customer.status === 'lead' || customer.status === 'opportunity' || customer.status === 'proposal' || customer.status === 'negotiation') && ( 
                                                    <> 
                                                        <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 text-green-500" onClick={(e) => { e.stopPropagation(); handleOpenConvertDialog(customer); }}><UserCheck className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>Venda Realizada (Ganhou)</TooltipContent></Tooltip> 
                                                        <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={(e) => { e.stopPropagation(); handleDiscardClick(customer); }}><UserX className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>Descartar Lead (Perdeu)</TooltipContent></Tooltip> 
                                                    </> 
                                                )}
                                            </div>
                                        </TableCell>
                                    </TableRow> 
                                )) 
                            ) : ( 
                                <TableRow><TableCell colSpan={5} className="h-32 text-center text-muted-foreground italic">Nenhum registro encontrado com estes critérios.</TableCell></TableRow> 
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
                <CardFooter className="justify-center border-t py-6 bg-muted/10">
                    <p className="text-xs text-muted-foreground font-medium">Exibindo <strong>{displayedCustomers.length}</strong> de <strong>{customers.length}</strong> cadastros totais.</p>
                </CardFooter>
            </Card>
        </TabsContent>
      </Tabs>
    </div>
    </TooltipProvider>

    <AlertDialog open={!!deletingCustomer} onOpenChange={(open) => !open && setDeletingCustomer(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Excluir permanentemente?</AlertDialogTitle>
                <AlertDialogDescription>Essa ação não pode ser desfeita. Todos os dados e interações de <span className="font-bold text-foreground">{deletingCustomer?.nomeFantasia || deletingCustomer?.name}</span> serão removidos permanentemente.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setDeletingCustomer(null)}>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={confirmDeleteAction} className="bg-destructive hover:bg-destructive/90 font-bold">Sim, Excluir</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>

    <AlertDialog open={!!convertingCustomer} onOpenChange={(open) => !open && setConvertingCustomer(null)}>
        <AlertDialogContent className="sm:max-w-md">
            <AlertDialogHeader className="pb-4">
                <AlertDialogTitle className="flex items-center gap-2 text-xl">
                    <CheckCircle2 className="h-6 w-6 text-green-500" />
                    Parabéns pela Conversão!
                </AlertDialogTitle>
                <AlertDialogDescription>Você está transformando este lead em cliente. Selecione a modalidade de faturamento:</AlertDialogDescription>
            </AlertDialogHeader>
            <div className="grid grid-cols-2 gap-4 py-6 border-y">
                <Button variant="outline" className="h-auto flex-col gap-3 p-6 hover:border-primary hover:bg-primary/5 transition-all shadow-sm group" onClick={() => handleConfirmConvert('one_time')}>
                    <Users className="h-8 w-8 text-blue-500 group-hover:scale-110 transition-transform" />
                    <div className="text-center">
                        <p className="font-bold text-sm">Cliente Avulso</p>
                        <p className="text-[10px] text-muted-foreground">Faturamento eventual</p>
                    </div>
                </Button>
                <Button variant="outline" className="h-auto flex-col gap-3 p-6 hover:border-primary hover:bg-primary/5 transition-all shadow-sm group" onClick={() => handleConfirmConvert('active_contract')}>
                    <File className="h-8 w-8 text-purple-500 group-hover:scale-110 transition-transform" />
                    <div className="text-center">
                        <p className="font-bold text-sm">Contrato Fixo</p>
                        <p className="text-[10px] text-muted-foreground">Mensalista recorrente</p>
                    </div>
                </Button>
            </div>
            <AlertDialogFooter className="pt-4">
                <AlertDialogCancel onClick={() => setConvertingCustomer(null)}>Voltar</AlertDialogCancel>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>

    <Dialog open={notificationState.isOpen} onOpenChange={(open) => setNotificationState(prev => ({ ...prev, isOpen: open }))}>
        <DialogContent className="sm:max-w-md" onOpenAutoFocus={(e) => e.preventDefault()} onCloseAutoFocus={(e) => e.preventDefault()}>
            <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                    {notificationState.isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : (notificationState.isSimulated ? <AlertTriangle className="h-5 w-5 text-yellow-500" /> : <CheckCircle2 className="h-5 w-5 text-green-500" />)}
                    {notificationState.isLoading ? 'Processando Lembrete' : (notificationState.isSimulated ? 'Enviar WhatsApp Manual' : 'Lembrete Enviado!')}
                </DialogTitle>
                <DialogDescription>
                    {notificationState.isLoading ? 'Aguarde um momento enquanto preparamos os dados.' : (notificationState.isSimulated ? 'A integração automática está pendente. Use o botão abaixo para enviar via WhatsApp Web.' : 'O lembrete de retorno foi enviado com sucesso para o cliente.')}
                </DialogDescription>
            </DialogHeader>
            {notificationState.isLoading ? ( 
                <div className="py-12 flex justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary opacity-50" /></div> 
            ) : ( 
                <ScrollArea className="max-h-[50vh] pr-4 mt-2">
                    <div className="space-y-4 py-2">
                        {notificationState.details.map((detail, idx) => { 
                            const isSent = sentMessageIndexes.includes(idx); 
                            return ( 
                                <div key={idx} className="flex flex-col gap-3 p-4 border rounded-xl bg-muted/20">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-bold">{detail.name}</span>
                                        <Badge variant="outline" className="text-[9px] uppercase font-extrabold tracking-widest px-2 py-0 border-primary/20 text-primary">Ação: Retorno</Badge>
                                    </div>
                                    <div className="text-[11px] text-muted-foreground leading-relaxed italic border-l-2 pl-3 border-muted-foreground/30">"{detail.message}"</div>
                                    <Button size="sm" variant={isSent ? "outline" : "default"} className={cn("w-full h-10 gap-2 font-bold shadow-sm", isSent && "text-green-600 border-green-600/30 bg-green-600/5")} onClick={() => sendManualWhatsApp(detail, idx)}>
                                        {isSent ? <Check className="h-4 w-4" /> : <Send className="h-4 w-4" />}
                                        {isSent ? 'Mensagem Visualizada' : 'Enviar via WhatsApp'}
                                    </Button>
                                </div> 
                            ); 
                        })}
                    </div>
                </ScrollArea> 
            )}
            <DialogFooter className="pt-4 border-t">
                <Button variant="outline" onClick={() => setNotificationState(prev => ({ ...prev, isOpen: false }))} className="w-full h-10">Fechar Janela</Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
    </>
  );
}
