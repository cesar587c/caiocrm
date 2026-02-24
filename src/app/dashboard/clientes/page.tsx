

"use client";

import { useState, useMemo } from "react";
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
} from "lucide-react";
import { addDays, format, subDays, startOfMonth, endOfMonth, startOfDay, endOfDay } from "date-fns";
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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useSettings } from "@/contexts/SettingsContext";
import type { Customer } from "@/lib/types";

const statusMap: Record<string, string> = {
  active: "Ativo",
  inactive: "Inativo",
  new: "Novo",
};

const potentialMap: Record<string, string> = {
  high: "Alto",
  medium: "Médio",
  low: "Baixo",
};

const formSchema = z.object({
  cnpj: z.string().optional(),
  razaoSocial: z.string().min(1, "Razão Social é obrigatória."),
  nomeFantasia: z.string().optional(),
  contactName: z.string().optional(),
  email: z.string().email({ message: "E-mail inválido." }).optional().or(z.literal('')),
  telefone: z.string().optional(),
  inscricaoEstadual: z.string().optional(),
  tipoCliente: z.boolean().default(false), // false = Avulso, true = Contrato Ativo
}).refine((data) => !!data.email || !!data.telefone, {
    message: "É obrigatório informar um e-mail ou telefone.",
    path: ["telefone"],
});


