'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useSettings } from '@/contexts/SettingsContext';
import type { User } from '@/lib/types';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from '@/components/ui/button';
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
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
    DropdownMenuCheckboxItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
  } from "@/components/ui/dropdown-menu";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { UserCog, PlusCircle, Eye, EyeOff, Trash2, XCircle } from "lucide-react";
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const userFormSchema = z.object({
  name: z.string().min(2, 'O nome de usuário deve ter pelo menos 2 caracteres.'),
  email: z.string().email('E-mail inválido.').or(z.literal('')),
  whatsapp: z.string().optional(),
  role: z.enum(['admin', 'technician', 'finance', 'service']),
  sectorIds: z.array(z.string()).min(1, 'Selecione pelo menos um setor.'),
  password: z.string().optional(),
  confirmPassword: z.string().optional(),
}).refine(data => data.password === data.confirmPassword, {
  message: "As senhas não correspondem",
  path: ["confirmPassword"],
});


type UserFormValues = z.infer<typeof userFormSchema>;

const roleMap: Record<string, string> = {
    admin: 'Administrador',
    technician: 'Técnico',
    finance: 'Financeiro',
    service: 'Atendimento',
};

export default function UsuariosPage() {
  const { users, sectors, addUser, updateUser, deleteUser, currentUser } = useSettings();
  const { toast } = useToast();
  
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [deletingUser, setDeletingUser] = useState<User | null>(null);
  const [showPasswords, setShowPasswords] = useState({
    password: false,
    confirmPassword: false,
  });

  const form = useForm<UserFormValues>({
    resolver: zodResolver(userFormSchema),
    defaultValues: { name: '', email: '', whatsapp: '', role: 'technician', sectorIds: [], password: '', confirmPassword: '' },
  });
  
  useEffect(() => {
    if (selectedUser) {
        form.reset({
            name: selectedUser.name,
            email: selectedUser.email || '',
            whatsapp: selectedUser.whatsapp || '',
            role: selectedUser.role,
            sectorIds: selectedUser.sectorIds || [],
            password: '',
            confirmPassword: '',
        });
    } else {
        form.reset({ name: '', email: '', whatsapp: '', role: 'technician', sectorIds: [], password: '', confirmPassword: '' });
    }
     setShowPasswords({ password: false, confirmPassword: false });
  }, [selectedUser, form]);


  const sectorMap = useMemo(() => {
    return new Map(sectors.map(s => [s.id, s.name]));
  }, [sectors]);

  const handleAddNew = () => {
    setSelectedUser(null);
  };

  const handleSelectUser = (user: User) => {
    setSelectedUser(user);
  };

  const handleDelete = (user: User) => {
    if (user.id === currentUser?.id) {
        toast({ variant: 'destructive', title: 'Ação Bloqueada', description: 'Você não pode excluir seu próprio usuário.' });
        return;
    }
    setDeletingUser(user);
  };
  
  const handleCancelEdit = () => {
      setSelectedUser(null);
  }

  const confirmDelete = () => {
    if (!deletingUser) return;
    if (selectedUser?.id === deletingUser.id) {
        setSelectedUser(null);
    }
    deleteUser(deletingUser.id);
    toast({
      title: "Usuário Excluído!",
      description: `O usuário ${deletingUser.name} foi removido.`,
      variant: 'destructive'
    });
    setDeletingUser(null);
  };

  function onSubmit(values: UserFormValues) {
    if (selectedUser) {
      if (values.password && values.password.length < 8) {
        form.setError('password', { type: 'manual', message: 'A senha deve ter no mínimo 8 caracteres.' });
        return;
      }
      const userToUpdate: User = { 
        ...selectedUser, 
        ...values,
      };
      // Do not update password if it's empty
      if (!values.password) {
        delete userToUpdate.password;
      }
      updateUser(userToUpdate);
      toast({ title: 'Usuário Atualizado!', description: `Os dados de ${values.name} foram salvos.` });
    } else {
       if (!values.password || values.password.length < 8) {
        form.setError('password', { type: 'manual', message: 'A senha é obrigatória e precisa de no mínimo 8 caracteres.' });
        return;
      }
      addUser(values as Omit<User, 'id'>);
      toast({ title: 'Usuário Adicionado!', description: `${values.name} foi adicionado à equipe.` });
    }
    setSelectedUser(null);
  }

  return (
    <>
      <div className="flex-1 space-y-4 p-8 pt-6">
        <div className="flex items-center justify-between space-y-2">
          <h2 className="text-3xl font-bold tracking-tight font-headline">Usuários e Permissões</h2>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            <div className="lg:col-span-2">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                        <UserCog className="h-5 w-5" />
                        <span>Gerenciamento de Equipe</span>
                        </CardTitle>
                        <CardDescription>Adicione novos usuários ou clique em um usuário da lista para editar.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                        <TableHeader>
                            <TableRow>
                            <TableHead>Nome</TableHead>
                            <TableHead>Cargo / Nível</TableHead>
                            <TableHead>Setores</TableHead>
                            <TableHead className="text-right w-[50px]"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {users.length > 0 ? (
                            users.map(user => (
                                <TableRow 
                                    key={user.id} 
                                    onClick={() => handleSelectUser(user)}
                                    className={cn("cursor-pointer", selectedUser?.id === user.id && 'bg-muted/50')}
                                >
                                <TableCell className="font-medium">
                                    <div className="flex flex-col">
                                        <span>{user.name}</span>
                                        <span className="text-xs text-muted-foreground">{user.email || 'N/A'}</span>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                                        {roleMap[user.role]}
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    <div className="flex flex-wrap gap-1">
                                    {user.sectorIds.length > 0 ? (
                                        user.sectorIds.slice(0, 2).map(id => (
                                            <Badge key={id} variant="outline" className="text-[10px] h-4">{sectorMap.get(id) || 'N/A'}</Badge>
                                        ))
                                    ) : (
                                        <span className="text-muted-foreground text-xs">Nenhum setor</span>
                                    )}
                                    {user.sectorIds.length > 2 && <Badge variant="outline" className="text-[10px] h-4">+{user.sectorIds.length - 2}</Badge>}
                                    </div>
                                </TableCell>
                                <TableCell className="text-right">
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={(e) => { e.stopPropagation(); handleDelete(user); }}>
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </TableCell>
                                </TableRow>
                            ))
                            ) : (
                            <TableRow>
                                <TableCell colSpan={4} className="h-24 text-center">Nenhum usuário cadastrado.</TableCell>
                            </TableRow>
                            )}
                        </TableBody>
                        </Table>
                    </CardContent>
                    <CardFooter>
                        <div className="text-xs text-muted-foreground">
                            Mostrando <strong>{users.length}</strong> usuário(s).
                        </div>
                    </CardFooter>
                </Card>
            </div>

            <div className="lg:col-span-1 sticky top-4">
                 <Card className="flex flex-col max-h-[calc(100vh-5rem)]">
                     <Form {...form} key={selectedUser ? selectedUser.id : 'new'}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-1 flex-col min-h-0">
                             <CardHeader className="flex flex-row items-start justify-between">
                                 <div>
                                     <CardTitle>{selectedUser ? 'Editar Usuário' : 'Novo Usuário'}</CardTitle>
                                     <CardDescription>{selectedUser ? `Alterando dados de ${selectedUser.name}.` : 'Preencha para cadastrar.'}</CardDescription>
                                 </div>
                                {selectedUser ? (
                                    <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={handleCancelEdit}>
                                        <XCircle className="h-5 w-5" />
                                    </Button>
                                ) : (
                                    <Button type="button" size="sm" onClick={handleAddNew}>
                                        <PlusCircle className="mr-2 h-4 w-4" />
                                        Novo
                                    </Button>
                                )}
                             </CardHeader>
                             <CardContent className="flex-1 overflow-y-auto">
                                <div className="space-y-4 pr-4">
                                     <FormField
                                     control={form.control}
                                     name="name"
                                     render={({ field }) => (
                                         <FormItem>
                                         <FormLabel>Nome de Usuário</FormLabel>
                                         <FormControl><Input placeholder="Nome para login" {...field} /></FormControl>
                                         <FormMessage />
                                         </FormItem>
                                     )}
                                     />
                                     <FormField
                                     control={form.control}
                                     name="email"
                                     render={({ field }) => (
                                         <FormItem>
                                         <FormLabel>E-mail</FormLabel>
                                         <FormControl><Input type="email" placeholder="email@vendaspro.com" {...field} /></FormControl>
                                         <FormMessage />
                                         </FormItem>
                                     )}
                                     />
                                     <FormField
                                     control={form.control}
                                     name="whatsapp"
                                     render={({ field }) => (
                                         <FormItem>
                                         <FormLabel>WhatsApp</FormLabel>
                                         <FormControl><Input placeholder="(00) 00000-0000" {...field} value={field.value || ''} /></FormControl>
                                         <FormMessage />
                                         </FormItem>
                                     )}
                                     />
                                     <FormField
                                        control={form.control}
                                        name="role"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Cargo / Nível de Acesso</FormLabel>
                                                <Select onValueChange={field.onChange} value={field.value} defaultValue={field.value}>
                                                    <FormControl>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Selecione o nível" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        <SelectItem value="admin">Administrador (Total)</SelectItem>
                                                        <SelectItem value="technician">Técnico</SelectItem>
                                                        <SelectItem value="finance">Financeiro</SelectItem>
                                                        <SelectItem value="service">Atendimento</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                     />
                                     <FormField
                                     control={form.control}
                                     name="password"
                                     render={({ field }) => (
                                         <FormItem>
                                         <FormLabel>Senha</FormLabel>
                                         <div className="relative">
                                             <FormControl>
                                             <Input 
                                                 type={showPasswords.password ? 'text' : 'password'} 
                                                 placeholder={selectedUser ? 'Deixe em branco para manter a atual' : 'Mínimo 8 caracteres'} 
                                                 className="pr-10"
                                                 {...field} 
                                             />
                                             </FormControl>
                                             <button
                                             type="button"
                                             onClick={() => setShowPasswords(prev => ({...prev, password: !prev.password}))}
                                             className="absolute inset-y-0 right-0 flex items-center justify-center h-full w-10 text-muted-foreground hover:text-foreground"
                                             aria-label={showPasswords.password ? "Esconder senha" : "Mostrar senha"}
                                             tabIndex={-1}
                                             >
                                             {showPasswords.password ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                             </button>
                                         </div>
                                         <FormMessage />
                                         </FormItem>
                                     )}
                                     />
                                     <FormField
                                     control={form.control}
                                     name="confirmPassword"
                                     render={({ field }) => (
                                         <FormItem>
                                         <FormLabel>Confirmar Senha</FormLabel>
                                         <div className="relative">
                                             <FormControl>
                                             <Input 
                                                 type={showPasswords.confirmPassword ? 'text' : 'password'} 
                                                 placeholder="Repita a senha"
                                                 className="pr-10"
                                                 {...field} 
                                             />
                                             </FormControl>
                                             <button
                                             type="button"
                                             onClick={() => setShowPasswords(prev => ({...prev, confirmPassword: !prev.confirmPassword}))}
                                             className="absolute inset-y-0 right-0 flex items-center justify-center h-full w-10 text-muted-foreground hover:text-foreground"
                                             aria-label={showPasswords.confirmPassword ? "Esconder senha" : "Mostrar senha"}
                                             tabIndex={-1}
                                             >
                                             {showPasswords.confirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                             </button>
                                         </div>
                                         <FormMessage />
                                         </FormItem>
                                     )}
                                     />
                                     <FormField
                                     control={form.control}
                                     name="sectorIds"
                                     render={({ field }) => (
                                         <FormItem>
                                         <FormLabel>Setores Associados</FormLabel>
                                         <DropdownMenu>
                                             <DropdownMenuTrigger asChild>
                                                 <FormControl>
                                                     <Button variant="outline" className="w-full justify-start text-left h-auto min-h-10">
                                                         {field.value?.length > 0 ? (
                                                             <div className="flex flex-wrap gap-1">
                                                                 {field.value.map(id => (
                                                                     <Badge key={id} variant="secondary">{sectorMap.get(id) || 'N/A'}</Badge>
                                                                 ))}
                                                             </div>
                                                         ) : (
                                                             <span className="text-muted-foreground">Selecione os setores</span>
                                                         )}
                                                     </Button>
                                                 </FormControl>
                                             </DropdownMenuTrigger>
                                             <DropdownMenuContent className="w-full max-w-[var(--radix-dropdown-menu-trigger-width)]">
                                                 <DropdownMenuLabel>Setores Disponíveis</DropdownMenuLabel>
                                                 <DropdownMenuSeparator />
                                                 <ScrollArea className="max-h-40">
                                                     {sectors.map(sector => (
                                                     <DropdownMenuCheckboxItem
                                                         key={sector.id}
                                                         checked={field.value?.includes(sector.id)}
                                                         onCheckedChange={(checked) => {
                                                             const currentIds = field.value || [];
                                                             const newIds = checked 
                                                                 ? [...currentIds, sector.id]
                                                                 : currentIds.filter(id => id !== sector.id);
                                                             field.onChange(newIds);
                                                         }}
                                                         onSelect={(e) => e.preventDefault()} // Prevent closing on select
                                                     >
                                                         {sector.name}
                                                     </DropdownMenuCheckboxItem>
                                                     ))}
                                                     {sectors.length === 0 && <p className="p-2 text-xs text-muted-foreground">Nenhum setor cadastrado.</p>}
                                                 </ScrollArea>
                                             </DropdownMenuContent>
                                         </DropdownMenu>
                                         <FormMessage />
                                         </FormItem>
                                     )}
                                     />
                                </div>
                             </CardContent>
                            <CardFooter>
                                <Button type="submit" className="w-full">Salvar Alterações</Button>
                            </CardFooter>
                         </form>
                     </Form>
                 </Card>
            </div>
        </div>
      </div>
      
      <AlertDialog open={!!deletingUser} onOpenChange={(open) => !open && setDeletingUser(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Essa ação não pode ser desfeita. Isso excluirá permanentemente o usuário <span className="font-medium">{deletingUser?.name}</span>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Confirmar Exclusão</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
