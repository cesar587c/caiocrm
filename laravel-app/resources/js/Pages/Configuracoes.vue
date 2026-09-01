<script setup>
import { computed, ref } from 'vue';
import { Head, router, useForm, usePage } from '@inertiajs/vue3';
import axios from 'axios';
import {
    Settings, UploadCloud, Trash2, ShieldAlert, Lock, ShieldCheck, CalendarDays,
    ExternalLink, CheckCircle2, Download, Upload, AlertTriangle, MonitorSmartphone,
    Mail, Users, Plus, X, UserPlus,
} from 'lucide-vue-next';
import AppLayout from '@/Layouts/AppLayout.vue';
import { Button } from '@/Components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/Components/ui/card';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import { Textarea } from '@/Components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/Components/ui/tabs';
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/Components/ui/alert-dialog';
import { Alert, AlertDescription, AlertTitle } from '@/Components/ui/alert';
import { Checkbox } from '@/Components/ui/checkbox';
import { Badge } from '@/Components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/Components/ui/tooltip';
import { Separator } from '@/Components/ui/separator';
import { Popover, PopoverContent, PopoverTrigger } from '@/Components/ui/popover';
import { ScrollArea } from '@/Components/ui/scroll-area';
import { useToast } from '@/composables/useToast';
import { formatPhoneNumber } from '@/lib/utils';
import { MENU_ITEMS } from '@/lib/menu';

defineOptions({ layout: AppLayout });

const props = defineProps({ companyProfile: Object, sectors: Array, users: Array });
const { toast } = useToast();
const page = usePage();
const rolePermissions = computed(() => page.props.rolePermissions ?? {});

const roles = [
    { id: 'admin', label: 'Administrador' },
    { id: 'technician', label: 'Técnico' },
    { id: 'finance', label: 'Financeiro' },
    { id: 'service', label: 'Atendimento' },
];

const usersByRole = computed(() => {
    const map = {};
    for (const u of props.users) {
        (map[u.role] ||= []).push(u);
    }
    return map;
});

// --- Empresa ---
const profileForm = useForm({
    name: props.companyProfile.name,
    email: props.companyProfile.email,
    phone: props.companyProfile.phone ? formatPhoneNumber(props.companyProfile.phone) : '',
    address: props.companyProfile.address,
    whatsapp_reminder_message: props.companyProfile.whatsapp_reminder_message || '',
    whatsapp_technician_message: props.companyProfile.whatsapp_technician_message || '',
    google_calendar_email: props.companyProfile.google_calendar_email || '',
    monthly_goal: props.companyProfile.monthly_goal || 0,
    logo: null,
});
const logoPreview = ref(props.companyProfile.logo_url);
const fileInput = ref(null);

function onLogoChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
        toast({ variant: 'destructive', title: 'Arquivo muito grande', description: 'Selecione uma imagem com menos de 2MB.' });
        return;
    }
    profileForm.logo = file;
    logoPreview.value = URL.createObjectURL(file);
}

function submitProfile() {
    profileForm.transform((data) => ({ ...data, phone: data.phone.replace(/\D/g, '') })).post('/dashboard/configuracoes/empresa', {
        forceFormData: true,
        onSuccess: () => toast({ title: 'Configurações Salvas!' }),
    });
}

// --- Setores ---
const newSectorName = ref('');
const sectorToDelete = ref(null);
const isSectorDeleteDialogOpen = ref(false);

function addSector() {
    if (!newSectorName.value.trim()) return;
    router.post('/dashboard/configuracoes/setores', { name: newSectorName.value }, {
        onSuccess: () => { newSectorName.value = ''; toast({ title: 'Setor Criado!' }); },
    });
}

function removeSector() {
    if (!sectorToDelete.value) return;
    router.delete(`/dashboard/configuracoes/setores/${sectorToDelete.value.id}`);
    sectorToDelete.value = null;
}

function attachMember(sectorId, userId) {
    router.post(`/dashboard/configuracoes/setores/${sectorId}/membros`, { user_id: userId }, { preserveScroll: true });
}

function detachMember(sectorId, userId) {
    router.delete(`/dashboard/configuracoes/setores/${sectorId}/membros/${userId}`, { preserveScroll: true });
}

function nonMembers(sector) {
    const memberIds = new Set(sector.users.map((u) => u.id));
    return props.users.filter((u) => !memberIds.has(u.id));
}

