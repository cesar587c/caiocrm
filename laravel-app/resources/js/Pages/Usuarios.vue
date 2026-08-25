<script setup>
import { computed, ref } from 'vue';
import { Head, router, useForm, usePage } from '@inertiajs/vue3';
import {
    UserCog, PlusCircle, Eye, EyeOff, Trash2, XCircle, ShieldCheck, Search, UserPlus,
} from 'lucide-vue-next';
import AppLayout from '@/Layouts/AppLayout.vue';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/Components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/Components/ui/table';
import { Button } from '@/Components/ui/button';
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/Components/ui/alert-dialog';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import { Badge } from '@/Components/ui/badge';
import { ScrollArea } from '@/Components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/Components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/Components/ui/popover';
import { Checkbox } from '@/Components/ui/checkbox';
import { useToast } from '@/composables/useToast';
import { cn, formatPhoneNumber } from '@/lib/utils';

defineOptions({ layout: AppLayout });

const props = defineProps({ users: Array, sectors: Array });
const { toast } = useToast();
const page = usePage();
const currentUserId = computed(() => page.props.auth.user?.id);

const roleMap = { admin: 'Administrador', technician: 'Técnico', finance: 'Financeiro', service: 'Atendimento' };

const selectedUser = ref(null);
const deletingUser = ref(null);
const isDeleteDialogOpen = ref(false);
const searchTermSectors = ref('');
const showPassword = ref(false);
const showConfirmPassword = ref(false);

const defaultValues = { name: '', email: '', whatsapp: '', role: 'technician', sector_ids: [], password: '', password_confirmation: '' };
const form = useForm({ ...defaultValues });

const sectorMap = computed(() => new Map(props.sectors.map((s) => [s.id, s.name])));
const filteredSectors = computed(() => props.sectors.filter((s) => s.name.toLowerCase().includes(searchTermSectors.value.toLowerCase())));

function handleAddNew() {
    selectedUser.value = null;
    form.reset();
    form.clearErrors();
    showPassword.value = false;
    showConfirmPassword.value = false;
    searchTermSectors.value = '';
    toast({ title: 'Modo de Cadastro Ativo', description: 'O formulário foi limpo para um novo usuário.' });
}

function handleSelectUser(user) {
    selectedUser.value = user;
    form.name = user.name;
    form.email = user.email || '';
    form.whatsapp = user.whatsapp ? formatPhoneNumber(user.whatsapp) : '';
    form.role = user.role;
    form.sector_ids = user.sectors.map((s) => s.id);
    form.password = '';
    form.password_confirmation = '';
    form.clearErrors();
    showPassword.value = false;
    showConfirmPassword.value = false;
    searchTermSectors.value = '';
}

function handleDelete(user) {
    if (currentUserId.value === user.id) {
        toast({ variant: 'destructive', title: 'Ação Bloqueada', description: 'Você não pode excluir seu próprio usuário.' });
        return;
    }
    deletingUser.value = user;
    isDeleteDialogOpen.value = true;
}

function confirmDelete() {
    if (!deletingUser.value) return;
    const id = deletingUser.value.id;
    router.delete(`/dashboard/usuarios/${id}`, {
        onSuccess: () => {
            if (selectedUser.value?.id === id) handleAddNew();
        },
    });
    deletingUser.value = null;
}

function onWhatsappInput(e) {
    form.whatsapp = formatPhoneNumber(e.target.value);
}

function toggleSector(id) {
    const idx = form.sector_ids.indexOf(id);
    if (idx >= 0) form.sector_ids.splice(idx, 1);
    else form.sector_ids.push(id);
}

function submit() {
    if (selectedUser.value) {
        form.transform((data) => (data.password ? data : { ...data, password: null })).put(`/dashboard/usuarios/${selectedUser.value.id}`, {
            onSuccess: () => handleAddNew(),
        });
    } else {
        form.post('/dashboard/usuarios', { onSuccess: () => handleAddNew() });
    }
}
</script>

