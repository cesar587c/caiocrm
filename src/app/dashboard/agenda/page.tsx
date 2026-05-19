'use client';

import { useState, useMemo, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  addMonths,
  subMonths,
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isToday,
  isSameDay,
  parse,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Clock, MapPin, Phone, User, Plus, Pencil, Trash2, Briefcase, ClipboardList, Calendar as CalendarIcon, CheckCircle2, XCircle, Info, CalendarPlus, CalendarClock, Loader2, Users, Search, Send, UserCheck, MessageSquare, BellRing, Ban, ExternalLink, AlertTriangle, UserPlus, Check, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
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
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useSettings } from '@/contexts/SettingsContext';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import type { Appointment, Customer } from '@/lib/types';
import { Calendar } from '@/components/ui/calendar';
import { sendAppointmentNotifications } from '@/app/actions';
import { Separator } from '@/components/ui/separator';

const appointmentSchema = z.object({
  date: z.date({ required_error: 'A data é obrigatória.' }),
  time: z.string().min(1, 'O horário é obrigatório.'),
  clientName: z.string().min(1, 'O nome do cliente é obrigatório.'),
  address: z.string().min(1, 'O endereço é obrigatório.'),
  phone: z.string().optional(),
  contact: z.string().min(1, 'O nome do contato na visita é obrigatório.'),
  assignedTo: z.array(z.string()).min(1, 'Pelo menos um setor ou responsável é obrigatório.'),
  summary: z.string().optional(),
});

type AppointmentFormValues = z.infer<typeof appointmentSchema>;

