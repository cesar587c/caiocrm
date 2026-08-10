'use client';

import React, { useEffect, useRef, useState, useMemo } from 'react';
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
import { Settings, Loader2, UploadCloud, Trash2, ShieldAlert, Lock, ShieldCheck, CalendarDays, ExternalLink, CheckCircle2, Download, Upload, AlertTriangle, MonitorSmartphone, Mail, Users, Plus, X, UserPlus } from 'lucide-react';
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
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';

const formSchema = z.object({
  name: z.string().min(1, 'O nome da empresa é obrigatório.'),
  email: z.string().email('E-mail inválido.'),
  phone: z.string().min(1, 'O telefone é obrigatório.'),
  address: z.string().min(1, 'O endereço é obrigatório.'),
  logoUrl: z.string().optional(),
  whatsappReminderMessage: z.string().optional(),
  googleCalendarEmail: z.string().email('E-mail do Google inválido.').optional().or(z.literal('')),
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
    exportAllData,
    importAllData,
    isLoaded, 
    rolePermissions, 
    updateRolePermissions,
    users,
    updateUser
  } = useSettings();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const importInputRef = useRef<HTMLInputElement>(null);
  
  const [newSectorName, setNewSectorName] = useState('');
  const [sectorToDelete, setSectorToDelete] = useState<Sector | null>(null);
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);

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

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
        ...companyProfile,
        phone: companyProfile.phone ? formatPhoneNumber(companyProfile.phone) : '',
        googleCalendarEmail: companyProfile.googleCalendarEmail || '',
    },
  });

  const currentLogoUrl = form.watch('logoUrl');

  useEffect(() => {
    if(isLoaded) {
        form.reset({
            ...companyProfile,
            phone: companyProfile.phone ? formatPhoneNumber(companyProfile.phone) : '',
            googleCalendarEmail: companyProfile.googleCalendarEmail || '',
        });
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
    const dataToSave = {
        ...values,
        phone: values.phone ? values.phone.replace(/\D/g, '') : '',
    };
    setCompanyProfile(dataToSave);
    toast({
      title: 'Configurações Salvas!',
      description: 'Os dados da sua empresa foram atualizados com sucesso.',
    });
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast({ variant: "destructive", title: "Arquivo muito grande", description: "Por favor, selecione uma imagem com menos de 2MB." });
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        form.setValue('logoUrl', reader.result as string, { shouldDirty: true });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleImportFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        const success = importAllData(content);
        if (success) {
            toast({ title: "Backup Restaurado!", description: "Seus dados foram importados com sucesso." });
        } else {
            toast({ variant: "destructive", title: "Erro na Importação", description: "O arquivo selecionado é inválido." });
        }
      };
      reader.readAsText(file);
    }
  };

  const handleTogglePermission = (role: UserRole, path: string) => {
    if (role === 'admin' && (path === '/dashboard/configuracoes' || path === '/dashboard/usuarios')) {
        toast({ variant: "destructive", title: "Acesso Obrigatório", description: "O Administrador deve sempre ter acesso às Configurações e Usuários." });
        return;
    }
    const currentPaths = rolePermissions[role] || [];
    const newPaths = currentPaths.includes(path) ? currentPaths.filter(p => p !== path) : [...currentPaths, path];
    updateRolePermissions(role, newPaths);
  };

  const handleAddSector = () => {
    if (newSectorName.trim() === '') return;
    addSector(newSectorName);
    setNewSectorName('');
    toast({ title: "Setor Criado!" });
  };

  const handleOpenGoogleCalendar = () => {
    let url = 'https://calendar.google.com/calendar/render';
    if (companyProfile.googleCalendarEmail) {
      url += `?authuser=${encodeURIComponent(companyProfile.googleCalendarEmail)}`;
    }
    window.open(url, '_blank');
  };

  if (!isLoaded) {
    return <div className="flex h-full w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight font-headline">Configurações</h2>
      </div>
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Tabs defaultValue="company">
            <TabsList className="grid w-full max-w-4xl grid-cols-5">
              <TabsTrigger value="company">Dados da Empresa</TabsTrigger>
              <TabsTrigger value="sectors">Setores e Equipe</TabsTrigger>
              <TabsTrigger value="permissions">Controle de Acesso</TabsTrigger>
              <TabsTrigger value="integrations">Integrações</TabsTrigger>
              <TabsTrigger value="system">Sincronização</TabsTrigger>
            </TabsList>
            
            <TabsContent value="company">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Settings className="h-5 w-5" /><span>Dados da Sua Empresa</span></CardTitle>
                  <CardDescription>Estas informações serão usadas nas propostas e em outros documentos gerados pelo sistema.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 max-w-2xl">
                    <FormField control={form.control} name="name" render={({ field }) => (<FormItem><FormLabel>Nome da Empresa</FormLabel><FormControl><Input placeholder="O nome da sua empresa" {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="email" render={({ field }) => (<FormItem><FormLabel>E-mail de Contato</FormLabel><FormControl><Input type="email" placeholder="contato@suaempresa.com" {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField 
                      control={form.control} 
                      name="phone" 
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Telefone</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="(00) 00000-0000" 
                              {...field} 
                              onChange={(e) => field.onChange(formatPhoneNumber(e.target.value))}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} 
                    />
                    <FormField control={form.control} name="address" render={({ field }) => (<FormItem><FormLabel>Endereço</FormLabel><FormControl><Textarea placeholder="Rua, número, cidade - UF" {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="whatsappReminderMessage" render={({ field }) => (<FormItem><FormLabel>Mensagem de Lembrete (WhatsApp)</FormLabel><FormControl><Textarea placeholder="Texto do lembrete..." rows={5} {...field} value={field.value || ''} /></FormControl><FormDescription>Variáveis: {"{cliente}"}, {"{empresa}"}, {"{data}"}, e {"{hora}"}.</FormDescription><FormMessage /></FormItem>)} />
                    <FormItem>
                        <FormLabel>Logo da Empresa</FormLabel>
                        <div className="flex flex-col gap-4">
                            <div className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-muted/50 hover:bg-muted/80" onClick={() => fileInputRef.current?.click()}>
                                <div className="flex flex-col items-center justify-center pt-5 pb-6"><UploadCloud className="w-8 h-8 mb-3 text-muted-foreground" /><p className="mb-2 text-sm text-muted-foreground">Clique para carregar o logo</p><p className="text-xs text-muted-foreground">Máx. 2MB</p></div>
                                <input ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                            </div>
                            {currentLogoUrl && (<div className="p-4 border rounded-md flex items-center justify-center bg-muted/20"><img src={currentLogoUrl} alt="Logo Preview" className="max-h-24 w-auto object-contain" /></div>)}
                        </div>
                    </FormItem>
                    <Button type="submit">Salvar Alterações</Button>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="sectors">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Gerenciar Setores e Equipe
                  </CardTitle>
                  <CardDescription>Defina os departamentos e vincule os colaboradores a cada área.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-8">
                  <div className="flex gap-2 max-w-xl">
                    <Input 
                      value={newSectorName} 
                      onChange={(e) => setNewSectorName(e.target.value)} 
                      placeholder="Nome do novo setor (ex: Técnico, Comercial...)" 
                    />
                    <Button type="button" onClick={handleAddSector} className="gap-2">
                      <Plus className="h-4 w-4" /> Adicionar Setor
                    </Button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {sectors.map(sector => {
                      const sectorMembers = users.filter(u => u.sectorIds.includes(sector.id));
                      return (
                        <div key={sector.id} className="border rounded-xl p-5 space-y-4 bg-muted/10 hover:bg-muted/20 transition-colors border-primary/10 shadow-sm">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                                <Users className="h-5 w-5 text-primary" />
                              </div>
                              <div>
                                <h4 className="font-bold text-lg leading-tight">{sector.name}</h4>
                                <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">{sectorMembers.length}integrante(s)</p>
                              </div>
                            </div>
                            <Button 
                              type="button" 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => setSectorToDelete(sector)} 
                              className="text-destructive hover:bg-destructive/10 h-8 w-8"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>

                          <div className="space-y-3 pt-2 border-t">
                            <div className="flex flex-wrap gap-1.5">
                              {sectorMembers.map(member => (
                                <Badge key={member.id} variant="secondary" className="gap-1 pl-2 pr-1 h-7 bg-primary/5 border border-primary/20 text-foreground font-medium">
                                  {member.name}
                                  <Button 
                                    type="button" 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-5 w-5 rounded-full hover:bg-destructive hover:text-white transition-all"
                                    onClick={() => {
                                      const newSectors = member.sectorIds.filter(id => id !== sector.id);
                                      updateUser({ ...member, sectorIds: newSectors });
                                      toast({ title: "Membro Removido", description: `${member.name} não faz mais parte do setor ${sector.name}.` });
                                    }}
                                  >
                                    <X className="h-3 w-3" />
                                  </Button>
                                </Badge>
                              ))}
                              
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Button variant="outline" size="sm" className="h-7 gap-1 border-dashed hover:border-primary hover:text-primary transition-colors">
                                    <UserPlus className="h-3.5 w-3.5" /> Vincular Membro
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="p-0 w-64 shadow-xl border-primary/20" align="start">
                                  <div className="p-2.5 border-b bg-muted/30">
                                    <p className="text-[10px] font-bold uppercase text-center tracking-widest text-primary">Selecionar Colaborador</p>
                                  </div>
                                  <ScrollArea className="h-48">
                                    <div className="p-2 space-y-1">
                                      {users.filter(u => !u.sectorIds.includes(sector.id)).map(u => (
                                        <Button 
                                          key={u.id} 
                                          variant="ghost" 
                                          className="w-full justify-start text-xs h-9 hover:bg-primary/10"
                                          onClick={() => {
                                            updateUser({ ...u, sectorIds: [...u.sectorIds, sector.id] });
                                            toast({ title: "Membro Adicionado!", description: `${u.name} agora faz parte do setor ${sector.name}.` });
                                          }}
                                        >
                                          <UserPlus className="h-3.5 w-3.5 mr-2 text-primary" />
                                          <span className="font-semibold">{u.name}</span>
                                        </Button>
                                      ))}
                                      {users.filter(u => !u.sectorIds.includes(sector.id)).length === 0 && (
                                        <div className="flex flex-col items-center justify-center py-8 opacity-50">
                                          <ShieldCheck className="h-8 w-8 mb-2" />
                                          <p className="text-[10px] text-center italic">Todos os usuários já<br/>estão neste setor.</p>
                                        </div>
                                      )}
                                    </div>
                                  </ScrollArea>
                                </PopoverContent>
                              </Popover>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="permissions">
              <Card>
                <CardHeader><CardTitle className="flex items-center gap-2"><Lock className="h-5 w-5" /><span>Gestão de Permissões por Cargo</span></CardTitle><CardDescription>Defina quais módulos cada cargo pode acessar.</CardDescription></CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead><tr className="border-b"><th className="p-4 text-left font-semibold text-sm">Módulo / Tela</th>{roles.map(role => (<th key={role.id} className="p-4 text-center font-semibold text-sm min-w-[120px]"><div className="flex flex-col items-center gap-1"><div className="flex items-center gap-1.5">{role.id === 'admin' && <ShieldCheck className="h-3.5 w-3.5 text-primary" />}<span>{role.label}</span></div><TooltipProvider><Tooltip><TooltipTrigger asChild><Badge variant="outline" className="text-[10px] cursor-help">{usersByRole[role.id]?.length || 0} usuários</Badge></TooltipTrigger><TooltipContent><div className="text-xs space-y-1"><p className="font-semibold border-b pb-1 mb-1">Pessoas vinculadas:</p>{(usersByRole[role.id] || []).map(u => (<p key={u.id}>{u.name}</p>))}{(usersByRole[role.id]?.length || 0) === 0 && <p className="italic">Ninguém vinculado</p>}</div></TooltipContent></Tooltip></TooltipProvider></div></th>))}</tr></thead>
                      <tbody>{MENU_ITEMS.map((item) => (<tr key={item.href} className="border-b hover:bg-muted/30"><td className="p-4 flex items-center gap-3"><item.icon className="h-4 w-4 text-muted-foreground" /><span className="text-sm">{item.label}</span></td>{roles.map((role) => { const isChecked = rolePermissions[role.id]?.includes(item.href); const isDisabled = role.id === 'admin' && (item.href === '/dashboard/configuracoes' || item.href === '/dashboard/usuarios'); return (<td key={role.id} className="p-4 text-center"><Checkbox checked={isChecked} disabled={isDisabled} onCheckedChange={() => handleTogglePermission(role.id, item.href)} className={cn(role.id === 'admin' && "data-[state=checked]:bg-primary")} /></td>); })}</tr>))}</tbody>
                    </table>
                  </div>
                </CardContent>
                <CardFooter><p className="text-xs text-muted-foreground flex items-center gap-1.5"><ShieldAlert className="h-3.5 w-3.5" />O cargo de Administrador possui acesso obrigatório às Configurações e Usuários.</p></CardFooter>
              </Card>
            </TabsContent>

            <TabsContent value="integrations">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><CalendarDays className="h-5 w-5 text-emerald-500" />Google Agenda</CardTitle>
                  <CardDescription>Configure qual e-mail do Google deve ser usado para os agendamentos.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid gap-6 max-w-2xl">
                        <FormField 
                            control={form.control} 
                            name="googleCalendarEmail" 
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="flex items-center gap-2">
                                        <Mail className="h-4 w-4 text-primary" />
                                        E-mail do Google Agenda (Fixo)
                                    </FormLabel>
                                    <FormControl>
                                        <Input placeholder="seu-email@gmail.com" {...field} value={field.value || ''} />
                                    </FormControl>
                                    <FormDescription>
                                        Ao configurar um e-mail aqui, o sistema sempre tentará abrir esta conta específica para salvar agendamentos, evitando erros se você tiver várias contas logadas.
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <Button type="submit">Salvar Configurações de Agenda</Button>
                    </div>

                    <Separator />

                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-6 border rounded-lg bg-muted/20">
                        <div className="flex items-center gap-4">
                            <div className="h-14 w-14 rounded-full bg-emerald-500/10 flex items-center justify-center">
                                <CalendarDays className="h-8 w-8 text-emerald-600" />
                            </div>
                            <div className="space-y-1">
                                <h4 className="font-bold text-lg">Google Calendar (Sincronização)</h4>
                                <p className="text-sm text-muted-foreground">Status: Habilitado</p>
                                <div className="flex items-center gap-2 text-[10px] text-emerald-600 font-bold uppercase tracking-wider">
                                    <CheckCircle2 className="h-3 w-3" /> 
                                    Integração Direcionada Habilitada
                                </div>
                            </div>
                        </div>
                        <Button type="button" variant="outline" className="gap-2" onClick={handleOpenGoogleCalendar}>
                            <ExternalLink className="h-4 w-4" /> 
                            Ver Minha Agenda Google
                        </Button>
                    </div>
                </CardContent>
                <CardFooter className="border-t pt-6 bg-muted/5">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <ShieldCheck className="h-4 w-4 text-emerald-500" />
                        Seus dados de agenda permanecem privados e vinculados à conta Google configurada.
                    </div>
                </CardFooter>
              </Card>
            </TabsContent>

            <TabsContent value="system">
              <Card className="border-border">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><MonitorSmartphone className="h-5 w-5 text-primary" />Sincronização entre Computadores</CardTitle>
                  <CardDescription>Como seus dados estão salvos localmente neste navegador, use esta ferramenta para mover suas informações para outro PC ou celular.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                   <Alert className="bg-primary/5 border-primary/20">
                     <AlertTriangle className="h-4 w-4 text-primary" />
                     <AlertTitle className="font-bold">Atenção!</AlertTitle>
                     <AlertDescription className="text-xs">
                       O VendasPro salva tudo no seu navegador. Para ver os mesmos dados em outro computador, você deve <strong>Exportar</strong> aqui e <strong>Importar</strong> lá sempre que houver mudanças importantes.
                     </AlertDescription>
                   </Alert>

                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-4 border rounded-lg space-y-3 bg-card">
                            <h4 className="font-bold flex items-center gap-2"><Download className="h-4 w-4 text-primary" />1. Exportar Dados</h4>
                            <p className="text-xs text-muted-foreground">Gera um arquivo com todos os clientes, propostas, agendas e configurações atuais.</p>
                            <Button type="button" variant="outline" className="full gap-2 border-primary/30 text-primary hover:bg-primary/10" onClick={exportAllData}>
                                Salvar Backup Atual (.json)
                            </Button>
                        </div>
                        <div className="p-4 border rounded-lg space-y-3 bg-card">
                            <h4 className="font-bold flex items-center gap-2"><Upload className="h-4 w-4 text-emerald-500" />2. Importar em outro PC</h4>
                            <p className="text-xs text-muted-foreground">Carrega um arquivo de backup para restaurar ou atualizar suas informações nesta máquina.</p>
                            <input type="file" ref={importInputRef} className="hidden" accept=".json" onChange={handleImportFile} />
                            <Button type="button" variant="outline" className="full gap-2 text-emerald-500 hover:text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/10" onClick={() => importInputRef.current?.click()}>
                                Carregar Backup
                            </Button>
                        </div>
                   </div>

                  <div className="mt-8 pt-8 border-t">
                      <h3 className="text-destructive font-bold flex items-center gap-2 mb-4"><ShieldAlert className="h-5 w-5" />Zona de Perigo</h3>
                      <Alert variant="destructive" className="bg-destructive/5"><AlertTitle>Limpar Base de Dados</AlertTitle><AlertDescription>Isso apagará permanentemente todos os registros deste computador.</AlertDescription></Alert>
                      <Button type="button" variant="destructive" className="mt-4" onClick={() => setIsResetDialogOpen(true)}>Limpar Tudo</Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </form>
      </Form>

      <AlertDialog open={!!sectorToDelete} onOpenChange={(isOpen) => !isOpen && setSectorToDelete(null)}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Excluir Setor?</AlertDialogTitle><AlertDialogDescription>O setor "{sectorToDelete?.name}" será removido.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => { deleteSector(sectorToDelete!.id); setSectorToDelete(null); }}>Confirmar</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isResetDialogOpen} onOpenChange={setIsResetDialogOpen}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Confirmar Limpeza Total?</AlertDialogTitle><AlertDialogDescription>Essa ação não pode ser desfeita e removerá todos os seus dados operacionais.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={clearAllData} className="bg-destructive hover:bg-destructive/90">Limpar Tudo</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