<template>
    <Head title="Usuários" />

    <div class="flex-1 space-y-4 p-8 pt-6">
        <div class="flex items-center justify-between space-y-2">
            <h2 class="text-3xl font-bold tracking-tight font-headline">Usuários e Equipe</h2>
            <Button class="gap-2" @click="handleAddNew"><UserPlus class="h-4 w-4" /> Novo Usuário</Button>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            <div class="lg:col-span-2">
                <Card>
                    <CardHeader>
                        <CardTitle class="flex items-center gap-2"><UserCog class="h-5 w-5" /> Gerenciamento de Colaboradores</CardTitle>
                        <CardDescription>Gerencie quem acessa o sistema e defina seus níveis de responsabilidade.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Nome / Contato</TableHead>
                                    <TableHead>Cargo / Nível</TableHead>
                                    <TableHead>Setores</TableHead>
                                    <TableHead class="text-right w-[50px]" />
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                <TableRow v-if="users.length === 0"><TableCell colspan="4" class="h-24 text-center">Nenhum usuário cadastrado.</TableCell></TableRow>
                                <TableRow
                                    v-for="user in users" :key="user.id"
                                    class="cursor-pointer" :class="selectedUser?.id === user.id && 'bg-muted/50'"
                                    @click="handleSelectUser(user)"
                                >
                                    <TableCell class="font-medium">
                                        <div class="flex flex-col">
                                            <span class="flex items-center gap-1.5 text-base font-bold">
                                                {{ user.name }}
                                                <ShieldCheck v-if="user.role === 'admin'" class="h-3.5 w-3.5 text-primary" />
                                            </span>
                                            <span class="text-xs text-muted-foreground">{{ user.email || 'N/A' }}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge :variant="user.role === 'admin' ? 'default' : 'secondary'">
                                            <ShieldCheck v-if="user.role === 'admin'" class="h-3 w-3 mr-1" />
                                            {{ roleMap[user.role] }}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <div class="flex flex-wrap gap-1">
                                            <span v-if="user.sectors.length === 0" class="text-muted-foreground text-xs">Nenhum setor</span>
                                            <Badge v-for="s in user.sectors.slice(0, 2)" :key="s.id" variant="outline" class="text-[10px] h-4">{{ s.name }}</Badge>
                                            <Badge v-if="user.sectors.length > 2" variant="outline" class="text-[10px] h-4">+{{ user.sectors.length - 2 }}</Badge>
                                        </div>
                                    </TableCell>
                                    <TableCell class="text-right">
                                        <Button variant="ghost" size="icon" class="h-8 w-8 text-destructive" @click.stop="handleDelete(user)"><Trash2 class="h-4 w-4" /></Button>
                                    </TableCell>
                                </TableRow>
                            </TableBody>
                        </Table>
                    </CardContent>
                    <CardFooter><div class="text-xs text-muted-foreground">Mostrando <strong>{{ users.length }}</strong> usuário(s).</div></CardFooter>
                </Card>
            </div>

            <div class="lg:col-span-1 sticky top-4">
                <Card class="flex flex-col max-h-[85vh] shadow-lg border-primary/20">
                    <form @submit.prevent="submit" class="flex flex-1 flex-col min-h-0">
                        <CardHeader class="flex flex-row items-start justify-between bg-primary/5">
                            <div>
                                <CardTitle class="text-lg">{{ selectedUser ? 'Editar Usuário' : 'Cadastrar Novo' }}</CardTitle>
                                <CardDescription class="text-xs">{{ selectedUser ? `Alterando dados de ${selectedUser.name}.` : 'Preencha para cadastrar.' }}</CardDescription>
                            </div>
                            <Button type="button" size="icon" variant="ghost" @click="handleAddNew" title="Limpar e Criar Novo">
                                <XCircle v-if="selectedUser" class="h-5 w-5 text-muted-foreground" />
                                <PlusCircle v-else class="h-5 w-5 text-primary" />
                            </Button>
                        </CardHeader>
                        <CardContent class="flex-1 overflow-y-auto pt-6">
                            <div class="space-y-4 pr-2">
                                <div class="space-y-2">
                                    <Label>Nome de Usuário</Label>
                                    <Input v-model="form.name" placeholder="Nome para login" />
                                    <p v-if="form.errors.name" class="text-xs text-destructive">{{ form.errors.name }}</p>
                                </div>
                                <div class="space-y-2">
                                    <Label>E-mail</Label>
                                    <Input v-model="form.email" type="email" placeholder="email@vendaspro.com" />
                                    <p v-if="form.errors.email" class="text-xs text-destructive">{{ form.errors.email }}</p>
                                </div>
                                <div class="space-y-2">
                                    <Label>WhatsApp</Label>
                                    <Input :model-value="form.whatsapp" placeholder="(00) 00000-0000" @input="onWhatsappInput" />
                                </div>
                                <div class="space-y-2">
                                    <Label>Cargo / Nível de Acesso</Label>
                                    <Select v-model="form.role">
                                        <SelectTrigger><SelectValue placeholder="Selecione o nível" /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="admin">Administrador (Total)</SelectItem>
                                            <SelectItem value="technician">Técnico</SelectItem>
                                            <SelectItem value="finance">Financeiro</SelectItem>
                                            <SelectItem value="service">Atendimento</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <p class="text-[10px] text-muted-foreground">
                                        {{ form.role === 'admin' ? 'Acesso total a todas as configurações e dados.' : 'Acesso restrito conforme definido nas configurações.' }}
                                    </p>
                                </div>
                                <div class="space-y-2">
                                    <Label>Senha</Label>
                                    <div class="relative">
                                        <Input v-model="form.password" :type="showPassword ? 'text' : 'password'" :placeholder="selectedUser ? 'Em branco para não alterar' : 'Mínimo 8 caracteres'" class="pr-10" />
                                        <button type="button" class="absolute inset-y-0 right-0 flex items-center justify-center h-full w-10 text-muted-foreground hover:text-foreground" @click="showPassword = !showPassword">
                                            <EyeOff v-if="showPassword" class="h-5 w-5" /><Eye v-else class="h-5 w-5" />
                                        </button>
                                    </div>
                                    <p v-if="form.errors.password" class="text-xs text-destructive">{{ form.errors.password }}</p>
                                </div>
                                <div class="space-y-2">
                                    <Label>Confirmar Senha</Label>
                                    <div class="relative">
                                        <Input v-model="form.password_confirmation" :type="showConfirmPassword ? 'text' : 'password'" placeholder="Repita a senha" class="pr-10" />
                                        <button type="button" class="absolute inset-y-0 right-0 flex items-center justify-center h-full w-10 text-muted-foreground hover:text-foreground" @click="showConfirmPassword = !showConfirmPassword">
                                            <EyeOff v-if="showConfirmPassword" class="h-5 w-5" /><Eye v-else class="h-5 w-5" />
                                        </button>
                                    </div>
                                </div>
                                <div class="space-y-2">
                                    <Label>Setores Associados</Label>
                                    <Popover>
                                        <PopoverTrigger as-child>
                                            <Button type="button" variant="outline" class="w-full justify-start text-left h-auto min-h-10 px-3 py-2">
                                                <div v-if="form.sector_ids.length > 0" class="flex flex-wrap gap-1">
                                                    <Badge v-for="id in form.sector_ids" :key="id" variant="secondary" class="text-[10px]">{{ sectorMap.get(id) || 'N/A' }}</Badge>
                                                </div>
                                                <span v-else class="text-muted-foreground text-sm">Selecione os setores</span>
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent class="w-[300px] p-0" align="start">
                                            <div class="p-2 border-b bg-background">
                                                <div class="relative">
                                                    <Search class="absolute left-2 top-2.5 h-3 w-3 text-muted-foreground" />
                                                    <Input v-model="searchTermSectors" placeholder="Buscar setor..." class="pl-7 h-8 text-xs" />
                                                </div>
                                            </div>
                                            <ScrollArea class="h-[200px]">
                                                <div class="p-2">
                                                    <div v-for="sector in filteredSectors" :key="sector.id" class="flex items-center space-x-2 rounded-md p-2 hover:bg-muted/50 cursor-pointer" @click="toggleSector(sector.id)">
                                                        <Checkbox :checked="form.sector_ids.includes(sector.id)" />
                                                        <span class="text-sm">{{ sector.name }}</span>
                                                    </div>
                                                    <p v-if="filteredSectors.length === 0" class="text-[10px] text-center text-muted-foreground py-4">Nenhum setor encontrado.</p>
                                                </div>
                                            </ScrollArea>
                                        </PopoverContent>
                                    </Popover>
                                    <p v-if="form.errors.sector_ids" class="text-xs text-destructive">{{ form.errors.sector_ids }}</p>
                                </div>
                            </div>
                        </CardContent>
                        <CardFooter class="bg-muted/10 pt-4">
                            <Button type="submit" class="w-full font-bold" :disabled="form.processing">{{ selectedUser ? 'Salvar Alterações' : 'Cadastrar Usuário' }}</Button>
                        </CardFooter>
                    </form>
                </Card>
            </div>
        </div>
    </div>

    <AlertDialog v-model:open="isDeleteDialogOpen">
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                <AlertDialogDescription>Essa ação não pode ser desfeita. Isso excluirá permanentemente o usuário <span class="font-medium">{{ deletingUser?.name }}</span>.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel @click="deletingUser = null">Cancelar</AlertDialogCancel>
                <AlertDialogAction class="bg-destructive hover:bg-destructive/90" @click="confirmDelete">Confirmar Exclusão</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
</template>
