<script setup>
import { computed, ref } from 'vue';
import { Head, Link, useForm, usePage } from '@inertiajs/vue3';
import { ArrowLeft, Briefcase, Search } from 'lucide-vue-next';
import AppLayout from '@/Layouts/AppLayout.vue';
import { Button } from '@/Components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/Components/ui/card';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import { Textarea } from '@/Components/ui/textarea';
import { ScrollArea } from '@/Components/ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '@/Components/ui/popover';
import { Badge } from '@/Components/ui/badge';
import { Checkbox } from '@/Components/ui/checkbox';
import { formatPhoneNumber } from '@/lib/utils';

defineOptions({ layout: AppLayout });

const props = defineProps({
    appointment: Object,
    initialDate: String,
    customers: Array,
    sectors: Array,
    users: Array,
});
const page = usePage();

const isAdmin = computed(() => page.props.auth.user?.role === 'admin');
const isEditing = computed(() => !!props.appointment);
const fieldsDisabled = computed(() => !isAdmin.value && isEditing.value);

const form = useForm(props.appointment ? {
    date: props.appointment.date,
    time: props.appointment.time,
    client_name: props.appointment.client_name,
    address: props.appointment.address,
    phone: props.appointment.phone ? formatPhoneNumber(props.appointment.phone) : '',
    contact: props.appointment.contact,
    assigned_to: [...props.appointment.assigned_to],
    summary: props.appointment.summary || '',
} : {
    date: props.initialDate || '',
    time: '',
    client_name: '',
    address: '',
    phone: '',
    contact: '',
    assigned_to: [],
    summary: '',
});

const isCustomerSearchOpen = ref(false);
const searchTermAssignees = ref('');

function closeCustomerSearch() {
    setTimeout(() => (isCustomerSearchOpen.value = false), 150);
}

function handleCustomerSelect(customer) {
    const mainName = customer.nome_fantasia || customer.name;
    form.client_name = mainName;
    form.address = customer.endereco || '';
    form.phone = formatPhoneNumber(customer.telefone || customer.phone_2 || '');
    form.contact = customer.contact_name || customer.contact_name_2 || mainName;
    isCustomerSearchOpen.value = false;
}

const suggestedCustomers = computed(() => {
    const term = form.client_name;
    if (!term || term.length < 2 || isEditing.value) return [];
    return props.customers.filter((c) => c.name.toLowerCase().includes(term.toLowerCase()) || (c.nome_fantasia || '').toLowerCase().includes(term.toLowerCase())).slice(0, 5);
});

const filteredSectors = computed(() => props.sectors.filter((s) => s.name.toLowerCase().includes(searchTermAssignees.value.toLowerCase())));
const filteredUsers = computed(() => props.users.filter((u) => u.name.toLowerCase().includes(searchTermAssignees.value.toLowerCase())));

function getAssignedName(token) {
    const [type, id] = token.split(':');
    if (type === 'user') return props.users.find((u) => String(u.id) === id)?.name || 'Usuário';
    if (type === 'sector') return `Setor: ${props.sectors.find((s) => String(s.id) === id)?.name || 'Setor'}`;
    return token;
}

function toggleAssignee(token) {
    const idx = form.assigned_to.indexOf(token);
    if (idx >= 0) form.assigned_to.splice(idx, 1);
    else form.assigned_to.push(token);
}

function onSubmit() {
    const payload = form.transform((d) => ({ ...d, phone: d.phone.replace(/\D/g, '') }));
    if (isEditing.value) {
        payload.put(`/dashboard/agenda/${props.appointment.id}`);
    } else {
        payload.post('/dashboard/agenda');
    }
}
</script>