export default function AgendaPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [appointmentToDelete, setAppointmentToDelete] = useState<Appointment | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  
  const [notificationState, setNotificationState] = useState<{
    isOpen: boolean;
    isLoading: boolean;
    isSimulated: boolean;
    details: any[];
  }>({ isOpen: false, isLoading: false, isSimulated: false, details: [] });

  const [searchTermAssignees, setSearchTermAssignees] = useState('');
  const [isJustificationDialogOpen, setIsJustificationDialogOpen] = useState(false);
  const [appointmentToProcess, setAppointmentToProcess] = useState<Appointment | null>(null);
  const [justification, setJustification] = useState('');
  const [isCustomerSearchOpen, setIsCustomerSearchOpen] = useState(false);
  const [sentMessageIndexes, setSentMessages] = useState<number[]>([]);

  const { toast } = useToast();
  const { companyProfile, sectors, users, appointments, customers, addAppointment, updateAppointment, deleteAppointment, currentUser } = useSettings();

  const isAdmin = currentUser?.role === 'admin';

  useEffect(() => {
    const isAnyBlockingElementOpen = isModalOpen || isDeleteDialogOpen || notificationState.isOpen || isJustificationDialogOpen;
    
    if (!isAnyBlockingElementOpen) {
      const forceRelease = () => {
        document.body.style.pointerEvents = 'auto';
        document.body.style.overflow = 'auto';
        document.documentElement.style.pointerEvents = 'auto';
      };
      
      forceRelease();
      const timer = setTimeout(forceRelease, 300);
      return () => clearTimeout(timer);
    }
  }, [isModalOpen, isDeleteDialogOpen, notificationState.isOpen, isJustificationDialogOpen]);

  const appointmentsByDate = useMemo(() => {
    return appointments.reduce((acc, app) => {
        const dateKey = app.date;
        if (!acc[dateKey]) {
            acc[dateKey] = [];
        }
        acc[dateKey].push(app);
        return acc;
    }, {} as Record<string, Appointment[]>);
  }, [appointments]);

  const form = useForm<AppointmentFormValues>({
    resolver: zodResolver(appointmentSchema),
    defaultValues: {
      date: new Date(),
      clientName: '',
      address: '',
      phone: '',
      contact: '',
      time: '',
      assignedTo: [],
      summary: '',
    },
  });
  
  const getAssignedToNameSingle = (assignedToStr: string) => {
    if (!assignedToStr) return 'N/A';
    const [type, id] = assignedToStr.split(':');
    if (type === 'user') {
        const user = users.find(u => u.id === id);
        return user?.name || 'Usuário';
    }
    if (type === 'sector') {
        const sector = sectors.find(s => s.id === id);
        return `Setor: ${sector?.name || 'Setor'}`;
    }
    return assignedToStr;
  };

  const getStatusBadge = (status: Appointment['status']) => {
    switch(status) {
        case 'completed': return <Badge variant="secondary" className="bg-green-600/20 text-green-400 border-green-600/30 hover:bg-green-600/30"><CheckCircle2 className="h-3 w-3 mr-1" />Concluído</Badge>;
        case 'missed': return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Não Concluído</Badge>;
        case 'cancelled': return <Badge variant="destructive" className="bg-gray-600/20 text-gray-400 border-gray-600/30"><Ban className="h-3 w-3 mr-1" />Cancelado</Badge>;
        default: return <Badge variant="outline"><CalendarClock className="h-3 w-3 mr-1" />Agendado</Badge>;
    }
  }

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { locale: ptBR, weekStartsOn: 0 });
  const endDate = endOfWeek(monthEnd, { locale: ptBR, weekStartsOn: 0 });

  const days = eachDayOfInterval({ start: startDate, end: endDate });
  const weekdays = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

  const handlePrevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const handleNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

  const openModalForDay = (day: Date) => {
    setSelectedDate(day);
    setSearchTermAssignees('');
    if(editingAppointment) {
      form.setValue('date', day);
    } else {
       form.reset({
        date: day,
        clientName: '',
        address: '',
        phone: '',
        contact: '',
        time: '',
        assignedTo: [],
        summary: '',
      });
      setEditingAppointment(null);
      setSelectedAppointment(null);
    }
    setIsModalOpen(true);
  };
  
  const handleDayClick = (day: Date) => {
    if (isSameMonth(day, currentMonth)) openModalForDay(day);
  };

  const handleEditClick = (appointment: Appointment, day: Date) => {
    setEditingAppointment(appointment);
    setSearchTermAssignees('');
    const assignedToArray = Array.isArray(appointment.assignedTo) ? appointment.assignedTo : [appointment.assignedTo];
    form.reset({
      date: parse(appointment.date, 'yyyy-MM-dd', new Date()),
      clientName: appointment.clientName,
      address: appointment.address,
      phone: appointment.phone || '',
      contact: appointment.contact,
      time: appointment.time,
      assignedTo: assignedToArray,
      summary: appointment.summary || '',
    });
    setIsModalOpen(true);
  };

  const handleCustomerSelect = (customer: Customer) => {
    const mainName = customer.nomeFantasia || customer.name;
    form.setValue('clientName', mainName, { shouldDirty: true, shouldTouch: true, shouldValidate: true });
    form.setValue('address', customer.endereco || '', { shouldDirty: true, shouldTouch: true, shouldValidate: true });
    form.setValue('phone', customer.telefone || '', { shouldDirty: true, shouldTouch: true, shouldValidate: true });
    form.setValue('contact', customer.contactName || '', { shouldDirty: true, shouldTouch: true, shouldValidate: true });
    setIsCustomerSearchOpen(false);
    toast({
        title: "Cliente Selecionado",
        description: `Os dados de ${mainName} foram preenchidos.`
    });
  };

  const handleAddToGoogleCalendar = (app: Appointment) => {
    const [year, month, day] = app.date.split('-').map(Number);
    const [hour, minute] = app.time.split(':').map(Number);
    
    // Início do evento
    const startDate = new Date(year, month - 1, day, hour, minute);
    // Término (padrão 1 hora depois)
    const endDate = new Date(startDate.getTime() + 60 * 60 * 1000);
    
    const formatGCalDate = (date: Date) => format(date, "yyyyMMdd'T'HHmmss");
    
    const title = encodeURIComponent(`Visita Técnica: ${app.clientName}`);
    const dates = `${formatGCalDate(startDate)}/${formatGCalDate(endDate)}`;
    const details = encodeURIComponent(`Contato: ${app.contact}\nTelefone: ${app.phone || 'N/A'}\nResumo: ${app.summary || ''}\n\nAgendado via VendasPro`);
    const location = encodeURIComponent(app.address);
    
    const url = `https://www.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${dates}&details=${details}&location=${location}`;
    window.open(url, '_blank');
    
    toast({
        title: "Google Agenda",
        description: "Abrindo o calendário para salvar o compromisso."
    });
  };

  const triggerNotifications = async (appointment: any) => {
    setTimeout(async () => {
        setNotificationState(prev => ({ ...prev, isOpen: true, isLoading: true }));
        setSentMessages([]);
        
        const techIds = appointment.assignedTo
            .filter((at: string) => at.startsWith('user:'))
            .map((at: string) => at.split(':')[1]);
        
        const technicians = users.filter(u => techIds.includes(u.id));

        try {
            const response = await sendAppointmentNotifications({
                appointment,
                companyName: companyProfile.name,
                technicians,
                customMessageTemplate: companyProfile.whatsappReminderMessage
            });
            
            if (response.success) {
                setNotificationState({
                    isOpen: true,
                    isLoading: false,
                    isSimulated: !!response.isSimulated,
                    details: response.details || []
                });

                if (!response.isSimulated) {
                    toast({
                        title: "Notificações Enviadas",
                        description: "O cliente e os técnicos foram avisados via WhatsApp (Automático).",
                    });
                }
            } else {
                throw new Error("Falha no envio");
            }
        } catch (error) {
            setNotificationState(prev => ({ ...prev, isOpen: false, isLoading: false }));
            toast({
                variant: "destructive",
                title: "Erro nas Notificações",
                description: "Não foi possível enviar os avisos agora.",
            });
        }
    }, 400);
  };

  const sendManualWhatsApp = (detail: any, index: number) => {
    const cleanPhone = detail.phone.replace(/\D/g, '');
    const phoneWithCountryCode = cleanPhone.length > 11 ? cleanPhone : `55${cleanPhone}`;
    const url = `https://wa.me/${phoneWithCountryCode}?text=${encodeURIComponent(detail.message)}`;
    window.open(url, 'vendaspro_whatsapp');
    setSentMessages(prev => prev.includes(index) ? prev : [...prev, index]);
  };

  const handleMarkAsCompleted = () => {
    if (!selectedAppointment) return;
    updateAppointment({ ...selectedAppointment, status: 'completed' });
    toast({ title: "Agendamento Concluído!", description: `O compromisso com ${selectedAppointment.clientName} foi marcado como concluído.` });
    setSelectedAppointment(null);
  }

  const handleMarkAsCancelled = () => {
    if (!selectedAppointment || !isAdmin) return;
    updateAppointment({ ...selectedAppointment, status: 'cancelled' });
    toast({ variant: 'destructive', title: "Agendamento Cancelado", description: `O compromisso com ${selectedAppointment.clientName} foi cancelado.` });
    setSelectedAppointment(null);
  }

  const handleConfirmMissed = () => {
    if (!appointmentToProcess || !justification.trim()) {
        toast({ variant: 'destructive', title: 'Justificativa é obrigatória.'});
        return;
    }
    updateAppointment({ ...appointmentToProcess, status: 'missed', justification: justification.trim() });
    toast({ variant: 'destructive', title: "Agendamento Não Concluído", description: `O compromisso com ${appointmentToProcess.clientName} foi marcado como não concluído.` });
    setIsJustificationDialogOpen(false);
    setAppointmentToProcess(null);
    setJustification('');
    setSelectedAppointment(null);
  }

  const confirmDelete = () => {
    if (!appointmentToDelete || !isAdmin) return;
    deleteAppointment(appointmentToDelete.id);
    toast({ title: "Excluído", description: "Agendamento removido permanentemente.", variant: "destructive" });
    setIsDeleteDialogOpen(false);
    setAppointmentToDelete(null);
    setSelectedAppointment(null);
  };

  function onSubmit(values: AppointmentFormValues) {
    const dateKey = format(values.date, 'yyyy-MM-dd');
    const appointmentData = {
        date: dateKey,
        time: values.time,
        clientName: values.clientName,
        address: values.address,
        phone: values.phone,
        contact: values.contact,
        assignedTo: values.assignedTo,
        summary: values.summary,
    };
    
    let savedAppointment;

    if (editingAppointment) {
        savedAppointment = { id: editingAppointment.id, status: editingAppointment.status, ...appointmentData };
        updateAppointment(savedAppointment as Appointment);
        toast({ title: 'Agendamento Atualizado!' });
    } else {
        savedAppointment = { id: 'temp_' + Date.now(), status: 'scheduled' as const, ...appointmentData };
        addAppointment(savedAppointment as any);
        toast({ title: 'Agendamento Criado!' });
    }

    setIsModalOpen(false);
    setEditingAppointment(null);
    setSelectedAppointment(null);
    
    triggerNotifications(savedAppointment);
  }

  const selectedDayAppointments = useMemo(() => {
    const dateKey = format(selectedDate, 'yyyy-MM-dd');
    return (appointmentsByDate[dateKey] || []).sort((a, b) => a.time.localeCompare(b.time));
  }, [selectedDate, appointmentsByDate]);

  const filteredSectors = sectors.filter(s => s.name.toLowerCase().includes(searchTermAssignees.toLowerCase()));
  const filteredUsers = users.filter(u => u.name.toLowerCase().includes(searchTermAssignees.toLowerCase()));
  
  const clientNameValue = form.watch('clientName');
  const suggestedCustomers = useMemo(() => {
    if (!clientNameValue || clientNameValue.length < 2 || editingAppointment) return [];
    return customers.filter(c => 
      c.name.toLowerCase().includes(clientNameValue.toLowerCase()) || 
      (c.nomeFantasia && c.nomeFantasia.toLowerCase().includes(clientNameValue.toLowerCase()))
    ).slice(0, 5);
  }, [clientNameValue, customers, editingAppointment]);

  return (
    <>
      <div className="flex h-full flex-col bg-card shadow-xl rounded-2xl p-6 text-card-foreground">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold capitalize text-foreground">
                {format(currentMonth, 'MMMM', { locale: ptBR })}
              </h2>
              <p className="text-lg text-muted-foreground">{format(currentMonth, 'yyyy')}</p>
            </div>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" onClick={handlePrevMonth} className="rounded-lg h-10 w-10 hover:bg-accent/50">
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon" onClick={handleNextMonth} className="rounded-lg h-10 w-10 hover:bg-accent/50">
                <ChevronRight className="h-5 w-5" />
              </Button>
            </div>
          </div>

          <div className="grid flex-1 grid-cols-7 text-center">
            {weekdays.map((day, i) => (
              <div key={i} className="flex items-center justify-center text-sm font-medium text-muted-foreground py-2 border-b">
                {day}
              </div>
            ))}

            {days.map((day) => {
              const dayKey = format(day, 'yyyy-MM-dd');
              const dayEvents = appointmentsByDate[dayKey] || [];
              return (
                <div
                  key={day.toString()}
                  className={cn(
                    "flex flex-col items-center justify-start p-2 border-t border-l",
                    "aspect-[10/7] min-h-0",
                    isSameMonth(day, currentMonth) ? 'cursor-pointer' : 'bg-muted/30'
                  )}
                  onClick={() => handleDayClick(day)}
                >
                  <div
                    className={cn(
                      "w-8 h-8 flex items-center justify-center rounded-full transition-colors text-base font-medium",
                      !isSameMonth(day, currentMonth) && 'text-muted-foreground/50',
                      !isSameDay(day, selectedDate) && isSameMonth(day, currentMonth) && 'hover:bg-accent/50',
                      isSameDay(day, selectedDate) && 'bg-primary text-primary-foreground',
                      isToday(day) && !isSameDay(day, selectedDate) && 'border-2 border-primary/50'
                    )}
                  >
                    {format(day, 'd')}
                  </div>
                  {isSameMonth(day, currentMonth) && (
                    <div className="flex items-center gap-1 mt-2 h-2">
                      {dayEvents.slice(0, 3).map((event, index) => (
                        <div key={index} className={cn("w-2 h-2 rounded-full", ["bg-chart-1", "bg-chart-2", "bg-chart-3"][index % 3])}></div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
      </div>

      <Dialog open={isModalOpen} onOpenChange={(isOpen) => { if (!isOpen) { setEditingAppointment(null); setSelectedAppointment(null); } setIsModalOpen(isOpen); }}>
        <DialogContent className="sm:max-w-[425px] md:max-w-3xl flex flex-col h-[90vh]" onOpenAutoFocus={(e) => e.preventDefault()} onCloseAutoFocus={(e) => e.preventDefault()}>
          <DialogHeader className='flex-none'>
            <DialogTitle>
              Agenda para {format(selectedDate, 'dd/MM/yyyy', { locale: ptBR })}
            </DialogTitle>
            <DialogDescription>
              {isAdmin ? 'Adicione, edite ou exclua compromissos.' : 'Você pode apenas reagendar (data/hora) compromissos existentes.'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid flex-1 grid-cols-1 md:grid-cols-2 gap-6 py-4 overflow-y-auto">
            <div className="space-y-4">
                 <h3 className="font-semibold text-lg text-foreground">Compromissos Agendados</h3>
                 <ScrollArea className="h-full pr-4">
                    {selectedDayAppointments.length > 0 ? (
                        <div className="space-y-4">
                            {selectedDayAppointments.map(app => (
                                <div 
                                    key={app.id} 
                                    className={cn(
                                        "relative group p-3 bg-muted/50 rounded-lg text-sm space-y-2 cursor-pointer",
                                        selectedAppointment?.id === app.id && !editingAppointment && "ring-2 ring-primary"
                                    )}
                                    onClick={() => !editingAppointment && setSelectedAppointment(app)}
                                >
                                    <div className="flex justify-between items-start">
                                        <p className="font-semibold text-base pr-20">{app.clientName}</p>
                                        <div className="flex items-center gap-2 text-primary font-bold">
                                            <Clock className="h-4 w-4"/>
                                            {app.time}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">{getStatusBadge(app.status)}</div>
                                    <p className="text-muted-foreground flex items-center gap-2"><MapPin className="h-4 w-4"/>{app.address}</p>
                                    <p className="text-muted-foreground flex items-center gap-2"><User className="h-4 w-4"/>{app.contact}</p>
                                    <div className="flex flex-wrap gap-1 items-start">
                                        <Briefcase className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0"/>
                                        <div className="flex flex-wrap gap-1">
                                            {app.assignedTo.map(at => (
                                                <Badge key={at} variant="outline" className="text-[10px] py-0">{getAssignedToNameSingle(at)}</Badge>
                                            ))}
                                        </div>
                                    </div>
                                    {app.phone && <p className="text-muted-foreground flex items-center gap-2"><Phone className="h-4 w-4"/>{app.phone}</p>}

                                    <div className="absolute top-2 right-2 flex items-center opacity-0 group-hover:opacity-100 transition-opacity bg-muted/80 rounded-md shadow-sm border border-border/50">
                                        <Button variant="ghost" size="icon" className="h-7 w-7 text-emerald-600 hover:text-emerald-700" onClick={(e) => { e.stopPropagation(); handleAddToGoogleCalendar(app); }} title="Adicionar ao Google Agenda">
                                            <CalendarPlus className="h-4 w-4" />
                                        </Button>
                                        <Button variant="ghost" size="icon" className="h-7 w-7 text-primary" onClick={(e) => { e.stopPropagation(); triggerNotifications(app); }} title="Reenviar Notificações Automáticas">
                                            <BellRing className="h-4 w-4" />
                                        </Button>
                                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); handleEditClick(app, selectedDate); }} title="Editar">
                                            <Pencil className="h-4 w-4" />
                                        </Button>
                                        {isAdmin && (
                                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={(e) => { e.stopPropagation(); setAppointmentToDelete(app); setIsDeleteDialogOpen(true); }} title="Excluir">
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground border-2 border-dashed rounded-lg p-8">
                            <p>Nenhum compromisso para este dia.</p>
                        </div>
                    )}
                 </ScrollArea>
            </div>
            <div>
                 <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-lg text-foreground">{editingAppointment ? 'Editar Agendamento' : 'Novo Agendamento'}</h3>
                 </div>
                 <Form {...form}>
                    <form id="appointment-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="date"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Data</FormLabel>
                                    <Dialog>
                                        <DialogTrigger asChild>
                                            <FormControl>
                                                <Button type="button" variant="outline" className="w-full justify-start text-left font-normal">
                                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                                    {field.value ? format(field.value, "PPP", { locale: ptBR }) : <span>Selecione a data</span>}
                                                </Button>
                                            </FormControl>
                                        </DialogTrigger>
                                        <DialogContent className="w-auto" onOpenAutoFocus={(e) => e.preventDefault()} onCloseAutoFocus={(e) => e.preventDefault()}>
                                          <DialogHeader className="sr-only">
                                            <DialogTitle>Selecionar Data</DialogTitle>
                                          </DialogHeader>
                                          <Calendar mode="single" selected={field.value} onSelect={(date) => { if(date) { field.onChange(date); openModalForDay(date); } }} locale={ptBR} />
                                        </DialogContent>
                                    </Dialog>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField control={form.control} name="time" render={({ field }) => (<FormItem><FormLabel>Horário</FormLabel><FormControl><Input type="time" {...field} /></FormControl><FormMessage /></FormItem>)} />
                        
                        <FormField 
                          control={form.control} 
                          name="clientName" 
                          render={({ field }) => (
                            <FormItem className="relative">
                                <FormLabel>Nome do Cliente</FormLabel>
                                <FormControl>
                                  <div className="relative">
                                    <Input 
                                      placeholder="Digite o nome do cliente..." 
                                      {...field} 
                                      autoComplete="off"
                                      disabled={!isAdmin && !!editingAppointment}
                                      onFocus={() => setIsCustomerSearchOpen(true)}
                                    />
                                    {isCustomerSearchOpen && suggestedCustomers.length > 0 && (
                                      <div className="absolute z-50 mt-1 w-full bg-card border rounded-md shadow-lg overflow-hidden">
                                        {suggestedCustomers.map(customer => (
                                          <div 
                                            key={customer.id} 
                                            className="px-4 py-2 hover:bg-accent cursor-pointer transition-colors"
                                            onMouseDown={(e) => {
                                              e.preventDefault();
                                              handleCustomerSelect(customer);
                                            }}
                                          >
                                            <p className="text-sm font-semibold">{customer.nomeFantasia || customer.name}</p>
                                            {(customer.nomeFantasia && customer.nomeFantasia !== customer.name) && (
                                                <p className="text-[9px] text-muted-foreground uppercase">{customer.name}</p>
                                            )}
                                            <p className="text-[10px] text-muted-foreground truncate">{customer.endereco || 'Sem endereço'}</p>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                          )} 
                        />

                        <FormField control={form.control} name="address" render={({ field }) => (<FormItem><FormLabel>Endereço</FormLabel><FormControl><Input placeholder="Ex: Rua das Inovações, 123" {...field} disabled={!isAdmin && !!editingAppointment} /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name="phone" render={({ field }) => (<FormItem><FormLabel>Telefone (WhatsApp)</FormLabel><FormControl><Input placeholder="(00) 00000-0000" {...field} value={field.value || ''} disabled={!isAdmin && !!editingAppointment}/></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name="contact" render={({ field }) => (<FormItem><FormLabel>Contato na Visita</FormLabel><FormControl><Input placeholder="Ex: Sr. Carlos" {...field} disabled={!isAdmin && !!editingAppointment}/></FormControl><FormMessage /></FormItem>)} />
                        <FormField
                            control={form.control}
                            name="assignedTo"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Setor/Responsável (Múltiplos)</FormLabel>
                                <Popover modal={false}>
                                    <PopoverTrigger asChild disabled={!isAdmin && !!editingAppointment}>
                                        <FormControl>
                                            <Button variant="outline" className="w-full justify-start text-left h-auto min-h-10 px-3 py-2" disabled={!isAdmin && !!editingAppointment}>
                                                {field.value?.length > 0 ? (
                                                    <div className="flex flex-wrap gap-1">
                                                        {field.value.map(val => (
                                                            <Badge key={val} variant="secondary" className='text-[10px]'>
                                                                {getAssignedToNameSingle(val)}
                                                            </Badge>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <span className="text-muted-foreground text-sm">Selecione os responsáveis</span>
                                                )}
                                            </Button>
                                        </FormControl>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 pointer-events-auto" align="start" onWheel={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}>
                                        <div className="p-2 border-b bg-background">
                                            <div className="relative">
                                                <Search className="absolute left-2 top-2.5 h-3 w-3 text-muted-foreground" />
                                                <Input placeholder="Buscar por nome..." className="pl-7 h-8 text-xs" value={searchTermAssignees} onChange={(e) => setSearchTermAssignees(e.target.value)} />
                                            </div>
                                        </div>
                                        <div className="max-h-80 overflow-y-auto overscroll-contain" onWheel={(e) => e.stopPropagation()}>
                                            <div className="p-2 space-y-4">
                                                <div>
                                                    <p className="text-[10px] font-bold text-muted-foreground uppercase px-2 mb-2">Setores</p>
                                                    <div className="space-y-1">
                                                        {filteredSectors.map(sector => (
                                                            <div key={`sector-${sector.id}`} className="flex items-center space-x-2 rounded-md p-2 hover:bg-muted/50 cursor-pointer" onClick={(e) => {
                                                                e.preventDefault();
                                                                const current = field.value || [];
                                                                const val = `sector:${sector.id}`;
                                                                const next = current.includes(val) ? current.filter(v => v !== val) : [...current, val];
                                                                field.onChange(next);
                                                            }}>
                                                                <Checkbox checked={field.value?.includes(`sector:${sector.id}`)} />
                                                                <span className="text-sm">{sector.name}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-bold text-muted-foreground uppercase px-2 mb-2">Técnicos</p>
                                                    <div className="space-y-1">
                                                        {filteredUsers.map(user => (
                                                            <div key={`user-${user.id}`} className="flex items-center space-x-2 rounded-md p-2 hover:bg-muted/50 cursor-pointer" onClick={(e) => {
                                                                e.preventDefault();
                                                                const current = field.value || [];
                                                                const val = `user:${user.id}`;
                                                                const next = current.includes(val) ? current.filter(v => v !== val) : [...current, val];
                                                                field.onChange(next);
                                                            }}>
                                                                <Checkbox checked={field.value?.includes(`user:${user.id}`)} />
                                                                <span className="text-sm">{user.name}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </PopoverContent>
                                </Popover>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField control={form.control} name="summary" render={({ field }) => (<FormItem><FormLabel>Resumo/Notas</FormLabel><FormControl><Textarea placeholder="Observações importantes..." {...field} disabled={!isAdmin && !!editingAppointment} /></FormControl><FormMessage /></FormItem>)} />
                    </form>
                </Form>
            </div>
          </div>
          <DialogFooter className="flex-none pt-4 gap-2 border-t">
              {editingAppointment ? (
                <>
                    <Button type="button" variant="outline" onClick={() => { setEditingAppointment(null); setSelectedAppointment(null); }}>Cancelar</Button>
                    {isAdmin && selectedAppointment?.status !== 'cancelled' && (
                        <Button type="button" variant="destructive" onClick={handleMarkAsCancelled}>Cancelar Visita</Button>
                    )}
                    <Button type="submit" form="appointment-form">Salvar e Notificar</Button>
                </>
              ) : (
                <>
                    {selectedAppointment && !editingAppointment && (
                        <>
                            <Button type="button" variant="outline" className="mr-auto gap-2" onClick={() => handleAddToGoogleCalendar(selectedAppointment)}>
                                <CalendarPlus className="h-4 w-4 text-emerald-600" />
                                Google Agenda
                            </Button>
                            <Button type="button" variant="secondary" onClick={handleMarkAsCompleted}>Marcar Concluído</Button>
                            <Button type="button" onClick={() => handleEditClick(selectedAppointment, selectedDate)}>Reagendar</Button>
                            {isAdmin && (
                                <Button type="button" variant="destructive" onClick={() => { setAppointmentToDelete(selectedAppointment); setIsDeleteDialogOpen(true); }}>Excluir</Button>
                            )}
                        </>
                    )}
                    {(isAdmin || !editingAppointment) && (
                        <Button type="submit" form="appointment-form">Agendar e Notificar</Button>
                    )}
                </>
              )}
        </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Dialog open={notificationState.isOpen} onOpenChange={(open) => setNotificationState(prev => ({ ...prev, isOpen: open }))}>
        <DialogContent className="sm:max-w-md" onOpenAutoFocus={(e) => e.preventDefault()} onCloseAutoFocus={(e) => e.preventDefault()}>
            <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                    {notificationState.isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : (notificationState.isSimulated ? <AlertTriangle className="h-5 w-5 text-yellow-500" /> : <CheckCircle2 className="h-5 w-5 text-green-500" />)}
                    {notificationState.isLoading ? 'Enviando Notificações' : (notificationState.isSimulated ? 'Configuração Pendente' : 'Notificações Enviadas')}
                </DialogTitle>
                <DialogDescription>
                    {notificationState.isLoading 
                        ? 'Aguarde um momento enquanto o sistema processa os avisos.' 
                        : (notificationState.isSimulated 
                            ? 'A API automática não está configurada. Por favor, envie as mensagens manualmente abaixo.' 
                            : 'O cliente e os técnicos foram notificados com sucesso.')}
                </DialogDescription>
            </DialogHeader>

            {notificationState.isLoading ? (
                <div className="py-8 flex justify-center">
                    <Loader2 className="h-12 w-12 animate-spin text-primary" />
                </div>
            ) : (
                <ScrollArea className="max-h-[50vh] pr-4">
                    <div className="space-y-3 py-2">
                        {notificationState.details.map((detail, idx) => {
                            const isSent = sentMessageIndexes.includes(idx);
                            return (
                                <div key={idx} className="flex flex-col gap-2 p-3 border rounded-lg bg-muted/30">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-semibold">{detail.name}</span>
                                        <Badge variant="outline" className="text-[10px] uppercase">
                                            {detail.to === 'client' ? 'Cliente' : 'Técnico'}
                                        </Badge>
                                    </div>
                                    <div className="text-xs text-muted-foreground line-clamp-2 italic">"{detail.message}"</div>
                                    <Button 
                                        size="sm" 
                                        variant={isSent ? "outline" : (notificationState.isSimulated ? "default" : "outline")} 
                                        className={cn("w-full h-8 gap-2", isSent && "text-green-500 border-green-500/30 bg-green-500/5 hover:bg-green-500/10")} 
                                        onClick={() => sendManualWhatsApp(detail, idx)}
                                    >
                                        {isSent ? <Check className="h-3.5 w-3.5" /> : <Send className="h-3.5 w-3.5" />}
                                        {isSent ? 'Mensagem Enviada' : (notificationState.isSimulated ? 'Enviar via WhatsApp' : 'Reenviar')}
                                    </Button>
                                </div>
                            );
                        })}
                    </div>
                </ScrollArea>
            )}

            <DialogFooter>
                <Button variant="outline" onClick={() => setNotificationState(prev => ({ ...prev, isOpen: false }))}>
                    Fechar
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>

    <Dialog open={isJustificationDialogOpen} onOpenChange={setIsJustificationDialogOpen}>
        <DialogContent onOpenAutoFocus={(e) => e.preventDefault()} onCloseAutoFocus={(e) => e.preventDefault()}>
            <DialogHeader><DialogTitle>Justificar Não Conclusão</DialogTitle></DialogHeader>
            <div className="py-4"><Textarea placeholder="Motivo..." value={justification} onChange={(e) => setJustification(e.target.value)} rows={4}/></div>
            <DialogFooter>
                <Button variant="outline" onClick={() => { setJustification(''); setAppointmentToProcess(null); setIsJustificationDialogOpen(false); }}>Cancelar</Button>
                <Button variant="destructive" onClick={handleConfirmMissed}>Confirmar</Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>

    <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent onOpenAutoFocus={(e) => e.preventDefault()} onCloseAutoFocus={(e) => e.preventDefault()}>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Agendamento?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação é permanente e não pode ser desfeita. O compromisso será removido da base de dados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => { setIsDeleteDialogOpen(false); setAppointmentToDelete(null); }}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Confirmar Exclusão</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
