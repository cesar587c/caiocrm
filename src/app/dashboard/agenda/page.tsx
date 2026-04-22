
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
import { ChevronLeft, ChevronRight, Clock, MapPin, Phone, User, Plus, Pencil, Trash2, Briefcase, ClipboardList, Calendar as CalendarIcon, CheckCircle2, XCircle, Info, CalendarPlus, CalendarClock, Loader2 } from 'lucide-react';
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
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue, SelectSeparator } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import type { Appointment } from '@/lib/types';
import { Calendar } from '@/components/ui/calendar';

const appointmentSchema = z.object({
  date: z.date({ required_error: 'A data é obrigatória.' }),
  time: z.string().min(1, 'O horário é obrigatório.'),
  clientName: z.string().min(1, 'O nome do cliente é obrigatório.'),
  address: z.string().min(1, 'O endereço é obrigatório.'),
  phone: z.string().optional(),
  contact: z.string().min(1, 'O nome do contato na visita é obrigatório.'),
  assignedTo: z.string().min(1, 'O setor/responsável é obrigatório.'),
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
  const [reminderStep, setReminderStep] = useState<'idle' | 'confirming'>('idle');
  const [appointmentForReminders, setAppointmentForReminders] = useState<Appointment | null>(null);

  const [isJustificationDialogOpen, setIsJustificationDialogOpen] = useState(false);
  const [appointmentToProcess, setAppointmentToProcess] = useState<Appointment | null>(null);
  const [justification, setJustification] = useState('');

  const { toast } = useToast();
  const { companyProfile, sectors, users, appointments, addAppointment, updateAppointment, deleteAppointment } = useSettings();

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
      assignedTo: '',
      summary: '',
    },
  });

  useEffect(() => {
    if (reminderStep === 'idle') {
      setAppointmentForReminders(null);
    }
  }, [reminderStep]);
  
  const assignedToDisplay = useMemo(() => {
    if (!appointmentForReminders?.assignedTo) return { type: '', name: ''};
    const [type, id] = appointmentForReminders.assignedTo.split(':');
    if (type === 'user') {
        const user = users.find(u => u.id === id);
        return { type: 'user', name: user?.name || 'Usuário' };
    }
    if (type === 'sector') {
        const sector = sectors.find(s => s.id === id);
        return { type: 'sector', name: sector?.name || 'Setor' };
    }
    const sector = sectors.find(s => s.name === appointmentForReminders.assignedTo);
    return { type: 'sector', name: sector?.name || appointmentForReminders.assignedTo };
  }, [appointmentForReminders, users, sectors]);

  const getAssignedToName = (assignedToStr: string) => {
    if (!assignedToStr) return 'N/A';
    const [type, id] = assignedToStr.split(':');
    if (type === 'user') {
        const user = users.find(u => u.id === id);
        return user?.name || 'Usuário não encontrado';
    }
    if (type === 'sector') {
        const sector = sectors.find(s => s.id === id);
        return `Setor: ${sector?.name || 'Setor não encontrado'}`;
    }
    return assignedToStr;
  };

  const getStatusBadge = (status: Appointment['status']) => {
    switch(status) {
        case 'completed': return <Badge variant="secondary" className="bg-green-600/20 text-green-400 border-green-600/30 hover:bg-green-600/30"><CheckCircle2 className="h-3 w-3 mr-1" />Concluído</Badge>;
        case 'missed': return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Não Concluído</Badge>;
        default: return <Badge variant="outline"><CalendarClock className="h-3 w-3 mr-1" />Agendado</Badge>;
    }
  }

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { locale: ptBR, weekStartsOn: 0 });
  const endDate = endOfWeek(monthEnd, { locale: ptBR, weekStartsOn: 0 });

  const days = eachDayOfInterval({ start: startDate, end: endDate });
  const weekdays = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

  const handlePrevMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1));
  };

  const openModalForDay = (day: Date) => {
    setSelectedDate(day);
    
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
        assignedTo: '',
        summary: '',
      });
      setEditingAppointment(null);
      setSelectedAppointment(null);
    }
    setIsModalOpen(true);
  };
  
  const handleDayClick = (day: Date) => {
    if (isSameMonth(day, currentMonth)) {
        openModalForDay(day);
    }
  };

  const handleEditClick = (appointment: Appointment, day: Date) => {
    setEditingAppointment(appointment);
    
    let assignedToValue = appointment.assignedTo;
    if (assignedToValue && !assignedToValue.includes(':')) {
        const sector = sectors.find(s => s.name === assignedToValue);
        if (sector) {
            assignedToValue = `sector:${sector.id}`;
        }
    }

    form.reset({
      date: parse(appointment.date, 'yyyy-MM-dd', new Date()),
      clientName: appointment.clientName,
      address: appointment.address,
      phone: appointment.phone || '',
      contact: appointment.contact,
      time: appointment.time,
      assignedTo: assignedToValue,
      summary: appointment.summary || '',
    });
  };

  const handleDeleteClick = (appointment: Appointment) => {
    setAppointmentToDelete(appointment);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (!appointmentToDelete) return;
    
    deleteAppointment(appointmentToDelete.id);

    toast({
        title: "Agendamento Excluído!",
        description: `O compromisso com ${appointmentToDelete.clientName} foi removido.`,
        variant: "destructive"
    });
    setIsDeleteDialogOpen(false);
    setAppointmentToDelete(null);
  };

  const handleCancelEdit = () => {
    setEditingAppointment(null);
    setSelectedAppointment(null);
    form.reset({
      date: selectedDate,
      clientName: '',
      address: '',
      phone: '',
      contact: '',
      time: '',
      assignedTo: '',
      summary: '',
    });
  }

  const handleSendAllReminders = () => {
    if (!appointmentForReminders) return;

    const dateStr = format(parse(appointmentForReminders.date, 'yyyy-MM-dd', new Date()), 'dd/MM/yyyy', { locale: ptBR });

    const { time, phone, contact } = appointmentForReminders;
    const clientTemplate = companyProfile.whatsappReminderMessage || "Olá, {cliente}! 👋\n\nEste é um lembrete do seu agendamento com a {empresa} no dia {data} às {hora}.\n\nAté breve!";
    const clientMessage = clientTemplate
      .replace('{cliente}', contact)
      .replace('{empresa}', companyProfile.name)
      .replace('{data}', dateStr)
      .replace('{hora}', time);

    const cleanClientPhone = phone?.replace(/\D/g, '') || '';
    if (cleanClientPhone.length >= 10) {
        const clientPhoneWithCountryCode = cleanClientPhone.length > 11 ? cleanClientPhone : `55${cleanClientPhone}`;
        const clientUrl = `https://web.whatsapp.com/send?phone=${clientPhoneWithCountryCode}&text=${encodeURIComponent(clientMessage)}`;
        window.open(clientUrl, '_blank');
        toast({
            title: "WhatsApp Aberto (Cliente)",
            description: `A mensagem para ${contact} está pronta para ser enviada.`,
        });
    } else {
        toast({
            title: "Número do Cliente Inválido",
            description: `O cliente ${contact} não possui um número de telefone válido. A notificação não foi enviada.`,
            variant: "destructive",
        });
    }

    const { clientName, assignedTo, summary } = appointmentForReminders;
    const [type, id] = assignedTo.split(':');

    if (type === 'user') {
        const user = users.find(u => u.id === id);
        if (user) {
            const targetName = user.name;
            const targetPhone = user.whatsapp || '';
            let internalMessage = `*Lembrete de Agendamento Individual*\n\nOlá ${targetName}, você tem uma visita agendada.\n\n*Cliente:* ${clientName}\n*Data:* ${dateStr}\n*Horário:* ${time}`;
            if (summary) {
                internalMessage += `\n*Resumo:* ${summary}`;
            }
            internalMessage += `\n\nPor favor, verifique a agenda para mais detalhes.`;
            
            const cleanInternalPhone = targetPhone.replace(/\D/g, '');
            if (cleanInternalPhone.length >= 10) {
                const internalPhoneWithCountryCode = cleanInternalPhone.length > 11 ? cleanInternalPhone : `55${cleanInternalPhone}`;
                const internalUrl = `https://web.whatsapp.com/send?phone=${internalPhoneWithCountryCode}&text=${encodeURIComponent(internalMessage)}`;
                window.open(internalUrl, '_blank');
                toast({
                    title: "WhatsApp Aberto (Equipe)",
                    description: `A mensagem para ${targetName} está pronta para ser enviada.`,
                });
            } else {
                 toast({
                    title: "Número do Usuário Inválido",
                    description: `O usuário ${targetName} não possui um número de WhatsApp válido. A notificação não foi enviada.`,
                    variant: 'destructive',
                });
            }
        } else {
             toast({ title: 'Usuário não encontrado', description: 'Não foi possível encontrar o usuário para notificar.', variant: 'destructive'});
        }
    } else {
        const sector = sectors.find(s => s.id === id) || sectors.find(s => s.name === assignedTo);
        const sectorName = sector?.name || 'Setor desconhecido';
        toast({
            title: "Notificação para Setor",
            description: `O envio de mensagens para setores inteiros ("${sectorName}") não é suportado. A notificação para a equipe foi pulada.`,
            variant: 'secondary',
            duration: 7000,
        });
    }

    setReminderStep('idle');
  };

  const handleMarkAsCompleted = () => {
    if (!selectedAppointment) return;
    updateAppointment({ ...selectedAppointment, status: 'completed' });
    toast({ title: "Agendamento Concluído!", description: `O compromisso com ${selectedAppointment.clientName} foi marcado como concluído.` });
    setSelectedAppointment(null);
  }

  const handleOpenJustificationDialog = () => {
    if (!selectedAppointment) return;
    setAppointmentToProcess(selectedAppointment);
    setIsJustificationDialogOpen(true);
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
    
    if (editingAppointment) {
        const updatedAppointment: Appointment = {
            id: editingAppointment.id,
            status: editingAppointment.status,
            ...appointmentData
        };
        updateAppointment(updatedAppointment);
        setAppointmentForReminders(updatedAppointment);
        toast({
            title: 'Agendamento Atualizado!',
            description: `Visita para ${values.clientName} atualizada.`,
        });
    } else {
        const newAppointmentData = {
          ...appointmentData,
          status: 'scheduled' as const,
        }
        addAppointment(newAppointmentData);
        setAppointmentForReminders({ id: 'temp', ...newAppointmentData});
        toast({
            title: 'Agendamento Criado!',
            description: `Visita para ${values.clientName} agendada para as ${values.time}.`,
        });
    }

    setEditingAppointment(null);
    setSelectedAppointment(null);
    setIsModalOpen(false);
    setReminderStep('confirming');
  }

  const selectedDayAppointments = useMemo(() => {
    const dateKey = format(selectedDate, 'yyyy-MM-dd');
    return (appointmentsByDate[dateKey] || []).sort((a, b) => a.time.localeCompare(b.time));
  }, [selectedDate, appointmentsByDate]);

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

      <Dialog open={isModalOpen} onOpenChange={(isOpen) => {
          if (!isOpen) {
              handleCancelEdit();
          }
          setIsModalOpen(isOpen);
      }}>
        <DialogContent className="sm:max-w-[425px] md:max-w-3xl flex flex-col h-[90vh]">
          <DialogHeader className='flex-none'>
            <DialogTitle>
              Agenda para {format(selectedDate, 'dd/MM/yyyy', { locale: ptBR })}
            </DialogTitle>
            <DialogDescription>
              Visualize, adicione ou edite compromissos para este dia.
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
                                    onClick={() => {
                                        if (!editingAppointment) {
                                            setSelectedAppointment(app)
                                        }
                                    }}
                                >
                                    <div className="flex justify-between items-start">
                                        <p className="font-semibold text-base pr-16">{app.clientName}</p>
                                        <div className="flex items-center gap-2 text-primary font-bold">
                                            <Clock className="h-4 w-4"/>
                                            {app.time}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">{getStatusBadge(app.status)}</div>
                                    <p className="text-muted-foreground flex items-center gap-2"><MapPin className="h-4 w-4"/>{app.address}</p>
                                    <p className="text-muted-foreground flex items-center gap-2"><User className="h-4 w-4"/>{app.contact}</p>
                                    <p className="text-muted-foreground flex items-center gap-2"><Briefcase className="h-4 w-4"/>{getAssignedToName(app.assignedTo)}</p>
                                    {app.phone && <p className="text-muted-foreground flex items-center gap-2"><Phone className="h-4 w-4"/>{app.phone}</p>}
                                    {app.summary && <p className="text-muted-foreground flex items-start gap-2 pt-2"><ClipboardList className="h-4 w-4 mt-0.5 shrink-0"/>{app.summary}</p>}
                                    {app.status === 'missed' && app.justification && <p className="text-destructive/80 flex items-start gap-2 pt-2 border-t border-destructive/20 mt-2"><Info className="h-4 w-4 mt-0.5 shrink-0"/>{app.justification}</p>}

                                    <div className="absolute top-2 right-2 flex items-center opacity-0 group-hover:opacity-100 transition-opacity bg-muted/80 rounded-md">
                                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); handleEditClick(app, selectedDate); }}>
                                            <Pencil className="h-4 w-4" />
                                        </Button>
                                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={(e) => { e.stopPropagation(); handleDeleteClick(app); }}>
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground border-2 border-dashed rounded-lg p-8">
                            <p>Nenhum compromisso para este dia.</p>
                            <p className="text-xs">Use o formulário para adicionar um.</p>
                        </div>
                    )}
                 </ScrollArea>
            </div>
            <div>
                 <h3 className="font-semibold text-lg text-foreground mb-4">{editingAppointment ? 'Editar Agendamento' : 'Novo Agendamento'}</h3>
                 <Form {...form}>
                    <form id="appointment-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="date"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Data do Agendamento</FormLabel>
                                    <Dialog>
                                        <DialogTrigger asChild>
                                            <FormControl>
                                                <Button
                                                    type="button"
                                                    variant={"outline"}
                                                    className={cn("w-full justify-start text-left font-normal", !field.value && "text-muted-foreground")}
                                                >
                                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                                    {field.value ? format(field.value, "PPP", { locale: ptBR }) : <span>Selecione a data</span>}
                                                </Button>
                                            </FormControl>
                                        </DialogTrigger>
                                        <DialogContent className="w-auto">
                                            <Calendar
                                                mode="single"
                                                selected={field.value}
                                                onSelect={(date) => {
                                                    if(date) {
                                                      field.onChange(date);
                                                      openModalForDay(date);
                                                    }
                                                }}
                                                initialFocus
                                                locale={ptBR}
                                            />
                                        </DialogContent>
                                    </Dialog>
                                    <FormDescription>Clique na data para reagendar.</FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                        control={form.control}
                        name="time"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Horário</FormLabel>
                            <FormControl>
                                <Input type="time" {...field} />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                        />
                        <FormField
                        control={form.control}
                        name="clientName"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Nome do Cliente</FormLabel>
                            <FormControl>
                                <Input placeholder="Ex: Tech Solutions Ltda." {...field} />
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
                                <Input placeholder="Ex: Rua das Inovações, 123" {...field} />
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
                            <FormLabel>Telefone de Contato</FormLabel>
                            <FormControl>
                                <Input placeholder="(00) 00000-0000" {...field} value={field.value || ''}/>
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                        />
                        <FormField
                        control={form.control}
                        name="contact"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Contato na Visita</FormLabel>
                            <FormControl>
                                <Input placeholder="Ex: Sr. Carlos" {...field} />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                        />
                        <FormField
                            control={form.control}
                            name="summary"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Resumo da Visita</FormLabel>
                                <FormControl>
                                    <Textarea placeholder="Ex: Apresentar novo produto, resolver pendência..." {...field} value={field.value || ''} />
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name="assignedTo"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Setor/Responsável</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value} defaultValue={field.value}>
                                    <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecione um setor ou usuário" />
                                    </SelectTrigger>
                                    </FormControl>
                                    <SelectContent className="max-h-60">
                                        <SelectGroup>
                                            <SelectLabel>Setores</SelectLabel>
                                            {sectors.map(sector => (
                                                <SelectItem key={`sector-${sector.id}`} value={`sector:${sector.id}`}>
                                                    {sector.name} (Equipe Toda)
                                                </SelectItem>
                                            ))}
                                        </SelectGroup>
                                        <SelectSeparator />
                                        <SelectGroup>
                                            <SelectLabel>Colaboradores</SelectLabel>
                                            {users.map(user => (
                                                <SelectItem key={`user-${user.id}`} value={`user:${user.id}`}>
                                                    {user.name}
                                                </SelectItem>
                                            ))}
                                        </SelectGroup>
                                        {sectors.length === 0 && users.length === 0 && (
                                            <p className='p-2 text-xs text-muted-foreground'>Nenhum setor ou usuário cadastrado.</p>
                                        )}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                    </form>
                </Form>
            </div>
          </div>
          <DialogFooter className="flex-none pt-4 gap-2 border-t">
              {editingAppointment ? (
                <>
                    <Button type="button" variant="outline" onClick={handleCancelEdit}>Cancelar</Button>
                    <Button type="submit" form="appointment-form">Salvar Alterações</Button>
                </>
              ) : (
                <>
                    {selectedAppointment && !editingAppointment && selectedAppointment.status === 'scheduled' && (
                        <>
                            <Button type="button" variant="outline" className="mr-auto" onClick={handleOpenJustificationDialog}>Marcar Não Concluído</Button>
                            <Button type="button" variant="secondary" onClick={handleMarkAsCompleted}>Marcar Concluído</Button>
                        </>
                    )}
                    {selectedAppointment && !editingAppointment && (
                        <Button type="button" onClick={() => handleEditClick(selectedAppointment, selectedDate)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Editar
                        </Button>
                    )}
                    <Button type="submit" form="appointment-form">
                        <Plus className="mr-2 h-4 w-4" />
                        Agendar
                    </Button>
                </>
              )}
        </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
            <AlertDialogTitle>Você tem certeza absoluta?</AlertDialogTitle>
            <AlertDialogDescription>
                Essa ação não pode ser desfeita. Isso excluirá permanentemente o compromisso com <span className="font-medium">{appointmentToDelete?.clientName}</span>.
            </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setAppointmentToDelete(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Confirmar Exclusão</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    <AlertDialog open={reminderStep === 'confirming'} onOpenChange={(isOpen) => !isOpen && setReminderStep('idle')}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Enviar Lembretes via WhatsApp?</AlertDialogTitle>
                <AlertDialogDescription>
                    Serão abertas novas abas no seu navegador para enviar mensagens para o cliente <span className="font-medium">{appointmentForReminders?.contact}</span> e para o responsável <span className="font-medium">{assignedToDisplay.name}</span>. Deseja continuar?
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setReminderStep('idle')}>Não, obrigado</AlertDialogCancel>
                <AlertDialogAction onClick={handleSendAllReminders}>Sim, Enviar</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
    
    <Dialog open={isJustificationDialogOpen} onOpenChange={setIsJustificationDialogOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Justificar Não Conclusão</DialogTitle>
                <DialogDescription>
                    Por favor, informe o motivo pelo qual o agendamento com <span className="font-medium">{appointmentToProcess?.clientName}</span> não foi concluído.
                </DialogDescription>
            </DialogHeader>
            <div className="py-4">
                <Textarea 
                    placeholder="Ex: Cliente cancelou, imprevisto, etc."
                    value={justification}
                    onChange={(e) => setJustification(e.target.value)}
                    rows={4}
                />
            </div>
            <DialogFooter>
                <AlertDialogCancel onClick={() => { setJustification(''); setAppointmentToProcess(null); }}>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleConfirmMissed}>Confirmar Não Conclusão</AlertDialogAction>
            </DialogFooter>
        </DialogContent>
    </Dialog>
    </>
  );
}
