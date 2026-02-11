'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { add, format, isSameDay, parse, startOfDay } from 'date-fns';
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

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [deletingAppointment, setDeletingAppointment] = useState<Appointment | null>(null);
  const timeoutIdsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const [today, setToday] = useState<Date | undefined>();

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

  const dailyAppointments = useMemo(() => {
    if (!selectedDate) return [];
    return appointments
      .filter((appt) => isSameDay(appt.dateTime, selectedDate))
      .sort((a, b) => a.dateTime.getTime() - b.dateTime.getTime());
  }, [appointments, selectedDate]);
  
  useEffect(() => {
    const now = new Date();
    setSelectedDate(now);
    setToday(now);
  }, []);

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

  const dayWithAppointments = useMemo(() => {
    return appointments.map(a => startOfDay(a.dateTime));
  }, [appointments]);

  return (
    <>
      <div className="flex-1 space-y-4 p-8 pt-6">
        <div className="flex items-center justify-between space-y-2">
          <h2 className="text-3xl font-bold tracking-tight font-headline">Agenda e Compromissos</h2>
          <Button onClick={() => handleOpenForm(null)}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Adicionar Compromisso
          </Button>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
            <div className="md:col-span-1">
                <Card>
                    <CardContent className="p-0">
                        <Calendar
                            mode="single"
                            selected={selectedDate}
                            onSelect={setSelectedDate}
                            locale={ptBR}
                            className="p-3"
                            modifiers={{ appointments: dayWithAppointments }}
                            modifiersClassNames={{ appointments: 'day-with-appointment' }}
                            today={today}
                        />
                    </CardContent>
                </Card>
                <Card className="mt-6">
                    <CardHeader>
                        <CardTitle>Integração com Google</CardTitle>
                        <CardDescription>Conecte sua conta para sincronizar eventos.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground">
                            A integração completa para sincronização automática com o Google Calendar será implementada em breve.
                        </p>
                        <Button className="w-full mt-4" variant="outline">
                            <CalendarPlus className="mr-2 h-4 w-4" />
                            Conectar com Google Calendar
                        </Button>
                    </CardContent>
                </Card>
            </div>
            <div className="md:col-span-2">
                 <Card>
                    <CardHeader>
                        <CardTitle>
                            Compromissos para {selectedDate ? format(selectedDate, 'dd \'de\' MMMM', {locale: ptBR}) : 'a data selecionada'}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {dailyAppointments.length > 0 ? (
                            dailyAppointments.map(appt => {
                                const customer = initialCustomers.find(c => c.id === appt.customerId);
                                const assignedUsers = mockUsers.filter(u => appt.userIds.includes(u.id));
                                return (
                                <Card key={appt.id} className={cn("transition-all", appt.status === 'completed' && 'bg-muted/50 text-muted-foreground')}>
                                    <CardHeader className='pb-3'>
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <CardTitle className="text-lg flex items-center gap-2">
                                                     <Badge className={cn(
                                                         appt.status === 'scheduled' && 'bg-chart-2',
                                                         appt.status === 'completed' && 'bg-chart-4',
                                                         appt.status === 'canceled' && 'bg-destructive',
                                                     )}>
                                                        {appt.status === 'scheduled' ? 'Agendado' : appt.status === 'completed' ? 'Concluído' : 'Cancelado'}
                                                    </Badge>
                                                    <span>{appt.title}</span>
                                                </CardTitle>
                                                <CardDescription className="flex items-center gap-2 pt-2">
                                                    <Clock className="h-4 w-4" /> {format(appt.dateTime, 'HH:mm')}h
                                                </CardDescription>
                                            </div>
                                             <div className="flex gap-2">
                                                <Button variant="outline" size="sm" onClick={() => handleOpenForm(appt)}>Editar</Button>
                                                <Button variant="destructive" size="sm" onClick={() => setDeletingAppointment(appt)}>Excluir</Button>
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="space-y-3">
                                        <div className="flex items-center gap-2 text-sm">
                                            <BookUser className="h-4 w-4" />
                                            Cliente: <span className="font-semibold">{customer?.name || 'Não informado'}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-sm">
                                            <Users className="h-4 w-4" />
                                            Participantes: {assignedUsers.map(u => u.name).join(', ')}
                                        </div>
                                        {appt.reminder > 0 && (
                                            <div className="flex items-center gap-2 text-sm text-amber-500">
                                                <BellRing className="h-4 w-4" />
                                                Lembrete {appt.reminder} min. antes
                                            </div>
                                        )}
                                    </CardContent>
                                    <CardFooter>
                                        <Button variant="secondary" onClick={() => handleWhatsAppConfirmation(appt)}>
                                            <Send className="mr-2 h-4 w-4" />
                                            Confirmar por WhatsApp
                                        </Button>
                                    </CardFooter>
                                </Card>
                            )})
                        ) : (
                            <div className="text-center py-10 border-2 border-dashed rounded-lg">
                                <CalendarIcon className="mx-auto h-12 w-12 text-muted-foreground" />
                                <h3 className="mt-2 text-sm font-semibold text-foreground">Nenhum compromisso</h3>
                                <p className="mt-1 text-sm text-muted-foreground">Não há eventos agendados para este dia.</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
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
                                            {field.value ? (
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
                                            disabled={(date) => today ? date < startOfDay(today) : true}
                                            initialFocus
                                            locale={ptBR}
                                            today={today}
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

        <style jsx global>{`
            .day-with-appointment {
                position: relative;
            }
            .day-with-appointment::after {
                content: '';
                position: absolute;
                bottom: 4px;
                left: 50%;
                transform: translateX(-50%);
                width: 4px;
                height: 4px;
                border-radius: 50%;
                background-color: hsl(var(--primary));
            }
            .rdp-day_selected.day-with-appointment::after {
                 background-color: hsl(var(--primary-foreground));
            }
        `}</style>
    </>
  );
}
