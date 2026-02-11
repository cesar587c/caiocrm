'use client';

import React, { useEffect, useRef, useState } from 'react';
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
import { Settings, Loader2, UploadCloud, Link as LinkIcon, Trash2 } from 'lucide-react';
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
import type { Sector } from '@/lib/types';

const formSchema = z.object({
  name: z.string().min(1, 'O nome da empresa é obrigatório.'),
  email: z.string().email('E-mail inválido.'),
  phone: z.string().min(1, 'O telefone é obrigatório.'),
  address: z.string().min(1, 'O endereço é obrigatório.'),
  logoUrl: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export default function ConfiguracoesPage() {
  const { toast } = useToast();
  const { companyProfile, setCompanyProfile, sectors, addSector, deleteSector, isLoaded } = useSettings();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [newSectorName, setNewSectorName] = useState('');
  const [sectorToDelete, setSectorToDelete] = useState<Sector | null>(null);

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
      reader.onerror = () => {
        toast({
          variant: "destructive",
          title: "Erro ao ler arquivo",
          description: "Não foi possível carregar a imagem. Tente novamente.",
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddSector = () => {
    if (newSectorName.trim() === '') {
        toast({ variant: 'destructive', title: 'Nome inválido', description: 'O nome do setor não pode estar vazio.' });
        return;
    }
    addSector(newSectorName);
    setNewSectorName('');
    toast({ title: 'Setor Adicionado!', description: `O setor "${newSectorName}" foi criado.`});
  };

  const confirmDeleteSector = () => {
      if (!sectorToDelete) return;
      deleteSector(sectorToDelete.id);
      toast({ title: 'Setor Excluído', description: `O setor "${sectorToDelete.name}" foi removido.`, variant: 'destructive' });
      setSectorToDelete(null);
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
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="company">Dados da Empresa</TabsTrigger>
          <TabsTrigger value="sectors">Setores e Equipe</TabsTrigger>
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
                  <FormItem>
                    <FormLabel>Logo da Empresa</FormLabel>
                    <Tabs defaultValue="url" className="w-full">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="url"><LinkIcon className="mr-2 h-4 w-4" /> Colar URL</TabsTrigger>
                            <TabsTrigger value="upload"><UploadCloud className="mr-2 h-4 w-4" /> Carregar Imagem</TabsTrigger>
                        </TabsList>
                        <TabsContent value="url">
                            <FormField
                                control={form.control}
                                name="logoUrl"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormControl>
                                            <Input placeholder="https://suaempresa.com/logo.png" {...(field as any)} />
                                        </FormControl>
                                        <FormDescription>
                                            Insira a URL completa da imagem do seu logo.
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </TabsContent>
                        <TabsContent value="upload">
                            <FormControl>
                                <div
                                    className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-muted/50 hover:bg-muted/80"
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                        <UploadCloud className="w-8 h-8 mb-3 text-muted-foreground" />
                                        <p className="mb-2 text-sm text-muted-foreground">
                                            <span className="font-semibold">Clique para carregar</span> ou arraste e solte
                                        </p>
                                        <p className="text-xs text-muted-foreground">PNG, JPG ou GIF (máx. 2MB)</p>
                                    </div>
                                    <Input 
                                        ref={fileInputRef}
                                        id="file-upload" 
                                        type="file" 
                                        className="hidden" 
                                        accept="image/png, image/jpeg, image/gif"
                                        onChange={handleFileChange}
                                    />
                                </div>
                            </FormControl>
                        </TabsContent>
                    </Tabs>
                    {currentLogoUrl && (
                        <div className="mt-4">
                            <FormLabel>Pré-visualização do Logo</FormLabel>
                            <div className="mt-2 p-4 border rounded-md flex items-center justify-center bg-muted/20 min-h-[100px]">
                                <img 
                                    src={currentLogoUrl} 
                                    alt="Pré-visualização do logo" 
                                    data-ai-hint="logo"
                                    className="max-h-24 w-auto object-contain"
                                />
                            </div>
                        </div>
                    )}
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
              <CardDescription>Adicione ou remova setores para organizar sua equipe. Os setores são usados na Agenda e no cadastro de Usuários.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label htmlFor="new-sector">Adicionar novo setor</Label>
                <div className="flex gap-2 mt-2">
                  <Input 
                    id="new-sector"
                    value={newSectorName} 
                    onChange={(e) => setNewSectorName(e.target.value)} 
                    placeholder="Nome do novo setor" 
                    onKeyDown={(e) => e.key === 'Enter' && handleAddSector()}
                  />
                  <Button onClick={handleAddSector}>Adicionar</Button>
                </div>
              </div>
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-muted-foreground">Setores existentes</h3>
                {sectors.length > 0 ? (
                  <ul className="divide-y rounded-md border">
                    {sectors.map(sector => (
                      <li key={sector.id} className="flex items-center justify-between p-3 pl-4">
                        <span className="font-medium">{sector.name}</span>
                        <Button variant="ghost" size="icon" onClick={() => setSectorToDelete(sector)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="text-sm text-center text-muted-foreground py-8 border-2 border-dashed rounded-md">
                    <p>Nenhum setor cadastrado.</p>
                    <p className="text-xs">Use o campo acima para adicionar o primeiro.</p>
                  </div>
                )}
              </div>
            </CardContent>
            <CardFooter>
                <p className="text-xs text-muted-foreground">Para gerenciar usuários e associá-los a setores, vá para a página de <Link href="/dashboard/usuarios" className="underline hover:text-primary">Usuários</Link>.</p>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>

      <AlertDialog open={!!sectorToDelete} onOpenChange={(isOpen) => !isOpen && setSectorToDelete(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
            <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
                Esta ação excluirá o setor <span className="font-medium">{sectorToDelete?.name}</span>. Os usuários neste setor não serão excluídos, mas ficarão sem um setor atribuído.
            </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteSector}>Confirmar Exclusão</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
