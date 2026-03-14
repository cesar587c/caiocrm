
'use client';

import React, { useEffect, useRef, useState, useMemo } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useSettings } from '@/contexts/SettingsContext';
import { Settings, Loader2, UploadCloud, Link as LinkIcon, Trash2, ShieldAlert, DatabaseBackup, Lock, ShieldCheck, Users } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import type { Sector, UserRole } from '@/lib/types';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { MENU_ITEMS } from '@/components/layout/sidebar';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const formSchema = z.object({
  name: z.string().min(1, 'O nome da empresa é obrigatório.'),
  email: z.string().email('E-mail inválido.'),
  phone: z.string().min(1, 'O telefone é obrigatório.'),
  address: z.string().min(1, 'O endereço é obrigatório.'),
  logoUrl: z.string().optional(),
  whatsappReminderMessage: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

const roles: { id: UserRole; label: string }[] = [
    { id: 'admin', label: 'Administrador' },
    { id: 'technician', label: 'Técnico' },
    { id: 'finance', label: 'Financeiro' },
    { id: 'service', label: 'Atendimento' },
];

export default function ConfiguracoesPage() {
  const { toast } = useToast();
  const { 
    companyProfile, 
    setCompanyProfile, 
    sectors, 
    addSector, 
    deleteSector, 
    clearAllData, 
    isLoaded, 
    rolePermissions, 
    updateRolePermissions,
    users 
  } = useSettings();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [newSectorName, setNewSectorName] = useState('');
  const [sectorToDelete, setSectorToDelete] = useState<Sector | null>(null);
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: companyProfile,
  });

  const currentLogoUrl = form.watch('logoUrl');

  useEffect(() => {
    if(isLoaded) {
        form.reset(companyProfile);
    }
  }, [isLoaded, companyProfile, form]);

  const usersByRole = useMemo(() => {
    return users.reduce((acc, user) => {
        if (!acc[user.role]) acc[user.role] = [];
        acc[user.role].push(user);
        return acc;
    }, {} as Record<UserRole, typeof users>);
  }, [users]);

  function onSubmit(values: FormValues) {
    setCompanyProfile(values);
    toast({
      title: 'Configurações Salvas!',
      description: 'Os dados da sua empresa foram atualizados com sucesso.',
    });
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) { // 2MB limit
        toast({
          variant: "destructive",
          title: "Arquivo muito grande",
          description: "Por favor, selecione um arquivo de imagem com menos de 2MB.",
        });
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        form.setValue('logoUrl', reader.result as string, { shouldDirty: true });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleTogglePermission = (role: UserRole, path: string) => {
    // Prevent blocking admin from configurations or users to avoid lockout
    if (role === 'admin' && (path === '/dashboard/configuracoes' || path === '/dashboard/usuarios')) {
        toast({
            variant: "destructive",
            title: "Acesso Obrigatório",
            description: "O Administrador deve sempre ter acesso às Configurações e Usuários.",
        });
        return;
    }

    const currentPaths = rolePermissions[role] || [];
    const newPaths = currentPaths.includes(path)
        ? currentPaths.filter(p => p !== path)
        : [...currentPaths, path];
    
    updateRolePermissions(role, newPaths);
  };

  const handleAddSector = () => {
    if (newSectorName.trim() === '') return;
    addSector(newSectorName);
    setNewSectorName('');
  };

  if (!isLoaded) {
    return (
        <div className="flex h-full w-full items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
    );
  }

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight font-headline">Configurações</h2>
      </div>
      
      <Tabs defaultValue="company">
        <TabsList className="grid w-full max-w-2xl grid-cols-4">
          <TabsTrigger value="company">Dados da Empresa</TabsTrigger>
          <TabsTrigger value="sectors">Setores e Equipe</TabsTrigger>
          <TabsTrigger value="permissions">Controle de Acesso</TabsTrigger>
          <TabsTrigger value="system">Sistema</TabsTrigger>
        </TabsList>
        
        <TabsContent value="company">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                <span>Dados da Sua Empresa</span>
              </CardTitle>
              <CardDescription>
                Estas informações serão usadas nas propostas e em outros documentos gerados pelo sistema.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 max-w-2xl">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome da Empresa</FormLabel>
                        <FormControl>
                          <Input placeholder="O nome da sua empresa" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>E-mail de Contato</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="contato@suaempresa.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Telefone</FormLabel>
                        <FormControl>
                          <Input placeholder="(00) 00000-0000" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Endereço</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Rua, número, cidade - UF" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="whatsappReminderMessage"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Mensagem de Lembrete (WhatsApp)</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Texto do lembrete para o cliente..."
                            rows={5}
                            {...field}
                            value={field.value || ''}
                          />
                        </FormControl>
                        <FormDescription>
                          Você pode usar as variáveis: {"{cliente}"}, {"{empresa}"}, {"{data}"}, e {"{hora}"}.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormItem>
                    <FormLabel>Logo da Empresa</FormLabel>
                    <div className="flex flex-col gap-4">
                        <div
                            className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-muted/50 hover:bg-muted/80"
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                <UploadCloud className="w-8 h-8 mb-3 text-muted-foreground" />
                                <p className="mb-2 text-sm text-muted-foreground">Clique para carregar o logo</p>
                                <p className="text-xs text-muted-foreground">Máx. 2MB</p>
                            </div>
                            <input ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                        </div>
                        {currentLogoUrl && (
                            <div className="p-4 border rounded-md flex items-center justify-center bg-muted/20">
                                <img src={currentLogoUrl} alt="Logo Preview" className="max-h-24 w-auto object-contain" />
                            </div>
                        )}
                    </div>
                  </FormItem>
                  <Button type="submit">Salvar Alterações</Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="sectors">
          <Card>
            <CardHeader>
              <CardTitle>Gerenciar Setores</CardTitle>
              <CardDescription>Defina os departamentos da sua empresa para organizar a equipe.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex gap-2">
                <Input 
                  value={newSectorName} 
                  onChange={(e) => setNewSectorName(e.target.value)} 
                  placeholder="Nome do novo setor" 
                />
                <Button onClick={handleAddSector}>Adicionar</Button>
              </div>
              <ul className="divide-y rounded-md border">
                {sectors.map(sector => (
                  <li key={sector.id} className="flex items-center justify-between p-3 pl-4">
                    <span>{sector.name}</span>
                    <Button variant="ghost" size="icon" onClick={() => setSectorToDelete(sector)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="permissions">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5" />
                <span>Gestão de Permissões por Cargo</span>
              </CardTitle>
              <CardDescription>
                Defina quais módulos cada cargo pode acessar. As alterações são aplicadas a todos os usuários vinculados.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b">
                      <th className="p-4 text-left font-semibold text-sm">Módulo / Tela</th>
                      {roles.map(role => (
                        <th key={role.id} className="p-4 text-center font-semibold text-sm min-w-[120px]">
                          <div className="flex flex-col items-center gap-1">
                            <div className="flex items-center gap-1.5">
                                {role.id === 'admin' && <ShieldCheck className="h-3.5 w-3.5 text-primary" />}
                                <span>{role.label}</span>
                            </div>
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Badge variant="outline" className="text-[10px] cursor-help">
                                            {usersByRole[role.id]?.length || 0} usuários
                                        </Badge>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <div className="text-xs space-y-1">
                                            <p className="font-semibold border-b pb-1 mb-1">Pessoas vinculadas:</p>
                                            {(usersByRole[role.id] || []).map(u => (
                                                <p key={u.id}>{u.name}</p>
                                            ))}
                                            {(usersByRole[role.id]?.length || 0) === 0 && <p className="italic">Ninguém vinculado</p>}
                                        </div>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {MENU_ITEMS.map((item) => (
                      <tr key={item.href} className="border-b hover:bg-muted/30">
                        <td className="p-4 flex items-center gap-3">
                          <item.icon className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{item.label}</span>
                        </td>
                        {roles.map((role) => {
                          const isChecked = rolePermissions[role.id]?.includes(item.href);
                          const isDisabled = role.id === 'admin' && (item.href === '/dashboard/configuracoes' || item.href === '/dashboard/usuarios');

                          return (
                            <td key={role.id} className="p-4 text-center">
                              <Checkbox 
                                checked={isChecked}
                                disabled={isDisabled}
                                onCheckedChange={() => handleTogglePermission(role.id, item.href)}
                                className={cn(role.id === 'admin' && "data-[state=checked]:bg-primary")}
                              />
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
            <CardFooter>
                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <ShieldAlert className="h-3.5 w-3.5" />
                    O cargo de Administrador possui acesso obrigatório às Configurações e Usuários para evitar bloqueios permanentes.
                </p>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="system">
          <Card className="border-destructive/20">
            <CardHeader>
              <CardTitle className="text-destructive flex items-center gap-2">
                <ShieldAlert className="h-5 w-5" />
                Zona de Perigo
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert variant="destructive" className="bg-destructive/5">
                <AlertTitle>Limpar Base de Dados</AlertTitle>
                <AlertDescription>
                  Isso apagará todos os clientes, OS, agendamentos e propostas deste navegador. Apenas usuários e permissões serão mantidos.
                </AlertDescription>
              </Alert>
              <Button variant="destructive" onClick={() => setIsResetDialogOpen(true)}>
                Limpar Tudo
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <AlertDialog open={!!sectorToDelete} onOpenChange={(isOpen) => !isOpen && setSectorToDelete(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
            <AlertDialogTitle>Excluir Setor?</AlertDialogTitle>
            <AlertDialogDescription>O setor "{sectorToDelete?.name}" será removido.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => { deleteSector(sectorToDelete!.id); setSectorToDelete(null); }}>Confirmar</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isResetDialogOpen} onOpenChange={setIsResetDialogOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Limpeza Total?</AlertDialogTitle>
            <AlertDialogDescription>Essa ação não pode ser desfeita e removerá todos os seus dados operacionais.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={clearAllData} className="bg-destructive hover:bg-destructive/90">Limpar Tudo</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
