"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import {
  File,
  ListFilter,
  MoreHorizontal,
  PlusCircle,
  Search,
  Users,
  Loader2,
} from "lucide-react";
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
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { consultarCnpjAction } from "@/app/actions";

// Mock data for customers
const customers = [
  {
    name: "Tech Solutions Ltda.",
    email: "contato@techsolutions.com.br",
    status: "active",
    responsible: "Ana Silva",
    potential: "high",
    lastContact: "2024-07-22",
    type: "active_contract",
  },
  {
    name: "Inova Corp S.A.",
    email: "suporte@inovacorp.com",
    status: "active",
    responsible: "Carlos Pereira",
    potential: "medium",
    lastContact: "2024-07-20",
    type: "active_contract",
  },
  {
    name: "Mercado Central",
    email: "compras@mercadocentral.com",
    status: "inactive",
    responsible: "Ana Silva",
    potential: "low",
    lastContact: "2024-05-15",
    type: "one_time",
  },
  {
    name: "ConstruBem Materiais",
    email: "vendas@construbem.com.br",
    status: "new",
    responsible: "Juliana Costa",
    potential: "high",
    lastContact: "2024-07-23",
    type: "one_time",
  },
  {
    name: "AgroForte Distribuidora",
    email: "agroforte@distribuidora.com",
    status: "active",
    responsible: "Carlos Pereira",
    potential: "medium",
    lastContact: "2024-07-18",
    type: "active_contract",
  },
];

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
  email: z.string().email("E-mail inválido."),
  telefone: z.string().optional(),
  inscricaoEstadual: z.string().optional(),
  tipoCliente: z.boolean().default(false), // false = Avulso, true = Contrato Ativo
});


export default function ClientesPage() {
  const [isCnpjLoading, setIsCnpjLoading] = useState(false);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      cnpj: "",
      razaoSocial: "",
      nomeFantasia: "",
      email: "",
      telefone: "",
      inscricaoEstadual: "",
      tipoCliente: false,
    },
  });

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

    setIsCnpjLoading(true);
    const response = await consultarCnpjAction({ cnpj });
    setIsCnpjLoading(false);

    if (response.error) {
      toast({
        variant: "destructive",
        title: "Erro na Consulta",
        description: response.error,
      });
    } else if (response.success) {
      const { razaoSocial, nomeFantasia, email, telefone, inscricaoEstadual } = response.success;
      form.setValue("razaoSocial", razaoSocial);
      form.setValue("nomeFantasia", nomeFantasia || "");
      form.setValue("email", email);
      form.setValue("telefone", telefone);
      form.setValue("inscricaoEstadual", inscricaoEstadual);
      toast({
        title: "CNPJ Consultado!",
        description: "Os dados da empresa foram preenchidos.",
      });
    }
  };

  function onSubmit(values: z.infer<typeof formSchema>) {
    // Handle form submission logic here
    console.log(values);
    // You would typically save the customer data to your backend here
    toast({
        title: "Cliente Salvo!",
        description: `${values.razaoSocial} foi cadastrado com sucesso.`
    })
  }

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight font-headline">
          Gestão de Clientes
        </h2>
      </div>
      <Tabs defaultValue="all">
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
                <DropdownMenuCheckboxItem checked>
                  Status
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem>Responsável</DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem>
                  Potencial de Venda
                </DropdownMenuCheckboxItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button size="sm" variant="outline" className="h-8 gap-1">
              <File className="h-3.5 w-3.5" />
              <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                Importar
              </span>
            </Button>
            <Dialog>
              <DialogTrigger asChild>
                <Button size="sm" className="h-8 gap-1">
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
                      <DialogTitle>Cadastrar Novo Cliente</DialogTitle>
                      <DialogDescription>
                        Preencha os dados abaixo para adicionar um novo cliente.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-2 py-4">
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
                      <Button type="submit">Salvar Cliente</Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
        <TabsContent value="all">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                <span>Todos os Clientes</span>
              </CardTitle>
              <CardDescription>
                Gerencie seus clientes e visualize seus históricos.
              </CardDescription>
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Buscar cliente..." className="pl-8" />
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
                    <TableHead>
                      <span className="sr-only">Ações</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customers.map((customer) => (
                    <TableRow key={customer.email}>
                      <TableCell>
                        <div className="font-medium">{customer.name}</div>
                        <div className="hidden text-sm text-muted-foreground md:inline">
                          {customer.email}
                        </div>
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
                        {new Date(customer.lastContact).toLocaleDateString('pt-BR')}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              aria-haspopup="true"
                              size="icon"
                              variant="ghost"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">Toggle menu</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Ações</DropdownMenuLabel>
                            <DropdownMenuItem>Editar</DropdownMenuItem>
                            <DropdownMenuItem>Ver Histórico</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive">
                              Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
            <CardFooter>
              <div className="text-xs text-muted-foreground">
                Mostrando <strong>1-5</strong> de <strong>{customers.length}</strong> clientes
              </div>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