<template>
    <Head :title="isEditing ? 'Editar Agendamento' : 'Novo Agendamento'" />

    <div class="flex-1 space-y-6 p-4 md:p-8 pt-6 bg-background/50 max-w-3xl">
        <div class="flex items-center gap-3">
            <Button :as="Link" href="/dashboard/agenda" variant="ghost" size="icon" class="shrink-0"><ArrowLeft class="h-5 w-5" /></Button>
            <div>
                <h2 class="text-2xl font-bold tracking-tight font-headline">{{ isEditing ? 'Editar Agendamento' : 'Novo Agendamento' }}</h2>
                <p class="text-muted-foreground text-sm">{{ isAdmin || !isEditing ? 'Preencha os dados do compromisso.' : 'Você pode apenas reagendar (data/hora) compromissos existentes.' }}</p>
            </div>
        </div>

        <form @submit.prevent="onSubmit">
            <Card class="shadow-lg">
                <CardHeader>
                    <CardTitle class="text-lg">Dados do Compromisso</CardTitle>
                    <CardDescription>Data, cliente e responsáveis pelo atendimento.</CardDescription>
                </CardHeader>
                <CardContent class="space-y-4">
                    <div class="grid grid-cols-2 gap-3">
                        <div class="space-y-2">
                            <Label>Data</Label><Input v-model="form.date" type="date" @click="(e) => e.currentTarget.showPicker?.()" />
                            <p v-if="form.errors.date" class="text-xs text-destructive">{{ form.errors.date }}</p>
                        </div>
                        <div class="space-y-2">
                            <Label>Horário</Label><Input v-model="form.time" type="time" @click="(e) => e.currentTarget.showPicker?.()" />
                            <p v-if="form.errors.time" class="text-xs text-destructive">{{ form.errors.time }}</p>
                        </div>
                    </div>
                    <div class="space-y-2 relative">
                        <Label>Nome do Cliente</Label>
                        <Input v-model="form.client_name" autocomplete="off" :disabled="fieldsDisabled" @focus="isCustomerSearchOpen = true" @blur="closeCustomerSearch" />
                        <div v-if="isCustomerSearchOpen && suggestedCustomers.length > 0" class="absolute z-50 mt-1 w-full bg-card border rounded-md shadow-lg overflow-hidden">
                            <div v-for="customer in suggestedCustomers" :key="customer.id" class="px-4 py-2 hover:bg-accent cursor-pointer" @mousedown.prevent="handleCustomerSelect(customer)">
                                <p class="text-sm font-semibold">{{ customer.nome_fantasia || customer.name }}</p>
                                <p class="text-[10px] text-muted-foreground truncate">{{ customer.endereco || 'Sem endereço' }}</p>
                            </div>
                        </div>
                        <p v-if="form.errors.client_name" class="text-xs text-destructive">{{ form.errors.client_name }}</p>
                    </div>
                    <div class="space-y-2">
                        <Label>Endereço</Label><Input v-model="form.address" :disabled="fieldsDisabled" />
                        <p v-if="form.errors.address" class="text-xs text-destructive">{{ form.errors.address }}</p>
                    </div>
                    <div class="grid grid-cols-2 gap-3">
                        <div class="space-y-2">
                            <Label>Telefone (WhatsApp)</Label>
                            <Input :model-value="form.phone" @update:modelValue="(v) => (form.phone = formatPhoneNumber(v))" :disabled="fieldsDisabled" placeholder="(00) 00000-0000" />
                        </div>
                        <div class="space-y-2">
                            <Label>Contato na Visita</Label><Input v-model="form.contact" :disabled="fieldsDisabled" />
                            <p v-if="form.errors.contact" class="text-xs text-destructive">{{ form.errors.contact }}</p>
                        </div>
                    </div>
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
                    <div class="space-y-2"><Label>Resumo/Notas</Label><Textarea v-model="form.summary" :disabled="fieldsDisabled" rows="4" /></div>
                </CardContent>
                <CardFooter class="border-t bg-muted/20 flex justify-end gap-2 pt-6">
                    <Button :as="Link" href="/dashboard/agenda" variant="outline">Cancelar</Button>
                    <Button type="submit" :disabled="form.processing" class="gap-2">
                        <Briefcase class="h-4 w-4" /> {{ isEditing ? 'Salvar e Notificar' : 'Agendar e Notificar' }}
                    </Button>
                </CardFooter>
            </Card>
        </form>
    </div>
</template>
