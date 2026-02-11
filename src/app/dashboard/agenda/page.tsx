
'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { add, format, isSameDay, parse, startOfDay, getMonth, startOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  BellRing,
  BookUser,
  Calendar as CalendarIcon,
  CalendarPlus,
  Check,
  Clock,
  PlusCircle,
  Send,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { DayContentProps, useDayPicker } from 'react-day-picker';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
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
import { initialCustomers } from '@/lib/mock-data';
import type { Customer } from '@/lib/mock-data';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { useSettings } from '@/contexts/SettingsContext';
import { ToastAction } from '@/components/ui/toast';
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

// Tipos e Dados Mock
type Appointment = {
  id: string;
  title: string;
  customerId: string;
  opportunityId?: string;
  dateTime: Date;
  userIds: string[];
  reminder: number; // in minutes
  status: 'scheduled' | 'completed' | 'canceled';
};

const mockUsers = [
  { id: 'user_1', name: 'Ana Silva' },
  { id: 'user_2', name: 'Carlos Pereira' },
  { id: 'user_3', name: 'Juliana Costa' },
];

const mockOpportunities = [
  { id: 'opp_1', name: 'Tech Solutions Ltda. - Negociação' },
  { id: 'opp_2', name: 'Inova Corp S.A. - Proposta' },
  { id: 'opp_4', name: 'ConstruBem Materiais - Lead' },
];

const initialAppointments: Appointment[] = [
  {
    id: 'appt_1',
    title: 'Reunião de Follow-up',
    customerId: 'cust_1',
    opportunityId: 'opp_1',
    dateTime: add(new Date(), { hours: 2 }),
    userIds: ['user_1'],
    reminder: 15,
    status: 'scheduled',
  },
  {
    id: 'appt_2',
    title: 'Apresentação da Proposta',
    customerId: 'cust_2',
    opportunityId: 'opp_2',
    dateTime: add(new Date(), { days: 1, hours: 3 }),
    userIds: ['user_1', 'user_2'],
    reminder: 60,
    status: 'scheduled',
  },
    {
    id: 'appt_3',
    title: 'Primeiro Contato',
    customerId: 'cust_4',
    opportunityId: 'opp_4',
    dateTime: add(new Date(), { days: -2, hours: 5 }),
    userIds: ['user_3'],
    reminder: 0,
    status: 'completed',
  },
];

const appointmentSchema = z.object({
  title: z.string().min(1, 'O título é obrigatório.'),
  customerId: z.string({ required_error: 'Selecione um cliente.' }).min(1, 'Selecione um cliente.'),
  opportunityId: z.string().optional(),
  date: z.date({ required_error: 'A data é obrigatória.' }),
  time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Formato de hora inválido (HH:MM)."),
  userIds: z.array(z.string()).min(1, 'Atribua pelo menos um usuário.'),
  reminder: z.coerce.number().min(0),
});

