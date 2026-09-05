<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { Head, Link, router, usePage } from '@inertiajs/vue3';
import axios from 'axios';
import {
    addMonths, subMonths, format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
    eachDayOfInterval, isSameMonth, isToday, isSameDay,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
    ChevronLeft, ChevronRight, Clock, MapPin, Phone, User, Pencil, Trash2, Briefcase,
    CheckCircle2, CalendarPlus, Loader2, Send, BellRing, AlertTriangle, Check, PlusCircle,
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
import { ScrollArea } from '@/Components/ui/scroll-area';
import { Textarea } from '@/Components/ui/textarea';
import { Badge } from '@/Components/ui/badge';
import { useToast } from '@/composables/useToast';
import { cn, formatPhoneNumber } from '@/lib/utils';

defineOptions({ layout: AppLayout });

const props = defineProps({
    appointments: Array,
    sectors: Array,
    users: Array,
});
const { toast } = useToast();
const page = usePage();

const isAdmin = computed(() => page.props.auth.user?.role === 'admin');

const currentMonth = ref(new Date());
const selectedDate = ref(new Date());
const isDayDialogOpen = ref(false);
const selectedAppointment = ref(null);
const appointmentToDelete = ref(null);
const isDeleteDialogOpen = ref(false);
const isJustificationDialogOpen = ref(false);
const appointmentToProcess = ref(null);
const justification = ref('');
const sentMessageIndexes = ref([]);

const notificationState = reactive({ isOpen: false, isLoading: false, isSimulated: false, details: [] });
const pendingOsPromptId = ref(null);
const isOsPromptOpen = ref(false);

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

function handleDayClick(day) {
    if (!isSameMonth(day, currentMonth.value)) return;
    selectedDate.value = day;
    selectedAppointment.value = null;
    isDayDialogOpen.value = true;
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

function closeNotificationDialog() {
    notificationState.isOpen = false;
    if (pendingOsPromptId.value) isOsPromptOpen.value = true;
}

function handleOpenServiceOrder(app) {
    router.visit(`/dashboard/chamados?from_appointment=${app.id}`);
}

function confirmOsPrompt(open) {
    isOsPromptOpen.value = false;
    if (open && pendingOsPromptId.value) {
        router.visit(`/dashboard/chamados?from_appointment=${pendingOsPromptId.value}`);
    }
    pendingOsPromptId.value = null;
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

const selectedDayAppointments = computed(() => {
    const key = format(selectedDate.value, 'yyyy-MM-dd');
    return (appointmentsByDate.value[key] || []).slice().sort((a, b) => a.time.localeCompare(b.time));
});

function statusBadge(status) {
    return {
        completed: { label: 'Concluído', class: 'bg-green-600/20 text-green-400 border-green-600/30' },
        missed: { label: 'Não Concluído', class: '' },
        cancelled: { label: 'Cancelado', class: 'bg-gray-600/20 text-gray-400 border-gray-600/30' },
        scheduled: { label: 'Agendado', class: '' },
    }[status] || { label: status, class: '' };
}

onMounted(() => {
    const createdId = page.props.flash?.created_id;
    if (createdId) {
        pendingOsPromptId.value = createdId;
        triggerNotifications(createdId);
    }
});
</script>

<template>
    <Head title="Agenda" />

    <div class="flex h-full flex-col bg-card shadow-xl rounded-2xl p-6 text-card-foreground m-4 md:m-8">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
                <h2 class="text-2xl font-bold capitalize text-foreground">{{ format(currentMonth, 'MMMM', { locale: ptBR }) }}</h2>
                <p class="text-lg text-muted-foreground">{{ format(currentMonth, 'yyyy') }}</p>
            </div>
            <div class="flex items-center gap-2">
                <Button :as="Link" href="/dashboard/agenda/novo" class="gap-2"><PlusCircle class="h-4 w-4" /> Novo Agendamento</Button>
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

    <Dialog v-model:open="isDayDialogOpen">
        <DialogContent class="sm:max-w-[500px] flex flex-col max-h-[85vh]">
            <DialogHeader>
                <DialogTitle>Agenda para {{ format(selectedDate, 'dd/MM/yyyy', { locale: ptBR }) }}</DialogTitle>
                <DialogDescription>Compromissos do dia. Selecione um para ver as ações disponíveis.</DialogDescription>
            </DialogHeader>
            <ScrollArea class="flex-1 -mx-1 px-1">
                <div v-if="selectedDayAppointments.length > 0" class="space-y-3 py-2">
                    <div
                        v-for="app in selectedDayAppointments" :key="app.id"
                        :class="cn('relative group p-3 bg-muted/50 rounded-lg text-sm space-y-2 cursor-pointer', selectedAppointment?.id === app.id && 'ring-2 ring-primary')"
                        @click="selectedAppointment = app"
                    >
                        <div class="flex justify-between items-start">
                            <p class="font-semibold text-base">{{ app.client_name }}</p>
                            <div class="flex items-center gap-2 text-primary font-bold shrink-0"><Clock class="h-4 w-4" />{{ app.time }}</div>
                        </div>
                        <Badge :class="statusBadge(app.status).class" :variant="['missed', 'cancelled'].includes(app.status) ? 'destructive' : 'outline'">{{ statusBadge(app.status).label }}</Badge>
                        <p class="text-muted-foreground flex items-center gap-2"><MapPin class="h-4 w-4" />{{ app.address }}</p>
                        <p class="text-muted-foreground flex items-center gap-2"><User class="h-4 w-4" />{{ app.contact }}</p>
                        <div class="flex flex-wrap gap-1 items-start">
                            <Briefcase class="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                            <div class="flex flex-wrap gap-1"><Badge v-for="at in app.assigned_to" :key="at" variant="outline" class="text-[10px] py-0">{{ getAssignedName(at) }}</Badge></div>
                        </div>
                        <p v-if="app.phone" class="text-muted-foreground flex items-center gap-2"><Phone class="h-4 w-4" />{{ formatPhoneNumber(app.phone) }}</p>

                        <div class="flex items-center justify-end gap-0.5 pt-1 border-t border-border/50 -mx-1 px-1">
                            <Button variant="ghost" size="icon" class="h-7 w-7 text-emerald-600 hover:bg-transparent hover:text-emerald-600" @click.stop="handleAddToGoogleCalendar(app)"><CalendarPlus class="h-4 w-4" /></Button>
                            <Button variant="ghost" size="icon" class="h-7 w-7 text-primary hover:bg-transparent hover:text-primary" @click.stop="triggerNotifications(app.id)"><BellRing class="h-4 w-4" /></Button>
                            <Button :as="Link" :href="`/dashboard/agenda/${app.id}/editar`" variant="ghost" size="icon" class="h-7 w-7 hover:bg-transparent" @click.stop><Pencil class="h-4 w-4" /></Button>
                            <Button v-if="isAdmin" variant="ghost" size="icon" class="h-7 w-7 text-destructive hover:bg-transparent hover:text-destructive" @click.stop="appointmentToDelete = app; isDeleteDialogOpen = true"><Trash2 class="h-4 w-4" /></Button>
                        </div>
                    </div>
                </div>
                <div v-else class="flex flex-col items-center justify-center text-center text-muted-foreground border-2 border-dashed rounded-lg p-8 my-2"><p>Nenhum compromisso para este dia.</p></div>
            </ScrollArea>
            <DialogFooter class="pt-4 gap-2 border-t">
                <template v-if="selectedAppointment">
                    <Button type="button" variant="outline" class="mr-auto gap-2" @click="handleAddToGoogleCalendar(selectedAppointment)"><CalendarPlus class="h-4 w-4 text-emerald-600" /> Google Agenda</Button>
                    <Button type="button" variant="secondary" @click="handleMarkAsCompleted">Marcar Concluído</Button>
                    <Button type="button" variant="outline" class="gap-2" @click="handleOpenServiceOrder(selectedAppointment)"><Briefcase class="h-4 w-4" /> Abrir OS</Button>
                    <Button :as="Link" :href="`/dashboard/agenda/${selectedAppointment.id}/editar`">Reagendar</Button>
                    <Button v-if="isAdmin && selectedAppointment.status !== 'cancelled'" type="button" variant="destructive" @click="handleMarkAsCancelled">Cancelar Visita</Button>
                </template>
                <Button v-else :as="Link" :href="`/dashboard/agenda/novo?date=${format(selectedDate, 'yyyy-MM-dd')}`" class="ml-auto gap-2"><PlusCircle class="h-4 w-4" /> Novo Agendamento</Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>

    <Dialog :open="notificationState.isOpen" @update:open="(o) => !o && closeNotificationDialog()">
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
            <DialogFooter><Button variant="outline" @click="closeNotificationDialog">Fechar</Button></DialogFooter>
        </DialogContent>
    </Dialog>

    <AlertDialog :open="isOsPromptOpen" @update:open="(o) => (isOsPromptOpen = o)">
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Abrir Ordem de Serviço?</AlertDialogTitle>
                <AlertDialogDescription>Deseja abrir agora uma OS para este agendamento? Os dados de cliente, endereço, horário e técnico já vêm preenchidos — só falta completar as particularidades do atendimento.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel @click="confirmOsPrompt(false)">Agora não</AlertDialogCancel>
                <AlertDialogAction @click="confirmOsPrompt(true)">Sim, abrir OS</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>

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
