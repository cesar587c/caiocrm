"use client";

import { useState, useMemo, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
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
  AlertCircle
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

const statusMap: Record<string, string> = {
  active: "Ativo",
  inactive: "Inativo",
  new: "Novo",
  lead: "Lead",
  discarded: "Descartado",
};

const formSchema = z.object({
  cnpj: z.string().optional(),
  razaoSocial: z.string().min(1, "Razão Social é obrigatória."),
  nomeFantasia: z.string().min(1, "O Nome Fantasia é obrigatório."),
  contactName: z.string().optional(),
  email: z.string().email({ message: "E-mail inválido." }).optional().or(z.literal('')),
  telefone: z.string().optional(),
  inscricaoEstadual: z.string().optional(),
  isLead: z.boolean().default(false),
  tipoCliente: z.enum(["active_contract", "one_time"]).default("one_time"),
}).refine((data) => data.isLead || !!data.email || !!data.telefone, {
    message: "Para clientes, é obrigatório informar um e-mail ou telefone.",
    path: ["telefone"],
});


export default function ClientesPage() {
  const { customers, addCustomer, updateCustomer, deleteCustomer, currentUser } = useSettings();
  const [isCnpjLoading, setIsCnpjLoading] = useState(false);
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [deletingCustomer, setDeletingCustomer] = useState<Customer | null>(null);
  const [convertingCustomer, setConvertingCustomer] = useState<Customer | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [showInactive, setShowInactive] = useState(false);
  const [date, setDate] = useState<DateRange | undefined>(undefined);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { toast } = useToast();

  const formatPhoneNumber = (value: string) => {
    if (!value) return "";
    const cleaned = value.replace(/\D/g, "");
    const length = cleaned.length;

    if (length <= 2) return `(${cleaned}`;
    if (length <= 6) return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2)}`;
    if (length <= 10) return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 6)}-${cleaned.slice(6)}`;
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7, 11)}`;
  }
  
  const formatCnpj = (value: string) => {
    if (!value) return "";
    const cnpj = value.replace(/\D/g, "").slice(0, 14);

    if (cnpj.length > 12) {
      return `${cnpj.slice(0, 2)}.${cnpj.slice(2, 5)}.${cnpj.slice(5, 8)}/${cnpj.slice(8, 12)}-${cnpj.slice(12, 14)}`;
    }
    if (cnpj.length > 8) {
      return `${cnpj.slice(0, 2)}.${cnpj.slice(2, 5)}.${cnpj.slice(5, 8)}/${cnpj.slice(8)}`;
    }
    if (cnpj.length > 5) {
      return `${cnpj.slice(0, 2)}.${cnpj.slice(2, 5)}.${cnpj.slice(5)}`;
    }
    if (cnpj.length > 2) {
      return `${cnpj.slice(0, 2)}.${cnpj.slice(2)}`;
    }
    return cnpj;
  }

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      cnpj: "",
      razaoSocial: "",
      nomeFantasia: "",
      contactName: "",
      email: "",
      telefone: "",
      inscricaoEstadual: "",
      isLead: false,
      tipoCliente: "one_time",
    },
  });

  const displayedCustomers = useMemo(() => {
    const lowercasedSearchTerm = searchTerm.toLowerCase();

    let filtered = customers.filter(c =>
        searchTerm === "" ||
        c.name.toLowerCase().includes(lowercasedSearchTerm) ||
        (c.nomeFantasia && c.nomeFantasia.toLowerCase().includes(lowercasedSearchTerm)) ||
        (c.contactName && c.contactName.toLowerCase().includes(lowercasedSearchTerm)) ||
        c.email.toLowerCase().includes(lowercasedSearchTerm)
    );

    if (showInactive) {
        filtered = filtered.filter(c => c.status === 'inactive' || c.status === 'discarded');
    } else {
        switch (activeTab) {
            case 'all':
                filtered = filtered.filter(c => c.status !== 'inactive' && c.status !== 'discarded' && c.status !== 'lead');
                break;
            case 'active_contract':
                filtered = filtered.filter(c => c.type === 'active_contract' && c.status !== 'lead');
                break;
            case 'one_time':
                filtered = filtered.filter(c => c.type === 'one_time' && c.status !== 'lead');
                break;
            case 'leads':
                filtered = filtered.filter(c => c.status === 'lead');
                break;
            case 'new':
                filtered = filtered.filter(c => c.status === 'new');
                break;
            default:
                filtered = filtered.filter(c => c.status !== 'inactive' && c.status !== 'discarded');
        }
    }
    
    if (date?.from) {
      const fromDate = startOfDay(date.from);
      const toDate = endOfDay(date.to || date.from);
      filtered = filtered.filter(c => {
          const createdAt = new Date(c.createdAt);
          return createdAt >= fromDate && createdAt <= toDate;
      });
    }

    return filtered;

  }, [customers, searchTerm, activeTab, showInactive, date]);


  const handleCnpjLookup = async () => {
    const cnpj = form.getValues("cnpj");
    if (!cnpj) {
      toast({
        variant: "destructive",
        title: "CNPJ Inválido",
        description: "Por favor, insira um CNPJ para consultar.",
      });
      return;
    }

    const cleanedCnpj = cnpj.replace(/\D/g, "");
    if (cleanedCnpj.length !== 14) {
        toast({
            variant: "destructive",
            title: "CNPJ Inválido",
            description: "O CNPJ deve conter 14 dígitos.",
        });
        return;
    }

    setIsCnpjLoading(true);
    try {
        const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cleanedCnpj}`);
        
        if (!response.ok) {
            if (response.status === 404) {
                 throw new Error('CNPJ não encontrado na base de dados da BrasilAPI.');
            }
            const errorText = await response.text();
            console.error(`BrasilAPI request failed with status ${response.status}: ${errorText}`);
            throw new Error(`A consulta na BrasilAPI falhou: ${response.statusText}`);
        }

        const data = await response.json();
        
        const inscricaoEstadual = data.uf ? `Ativo em ${data.uf}` : 'Não informado';

        form.setValue("razaoSocial", data.razao_social || "");
        form.setValue("nomeFantasia", data.nome_fantasia || data.razao_social || "");
        form.setValue("email", data.email || "");
        form.setValue("telefone", data.ddd_telefone_1 || data.ddd_telefone_2 || "");
        form.setValue("inscricaoEstadual", inscricaoEstadual);
        toast({
            title: "CNPJ Consultado!",
            description: "Os dados da empresa foram preenchidos.",
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : "Falha ao consultar CNPJ.";
        toast({
            variant: "destructive",
            title: "Erro na Consulta",
            description: message,
        });
    } finally {
        setIsCnpjLoading(false);
    }
  };
  
  const handleAddNewClick = () => {
    setEditingCustomer(null);
    form.reset({
      cnpj: "",
      razaoSocial: "",
      nomeFantasia: "",
      contactName: "",
      email: "",
      telefone: "",
      inscricaoEstadual: "",
      isLead: false,
      tipoCliente: "one_time",
    });
    setIsFormDialogOpen(true);
  };

  const handleEditClick = (customer: Customer) => {
    setEditingCustomer(customer);
    form.reset({
        razaoSocial: customer.name,
        nomeFantasia: customer.nomeFantasia || "",
        contactName: customer.contactName || "",
        email: customer.email,
        isLead: customer.status === "lead",
        tipoCliente: customer.type === "active_contract" ? "active_contract" : "one_time",
        cnpj: '', 
        telefone: customer.telefone || '',
        inscricaoEstadual: '',
    });
    setIsFormDialogOpen(true);
  };
  
  const handleDiscardClick = (customer: Customer) => {
    updateCustomer({ ...customer, status: 'discarded' });
    toast({
        title: "Lead Descartado",
        description: `${customer.name} foi movido para inativos.`,
    });
  };

  const handleOpenConvertDialog = (customer: Customer) => {
    setConvertingCustomer(customer);
  };

  const handleConfirmConvert = (type: "active_contract" | "one_time") => {
    if (!convertingCustomer) return;
    updateCustomer({ ...convertingCustomer, status: 'new', type: type });
    toast({
        title: "Lead Convertido!",
        description: `${convertingCustomer.name} agora é um cliente.`,
    });
    setConvertingCustomer(null);
  };

  const handleDeleteClick = (customer: Customer) => {
    setDeletingCustomer(customer);
  };

  const confirmDeleteAction = () => {
    if (!deletingCustomer) return;
    deleteCustomer(deletingCustomer.id);
    toast({
      title: "Cliente Excluído",
      description: `${deletingCustomer.name} foi removido com sucesso.`,
    });
    setDeletingCustomer(null);
  };

  const handleImportCSV = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        const text = e.target?.result as string;
        if (!text) return;

        // Process CSV
        const lines = text.split(/\r?\n/);
        if (lines.length < 2) {
            toast({ variant: 'destructive', title: 'Arquivo Vazio', description: 'O arquivo CSV não possui dados suficientes.' });
            return;
        }

        const headers = lines[0].split(/[;,]/).map(h => h.trim().toLowerCase());
        const importedCustomers: Omit<Customer, 'id'>[] = [];

        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].split(/[;,]/);
            if (line.length < 1 || !line[0].trim()) continue;

            // Simple column mapping
            // Column 0: Razao Social, 1: Fantasia, 2: Contato, 3: Email, 4: Telefone, 5: Tipo
            const razaoSocial = line[0]?.trim() || '';
            const nomeFantasia = line[1]?.trim() || razaoSocial;
            const contactName = line[2]?.trim() || '';
            const email = line[3]?.trim() || '';
            const telefone = line[4]?.trim() || '';
            const tipoRaw = line[5]?.trim().toLowerCase() || '';

            let type: CustomerType = 'one_time';
            let status: CustomerStatus = 'new';

            if (tipoRaw.includes('contrato')) {
                type = 'active_contract';
            } else if (tipoRaw.includes('lead')) {
                type = 'lead';
                status = 'lead';
            }

            importedCustomers.push({
                name: razaoSocial,
                nomeFantasia,
                contactName,
                email,
                telefone,
                status,
                responsible: currentUser?.name || "Importador",
                potential: "medium",
                lastContact: new Date().toISOString(),
                createdAt: new Date().toISOString(),
                type,
            });
        }

        if (importedCustomers.length > 0) {
            importedCustomers.forEach(c => addCustomer(c));
            toast({
                title: "Importação Concluída!",
                description: `${importedCustomers.length} registros foram importados com sucesso.`,
            });
            setIsImportDialogOpen(false);
        } else {
             toast({ variant: 'destructive', title: 'Falha na Importação', description: 'Nenhum dado válido encontrado no arquivo.' });
        }
    };
    reader.readAsText(file);
    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };
  
  function onSubmit(values: z.infer<typeof formSchema>) {
    if (editingCustomer) {
      updateCustomer({
        ...editingCustomer,
        name: values.razaoSocial,
        nomeFantasia: values.nomeFantasia,
        contactName: values.contactName,
        email: values.email || '',
        telefone: values.telefone,
        status: values.isLead ? "lead" : (editingCustomer.status === "lead" ? "new" : editingCustomer.status),
        type: values.isLead ? "lead" : (values.tipoCliente as CustomerType),
      });
      toast({
        title: "Dados Atualizados!",
        description: `Os dados de ${values.razaoSocial} foram salvos.`,
      });
    } else {
      const existingCustomer = customers.find(
        (c) => c.email && values.email && c.email.toLowerCase() === values.email.toLowerCase()
      );
      if (existingCustomer) {
        toast({
          variant: "destructive",
          title: "E-mail já cadastrado",
          description: `Um registro com o e-mail ${values.email} já existe.`,
        });
        return;
      }
      
      const newCustomerData: Omit<Customer, 'id'> = {
        name: values.razaoSocial,
        nomeFantasia: values.nomeFantasia,
        contactName: values.contactName,
        email: values.email || '',
        telefone: values.telefone,
        status: values.isLead ? "lead" : "new",
        responsible: currentUser?.name || "Admin",
        potential: "medium",
        lastContact: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        type: values.isLead ? "lead" : (values.tipoCliente as CustomerType),
      };
      addCustomer(newCustomerData);
      toast({
        title: values.isLead ? "Lead Cadastrado!" : "Cliente Salvo!",
        description: `${values.razaoSocial} foi adicionado à base.`,
      });
    }
    setIsFormDialogOpen(false);
    setEditingCustomer(null);
  }

  const isLead = form.watch("isLead");

  return (
    <>
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight font-headline">
          Gestão de Clientes e Leads
        </h2>
      </div>
      <Tabs defaultValue="all" onValueChange={(value) => {
          setActiveTab(value);
          setShowInactive(false);
      }}>
        <div className="flex items-center">
          <TabsList>
            <TabsTrigger value="all">Clientes</TabsTrigger>
            <TabsTrigger value="active_contract">Contratos Ativos</TabsTrigger>
            <TabsTrigger value="one_time">Avulsos</TabsTrigger>
            <TabsTrigger value="leads">Leads</TabsTrigger>
            <TabsTrigger value="new">Novos</TabsTrigger>
          </TabsList>
          <div className="ml-auto flex items-center gap-2">
            <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 gap-1">
                  <Upload className="h-3.5 w-3.5" />
                  <span>Importar CSV</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Importar Clientes via CSV</DialogTitle>
                  <DialogDescription>
                    Selecione um arquivo CSV com seus clientes para importar em massa.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <Alert variant="default" className="bg-primary/5 border-primary/20">
                    <FileSpreadsheet className="h-4 w-4 text-primary" />
                    <AlertTitle>Formato do Arquivo</AlertTitle>
                    <AlertDescription className="text-xs">
                      O arquivo deve conter as colunas: <strong>Razão Social, Nome Fantasia, Contato, E-mail, Telefone, Tipo</strong>. 
                      O separador pode ser vírgula (,) ou ponto e vírgula (;).
                    </AlertDescription>
                  </Alert>
                  <div className="flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-10 hover:bg-muted/50 cursor-pointer transition-colors" onClick={() => fileInputRef.current?.click()}>
                    <Upload className="h-10 w-10 text-muted-foreground mb-2" />
                    <p className="text-sm font-medium">Clique para selecionar seu arquivo CSV</p>
                    <p className="text-xs text-muted-foreground mt-1">Tamanho máximo: 5MB</p>
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      className="hidden" 
                      accept=".csv" 
                      onChange={handleImportCSV} 
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="ghost" onClick={() => setIsImportDialogOpen(false)}>Cancelar</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 gap-1">
                  <ListFilter className="h-3.5 w-3.5" />
                  <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                    Filtrar
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Filtrar por</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuCheckboxItem
                    checked={showInactive}
                    onCheckedChange={setShowInactive}
                >
                  Mostrar Inativos / Descartados
                </DropdownMenuCheckboxItem>
                <DropdownMenuSeparator />
                <DropdownMenuLabel>Data de Cadastro</DropdownMenuLabel>
                <div className="px-2 py-1.5">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        id="date"
                        variant={"outline"}
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !date && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {date?.from ? (
                          date.to ? (
                            <>
                              {format(date.from, "dd/MM/y")} -{" "}
                              {format(date.to, "dd/MM/y")}
                            </>
                          ) : (
                            format(date.from, "dd/MM/y")
                          )
                        ) : (
                          <span>Selecione um intervalo</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        initialFocus
                        mode="range"
                        defaultMonth={date?.from}
                        selected={date}
                        onSelect={setDate}
                        numberOfMonths={2}
                        locale={ptBR}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => setDate(undefined)}>
                  Limpar filtro de data
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Dialog open={isFormDialogOpen} onOpenChange={setIsFormDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="h-8 gap-1" onClick={handleAddNewClick}>
                  <PlusCircle className="h-3.5 w-3.5" />
                  <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                    Novo Registro
                  </span>
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[625px]">
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)}>
                    <DialogHeader>
                      <DialogTitle>{editingCustomer ? 'Editar Registro' : 'Cadastrar Novo'}</DialogTitle>
                      <DialogDescription>
                        {editingCustomer ? 'Altere os dados abaixo para atualizar.' : 'Preencha os dados abaixo para adicionar um novo lead ou cliente.'}
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-2 py-4 max-h-[60vh] overflow-y-auto -mx-6 px-6">
                        <FormField
                            control={form.control}
                            name="isLead"
                            render={({ field }) => (
                            <FormItem className="grid grid-cols-4 items-center gap-4 bg-primary/5 p-4 rounded-lg mb-4">
                                <FormLabel className="text-right">Tipo de Registro</FormLabel>
                                <div className="col-span-3 flex items-center space-x-2">
                                    <span className={cn("text-sm font-medium", !field.value && "text-primary")}>Cliente</span>
                                    <FormControl>
                                        <Switch
                                            checked={field.value}
                                            onCheckedChange={field.onChange}
                                        />
                                    </FormControl>
                                    <span className={cn("text-sm font-medium", field.value && "text-primary")}>Lead</span>
                                </div>
                                <FormDescription className="col-start-2 col-span-3">
                                    {field.value ? "Leads são prospecções que ainda não fecharam negócio." : "Clientes já possuem relacionamento comercial."}
                                </FormDescription>
                            </FormItem>
                            )}
                        />

                       <FormField
                        control={form.control}
                        name="cnpj"
                        render={({ field }) => (
                          <FormItem className="grid grid-cols-4 items-center gap-4">
                            <FormLabel className="text-right">CNPJ</FormLabel>
                            <div className="col-span-3 flex items-center gap-2">
                              <FormControl>
                                <Input
                                  placeholder="00.000.000/0000-00"
                                  className="flex-1"
                                  {...field}
                                  onChange={(e) => field.onChange(formatCnpj(e.target.value))}
                                />
                              </FormControl>
                              <Button type="button" variant="secondary" onClick={handleCnpjLookup} disabled={isCnpjLoading}>
                                {isCnpjLoading ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Search className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                             <div className="col-start-2 col-span-3">
                               <FormMessage />
                            </div>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="razaoSocial"
                        render={({ field }) => (
                          <FormItem className="grid grid-cols-4 items-center gap-4">
                            <FormLabel className="text-right">Razão Social</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Nome da empresa"
                                className="col-span-3"
                                {...field}
                              />
                            </FormControl>
                             <div className="col-start-2 col-span-3">
                               <FormMessage />
                            </div>
                          </FormItem>
                        )}
                      />
                       <FormField
                        control={form.control}
                        name="nomeFantasia"
                        render={({ field }) => (
                          <FormItem className="grid grid-cols-4 items-center gap-4">
                            <FormLabel className="text-right">Nome Fantasia</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Nome popular da empresa"
                                className="col-span-3"
                                {...field}
                              />
                             </FormControl>
                             <div className="col-start-2 col-span-3">
                               <FormMessage />
                            </div>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="contactName"
                        render={({ field }) => (
                           <FormItem className="grid grid-cols-4 items-center gap-4">
                            <FormLabel className="text-right">Nome do Contato</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Pessoa de contato"
                                className="col-span-3"
                                {...field}
                                value={field.value || ''}
                              />
                            </FormControl>
                             <div className="col-start-2 col-span-3">
                               <FormMessage />
                            </div>
                          </FormItem>
                        )}
                      />
                       <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem className="grid grid-cols-4 items-center gap-4">
                            <FormLabel className="text-right">E-mail</FormLabel>
                             <FormControl>
                              <Input
                                type="email"
                                placeholder="contato@empresa.com"
                                className="col-span-3"
                                {...field}
                              />
                            </FormControl>
                             <div className="col-start-2 col-span-3">
                               <FormMessage />
                            </div>
                          </FormItem>
                        )}
                      />
                       <FormField
                        control={form.control}
                        name="telefone"
                        render={({ field }) => (
                          <FormItem className="grid grid-cols-4 items-center gap-4">
                            <FormLabel className="text-right">Telefone</FormLabel>
                            <FormControl>
                            <Input
                              placeholder="(00) 00000-0000"
                              className="col-span-3"
                              {...field}
                              onChange={(e) => field.onChange(formatPhoneNumber(e.target.value))}
                              value={field.value || ''}
                            />
                            </FormControl>
                             <div className="col-start-2 col-span-3">
                               <FormMessage />
                            </div>
                          </FormItem>
                        )}
                      />
                       {!isLead && (
                         <FormField
                            control={form.control}
                            name="tipoCliente"
                            render={({ field }) => (
                            <FormItem className="grid grid-cols-4 items-center gap-4">
                                <FormLabel className="text-right">Tipo de Cliente</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value} defaultValue={field.value}>
                                    <FormControl>
                                    <SelectTrigger className="col-span-3">
                                        <SelectValue placeholder="Selecione o tipo" />
                                    </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        <SelectItem value="active_contract">Contrato Ativo</SelectItem>
                                        <SelectItem value="one_time">Cliente Avulso</SelectItem>
                                    </SelectContent>
                                </Select>
                                <div className="col-start-2 col-span-3">
                                <FormMessage />
                                </div>
                            </FormItem>
                            )}
                        />
                       )}
                    </div>
                    <DialogFooter>
                      {editingCustomer && (
                          <Button
                              type="button"
                              variant="destructive"
                              className="mr-auto"
                              onClick={() => {
                                  setIsFormDialogOpen(false);
                                  handleDeleteClick(editingCustomer);
                              }}
                              >
                              Excluir permanentemente
                          </Button>
                      )}
                      <Button type="submit">{editingCustomer ? 'Salvar Alterações' : 'Cadastrar'}</Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
        <TabsContent value={activeTab} forceMount className="mt-4">
            <Card>
                <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    {activeTab === 'leads' ? <UserPlus className="h-5 w-5" /> : <Users className="h-5 w-5" />}
                    <span>{activeTab === 'leads' ? 'Prospecções e Leads' : 'Lista de Clientes'}</span>
                </CardTitle>
                <CardDescription>
                    {activeTab === 'leads' 
                        ? 'Leads identificados que aguardam conversão.' 
                        : 'Sua base de clientes ativos e recorrentes.'}
                </CardDescription>
                    <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Buscar por nome, fantasia ou e-mail..." className="pl-8" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                    </div>
                </CardHeader>
                <CardContent>
                <Table>
                    <TableHeader>
                    <TableRow>
                        <TableHead>Nome / Contato</TableHead>
                        <TableHead className="hidden sm:table-cell">Status</TableHead>
                        <TableHead className="hidden md:table-cell">Responsável</TableHead>
                        <TableHead className="hidden lg:table-cell">Cadastro</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                    </TableHeader>
                    <TableBody>
                    {displayedCustomers.length > 0 ? (
                        displayedCustomers.map((customer) => (
                        <TableRow key={customer.id} onClick={() => handleEditClick(customer)} className="cursor-pointer">
                        <TableCell>
                            <div className="font-medium">{customer.name}</div>
                            <div className="text-xs text-muted-foreground">{customer.email}</div>
                            {customer.contactName && (
                                <div className="text-xs text-muted-foreground flex items-center gap-1.5 pt-1">
                                    <User className="h-3 w-3" />
                                    <span>{customer.contactName}</span>
                                </div>
                            )}
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                            <Badge variant={
                                customer.status === 'active' ? 'default' : 
                                customer.status === 'lead' ? 'secondary' : 
                                customer.status === 'new' ? 'outline' : 'destructive'
                            }>
                                {statusMap[customer.status]}
                            </Badge>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                            {customer.responsible}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                            {format(new Date(customer.createdAt), "dd/MM/yyyy", { locale: ptBR })}
                        </TableCell>
                        <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                                {customer.status === 'lead' && (
                                    <>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-green-500" onClick={(e) => { e.stopPropagation(); handleOpenConvertDialog(customer); }}>
                                            <UserCheck className="h-4 w-4" />
                                        </Button>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={(e) => { e.stopPropagation(); handleDiscardClick(customer); }}>
                                            <UserX className="h-4 w-4" />
                                        </Button>
                                    </>
                                )}
                            </div>
                        </TableCell>
                        </TableRow>
                    ))
                    ) : (
                        <TableRow>
                            <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                                <div className="flex flex-col items-center justify-center">
                                    <Users className="h-8 w-8 mb-2 opacity-20" />
                                    <p>Nenhum cliente encontrado.</p>
                                    <p className="text-xs">Cadastre um novo ou importe via CSV.</p>
                                </div>
                            </TableCell>
                        </TableRow>
                    )}
                    </TableBody>
                </Table>
                </CardContent>
                <CardFooter>
                <div className="text-xs text-muted-foreground">
                    Mostrando <strong>{displayedCustomers.length}</strong> registros
                </div>
                </CardFooter>
            </Card>
        </TabsContent>
      </Tabs>
    </div>

    <AlertDialog open={!!deletingCustomer} onOpenChange={(open) => !open && setDeletingCustomer(null)}>
        <AlertDialogContent onOpenAutoFocus={(e) => e.preventDefault()}>
            <AlertDialogHeader>
            <AlertDialogTitle>Excluir permanentemente?</AlertDialogTitle>
            <AlertDialogDescription>
                Essa ação não pode ser desfeita. Isso excluirá permanentemente os dados de <span className="font-semibold">{deletingCustomer?.name}</span>.
            </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteAction}>Confirmar Exclusão</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>

    <AlertDialog open={!!convertingCustomer} onOpenChange={(open) => !open && setConvertingCustomer(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Converter Lead em Cliente</AlertDialogTitle>
                <AlertDialogDescription>
                    Como você deseja cadastrar <span className="font-medium">{convertingCustomer?.name}</span>?
                </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="grid grid-cols-2 gap-4 py-4">
                <Button variant="outline" className="h-auto flex-col gap-2 p-4" onClick={() => handleConfirmConvert('one_time')}>
                    <Users className="h-6 w-6" />
                    <span>Cliente Avulso</span>
                </Button>
                <Button variant="outline" className="h-auto flex-col gap-2 p-4" onClick={() => handleConfirmConvert('active_contract')}>
                    <File className="h-6 w-6" />
                    <span>Contrato Ativo</span>
                </Button>
            </div>
            <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