// --- Permissões ---
function togglePermission(role, path) {
    if (role === 'admin' && (path === '/dashboard/configuracoes' || path === '/dashboard/usuarios')) {
        toast({ variant: 'destructive', title: 'Acesso Obrigatório', description: 'O Administrador deve sempre ter acesso às Configurações e Usuários.' });
        return;
    }
    const current = rolePermissions.value[role] || [];
    const next = current.includes(path) ? current.filter((p) => p !== path) : [...current, path];
    router.post('/dashboard/configuracoes/permissoes', { role, paths: next }, { preserveScroll: true });
}

// --- Integrações ---
function openGoogleCalendar() {
    let url = 'https://calendar.google.com/calendar/render';
    if (props.companyProfile.google_calendar_email) url += `?authuser=${encodeURIComponent(props.companyProfile.google_calendar_email)}`;
    window.open(url, '_blank');
}

// --- Sincronização ---
const importInput = ref(null);
const isResetDialogOpen = ref(false);

function exportData() {
    window.open('/dashboard/configuracoes/exportar', '_blank');
}

function onImportFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const data = new FormData();
    data.append('backup', file);
    router.post('/dashboard/configuracoes/importar', data, {
        forceFormData: true,
        onSuccess: () => toast({ title: 'Backup Restaurado!' }),
    });
}

function clearAll() {
    router.post('/dashboard/configuracoes/limpar', {}, { onSuccess: () => (isResetDialogOpen.value = false) });
}
</script>