export default function AgendaPage() {
  const { companyProfile } = useSettings();
  const { toast } = useToast();
  const [appointments, setAppointments] = useState<Appointment[]>(initialAppointments);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [currentMonth, setCurrentMonth] = useState(startOfMonth(new Date()));
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [deletingAppointment, setDeletingAppointment] = useState<Appointment | null>(null);
  const timeoutIdsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const form = useForm<z.infer<typeof appointmentSchema>>({
    resolver: zodResolver(appointmentSchema),
    defaultValues: {
      title: '',
      customerId: '',
      opportunityId: '',
      time: format(new Date(), 'HH:mm'),
      userIds: [],
      reminder: 15,
    },
  });
  
  useEffect(() => {
    timeoutIdsRef.current.forEach(clearTimeout);
    timeoutIdsRef.current.clear();
    const newTimeoutIds = new Map<string, NodeJS.Timeout>();

    appointments
      .filter((appt) => appt.status === 'scheduled' && appt.reminder > 0)
      .forEach((appt) => {
        const reminderTime = new Date(appt.dateTime).getTime() - appt.reminder * 60 * 1000;
        const now = Date.now();

        if (reminderTime > now) {
          const timeoutId = setTimeout(() => {
            const customer = initialCustomers.find(c => c.id === appt.customerId);
            toast({
              title: `Lembrete: ${appt.title}`,
              description: `Seu compromisso com ${customer?.name} começa em ${appt.reminder} minutos.`,
              duration: 15000,
              action: <ToastAction altText="Ok">Ok</ToastAction>,
            });
          }, reminderTime - now);
          newTimeoutIds.set(appt.id, timeoutId);
        }
      });
    
    timeoutIdsRef.current = newTimeoutIds;

    return () => {
      timeoutIdsRef.current.forEach(clearTimeout);
    };
  }, [appointments, toast]);

  const handleOpenForm = (appointment: Appointment | null) => {
    setEditingAppointment(appointment);
    if (appointment) {
      form.reset({
        title: appointment.title,
        customerId: appointment.customerId,
        opportunityId: appointment.opportunityId,
        date: appointment.dateTime,
        time: format(appointment.dateTime, 'HH:mm'),
        userIds: appointment.userIds,
        reminder: appointment.reminder,
      });
    } else {
      form.reset({
        title: '',
        customerId: '',
        opportunityId: '',
        date: selectedDate || new Date(),
        time: format(add(new Date(), { hours: 1 }), 'HH:mm'),
        userIds: [],
        reminder: 15,
      });
    }
    setIsFormOpen(true);
  };

  const onSubmit = (values: z.infer<typeof appointmentSchema>) => {
    const [hours, minutes] = values.time.split(':').map(Number);
    const dateTime = new Date(values.date);
    dateTime.setHours(hours, minutes, 0, 0);

    if (editingAppointment) {
      const updatedAppointment: Appointment = {
        ...editingAppointment,
        ...values,
        dateTime,
      };
      setAppointments(
        appointments.map((a) => (a.id === editingAppointment.id ? updatedAppointment : a))
      );
      toast({ title: 'Compromisso Atualizado!', description: 'As alterações foram salvas.' });
    } else {
      const newAppointment: Appointment = {
        id: `appt_${Date.now()}`,
        status: 'scheduled',
        ...values,
        dateTime,
      };
      setAppointments([newAppointment, ...appointments]);
      toast({ title: 'Compromisso Agendado!', description: 'O novo compromisso foi adicionado à sua agenda.' });
    }
    setIsFormOpen(false);
  };

  const confirmDelete = () => {
    if (!deletingAppointment) return;
    setAppointments(appointments.filter((a) => a.id !== deletingAppointment.id));
    toast({
        title: 'Compromisso Excluído!',
        variant: 'destructive'
    });
    setDeletingAppointment(null);
  };

  const handleWhatsAppConfirmation = (appointment: Appointment) => {
    const customer = initialCustomers.find(c => c.id === appointment.customerId);
    if (!customer) return;

    const message = `Olá, ${customer.name}! Gostaríamos de confirmar seu compromisso "${appointment.title}" agendado para ${format(appointment.dateTime, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}. Por favor, responda a esta mensagem para confirmar. Atenciosamente, ${companyProfile.name}`;

    const encodedMessage = encodeURIComponent(message);
    const phone = customer.telefone?.replace(/\D/g, '') || '';
    
    let whatsappUrl = `https://wa.me/?text=${encodedMessage}`;
    if (phone) {
        whatsappUrl = `https://wa.me/55${phone}?text=${encodedMessage}`;
    }
    
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
    
    toast({
        title: "Confirmação preparada!",
        description: `Uma mensagem para ${customer.name} está pronta no WhatsApp.`
    });
  };

  function CustomDayContent(props: DayContentProps) {
    const dayAppointments = useMemo(() => {
        return appointments
            .filter((appt) => isSameDay(appt.dateTime, props.date))
            .sort((a, b) => a.dateTime.getTime() - b.dateTime.getTime());
    }, [props.date, appointments]);
    
    const { date, displayMonth } = props;
    const isOutside = getMonth(date) !== getMonth(displayMonth);

    return (
        <div className={cn("h-full w-full p-1 flex flex-col", isOutside && "text-muted-foreground/50")}>
            <div className="self-end text-sm">{format(props.date, 'd')}</div>
            <div className="flex-grow space-y-1 overflow-hidden mt-1 text-left">
                {dayAppointments.slice(0, 3).map(appt => (
                    <div
                        key={appt.id}
                        onClick={(e) => {
                            e.stopPropagation();
                            handleOpenForm(appt);
                        }}
                        className={cn(
                          "bg-chart-4/20 text-xs rounded px-1.5 py-0.5 truncate cursor-pointer hover:bg-chart-4/30",
                          appt.status === 'completed' && 'bg-muted-foreground/20 line-through'
                        )}
                    >
                        {appt.title}
                    </div>
                ))}
                {dayAppointments.length > 3 && (
                    <div className="text-xs text-muted-foreground">+ {dayAppointments.length - 3} mais</div>
                )}
            </div>
        </div>
    );
  }

  return (
    <>
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6 h-full flex flex-col">
        <div className="flex items-center justify-between space-y-2">
          <h2 className="text-3xl font-bold tracking-tight font-headline">Agenda</h2>
          <Button onClick={() => handleOpenForm(null)}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Adicionar Compromisso
          </Button>
        </div>

        <Card className="flex-1 flex flex-col">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={setSelectedDate}
            month={currentMonth}
            onMonthChange={setCurrentMonth}
            locale={ptBR}
            components={{ DayContent: CustomDayContent }}
            className="h-full w-full"
            classNames={{
                months: "h-full flex flex-col",
                month: "h-full flex flex-col",
                caption_label: "text-lg font-bold",
                head_row: "flex border-b",
                head_cell: "text-muted-foreground w-[14.28%] text-sm font-normal py-3",
                body: "flex-1 grid grid-cols-7 grid-rows-5",
                row: "flex w-full mt-0",
                cell: "h-auto text-center text-sm p-0 relative focus-within:relative focus-within:z-20 w-full border-l border-t first:border-l-0",
                day: "h-full w-full p-0 rounded-none focus:bg-accent/50",
                day_selected: "bg-accent text-accent-foreground",
                day_today: "bg-primary/10 text-primary",
            }}
          />
        </Card>
      </div>

       <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-[625px]">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <DialogHeader>
                <DialogTitle>{editingAppointment ? 'Editar Compromisso' : 'Novo Compromisso'}</DialogTitle>
                <DialogDescription>
                  Preencha os detalhes abaixo.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Título</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: Reunião de alinhamento" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                     <FormField
                        control={form.control}
                        name="customerId"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Cliente</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Selecione um cliente" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        {initialCustomers.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            <FormMessage />
                            </FormItem>
                        )}
                        />
                     <FormField
                        control={form.control}
                        name="opportunityId"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Oportunidade (Opcional)</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Vincule uma oportunidade" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        {mockOpportunities.map(o => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            <FormMessage />
                            </FormItem>
                        )}
                        />
                </div>
                 <div className="grid grid-cols-2 gap-4">
                     <FormField
                        control={form.control}
                        name="date"
                        render={({ field }) => (
                            <FormItem className="flex flex-col">
                                <FormLabel className="mb-1">Data</FormLabel>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <FormControl>
                                            <Button
                                            variant={"outline"}
                                            className={cn(
                                                "w-full pl-3 text-left font-normal",
                                                !field.value && "text-muted-foreground"
                                            )}
                                            >
                                            {isClient && field.value ? (
                                                format(field.value, "PPP", { locale: ptBR })
                                            ) : (
                                                <span>Escolha uma data</span>
                                            )}
                                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                            </Button>
                                        </FormControl>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                        <Calendar
                                            mode="single"
                                            selected={field.value}
                                            onSelect={field.onChange}
                                            initialFocus
                                            locale={ptBR}
                                        />
                                    </PopoverContent>
                                </Popover>
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
                 </div>
                <div className="grid grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="userIds"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Atribuir a</FormLabel>
                             <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <FormControl>
                                    <Button variant="outline" className="w-full justify-start">
                                        <span className="truncate">
                                            {field.value.length > 0
                                            ? mockUsers.filter(u => field.value.includes(u.id)).map(u => u.name).join(', ')
                                            : "Selecione os usuários"}
                                        </span>
                                    </Button>
                                    </FormControl>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent className="w-full">
                                    {mockUsers.map(user => (
                                        <DropdownMenuCheckboxItem
                                            key={user.id}
                                            checked={field.value.includes(user.id)}
                                            onCheckedChange={(checked) => {
                                                return checked
                                                ? field.onChange([...field.value, user.id])
                                                : field.onChange(field.value.filter((value) => value !== user.id))
                                            }}
                                        >
                                            {user.name}
                                        </DropdownMenuCheckboxItem>
                                    ))}
                                </DropdownMenuContent>
                            </DropdownMenu>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                     <FormField
                        control={form.control}
                        name="reminder"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Lembrete</FormLabel>
                                <Select onValueChange={(val) => field.onChange(Number(val))} defaultValue={String(field.value)}>
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        <SelectItem value="0">Sem lembrete</SelectItem>
                                        <SelectItem value="5">5 minutos antes</SelectItem>
                                        <SelectItem value="15">15 minutos antes</SelectItem>
                                        <SelectItem value="30">30 minutos antes</SelectItem>
                                        <SelectItem value="60">1 hora antes</SelectItem>
                                    </SelectContent>
                                </Select>
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setIsFormOpen(false)}>Cancelar</Button>
                <Button type="submit">{editingAppointment ? 'Salvar Alterações' : 'Agendar'}</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      <AlertDialog open={!!deletingAppointment} onOpenChange={() => setDeletingAppointment(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
                <AlertDialogDescription>
                    Esta ação não pode ser desfeita. O compromisso será excluído permanentemente.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={confirmDelete}>Confirmar</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

    