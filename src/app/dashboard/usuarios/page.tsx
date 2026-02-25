'use client';

import React, { useState, useMemo } from 'react';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuCheckboxItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
  } from "@/components/ui/dropdown-menu";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { UserCog, PlusCircle, MoreHorizontal, Eye, EyeOff } from "lucide-react";
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

const userFormSchema = z.object({
  name: z.string().min(2, 'O nome de usuário deve ter pelo menos 2 caracteres.'),
  email: z.string().email('E-mail inválido.').or(z.literal('')),
  whatsapp: z.string().optional(),
  sectorIds: z.array(z.string()).min(1, 'Selecione pelo menos um setor.'),
  password: z.string().optional(),
  confirmPassword: z.string().optional(),
}).refine(data => data.password === data.confirmPassword, {
  message: "As senhas não correspondem",
  path: ["confirmPassword"],
});


type UserFormValues = z.infer<typeof userFormSchema>;

export default function UsuariosPage() {
  const { users, sectors, addUser, updateUser, deleteUser } = useSettings();
  const { toast } = useToast();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deletingUser, setDeletingUser] = useState<User | null>(null);
  const [showPasswords, setShowPasswords] = useState({
    password: false,
    confirmPassword: false,
  });

  const form = useForm<UserFormValues>({
    resolver: zodResolver(userFormSchema),
    defaultValues: { name: '', email: '', whatsapp: '', sectorIds: [], password: '', confirmPassword: '' },
  });

  const sectorMap = useMemo(() => {
    return new Map(sectors.map(s => [s.id, s.name]));
  }, [sectors]);

  const handleAddNew = () => {
    setEditingUser(null);
    form.reset({ name: '', email: '', whatsapp: '', sectorIds: [], password: '', confirmPassword: '' });
    setIsDialogOpen(true);
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    form.reset({
      name: user.name,
      email: user.email || '',
      whatsapp: user.whatsapp || '',
      sectorIds: user.sectorIds || [],
      password: '',
      confirmPassword: '',
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (user: User) => {
    setDeletingUser(user);
  };

  const confirmDelete = () => {
    if (!deletingUser) return;
    deleteUser(deletingUser.id);
    toast({
      title: "Usuário Excluído!",
      description: `O usuário ${deletingUser.name} foi removido.`,
      variant: 'destructive'
    });
    setDeletingUser(null);
  };

  function onSubmit(values: UserFormValues) {
    if (editingUser) {
      if (values.password && values.password.length < 8) {
        form.setError('password', { type: 'manual', message: 'A senha deve ter no mínimo 8 caracteres.' });
        return;
      }
      const userToUpdate: User = { 
        ...editingUser, 
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
    setIsDialogOpen(false);
  }

  return (
    <>
      <div className="flex-1 space-y-4 p-8 pt-6">
        <div className="flex items-center justify-between space-y-2">
          <h2 className="text-3xl font-bold tracking-tight font-headline">Usuários e Permissões</h2>
          <Button onClick={handleAddNew}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Novo Usuário
          </Button>
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCog className="h-5 w-5" />
              <span>Gerenciamento de Equipe</span>
            </CardTitle>
            <CardDescription>Adicione, edite e remova usuários do sistema.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>E-mail</TableHead>
                  <TableHead>WhatsApp</TableHead>
                  <TableHead>Setores</TableHead>
                  <TableHead className="text-right w-[80px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.length > 0 ? (
                  users.map(user => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.name}</TableCell>
                      <TableCell>{user.email || <span className="text-muted-foreground">N/A</span>}</TableCell>
                      <TableCell>{user.whatsapp || <span className="text-muted-foreground">N/A</span>}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {user.sectorIds.length > 0 ? (
                            user.sectorIds.map(id => (
                                <Badge key={id} variant="secondary">{sectorMap.get(id) || 'N/A'}</Badge>
                            ))
                          ) : (
                            <span className="text-muted-foreground">N/A</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Abrir menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(user)}>Editar</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDelete(user)} className="text-destructive">Excluir</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">Nenhum usuário cadastrado.</TableCell>
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

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{editingUser ? 'Editar Usuário' : 'Novo Usuário'}</DialogTitle>
            <DialogDescription>
              {editingUser ? 'Altere os dados do usuário abaixo.' : 'Preencha os dados para adicionar um novo usuário à equipe.'}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
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
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Senha</FormLabel>
                    <div className="relative">
                      <FormControl>
                        <Input 
                          type={showPasswords.password ? 'text' : 'password'} 
                          placeholder={editingUser ? 'Deixe em branco para manter a atual' : 'Mínimo 8 caracteres'} 
                          className="pr-10"
                          {...field} 
                        />
                      </FormControl>
                      <button
                        type="button"
                        onClick={() => setShowPasswords(prev => ({...prev, password: !prev.password}))}
                        className="absolute inset-y-0 right-0 flex items-center justify-center h-full w-10 text-muted-foreground hover:text-foreground"
                        aria-label={showPasswords.password ? "Esconder senha" : "Mostrar senha"}
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
                    <FormLabel>Setores</FormLabel>
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
                            </ScrollArea>
                        </DropdownMenuContent>
                    </DropdownMenu>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                <Button type="submit">Salvar</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
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