<template>
    <Head title="Configurações" />

    <div class="flex-1 space-y-4 p-8 pt-6">
        <h2 class="text-3xl font-bold tracking-tight font-headline">Configurações</h2>

        <Tabs default-value="company">
            <TabsList class="grid w-full max-w-4xl grid-cols-5">
                <TabsTrigger value="company">Dados da Empresa</TabsTrigger>
                <TabsTrigger value="sectors">Setores e Equipe</TabsTrigger>
                <TabsTrigger value="permissions">Controle de Acesso</TabsTrigger>
                <TabsTrigger value="integrations">Integrações</TabsTrigger>
                <TabsTrigger value="system">Sincronização</TabsTrigger>
            </TabsList>

            <TabsContent value="company">
                <form @submit.prevent="submitProfile">
                    <Card>
                        <CardHeader>
                            <CardTitle class="flex items-center gap-2"><Settings class="h-5 w-5" /> Dados da Sua Empresa</CardTitle>
                            <CardDescription>Estas informações serão usadas nas propostas e em outros documentos gerados pelo sistema.</CardDescription>
                        </CardHeader>
                        <CardContent class="space-y-6 max-w-2xl">
                            <div class="space-y-2"><Label>Nome da Empresa</Label><Input v-model="profileForm.name" /><p v-if="profileForm.errors.name" class="text-xs text-destructive">{{ profileForm.errors.name }}</p></div>
                            <div class="space-y-2"><Label>E-mail de Contato</Label><Input v-model="profileForm.email" type="email" /></div>
                            <div class="space-y-2">
                                <Label>Telefone</Label>
                                <Input :model-value="profileForm.phone" @update:modelValue="(v) => (profileForm.phone = formatPhoneNumber(v))" placeholder="(00) 00000-0000" />
                            </div>
                            <div class="space-y-2"><Label>Endereço</Label><Textarea v-model="profileForm.address" /></div>
                            <div class="space-y-2">
                                <Label>Meta Mensal de Faturamento (R$)</Label>
                                <Input v-model="profileForm.monthly_goal" type="number" step="0.01" min="0" />
                                <p class="text-xs text-muted-foreground">Usada para calcular o progresso "Meta vs Realizado" no Dashboard.</p>
                                <p v-if="profileForm.errors.monthly_goal" class="text-xs text-destructive">{{ profileForm.errors.monthly_goal }}</p>
                            </div>
                            <div class="space-y-2">
                                <Label>Mensagem de Lembrete ao Cliente (WhatsApp)</Label>
                                <Textarea v-model="profileForm.whatsapp_reminder_message" rows="5" />
                                <p class="text-xs text-muted-foreground">Variáveis: {cliente}, {empresa}, {data} e {hora}.</p>
                            </div>
                            <div class="space-y-2">
                                <Label>Mensagem de Aviso ao Técnico (WhatsApp)</Label>
                                <Textarea v-model="profileForm.whatsapp_technician_message" rows="6" />
                                <p class="text-xs text-muted-foreground">Variáveis: {tecnico}, {cliente}, {contato}, {data}, {hora}, {endereco}, {telefone}, {resumo} e {empresa}.</p>
                            </div>
                            <div class="space-y-2">
                                <Label>Logo da Empresa</Label>
                                <div class="flex flex-col gap-4">
                                    <div class="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-muted/50 hover:bg-muted/80" @click="fileInput?.click()">
                                        <UploadCloud class="w-8 h-8 mb-2 text-muted-foreground" />
                                        <p class="text-sm text-muted-foreground">Clique para carregar o logo</p>
                                        <p class="text-xs text-muted-foreground">Máx. 2MB</p>
                                        <input ref="fileInput" type="file" class="hidden" accept="image/*" @change="onLogoChange" />
                                    </div>
                                    <div v-if="logoPreview" class="p-4 border rounded-md flex items-center justify-center bg-muted/20">
                                        <img :src="logoPreview" alt="Logo Preview" class="max-h-24 w-auto object-contain" />
                                    </div>
                                </div>
                            </div>
                            <Button type="submit" :disabled="profileForm.processing">Salvar Alterações</Button>
                        </CardContent>
                    </Card>
                </form>
            </TabsContent>

            <TabsContent value="sectors">
                <Card>
                    <CardHeader>
                        <CardTitle class="flex items-center gap-2"><Users class="h-5 w-5" /> Gerenciar Setores e Equipe</CardTitle>
                        <CardDescription>Defina os departamentos e vincule os colaboradores a cada área.</CardDescription>
                    </CardHeader>
                    <CardContent class="space-y-8">
                        <div class="flex gap-2 max-w-xl">
                            <Input v-model="newSectorName" placeholder="Nome do novo setor (ex: Técnico, Comercial...)" @keyup.enter="addSector" />
                            <Button type="button" class="gap-2" @click="addSector"><Plus class="h-4 w-4" /> Adicionar Setor</Button>
                        </div>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div v-for="sector in sectors" :key="sector.id" class="border rounded-xl p-5 space-y-4 bg-muted/10 hover:bg-muted/20 transition-colors border-primary/10 shadow-sm">
                                <div class="flex items-center justify-between">
                                    <div class="flex items-center gap-3">
                                        <div class="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center"><Users class="h-5 w-5 text-primary" /></div>
                                        <div>
                                            <h4 class="font-bold text-lg leading-tight">{{ sector.name }}</h4>
                                            <p class="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">{{ sector.users.length }} integrante(s)</p>
                                        </div>
                                    </div>
                                    <Button type="button" variant="ghost" size="icon" class="text-destructive hover:bg-destructive/10 h-8 w-8" @click="sectorToDelete = sector; isSectorDeleteDialogOpen = true"><Trash2 class="h-4 w-4" /></Button>
                                </div>
                                <div class="space-y-3 pt-2 border-t">
                                    <div class="flex flex-wrap gap-1.5">
                                        <Badge v-for="member in sector.users" :key="member.id" variant="secondary" class="gap-1 pl-2 pr-1 h-7 bg-primary/5 border border-primary/20 text-foreground font-medium">
                                            {{ member.name }}
                                            <button type="button" class="h-5 w-5 rounded-full hover:bg-destructive hover:text-white transition-all flex items-center justify-center" @click="detachMember(sector.id, member.id)">
                                                <X class="h-3 w-3" />
                                            </button>
                                        </Badge>
                                        <Popover>
                                            <PopoverTrigger as-child>
                                                <Button variant="outline" size="sm" class="h-7 gap-1 border-dashed hover:border-primary hover:text-primary"><UserPlus class="h-3.5 w-3.5" /> Vincular Membro</Button>
                                            </PopoverTrigger>
                                            <PopoverContent class="p-0 w-64" align="start">
                                                <div class="p-2.5 border-b bg-muted/30"><p class="text-[10px] font-bold uppercase text-center tracking-widest text-primary">Selecionar Colaborador</p></div>
                                                <ScrollArea class="h-48">
                                                    <div class="p-2 space-y-1">
                                                        <Button v-for="u in nonMembers(sector)" :key="u.id" variant="ghost" class="w-full justify-start text-xs h-9 hover:bg-primary/10" @click="attachMember(sector.id, u.id)">
                                                            <UserPlus class="h-3.5 w-3.5 mr-2 text-primary" /><span class="font-semibold">{{ u.name }}</span>
                                                        </Button>
                                                        <div v-if="nonMembers(sector).length === 0" class="flex flex-col items-center justify-center py-8 opacity-50">
                                                            <ShieldCheck class="h-8 w-8 mb-2" />
                                                            <p class="text-[10px] text-center italic">Todos os usuários já<br />estão neste setor.</p>
                                                        </div>
                                                    </div>
                                                </ScrollArea>
                                            </PopoverContent>
                                        </Popover>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </TabsContent>

            <TabsContent value="permissions">
                <Card>
                    <CardHeader>
                        <CardTitle class="flex items-center gap-2"><Lock class="h-5 w-5" /> Gestão de Permissões por Cargo</CardTitle>
                        <CardDescription>Defina quais módulos cada cargo pode acessar.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div class="overflow-x-auto">
                            <table class="w-full border-collapse">
                                <thead>
                                    <tr class="border-b">
                                        <th class="p-4 text-left font-semibold text-sm">Módulo / Tela</th>
                                        <th v-for="role in roles" :key="role.id" class="p-4 text-center font-semibold text-sm min-w-[120px]">
                                            <div class="flex flex-col items-center gap-1">
                                                <div class="flex items-center gap-1.5"><ShieldCheck v-if="role.id === 'admin'" class="h-3.5 w-3.5 text-primary" /><span>{{ role.label }}</span></div>
                                                <TooltipProvider>
                                                    <Tooltip>
                                                        <TooltipTrigger as-child><Badge variant="outline" class="text-[10px] cursor-help">{{ usersByRole[role.id]?.length || 0 }} usuários</Badge></TooltipTrigger>
                                                        <TooltipContent>
                                                            <div class="text-xs space-y-1">
                                                                <p class="font-semibold border-b pb-1 mb-1">Pessoas vinculadas:</p>
                                                                <p v-for="u in usersByRole[role.id] || []" :key="u.id">{{ u.name }}</p>
                                                                <p v-if="!(usersByRole[role.id]?.length)" class="italic">Ninguém vinculado</p>
                                                            </div>
                                                        </TooltipContent>
                                                    </Tooltip>
                                                </TooltipProvider>
                                            </div>
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr v-for="item in MENU_ITEMS" :key="item.href" class="border-b hover:bg-muted/30">
                                        <td class="p-4 flex items-center gap-3"><component :is="item.icon" class="h-4 w-4 text-muted-foreground" /><span class="text-sm">{{ item.label }}</span></td>
                                        <td v-for="role in roles" :key="role.id" class="p-4 text-center">
                                            <Checkbox
                                                :checked="(rolePermissions[role.id] || []).includes(item.href)"
                                                :disabled="role.id === 'admin' && (item.href === '/dashboard/configuracoes' || item.href === '/dashboard/usuarios')"
                                                @update:checked="() => togglePermission(role.id, item.href)"
                                            />
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                    <CardFooter><p class="text-xs text-muted-foreground flex items-center gap-1.5"><ShieldAlert class="h-3.5 w-3.5" /> O cargo de Administrador possui acesso obrigatório às Configurações e Usuários.</p></CardFooter>
                </Card>
            </TabsContent>

            <TabsContent value="integrations">
                <Card>
                    <CardHeader>
                        <CardTitle class="flex items-center gap-2"><CalendarDays class="h-5 w-5 text-emerald-500" /> Google Agenda</CardTitle>
                        <CardDescription>Configure qual e-mail do Google deve ser usado para os agendamentos.</CardDescription>
                    </CardHeader>
                    <CardContent class="space-y-6">
                        <form @submit.prevent="submitProfile" class="grid gap-6 max-w-2xl">
                            <div class="space-y-2">
                                <Label class="flex items-center gap-2"><Mail class="h-4 w-4 text-primary" /> E-mail do Google Agenda (Fixo)</Label>
                                <Input v-model="profileForm.google_calendar_email" placeholder="seu-email@gmail.com" />
                                <p class="text-xs text-muted-foreground">Ao configurar um e-mail aqui, o sistema sempre tentará abrir esta conta específica para salvar agendamentos.</p>
                            </div>
                            <Button type="submit" :disabled="profileForm.processing">Salvar Configurações de Agenda</Button>
                        </form>
                        <Separator />
                        <div class="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-6 border rounded-lg bg-muted/20">
                            <div class="flex items-center gap-4">
                                <div class="h-14 w-14 rounded-full bg-emerald-500/10 flex items-center justify-center"><CalendarDays class="h-8 w-8 text-emerald-600" /></div>
                                <div class="space-y-1">
                                    <h4 class="font-bold text-lg">Google Calendar (Sincronização)</h4>
                                    <div class="flex items-center gap-2 text-[10px] text-emerald-600 font-bold uppercase tracking-wider"><CheckCircle2 class="h-3 w-3" /> Integração Direcionada Habilitada</div>
                                </div>
                            </div>
                            <Button type="button" variant="outline" class="gap-2" @click="openGoogleCalendar"><ExternalLink class="h-4 w-4" /> Ver Minha Agenda Google</Button>
                        </div>
                    </CardContent>
                </Card>
            </TabsContent>

            <TabsContent value="system">
                <Card>
                    <CardHeader>
                        <CardTitle class="flex items-center gap-2"><MonitorSmartphone class="h-5 w-5 text-primary" /> Sincronização de Dados</CardTitle>
                        <CardDescription>Exporte um backup completo ou restaure dados a partir de um arquivo.</CardDescription>
                    </CardHeader>
                    <CardContent class="space-y-6">
                        <Alert class="bg-primary/5 border-primary/20">
                            <AlertTriangle class="h-4 w-4 text-primary" />
                            <AlertTitle class="font-bold">Atenção!</AlertTitle>
                            <AlertDescription class="text-xs">Seus dados vivem no banco de dados do servidor. Use esta ferramenta para gerar backups periódicos ou migrar dados.</AlertDescription>
                        </Alert>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div class="p-4 border rounded-lg space-y-3 bg-card">
                                <h4 class="font-bold flex items-center gap-2"><Download class="h-4 w-4 text-primary" /> 1. Exportar Dados</h4>
                                <p class="text-xs text-muted-foreground">Gera um arquivo com todos os clientes, propostas, agendas e configurações atuais.</p>
                                <Button type="button" variant="outline" class="gap-2 border-primary/30 text-primary hover:bg-primary/10" @click="exportData">Salvar Backup Atual (.json)</Button>
                            </div>
                            <div class="p-4 border rounded-lg space-y-3 bg-card">
                                <h4 class="font-bold flex items-center gap-2"><Upload class="h-4 w-4 text-emerald-500" /> 2. Importar Backup</h4>
                                <p class="text-xs text-muted-foreground">Carrega um arquivo de backup para restaurar clientes/produtos/perfil da empresa.</p>
                                <input type="file" ref="importInput" class="hidden" accept=".json" @change="onImportFile" />
                                <Button type="button" variant="outline" class="gap-2 text-emerald-500 hover:text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/10" @click="importInput?.click()">Carregar Backup</Button>
                            </div>
                        </div>
                        <div class="mt-8 pt-8 border-t">
                            <h3 class="text-destructive font-bold flex items-center gap-2 mb-4"><ShieldAlert class="h-5 w-5" /> Zona de Perigo</h3>
                            <Alert variant="destructive" class="bg-destructive/5"><AlertTitle>Limpar Dados Operacionais</AlertTitle><AlertDescription>Isso apagará permanentemente clientes, propostas, OS e agendamentos.</AlertDescription></Alert>
                            <Button type="button" variant="destructive" class="mt-4" @click="isResetDialogOpen = true">Limpar Tudo</Button>
                        </div>
                    </CardContent>
                </Card>
            </TabsContent>
        </Tabs>
    </div>

    <AlertDialog v-model:open="isSectorDeleteDialogOpen">
        <AlertDialogContent>
            <AlertDialogHeader><AlertDialogTitle>Excluir Setor?</AlertDialogTitle><AlertDialogDescription>O setor "{{ sectorToDelete?.name }}" será removido.</AlertDialogDescription></AlertDialogHeader>
            <AlertDialogFooter><AlertDialogCancel @click="sectorToDelete = null">Cancelar</AlertDialogCancel><AlertDialogAction @click="removeSector">Confirmar</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>

    <AlertDialog v-model:open="isResetDialogOpen">
        <AlertDialogContent>
            <AlertDialogHeader><AlertDialogTitle>Confirmar Limpeza Total?</AlertDialogTitle><AlertDialogDescription>Essa ação não pode ser desfeita e removerá seus dados operacionais.</AlertDialogDescription></AlertDialogHeader>
            <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction class="bg-destructive hover:bg-destructive/90" @click="clearAll">Limpar Tudo</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
</template>
