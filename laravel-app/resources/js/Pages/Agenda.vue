<script setup>
import { computed, reactive, ref, watch } from 'vue';
import { Head, router, useForm, usePage } from '@inertiajs/vue3';
import axios from 'axios';
import {
    addMonths, subMonths, format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
    eachDayOfInterval, isSameMonth, isToday, isSameDay, parseISO,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
    ChevronLeft, ChevronRight, Clock, MapPin, Phone, User, Pencil, Trash2, Briefcase,
    Calendar as CalendarIcon, CheckCircle2, XCircle, CalendarPlus, CalendarClock, Loader2,
    Search, Send, BellRing, Ban, AlertTriangle, Check,
} from 'lucide-vue-next';
import AppLayout from '@/Layouts/AppLayout.vue';
import { Button } from '@/Components/ui/button';
import {
    Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/Components/ui/dialog';
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/Components/ui/alert-dialog';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import { ScrollArea } from '@/Components/ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '@/Components/ui/popover';
import { Textarea } from '@/Components/ui/textarea';
import { Badge } from '@/Components/ui/badge';
import { Checkbox } from '@/Components/ui/checkbox';
import { useToast } from '@/composables/useToast';
import { cn, formatPhoneNumber } from '@/lib/utils';

defineOptions({ layout: AppLayout });

const props = defineProps({
    appointments: Array,
    customers: Array,
    sectors: Array,
    users: Array,
});
const { toast } = useToast();
const page = usePage();

const isAdmin = computed(() => page.props.auth.user?.role === 'admin');

const currentMonth = ref(new Date());
const selectedDate = ref(new Date());
const isModalOpen = ref(false);
const editingAppointment = ref(null);
const selectedAppointment = ref(null);
const appointmentToDelete = ref(null);
const isDeleteDialogOpen = ref(false);
const searchTermAssignees = ref('');
const isJustificationDialogOpen = ref(false);
const appointmentToProcess = ref(null);
const justification = ref('');
const isCustomerSearchOpen = ref(false);
const sentMessageIndexes = ref([]);

const notificationState = reactive({ isOpen: false, isLoading: false, isSimulated: false, details: [] });

const defaultValues = { date: format(new Date(), 'yyyy-MM-dd'), time: '', client_name: '', address: '', phone: '', contact: '', assigned_to: [], summary: '' };
const form = useForm({ ...defaultValues });

const weekdays = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

const days = computed(() => {
    const monthStart = startOfMonth(currentMonth.value);
    const monthEnd = endOfMonth(monthStart);
    const start = startOfWeek(monthStart, { weekStartsOn: 0 });
    const end = endOfWeek(monthEnd, { weekStartsOn: 0 });
    return eachDayOfInterval({ start, end });
});

const appointmentsByDate = computed(() => {
    const map = {};
    for (const app of props.appointments) {
        (map[app.date] ||= []).push(app);
    }
    return map;
});

function getAssignedName(token) {
    const [type, id] = token.split(':');
    if (type === 'user') return props.users.find((u) => String(u.id) === id)?.name || 'Usuário';
    if (type === 'sector') return `Setor: ${props.sectors.find((s) => String(s.id) === id)?.name || 'Setor'}`;
    return token;
}

function handlePrevMonth() { currentMonth.value = subMonths(currentMonth.value, 1); }
function handleNextMonth() { currentMonth.value = addMonths(currentMonth.value, 1); }

function openModalForDay(day) {
    selectedDate.value = day;
    searchTermAssignees.value = '';
    editingAppointment.value = null;
    selectedAppointment.value = null;
    form.reset();
    Object.assign(form, defaultValues, { date: format(day, 'yyyy-MM-dd') });
    isModalOpen.value = true;
}

function handleDayClick(day) {
    if (isSameMonth(day, currentMonth.value)) openModalForDay(day);
}

function handleEditClick(app) {
    editingAppointment.value = app;
    searchTermAssignees.value = '';
    form.clearErrors();
    Object.assign(form, {
        date: app.date,
        time: app.time,
        client_name: app.client_name,
        address: app.address,
        phone: app.phone ? formatPhoneNumber(app.phone) : '',
        contact: app.contact,
        assigned_to: [...app.assigned_to],
        summary: app.summary || '',
    });
    isModalOpen.value = true;
}

function handleCustomerSelect(customer) {
    const mainName = customer.nome_fantasia || customer.name;
    form.client_name = mainName;
    form.address = customer.endereco || '';
    form.phone = formatPhoneNumber(customer.telefone || customer.phone_2 || '');
    form.contact = customer.contact_name || customer.contact_name_2 || mainName;
    isCustomerSearchOpen.value = false;
}

function handleAddToGoogleCalendar(app) {
    const [year, month, day] = app.date.split('-').map(Number);
    const [hour, minute] = app.time.split(':').map(Number);
    const start = new Date(year, month - 1, day, hour, minute);
    const end = new Date(start.getTime() + 60 * 60 * 1000);
    const fmt = (d) => format(d, "yyyyMMdd'T'HHmmss");
    const title = encodeURIComponent(`Visita Técnica: ${app.client_name}`);
    const dates = `${fmt(start)}/${fmt(end)}`;
    const details = encodeURIComponent(`Contato: ${app.contact}\nTelefone: ${app.phone || 'N/A'}\nResumo: ${app.summary || ''}\n\nAgendado via VendasPro`);
    const location = encodeURIComponent(app.address);
    window.open(`https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${dates}&details=${details}&location=${location}`, '_blank');
}

async function triggerNotifications(appointmentId) {
    notificationState.isOpen = true;
    notificationState.isLoading = true;
    sentMessageIndexes.value = [];
    try {
        const { data } = await axios.post(`/dashboard/agenda/${appointmentId}/notify`);
        notificationState.isLoading = false;
        notificationState.isSimulated = !!data.isSimulated;
        notificationState.details = data.details || [];
        if (!data.isSimulated) toast({ title: 'Notificações Enviadas', description: 'O cliente e os técnicos foram avisados via WhatsApp.' });
    } catch (e) {
        notificationState.isOpen = false;
        notificationState.isLoading = false;
        toast({ variant: 'destructive', title: 'Erro nas Notificações' });
    }
}

function sendManualWhatsApp(detail, index) {
    const cleanPhone = detail.phone.replace(/\D/g, '');
    const phoneWithCountryCode = cleanPhone.length > 11 ? cleanPhone : `55${cleanPhone}`;
    window.open(`https://wa.me/${phoneWithCountryCode}?text=${encodeURIComponent(detail.message)}`, 'vendaspro_whatsapp');
    if (!sentMessageIndexes.value.includes(index)) sentMessageIndexes.value.push(index);
}

function statusUpdate(app, status, extra = {}) {
    router.patch(`/dashboard/agenda/${app.id}/status`, { status, ...extra }, {
        preserveScroll: true,
        onSuccess: () => { selectedAppointment.value = null; },
    });
}

function handleMarkAsCompleted() {
    if (!selectedAppointment.value) return;
    statusUpdate(selectedAppointment.value, 'completed');
    toast({ title: 'Agendamento Concluído!' });
}

function handleMarkAsCancelled() {
    if (!selectedAppointment.value || !isAdmin.value) return;
    statusUpdate(selectedAppointment.value, 'cancelled');
    toast({ variant: 'destructive', title: 'Agendamento Cancelado' });
}

function handleConfirmMissed() {
    if (!appointmentToProcess.value || !justification.value.trim()) {
        toast({ variant: 'destructive', title: 'Justificativa é obrigatória.' });
        return;
    }
    statusUpdate(appointmentToProcess.value, 'missed', { justification: justification.value.trim() });
    isJustificationDialogOpen.value = false;
    appointmentToProcess.value = null;
    justification.value = '';
}

function confirmDelete() {
    if (!appointmentToDelete.value || !isAdmin.value) return;
    router.delete(`/dashboard/agenda/${appointmentToDelete.value.id}`, {
        onSuccess: () => { selectedAppointment.value = null; isDeleteDialogOpen.value = false; appointmentToDelete.value = null; },
    });
}

function onSubmit() {
    if (editingAppointment.value) {
        form.transform((d) => ({ ...d, phone: d.phone.replace(/\D/g, '') })).put(`/dashboard/agenda/${editingAppointment.value.id}`, {
            onSuccess: () => {
                const id = editingAppointment.value.id;
                isModalOpen.value = false;
                editingAppointment.value = null;
                selectedAppointment.value = null;
                triggerNotifications(id);
            },
        });
    } else {
        form.transform((d) => ({ ...d, phone: d.phone.replace(/\D/g, '') })).post('/dashboard/agenda', {
            onSuccess: () => {
                isModalOpen.value = false;
                const createdId = page.props.flash?.created_id;
                if (createdId) triggerNotifications(createdId);
            },
        });
    }
}

const selectedDayAppointments = computed(() => {
    const key = format(selectedDate.value, 'yyyy-MM-dd');
    return (appointmentsByDate.value[key] || []).slice().sort((a, b) => a.time.localeCompare(b.time));
});

const filteredSectors = computed(() => props.sectors.filter((s) => s.name.toLowerCase().includes(searchTermAssignees.value.toLowerCase())));
const filteredUsers = computed(() => props.users.filter((u) => u.name.toLowerCase().includes(searchTermAssignees.value.toLowerCase())));

const suggestedCustomers = computed(() => {
    const term = form.client_name;
    if (!term || term.length < 2 || editingAppointment.value) return [];
    return props.customers.filter((c) => c.name.toLowerCase().includes(term.toLowerCase()) || (c.nome_fantasia || '').toLowerCase().includes(term.toLowerCase())).slice(0, 5);
});

function toggleAssignee(token) {
    const idx = form.assigned_to.indexOf(token);
    if (idx >= 0) form.assigned_to.splice(idx, 1);
    else form.assigned_to.push(token);
}

function statusBadge(status) {
    return {
        completed: { label: 'Concluído', class: 'bg-green-600/20 text-green-400 border-green-600/30' },
        missed: { label: 'Não Concluído', class: '' },
        cancelled: { label: 'Cancelado', class: 'bg-gray-600/20 text-gray-400 border-gray-600/30' },
        scheduled: { label: 'Agendado', class: '' },
    }[status] || { label: status, class: '' };
}

const fieldsDisabled = computed(() => !isAdmin.value && !!editingAppointment.value);
</script>

<template>
    <Head title="Agenda" />

    <div class="flex h-full flex-col bg-card shadow-xl rounded-2xl p-6 text-card-foreground m-4 md:m-8">
        <div class="flex items-center justify-between mb-6">
            <div>
                <h2 class="text-2xl font-bold capitalize text-foreground">{{ format(currentMonth, 'MMMM', { locale: ptBR }) }}</h2>
                <p class="text-lg text-muted-foreground">{{ format(currentMonth, 'yyyy') }}</p>
            </div>
            <div class="flex items-center gap-1">
                <Button variant="ghost" size="icon" class="rounded-lg h-10 w-10" @click="handlePrevMonth"><ChevronLeft class="h-5 w-5" /></Button>
                <Button variant="ghost" size="icon" class="rounded-lg h-10 w-10" @click="handleNextMonth"><ChevronRight class="h-5 w-5" /></Button>
            </div>
        </div>

        <div class="grid flex-1 grid-cols-7 text-center">
            <div v-for="(d, i) in weekdays" :key="i" class="flex items-center justify-center text-sm font-medium text-muted-foreground py-2 border-b">{{ d }}</div>
            <div
                v-for="day in days" :key="day.toString()"
                :class="cn('flex flex-col items-center justify-start p-2 border-t border-l aspect-[10/7] min-h-0', isSameMonth(day, currentMonth) ? 'cursor-pointer' : 'bg-muted/30')"
                @click="handleDayClick(day)"
            >
                <div :class="cn(
                    'w-8 h-8 flex items-center justify-center rounded-full text-base font-medium',
                    !isSameMonth(day, currentMonth) && 'text-muted-foreground/50',
                    !isSameDay(day, selectedDate) && isSameMonth(day, currentMonth) && 'hover:bg-accent/50',
                    isSameDay(day, selectedDate) && 'bg-primary text-primary-foreground',
                    isToday(day) && !isSameDay(day, selectedDate) && 'border-2 border-primary/50',
                )">
                    {{ format(day, 'd') }}
                </div>
                <div v-if="isSameMonth(day, currentMonth)" class="flex items-center gap-1 mt-2 h-2">
                    <div v-for="(event, index) in (appointmentsByDate[format(day, 'yyyy-MM-dd')] || []).slice(0, 3)" :key="index" :class="cn('w-2 h-2 rounded-full', ['bg-chart-1', 'bg-chart-2', 'bg-chart-3'][index % 3])" />
                </div>
            </div>
        </div>
    </div>

    <Dialog v-model:open="isModalOpen">
        <DialogContent class="sm:max-w-[425px] md:max-w-3xl flex flex-col h-[85vh]">
            <DialogHeader>
                <DialogTitle>Agenda para {{ format(selectedDate, 'dd/MM/yyyy', { locale: ptBR }) }}</DialogTitle>
                <DialogDescription>{{ isAdmin ? 'Adicione, edite ou exclua compromissos.' : 'Você pode apenas reagendar (data/hora) compromissos existentes.' }}</DialogDescription>
            </DialogHeader>
            <div class="grid flex-1 grid-cols-1 md:grid-cols-2 gap-6 py-4 overflow-y-auto">
                <div class="space-y-4">
                    <h3 class="font-semibold text-lg text-foreground">Compromissos Agendados</h3>
                    <ScrollArea class="h-full pr-4">
                        <div v-if="selectedDayAppointments.length > 0" class="space-y-4">
                            <div
                                v-for="app in selectedDayAppointments" :key="app.id"
                                :class="cn('relative group p-3 bg-muted/50 rounded-lg text-sm space-y-2 cursor-pointer', selectedAppointment?.id === app.id && !editingAppointment && 'ring-2 ring-primary')"
                                @click="!editingAppointment && (selectedAppointment = app)"
                            >
                                <div class="flex justify-between items-start">
                                    <p class="font-semibold text-base pr-20">{{ app.client_name }}</p>
                                    <div class="flex items-center gap-2 text-primary font-bold"><Clock class="h-4 w-4" />{{ app.time }}</div>
                                </div>
                                <Badge :class="statusBadge(app.status).class" :variant="['missed', 'cancelled'].includes(app.status) ? 'destructive' : 'outline'">{{ statusBadge(app.status).label }}</Badge>
                                <p class="text-muted-foreground flex items-center gap-2"><MapPin class="h-4 w-4" />{{ app.address }}</p>
                                <p class="text-muted-foreground flex items-center gap-2"><User class="h-4 w-4" />{{ app.contact }}</p>
                                <div class="flex flex-wrap gap-1 items-start">
                                    <Briefcase class="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                                    <div class="flex flex-wrap gap-1"><Badge v-for="at in app.assigned_to" :key="at" variant="outline" class="text-[10px] py-0">{{ getAssignedName(at) }}</Badge></div>
                                </div>
                                <p v-if="app.phone" class="text-muted-foreground flex items-center gap-2"><Phone class="h-4 w-4" />{{ formatPhoneNumber(app.phone) }}</p>

                                <div class="absolute top-2 right-2 flex items-center opacity-0 group-hover:opacity-100 transition-opacity bg-muted/80 rounded-md shadow-sm border">
                                    <Button variant="ghost" size="icon" class="h-7 w-7 text-emerald-600" @click.stop="handleAddToGoogleCalendar(app)"><CalendarPlus class="h-4 w-4" /></Button>
                                    <Button variant="ghost" size="icon" class="h-7 w-7 text-primary" @click.stop="triggerNotifications(app.id)"><BellRing class="h-4 w-4" /></Button>
                                    <Button variant="ghost" size="icon" class="h-7 w-7" @click.stop="handleEditClick(app)"><Pencil class="h-4 w-4" /></Button>
                                    <Button v-if="isAdmin" variant="ghost" size="icon" class="h-7 w-7 text-destructive" @click.stop="appointmentToDelete = app; isDeleteDialogOpen = true"><Trash2 class="h-4 w-4" /></Button>
                                </div>
                            </div>
                        </div>
                        <div v-else class="flex flex-col items-center justify-center h-full text-center text-muted-foreground border-2 border-dashed rounded-lg p-8"><p>Nenhum compromisso para este dia.</p></div>
                    </ScrollArea>
                </div>
                <div>
                    <h3 class="font-semibold text-lg text-foreground mb-4">{{ editingAppointment ? 'Editar Agendamento' : 'Novo Agendamento' }}</h3>
                    <form id="appointment-form" @submit.prevent="onSubmit" class="space-y-4">
                        <div class="grid grid-cols-2 gap-3">
                            <div class="space-y-2"><Label>Data</Label><Input v-model="form.date" type="date" /></div>
                            <div class="space-y-2"><Label>Horário</Label><Input v-model="form.time" type="time" /></div>
                        </div>
                        <div class="space-y-2 relative">
                            <Label>Nome do Cliente</Label>
                            <Input v-model="form.client_name" autocomplete="off" :disabled="fieldsDisabled" @focus="isCustomerSearchOpen = true" />
                            <div v-if="isCustomerSearchOpen && suggestedCustomers.length > 0" class="absolute z-50 mt-1 w-full bg-card border rounded-md shadow-lg overflow-hidden">
                                <div v-for="customer in suggestedCustomers" :key="customer.id" class="px-4 py-2 hover:bg-accent cursor-pointer" @mousedown.prevent="handleCustomerSelect(customer)">
                                    <p class="text-sm font-semibold">{{ customer.nome_fantasia || customer.name }}</p>
                                    <p class="text-[10px] text-muted-foreground truncate">{{ customer.endereco || 'Sem endereço' }}</p>
                                </div>
                            </div>
                        </div>
                        <div class="space-y-2"><Label>Endereço</Label><Input v-model="form.address" :disabled="fieldsDisabled" /></div>
                        <div class="space-y-2">
                            <Label>Telefone (WhatsApp)</Label>
                            <Input :model-value="form.phone" @update:modelValue="(v) => (form.phone = formatPhoneNumber(v))" :disabled="fieldsDisabled" placeholder="(00) 00000-0000" />
                        </div>
                        <div class="space-y-2"><Label>Contato na Visita</Label><Input v-model="form.contact" :disabled="fieldsDisabled" /></div>
                        <div class="space-y-2">
                            <Label>Setor/Responsável (Múltiplos)</Label>
                            <Popover :modal="false">
                                <PopoverTrigger as-child :disabled="fieldsDisabled">
                                    <Button type="button" variant="outline" class="w-full justify-start text-left h-auto min-h-10 px-3 py-2" :disabled="fieldsDisabled">
                                        <div v-if="form.assigned_to.length > 0" class="flex flex-wrap gap-1"><Badge v-for="val in form.assigned_to" :key="val" variant="secondary" class="text-[10px]">{{ getAssignedName(val) }}</Badge></div>
                                        <span v-else class="text-muted-foreground text-sm">Selecione os responsáveis</span>
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent class="w-[350px] p-0" align="start">
                                    <div class="p-2 border-b bg-background"><div class="relative"><Search class="absolute left-2 top-2.5 h-3 w-3 text-muted-foreground" /><Input v-model="searchTermAssignees" placeholder="Buscar por nome..." class="pl-7 h-8 text-xs" /></div></div>
                                    <ScrollArea class="h-[250px]">
                                        <div class="p-2 space-y-4">
                                            <div>
                                                <p class="text-[10px] font-bold text-muted-foreground uppercase px-2 mb-2">Setores</p>
                                                <div v-for="sector in filteredSectors" :key="`s-${sector.id}`" class="flex items-center space-x-2 rounded-md p-2 hover:bg-muted/50 cursor-pointer" @click="toggleAssignee(`sector:${sector.id}`)">
                                                    <Checkbox :checked="form.assigned_to.includes(`sector:${sector.id}`)" /><span class="text-sm">{{ sector.name }}</span>
                                                </div>
                                            </div>
                                            <div>
                                                <p class="text-[10px] font-bold text-muted-foreground uppercase px-2 mb-2">Colaboradores</p>
                                                <div v-for="u in filteredUsers" :key="`u-${u.id}`" class="flex items-center space-x-2 rounded-md p-2 hover:bg-muted/50 cursor-pointer" @click="toggleAssignee(`user:${u.id}`)">
                                                    <Checkbox :checked="form.assigned_to.includes(`user:${u.id}`)" /><span class="text-sm">{{ u.name }}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </ScrollArea>
                                </PopoverContent>
                            </Popover>
                            <p v-if="form.errors.assigned_to" class="text-xs text-destructive">{{ form.errors.assigned_to }}</p>
                        </div>
                        <div class="space-y-2"><Label>Resumo/Notas</Label><Textarea v-model="form.summary" :disabled="fieldsDisabled" /></div>
                    </form>
                </div>
            </div>
            <DialogFooter class="pt-4 gap-2 border-t">
                <template v-if="editingAppointment">
                    <Button type="button" variant="outline" @click="editingAppointment = null; selectedAppointment = null">Cancelar</Button>
                    <Button v-if="isAdmin && selectedAppointment?.status !== 'cancelled'" type="button" variant="destructive" @click="handleMarkAsCancelled">Cancelar Visita</Button>
                    <Button type="submit" form="appointment-form">Salvar e Notificar</Button>
                </template>
                <template v-else>
                    <template v-if="selectedAppointment">
                        <Button type="button" variant="outline" class="mr-auto gap-2" @click="handleAddToGoogleCalendar(selectedAppointment)"><CalendarPlus class="h-4 w-4 text-emerald-600" /> Google Agenda</Button>
                        <Button type="button" variant="secondary" @click="handleMarkAsCompleted">Marcar Concluído</Button>
                        <Button type="button" @click="handleEditClick(selectedAppointment)">Reagendar</Button>
                        <Button v-if="isAdmin" type="button" variant="destructive" @click="appointmentToDelete = selectedAppointment; isDeleteDialogOpen = true">Excluir</Button>
                    </template>
                    <Button v-if="isAdmin || !editingAppointment" type="submit" form="appointment-form">Agendar e Notificar</Button>
                </template>
            </DialogFooter>
        </DialogContent>
    </Dialog>

    <Dialog v-model:open="notificationState.isOpen">
        <DialogContent class="sm:max-w-md">
            <DialogHeader>
                <DialogTitle class="flex items-center gap-2">
                    <Loader2 v-if="notificationState.isLoading" class="h-5 w-5 animate-spin" />
                    <AlertTriangle v-else-if="notificationState.isSimulated" class="h-5 w-5 text-yellow-500" />
                    <CheckCircle2 v-else class="h-5 w-5 text-green-500" />
                    {{ notificationState.isLoading ? 'Enviando Notificações' : (notificationState.isSimulated ? 'Configuração Pendente' : 'Notificações Enviadas') }}
                </DialogTitle>
                <DialogDescription>
                    {{ notificationState.isLoading ? 'Aguarde um momento enquanto o sistema processa os avisos.' : (notificationState.isSimulated ? 'A API automática não está configurada. Por favor, envie as mensagens manualmente abaixo.' : 'O cliente e os técnicos foram notificados com sucesso.') }}
                </DialogDescription>
            </DialogHeader>
            <div v-if="notificationState.isLoading" class="py-8 flex justify-center"><Loader2 class="h-12 w-12 animate-spin text-primary" /></div>
            <ScrollArea v-else class="max-h-[50vh] pr-4">
                <div class="space-y-3 py-2">
                    <div v-for="(detail, idx) in notificationState.details" :key="idx" class="flex flex-col gap-2 p-3 border rounded-lg bg-muted/30">
                        <div class="flex items-center justify-between">
                            <span class="text-sm font-semibold">{{ detail.name }}</span>
                            <Badge variant="outline" class="text-[10px] uppercase">{{ detail.to === 'client' ? 'Cliente' : 'Técnico' }}</Badge>
                        </div>
                        <div class="text-xs text-muted-foreground line-clamp-2 italic">"{{ detail.message }}"</div>
                        <Button
                            size="sm"
                            :variant="sentMessageIndexes.includes(idx) ? 'outline' : (notificationState.isSimulated ? 'default' : 'outline')"
                            :class="cn('w-full h-8 gap-2', sentMessageIndexes.includes(idx) && 'text-green-500 border-green-500/30 bg-green-500/5')"
                            @click="sendManualWhatsApp(detail, idx)"
                        >
                            <Check v-if="sentMessageIndexes.includes(idx)" class="h-3.5 w-3.5" /><Send v-else class="h-3.5 w-3.5" />
                            {{ sentMessageIndexes.includes(idx) ? 'Mensagem Enviada' : (notificationState.isSimulated ? 'Enviar via WhatsApp' : 'Reenviar') }}
                        </Button>
                    </div>
                </div>
            </ScrollArea>
            <DialogFooter><Button variant="outline" @click="notificationState.isOpen = false">Fechar</Button></DialogFooter>
        </DialogContent>
    </Dialog>

    <Dialog v-model:open="isJustificationDialogOpen">
        <DialogContent>
            <DialogHeader><DialogTitle>Justificar Não Conclusão</DialogTitle></DialogHeader>
            <div class="py-4"><Textarea v-model="justification" placeholder="Motivo..." rows="4" /></div>
            <DialogFooter>
                <Button variant="outline" @click="justification = ''; appointmentToProcess = null; isJustificationDialogOpen = false">Cancelar</Button>
                <Button variant="destructive" @click="handleConfirmMissed">Confirmar</Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>

    <AlertDialog v-model:open="isDeleteDialogOpen">
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Excluir Agendamento?</AlertDialogTitle>
                <AlertDialogDescription>Esta ação é permanente e não pode ser desfeita.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel @click="isDeleteDialogOpen = false; appointmentToDelete = null">Cancelar</AlertDialogCancel>
                <AlertDialogAction class="bg-destructive text-destructive-foreground hover:bg-destructive/90" @click="confirmDelete">Confirmar Exclusão</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
</template>
