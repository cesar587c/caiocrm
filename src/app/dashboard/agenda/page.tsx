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
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Clock, MapPin, Phone, User, Plus, Pencil, Trash2, Briefcase } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
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
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useSettings } from '@/contexts/SettingsContext';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';

// Define the structure for a single appointment
type Appointment = {
  id: string;
  time: string;
  clientName: string;
  address: string;
  phone?: string;
  contact: string;
  assignedTo: string;
};

// Define the schema for the appointment form using Zod
const appointmentSchema = z.object({
  clientName: z.string().min(1, 'O nome do cliente é obrigatório.'),
  address: z.string().min(1, 'O endereço é obrigatório.'),
  phone: z.string().optional(),
  contact: z.string().min(1, 'O nome do contato na visita é obrigatório.'),
  time: z.string().min(1, 'O horário é obrigatório.'),
  assignedTo: z.string().min(1, 'O setor/responsável é obrigatório.'),
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
  
  const [reminderStep, setReminderStep] = useState<'idle' | 'client' | 'internal'>('idle');
  const [appointmentForReminders, setAppointmentForReminders] = useState<Appointment | null>(null);


  const [appointments, setAppointments] = useState<Record<string, Appointment[]>>({
    [format(new Date(), 'yyyy-MM-dd')]: [
        { id: '1', time: '10:00', clientName: 'Tech Solutions', address: 'Rua das Inovações, 123', phone: '1199999999', contact: 'Ana', assignedTo: 'user:user_1' },
    ]
  });
  const { toast } = useToast();
  const { companyProfile, sectors, users } = useSettings();

  const form = useForm<AppointmentFormValues>({
    resolver: zodResolver(appointmentSchema),
    defaultValues: {
      clientName: '',
      address: '',
      phone: '',
      contact: '',
      time: '',
      assignedTo: '',
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
    // Fallback for old data
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
    return assignedToStr; // Fallback for old data
  };

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
    form.reset({
      clientName: '',
      address: '',
      phone: '',
      contact: '',
      time: '',
      assignedTo: '',
    });
    setEditingAppointment(null);
    setSelectedAppointment(null);
    setIsModalOpen(true);
  };
  
  const handleDayClick = (day: Date) => {
    if (isSameMonth(day, currentMonth)) {
        openModalForDay(day);
    }
  };

  const handleEditClick = (appointment: Appointment) => {
    setEditingAppointment(appointment);

    let assignedToValue = appointment.assignedTo;
    // Convert old data format (sector name) to new format (sector:id)
    if (assignedToValue && !assignedToValue.includes(':')) {
        const sector = sectors.find(s => s.name === assignedToValue);
        if (sector) {
            assignedToValue = `sector:${sector.id}`;
        }
    }

    form.reset({
      clientName: appointment.clientName,
      address: appointment.address,
      phone: appointment.phone || '',
      contact: appointment.contact,
      time: appointment.time,
      assignedTo: assignedToValue,
    });
  };

  const handleDeleteClick = (appointment: Appointment) => {
    setAppointmentToDelete(appointment);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (!appointmentToDelete) return;
    
    const dateKey = format(selectedDate, 'yyyy-MM-dd');
    setAppointments(prev => ({
        ...prev,
        [dateKey]: prev[dateKey].filter(app => app.id !== appointmentToDelete.id),
    }));

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
      clientName: '',
      address: '',
      phone: '',
      contact: '',
      time: '',
      assignedTo: '',
    });
  }

  const handleSendWhatsAppReminder = () => {
    if (!appointmentForReminders) return;

    const { clientName, time, phone } = appointmentForReminders;
    const dateStr = format(selectedDate, 'dd/MM/yyyy', { locale: ptBR });

    const template = companyProfile.whatsappReminderMessage || "Olá, {cliente}! 👋\n\nEste é um lembrete do seu agendamento com a {empresa} no dia {data} às {hora}.\n\nAté breve!";
    const message = template
      .replace('{cliente}', clientName)
      .replace('{empresa}', companyProfile.name)
      .replace('{data}', dateStr)
      .replace('{hora}', time);
    
    const encodedMessage = encodeURIComponent(message);
    
    const cleanPhone = phone?.replace(/\D/g, '') || '';
    let whatsappUrl = `https://api.whatsapp.com/send?text=${encodedMessage}`;

    if (cleanPhone.length >= 10) {
        const phoneWithCountryCode = cleanPhone.length > 11 ? cleanPhone : `55${cleanPhone}`;
        whatsappUrl = `https://api.whatsapp.com/send?phone=${phoneWithCountryCode}&text=${encodedMessage}`;
    }

    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');

    toast({
        title: "Pronto para Enviar!",
        description: `Sua mensagem para ${clientName} está pronta no WhatsApp.`,
    });

    setReminderStep('internal');
  };

  const handleSendInternalWhatsAppReminder = () => {
    if (!appointmentForReminders) return;

    const { clientName, time, assignedTo } = appointmentForReminders;
    const dateStr = format(selectedDate, 'dd/MM/yyyy', { locale: ptBR });
    
    const [type, id] = assignedTo.split(':');
    let targetName = '';
    let message = '';
    let whatsAppUrl = `https://api.whatsapp.com/send?text=`;
    let toastDescription = '';

    if (type === 'user') {
        const user = users.find(u => u.id === id);
        if (!user) {
            toast({ title: 'Erro', description: 'Usuário não encontrado.', variant: 'destructive'});
            setReminderStep('idle');
            return;
        }
        targetName = user.name;
        message = `*Lembrete de Agendamento Individual*\n\nOlá ${targetName}, você tem uma visita agendada.\n\n*Cliente:* ${clientName}\n*Data:* ${dateStr}\n*Horário:* ${time}\n\nPor favor, verifique a agenda para mais detalhes.`;
        
        const cleanPhone = user.whatsapp?.replace(/\D/g, '') || '';
        if (cleanPhone.length >= 10) {
            const phoneWithCountryCode = cleanPhone.length > 11 ? cleanPhone : `55${cleanPhone}`;
            whatsAppUrl += `&phone=${phoneWithCountryCode}`;
        } else {
             toast({
                title: "Usuário sem WhatsApp",
                description: `O usuário ${targetName} não tem um número de WhatsApp cadastrado. A mensagem será aberta para compartilhamento.`,
            });
        }
        toastDescription = `A mensagem para ${targetName} está pronta para ser enviada.`;
    } else { // 'sector' or fallback
        let sectorName = '';
        if (type === 'sector') {
            const sector = sectors.find(s => s.id === id);
            sectorName = sector?.name || 'Setor';
        } else {
            sectorName = assignedTo; // Fallback for old data format
        }
        targetName = `Setor ${sectorName}`;
        message = `*Lembrete de Agendamento para o Setor*\n\nUma visita foi agendada para o setor *${sectorName}*.\n\n*Cliente:* ${clientName}\n*Data:* ${dateStr}\n*Horário:* ${time}\n\nPor favor, verifique a agenda para mais detalhes.`;
        toastDescription = `A mensagem para ${targetName.replace('Setor ','o setor ')} está pronta para ser enviada.`;
    }

    const encodedMessage = encodeURIComponent(message);
    whatsAppUrl = `${whatsAppUrl.replace('text=','text='+encodedMessage)}`;

    window.open(whatsAppUrl, '_blank', 'noopener,noreferrer');

    toast({
        title: "Notificação Interna Pronta",
        description: toastDescription,
    });

    setReminderStep('idle');
  };

  function onSubmit(values: AppointmentFormValues) {
    const dateKey = format(selectedDate, 'yyyy-MM-dd');
    let savedAppointment: Appointment;
    
    if (editingAppointment) {
        // Update existing appointment
        const updatedAppointment: Appointment = {
            id: editingAppointment.id,
            time: values.time,
            clientName: values.clientName,
            address: values.address,
            phone: values.phone,
            contact: values.contact,
            assignedTo: values.assignedTo,
        };
        savedAppointment = updatedAppointment;
        setAppointments(prev => {
            const dayAppointments = prev[dateKey].map(app => 
                app.id === editingAppointment.id ? updatedAppointment : app
            );
            dayAppointments.sort((a, b) => a.time.localeCompare(b.time));
            return { ...prev, [dateKey]: dayAppointments };
        });
        toast({
            title: 'Agendamento Atualizado!',
            description: `Visita para ${values.clientName} atualizada.`,
        });
    } else {
        // Create new appointment
        const newAppointment: Appointment = {
            id: new Date().toISOString(),
            time: values.time,
            clientName: values.clientName,
            address: values.address,
            phone: values.phone,
            contact: values.contact,
            assignedTo: values.assignedTo,
        };
        savedAppointment = newAppointment;

        setAppointments(prev => {
            const dayAppointments = prev[dateKey] ? [...prev[dateKey], newAppointment] : [newAppointment];
            dayAppointments.sort((a, b) => a.time.localeCompare(b.time));
            return { ...prev, [dateKey]: dayAppointments };
        });

        toast({
            title: 'Agendamento Criado!',
            description: `Visita para ${values.clientName} agendada para as ${values.time}.`,
        });
    }

    setEditingAppointment(null);
    setSelectedAppointment(null);
    form.reset({
      clientName: '',
      address: '',
      phone: '',
      contact: '',
      time: '',
      assignedTo: '',
    });
    
    setAppointmentForReminders(savedAppointment);
    setReminderStep('client');
  }

  const selectedDayAppointments = useMemo(() => {
    const dateKey = format(selectedDate, 'yyyy-MM-dd');
    return appointments[dateKey] || [];
  }, [selectedDate, appointments]);

  return (
    <>
      <div className="flex h-full flex-col bg-card shadow-xl rounded-2xl p-6 text-card-foreground">
          {/* Header */}
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

          {/* Calendar Grid */}
          <div className="grid flex-1 grid-cols-7 text-center">
            {/* Weekdays */}
            {weekdays.map((day, i) => (
              <div key={i} className="flex items-center justify-center text-sm font-medium text-muted-foreground py-2 border-b">
                {day}
              </div>
            ))}

            {/* Days */}
            {days.map((day) => {
              const dayKey = format(day, 'yyyy-MM-dd');
              const dayEvents = appointments[dayKey] || [];
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
              setEditingAppointment(null);
              setSelectedAppointment(null);
              form.reset({
                clientName: '',
                address: '',
                phone: '',
                contact: '',
                time: '',
                assignedTo: '',
              });
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
            {/* Existing Appointments */}
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
                                    <p className="text-muted-foreground flex items-center gap-2"><MapPin className="h-4 w-4"/>{app.address}</p>
                                    <p className="text-muted-foreground flex items-center gap-2"><User className="h-4 w-4"/>{app.contact}</p>
                                    <p className="text-muted-foreground flex items-center gap-2"><Briefcase className="h-4 w-4"/>{getAssignedToName(app.assignedTo)}</p>
                                    {app.phone && <p className="text-muted-foreground flex items-center gap-2"><Phone className="h-4 w-4"/>{app.phone}</p>}
                                    
                                    <div className="absolute top-2 right-2 flex items-center opacity-0 group-hover:opacity-100 transition-opacity bg-muted/80 rounded-md">
                                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEditClick(app)}>
                                            <Pencil className="h-4 w-4" />
                                        </Button>
                                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => handleDeleteClick(app)}>
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
            {/* New/Edit Appointment Form */}
            <div>
                 <h3 className="font-semibold text-lg text-foreground mb-4">{editingAppointment ? 'Editar Agendamento' : 'Novo Agendamento'}</h3>
                 <Form {...form}>
                    <form id="appointment-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                                        {sectors.map(sector => (
                                            <SelectGroup key={sector.id}>
                                                <SelectLabel>{sector.name}</SelectLabel>
                                                <SelectItem value={`sector:${sector.id}`}>{`Todo o setor`}</SelectItem>
                                                {users
                                                    .filter(u => u.sectorIds.includes(sector.id))
                                                    .map(user => (
                                                        <SelectItem key={user.id} value={`user:${user.id}`}>{user.name}</SelectItem>
                                                    ))
                                                }
                                            </SelectGroup>
                                        ))}
                                        {sectors.length === 0 && <p className='p-2 text-xs text-muted-foreground'>Nenhum setor cadastrado.</p>}
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
                    {selectedAppointment && !editingAppointment && (
                        <Button type="button" onClick={() => handleEditClick(selectedAppointment)}>
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

    <AlertDialog open={reminderStep === 'client'} onOpenChange={(isOpen) => !isOpen && setReminderStep('idle')}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Agendamento Concluído!</AlertDialogTitle>
                <AlertDialogDescription>
                    Deseja enviar um lembrete via WhatsApp para o cliente{" "}
                    <span className="font-medium">{appointmentForReminders?.clientName}</span>?
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setReminderStep('internal')}>Não, obrigado</AlertDialogCancel>
                <AlertDialogAction onClick={handleSendWhatsAppReminder}>Enviar Lembrete</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>

    <AlertDialog open={reminderStep === 'internal'} onOpenChange={(isOpen) => !isOpen && setReminderStep('idle')}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Notificar Equipe Interna</AlertDialogTitle>
                <AlertDialogDescription>
                    Deseja notificar {assignedToDisplay.type === 'sector' ? 'o setor' : ''} <span className="font-medium">{assignedToDisplay.name}</span> sobre este agendamento via WhatsApp?
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setReminderStep('idle')}>Não</AlertDialogCancel>
                <AlertDialogAction onClick={handleSendInternalWhatsAppReminder}>Notificar Equipe</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
