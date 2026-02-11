'use client';

import { useState, useMemo } from 'react';
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
import { ChevronLeft, ChevronRight, Clock, MapPin, Phone, User, Plus, Pencil, Trash2 } from 'lucide-react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';

// Define the structure for a single appointment
type Appointment = {
  id: string;
  time: string;
  clientName: string;
  address: string;
  phone: string;
  contact: string;
};

// Define the schema for the appointment form using Zod
const appointmentSchema = z.object({
  clientName: z.string().min(1, 'O nome do cliente é obrigatório.'),
  address: z.string().min(1, 'O endereço é obrigatório.'),
  phone: z.string().optional(),
  contact: z.string().min(1, 'O nome do contato na visita é obrigatório.'),
  time: z.string({ required_error: 'Por favor, selecione um horário.' }),
});

type AppointmentFormValues = z.infer<typeof appointmentSchema>;

// Generate time slots from 8:00 to 20:00
const timeSlots = Array.from({ length: 13 }, (_, i) => `${String(i + 8).padStart(2, '0')}:00`);

export default function AgendaPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [appointmentToDelete, setAppointmentToDelete] = useState<Appointment | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const [appointments, setAppointments] = useState<Record<string, Appointment[]>>({
    [format(new Date(), 'yyyy-MM-dd')]: [
        { id: '1', time: '10:00', clientName: 'Tech Solutions', address: 'Rua das Inovações, 123', phone: '1199999999', contact: 'Ana' },
    ]
  });
  const { toast } = useToast();

  const form = useForm<AppointmentFormValues>({
    resolver: zodResolver(appointmentSchema),
  });

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
    form.reset();
    setEditingAppointment(null);
    setIsModalOpen(true);
  };
  
  const handleDayClick = (day: Date) => {
    if (isSameMonth(day, currentMonth)) {
        openModalForDay(day);
    }
  };

  const handleEditClick = (appointment: Appointment) => {
    setEditingAppointment(appointment);
    form.reset({
      clientName: appointment.clientName,
      address: appointment.address,
      phone: appointment.phone,
      contact: appointment.contact,
      time: appointment.time,
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
    form.reset();
  }

  function onSubmit(values: AppointmentFormValues) {
    const dateKey = format(selectedDate, 'yyyy-MM-dd');
    
    if (editingAppointment) {
        // Update existing appointment
        const updatedAppointment: Appointment = {
            id: editingAppointment.id,
            ...values,
        };
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
            ...values,
        };

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
    form.reset();
    // Keep modal open after submit to see the updated list
  }

  const selectedDayAppointments = useMemo(() => {
    const dateKey = format(selectedDate, 'yyyy-MM-dd');
    return appointments[dateKey] || [];
  }, [selectedDate, appointments]);

  return (
    <>
      <div className="flex h-full flex-col p-4 bg-background">
        <div className="flex w-full flex-1 flex-col rounded-2xl bg-card p-6 text-card-foreground shadow-xl">
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
              <div key={i} className="flex items-center justify-center text-sm font-medium text-muted-foreground">
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
                  className="flex flex-col items-center justify-start py-2"
                  onClick={() => handleDayClick(day)}
                >
                  <div
                    className={cn(
                      "w-12 h-12 flex items-center justify-center rounded-full transition-colors text-base font-medium",
                      isSameMonth(day, currentMonth) ? 'cursor-pointer' : 'text-muted-foreground/50',
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
      </div>

      <Dialog open={isModalOpen} onOpenChange={(isOpen) => {
          if (!isOpen) {
              setEditingAppointment(null);
              form.reset();
          }
          setIsModalOpen(isOpen);
      }}>
        <DialogContent className="sm:max-w-[425px] md:max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              Agenda para {format(selectedDate, 'dd/MM/yyyy', { locale: ptBR })}
            </DialogTitle>
            <DialogDescription>
              Visualize, adicione ou edite compromissos para este dia.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
            {/* Existing Appointments */}
            <div className="space-y-4">
                 <h3 className="font-semibold text-lg text-foreground">Compromissos Agendados</h3>
                 <ScrollArea className="h-96">
                    {selectedDayAppointments.length > 0 ? (
                        <div className="space-y-4 pr-4">
                            {selectedDayAppointments.map(app => (
                                <div key={app.id} className="relative group p-3 bg-muted/50 rounded-lg text-sm space-y-2">
                                    <div className="flex justify-between items-start">
                                        <p className="font-semibold text-base pr-16">{app.clientName}</p>
                                        <div className="flex items-center gap-2 text-primary font-bold">
                                            <Clock className="h-4 w-4"/>
                                            {app.time}
                                        </div>
                                    </div>
                                    <p className="text-muted-foreground flex items-center gap-2"><MapPin className="h-4 w-4"/>{app.address}</p>
                                    <p className="text-muted-foreground flex items-center gap-2"><User className="h-4 w-4"/>{app.contact}</p>
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
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                        control={form.control}
                        name="time"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Horário</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecione um horário" />
                                </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                {timeSlots.map(slot => (
                                    <SelectItem key={slot} value={slot}>{slot}</SelectItem>
                                ))}
                                </SelectContent>
                            </Select>
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
                                <Input placeholder="(00) 00000-0000" {...field} />
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
                         <DialogFooter className="pt-4 gap-2">
                             {editingAppointment && (
                                <Button type="button" variant="outline" onClick={handleCancelEdit}>Cancelar</Button>
                             )}
                            <Button type="submit">
                                {editingAppointment ? 'Salvar Alterações' : (
                                    <>
                                        <Plus className="mr-2 h-4 w-4" />
                                        Agendar
                                    </>
                                )}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </div>
          </div>
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
    </>
  );
}

    