export default function ClientesPage() {
  const { customers, addCustomer, updateCustomer, deleteCustomer } = useSettings();
  const [isCnpjLoading, setIsCnpjLoading] = useState(false);
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [deletingCustomer, setDeletingCustomer] = useState<Customer | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [showInactive, setShowInactive] = useState(false);
  const [date, setDate] = useState<DateRange | undefined>(undefined);

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
      tipoCliente: false,
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
        filtered = filtered.filter(c => c.status === 'inactive');
    } else {
        switch (activeTab) {
            case 'all':
                filtered = filtered.filter(c => c.status !== 'inactive');
                break;
            case 'active_contract':
                filtered = filtered.filter(c => c.type === 'active_contract');
                break;
            case 'one_time':
                filtered = filtered.filter(c => c.type === 'one_time');
                break;
            case 'new':
                filtered = filtered.filter(c => c.status === 'new');
                break;
            default:
                filtered = filtered.filter(c => c.status !== 'inactive');
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
        form.setValue("nomeFantasia", data.nome_fantasia || "");
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
      tipoCliente: false,
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
        tipoCliente: customer.type === "active_contract",
        cnpj: '', 
        telefone: customer.telefone || '',
        inscricaoEstadual: '',
    });
    setIsFormDialogOpen(true);
  };
  
  const handleViewHistoryClick = (customer: Customer) => {
    toast({
      title: "Histórico do Cliente",
      description: `Funcionalidade para exibir o histórico de ${customer.name} será implementada.`,
    });
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
  
  function onSubmit(values: z.infer<typeof formSchema>) {
    if (editingCustomer) {
      updateCustomer({
        ...editingCustomer,
        name: values.razaoSocial,
        nomeFantasia: values.nomeFantasia,
        contactName: values.contactName,
        email: values.email || '',
        telefone: values.telefone,
        type: values.tipoCliente ? "active_contract" : "one_time",
      });
      toast({
        title: "Cliente Atualizado!",
        description: `Os dados de ${values.razaoSocial} foram atualizados com sucesso.`,
      });
    } else {
      const existingCustomer = customers.find(
        (c) => c.email && values.email && c.email.toLowerCase() === values.email.toLowerCase()
      );
      if (existingCustomer) {
        toast({
          variant: "destructive",
          title: "Cliente já cadastrado",
          description: `Um cliente com o e-mail ${values.email} já existe.`,
        });
        return;
      }
      
      const newCustomerData: Omit<Customer, 'id'> = {
        name: values.razaoSocial,
        nomeFantasia: values.nomeFantasia,
        contactName: values.contactName,
        email: values.email || '',
        telefone: values.telefone,
        status: "new",
        responsible: "Admin",
        potential: "medium",
        lastContact: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        type: values.tipoCliente ? "active_contract" : "one_time",
      };
      addCustomer(newCustomerData);
      toast({
        title: "Cliente Salvo!",
        description: `${values.razaoSocial} foi cadastrado com sucesso.`,
      });
    }
    setIsFormDialogOpen(false);
    setEditingCustomer(null);
  }

  return (
    <>
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight font-headline">
          Gestão de Clientes
        </h2>
      </div>
      <Tabs defaultValue="all" onValueChange={(value) => {
          setActiveTab(value);
          setShowInactive(false);
      }}>
        <div className="flex items-center">
          <TabsList>
            <TabsTrigger value="all">Todos</TabsTrigger>
            <TabsTrigger value="active_contract">Contratos Ativos</TabsTrigger>
            <TabsTrigger value="one_time">Clientes Avulsos</TabsTrigger>
            <TabsTrigger value="new">Novos</TabsTrigger>
          </TabsList>
          <div className="ml-auto flex items-center gap-2">
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
                  Mostrar Somente Inativos
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
                <DropdownMenuItem
                  onSelect={() =>
                    setDate({ from: subDays(new Date(), 7), to: new Date() })
                  }
                >
                  Últimos 7 dias
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() =>
                    setDate({ from: subDays(new Date(), 15), to: new Date() })
                  }
                >
                  Últimos 15 dias
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() =>
                    setDate({ from: subDays(new Date(), 30), to: new Date() })
                  }
                >
                  Últimos 30 dias
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() =>
                    setDate({ from: startOfMonth(new Date()), to: new Date() })
                  }
                >
                  Este mês
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => setDate(undefined)}>
                  Limpar filtro de data
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button size="sm" variant="outline" className="h-8 gap-1">
              <File className="h-3.5 w-3.5" />
              <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                Importar
              </span>
            </Button>
            <Dialog open={isFormDialogOpen} onOpenChange={setIsFormDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="h-8 gap-1" onClick={handleAddNewClick}>
                  <PlusCircle className="h-3.5 w-3.5" />
                  <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                    Novo Cliente
                  </span>
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[625px]">
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)}>
                    <DialogHeader>
                      <DialogTitle>{editingCustomer ? 'Editar Cliente' : 'Cadastrar Novo Cliente'}</DialogTitle>
                      <DialogDescription>
                        {editingCustomer ? 'Altere os dados abaixo para atualizar o cliente.' : 'Preencha os dados abaixo para adicionar um novo cliente.'}
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-2 py-4 max-h-[60vh] overflow-y-auto -mx-6 px-6">
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
                                <span className="ml-2 hidden sm:inline">Consultar</span>
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
                                placeholder="Pessoa de contato na empresa"
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
                       <FormField
                        control={form.control}
                        name="inscricaoEstadual"
                        render={({ field }) => (
                           <FormItem className="grid grid-cols-4 items-center gap-4">
                            <FormLabel className="text-right">Inscrição Estadual</FormLabel>
                            <FormControl>
                            <Input
                              placeholder="Número da inscrição"
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
                        name="tipoCliente"
                        render={({ field }) => (
                          <FormItem className="grid grid-cols-4 items-center gap-4">
                              <FormLabel className="text-right">Tipo de Cliente</FormLabel>
                              <div className="col-span-3 flex items-center space-x-2">
                                <FormLabel htmlFor="tipo_cliente_avulso">Cliente Avulso</FormLabel>
                                <FormControl>
                                    <Switch
                                        id="tipo_cliente_switch"
                                        checked={field.value}
                                        onCheckedChange={field.onChange}
                                    />
                                </FormControl>
                                <FormLabel htmlFor="tipo_cliente_contrato">Contrato Ativo</FormLabel>
                              </div>
                              <div className="col-start-2 col-span-3">
                               <FormMessage />
                            </div>
                          </FormItem>
                        )}
                      />
                    </div>
                    <DialogFooter>
                      {editingCustomer && (
                          <>
                          <Button
                              type="button"
                              variant="destructive"
                              className="mr-auto"
                              onClick={() => {
                                  setIsFormDialogOpen(false);
                                  handleDeleteClick(editingCustomer);
                              }}
                              >
                              Excluir
                          </Button>
                          <Button type="button" variant="secondary" onClick={() => handleViewHistoryClick(editingCustomer)}>Ver Histórico</Button>
                          </>
                      )}
                      <Button type="submit">{editingCustomer ? 'Salvar Alterações' : 'Salvar Cliente'}</Button>
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
                <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    <span>Todos os Clientes</span>
                </CardTitle>
                <CardDescription>
                    Gerencie seus clientes e visualize seus históricos. Clique em um cliente para editar.
                </CardDescription>
                    <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Buscar cliente..." className="pl-8" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                    </div>
                </CardHeader>
                <CardContent>
                <Table>
                    <TableHeader>
                    <TableRow>
                        <TableHead>Cliente</TableHead>
                        <TableHead className="hidden sm:table-cell">
                        Status
                        </TableHead>
                        <TableHead className="hidden md:table-cell">
                        Responsável
                        </TableHead>
                        <TableHead className="hidden md:table-cell">
                        Potencial
                        </TableHead>
                        <TableHead className="hidden lg:table-cell">
                        Último Contato
                        </TableHead>
                    </TableRow>
                    </TableHeader>
                    <TableBody>
                    {displayedCustomers.map((customer) => (
                        <TableRow key={customer.id} onClick={() => handleEditClick(customer)} className="cursor-pointer">
                        <TableCell>
                            <div className="font-medium">{customer.name}</div>
                            {customer.nomeFantasia && (
                                <div className="text-sm text-muted-foreground">{customer.nomeFantasia}</div>
                            )}
                            <div className="hidden text-sm text-muted-foreground md:inline">
                            {customer.email}
                            </div>
                            {customer.contactName && (
                                <div className="text-sm text-muted-foreground flex items-center gap-1.5 pt-1">
                                    <User className="h-3.5 w-3.5" />
                                    <span>{customer.contactName}</span>
                                </div>
                            )}
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                            <Badge variant={customer.status === 'active' ? 'default' : customer.status === 'new' ? 'secondary' : 'outline'}>
                                {statusMap[customer.status]}
                            </Badge>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                            {customer.responsible}
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                            <Badge variant={customer.potential === 'high' ? 'destructive' : customer.potential === 'medium' ? 'secondary' : 'outline'} className="capitalize">
                                {potentialMap[customer.potential]}
                            </Badge>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                            {new Date(customer.lastContact).toLocaleDateString("pt-BR", {timeZone: 'UTC'})}
                        </TableCell>
                        </TableRow>
                    ))}
                    </TableBody>
                </Table>
                </CardContent>
                <CardFooter>
                <div className="text-xs text-muted-foreground">
                    Mostrando <strong>{displayedCustomers.length}</strong> de <strong>{customers.length}</strong> clientes
                </div>
                </CardFooter>
            </Card>
        </TabsContent>
        <TabsContent value="active_contract" forceMount className="mt-4"><Card><CardHeader><CardTitle>Conteúdo Contratos Ativos</CardTitle></CardHeader><CardContent><p>O mesmo componente de tabela será renderizado aqui com os dados filtrados.</p></CardContent></Card></TabsContent>
        <TabsContent value="one_time" forceMount className="mt-4"><Card><CardHeader><CardTitle>Conteúdo Clientes Avulsos</CardTitle></CardHeader><CardContent><p>O mesmo componente de tabela será renderizado aqui com os dados filtrados.</p></CardContent></Card></TabsContent>
        <TabsContent value="new" forceMount className="mt-4"><Card><CardHeader><CardTitle>Conteúdo Novos</CardTitle></CardHeader><CardContent><p>O mesmo componente de tabela será renderizado aqui com os dados filtrados.</p></CardContent></Card></TabsContent>

      </Tabs>
    </div>

    <AlertDialog open={!!deletingCustomer} onOpenChange={(open) => !open && setDeletingCustomer(null)}>
        <AlertDialogContent onOpenAutoFocus={(e) => e.preventDefault()}>
            <AlertDialogHeader>
            <AlertDialogTitle>Você tem certeza absoluta?</AlertDialogTitle>
            <AlertDialogDescription>
                Essa ação não pode ser desfeita. Isso excluirá permanentemente o
                cliente <span className="font-semibold">{deletingCustomer?.name}</span> e removerá seus dados de nossos servidores.
            </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteAction}>Confirmar</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
    </>
  );
}

    
