'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { add, format, isSameDay, startOfDay, getMonth, startOfMonth, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  BellRing,
  BookUser,
  Calendar as CalendarIcon,
  CalendarPlus,
  Check,
  Clock,
  Loader2,
  PlusCircle,
  Send,
  Trash2,
  Users,
  X,
  Filter,
} from 'lucide-react';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { DayContentProps, DayPicker } from 'react-day-picker';

import { Button, buttonVariants } from '@/components/ui/button';
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
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';


const eventTypes = {
  pagamento: { label: 'Pagamento', className: 'border-transparent bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200' },
  recebimento: { label: 'Receita', className: 'border-transparent bg-green-100 text-green-800 dark:bg-green-900/60 dark:text-green-200' },
  vencimento: { label: 'Despesa', className: 'border-transparent bg-red-100 text-red-800 dark:bg-red-900/60 dark:text-red-200' },
  reuniao: { label: 'Reunião', className: 'border-transparent bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-200' },
  entrega: { label: 'Entrega', className: 'border-transparent bg-indigo-100 text-indigo-800 dark:bg-indigo-900/60 dark:text-indigo-200' },
  relatorio: { label: 'Relatório', className: 'border-transparent bg-cyan-100 text-cyan-800 dark:bg-cyan-900/60 dark:text-cyan-200' },
};
type EventType = keyof typeof eventTypes;

type Event = {
  id: string;
  title: string;
  customerId: string;
  opportunityId?: string;
  dateTime: Date;
  userIds: string[];
  reminder: number; // in minutes
  status: 'scheduled' | 'completed' | 'canceled';
  eventType: EventType;
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

const eventSchema = z.object({
  title: z.string().min(1, 'O título é obrigatório.'),
  customerId: z.string({ required_error: 'Selecione um cliente.' }).min(1, 'Selecione um cliente.'),
  opportunityId: z.string().optional(),
  date: z.date({ required_error: 'A data é obrigatória.' }),
  time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Formato de hora inválido (HH:MM)."),
  userIds: z.array(z.string()).min(1, 'Atribua pelo menos um usuário.'),
  reminder: z.coerce.number().min(0),
  eventType: z.string().min(1, "Selecione um tipo de evento."),
});

const formatWeekdayName = (day: Date) => {
  return format(day, "EEEE", { locale: ptBR }).replace('-feira', '');
};

export default function AgendaPage() {
  const { companyProfile } = useSettings();
  const { toast } = useToast();
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [currentMonth, setCurrentMonth] = useState<Date | undefined>();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [deletingEvent, setDeletingEvent] = useState<Event | null>(null);
  const timeoutIdsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const [isClient, setIsClient] = useState(false);
  const [today, setToday] = useState<Date | undefined>();
  
  const [visibleEventTypes, setVisibleEventTypes] = useState<string[]>(Object.keys(eventTypes));
  const [dayModal, setDayModal] = useState<Date | null>(null);

  const form = useForm<z.infer<typeof eventSchema>>({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      title: '',
      customerId: '',
      opportunityId: '',
      time: '09:00',
      userIds: [],
      reminder: 15,
      eventType: 'reuniao',
    },
  });
  
  useEffect(() => {
    const now = new Date();
    setToday(now);
    const dynamicInitialEvents: Event[] = [
      {
        id: 'evt_1',
        title: 'Pagamento Fornecedor A',
        customerId: 'cust_1',
        dateTime: add(now, { days: 1, hours: 2 }),
        userIds: ['user_1'],
        reminder: 15,
        status: 'scheduled',
        eventType: 'pagamento',
      },
      {
        id: 'evt_2',
        title: 'Receita de consultoria',
        customerId: 'cust_2',
        opportunityId: 'opp_2',
        dateTime: add(now, { days: 2, hours: 4 }),
        userIds: ['user_1', 'user_2'],
        reminder: 60,
        status: 'completed',
        eventType: 'recebimento',
      },
      {
        id: 'evt_3',
        title: 'Pagamento de Software',
        customerId: 'cust_4',
        opportunityId: 'opp_4',
        dateTime: add(now, { days: 5 }),
        userIds: ['user_3'],
        reminder: 0,
        status: 'scheduled',
        eventType: 'vencimento',
      },
      {
        id: 'evt_4',
        title: 'Reunião de Alinhamento',
        customerId: 'cust_5',
        dateTime: add(now, { days: -2, hours: 1 }),
        userIds: ['user_2'],
        reminder: 30,
        status: 'completed',
        eventType: 'reuniao',
      },
      {
        id: 'evt_5',
        title: 'Entrega Fase 1 Projeto',
        customerId: 'cust_1',
        dateTime: now,
        userIds: ['user_1', 'user_2'],
        reminder: 0,
        status: 'scheduled',
        eventType: 'entrega'
      },
       {
        id: 'evt_6',
        title: 'Gerar Relatório Financeiro',
        customerId: 'cust_3',
        dateTime: add(now, { days: 3, hours: 6 }),
        userIds: ['user_1'],
        reminder: 0,
        status: 'scheduled',
        eventType: 'relatorio'
      },
    ];
    setEvents(dynamicInitialEvents);
    setSelectedDate(now);
    setCurrentMonth(startOfMonth(now));
    setIsClient(true);
  }, []);

  useEffect(() => {
    timeoutIdsRef.current.forEach(clearTimeout);
    timeoutIdsRef.current.clear();
    const newTimeoutIds = new Map<string, NodeJS.Timeout>();

    events
      .filter((evt) => evt.status === 'scheduled' && evt.reminder > 0)
      .forEach((evt) => {
        const reminderTime = new Date(evt.dateTime).getTime() - evt.reminder * 60 * 1000;
        const now = Date.now();

        if (reminderTime > now) {
          const timeoutId = setTimeout(() => {
            const customer = initialCustomers.find(c => c.id === evt.customerId);
            toast({
              title: `Lembrete: ${evt.title}`,
              description: `Seu evento com ${customer?.name} começa em ${evt.reminder} minutos.`,
              duration: 15000,
              action: <ToastAction altText="Ok">Ok</ToastAction>,
            });
          }, reminderTime - now);
          newTimeoutIds.set(evt.id, timeoutId);
        }
      });
    
    timeoutIdsRef.current = newTimeoutIds;

    return () => {
      timeoutIdsRef.current.forEach(clearTimeout);
    };
  }, [events, toast]);

  const handleOpenForm = (event: Event | null) => {
    setEditingEvent(event);
    if (event) {
      form.reset({
        title: event.title,
        customerId: event.customerId,
        opportunityId: event.opportunityId,
        date: event.dateTime,
        time: format(event.dateTime, 'HH:mm'),
        userIds: event.userIds,
        reminder: event.reminder,
        eventType: event.eventType,
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
        eventType: 'reuniao'
      });
    }
    setIsFormOpen(true);
  };

  const onSubmit = (values: z.infer<typeof eventSchema>) => {
    const [hours, minutes] = values.time.split(':').map(Number);
    const dateTime = new Date(values.date);
    dateTime.setHours(hours, minutes, 0, 0);

    if (editingEvent) {
      const updatedEvent: Event = {
        ...editingEvent,
        ...values,
        dateTime,
        eventType: values.eventType as EventType,
      };
      setEvents(
        events.map((a) => (a.id === editingEvent.id ? updatedEvent : a))
      );
      toast({ title: 'Evento Atualizado!', description: 'As alterações foram salvas.' });
    } else {
      const newEvent: Event = {
        id: `evt_${Date.now()}`,
        status: 'scheduled',
        ...values,
        dateTime,
        eventType: values.eventType as EventType,
      };
      setEvents([newEvent, ...events]);
      toast({ title: 'Evento Agendado!', description: 'O novo evento foi adicionado à sua agenda.' });
    }
    setIsFormOpen(false);
  };

  const confirmDelete = () => {
    if (!deletingEvent) return;
    setEvents(events.filter((a) => a.id !== deletingEvent.id));
    toast({
        title: 'Evento Excluído!',
        variant: 'destructive'
    });
    setDeletingEvent(null);
  };

  function CustomDayContent(props: DayContentProps) {
    const dayEvents = useMemo(() => {
        return events
            .filter((evt) => isSameDay(evt.dateTime, props.date) && visibleEventTypes.includes(evt.eventType))
            .sort((a, b) => a.dateTime.getTime() - b.dateTime.getTime());
    }, [props.date, events, visibleEventTypes]);
    
    const { date, modifiers } = props;
    const isOutside = modifiers.outside;
    const isTodayDate = isToday(date);
    const isSelected = modifiers.selected;

    return (
        <div className={cn("h-full w-full flex flex-col p-1.5 align-top", isOutside && "text-muted-foreground/50")}>
            <div className={cn(
                "self-end text-sm w-7 h-7 flex items-center justify-center rounded-full",
                isTodayDate && !isSelected && "bg-accent text-accent-foreground",
                isSelected && "bg-primary text-primary-foreground font-semibold",
            )}>
                {format(date, 'd')}
            </div>
            <div className="flex-grow space-y-1 overflow-hidden mt-1 text-left">
                {dayEvents.slice(0, 2).map(evt => (
                    <button
                        key={evt.id}
                        onClick={(e) => {
                            e.stopPropagation();
                            handleOpenForm(evt);
                        }}
                        className={cn(
                          "w-full text-xs rounded-md px-1.5 py-1 truncate text-left",
                          eventTypes[evt.eventType]?.className,
                          evt.status === 'completed' && 'bg-muted/80 line-through text-muted-foreground'
                        )}
                    >
                        {eventTypes[evt.eventType].label}
                    </button>
                ))}
                {dayEvents.length > 2 && (
                    <p
                        className="text-xs text-muted-foreground cursor-pointer hover:underline"
                        onClick={(e) => {
                            e.stopPropagation();
                            setDayModal(props.date);
                        }}
                    >
                        + {dayEvents.length - 2} mais
                    </p>
                )}
            </div>
        </div>
    );
  }

  return (
    <>
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6 h-full flex flex-col">
        <div className="flex items-center justify-between space-y-2">
          <h2 className="text-3xl font-bold tracking-tight font-headline">Agenda Financeira e Operacional</h2>
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <Filter className="mr-2 h-4 w-4" />
                  Filtrar Eventos
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Filtrar por tipo</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {Object.entries(eventTypes).map(([key, { label }]) => (
                    <DropdownMenuCheckboxItem
                        key={key}
                        checked={visibleEventTypes.includes(key)}
                        onCheckedChange={(checked) => {
                            setVisibleEventTypes(prev => 
                                checked ? [...prev, key] : prev.filter(t => t !== key)
                            )
                        }}
                    >
                        {label}
                    </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <Button onClick={() => handleOpenForm(null)}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Adicionar Evento
            </Button>
          </div>
        </div>

        <Card className="flex-1 flex flex-col p-0">
          {isClient ? (
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(day) => {
                if (day) {
                    setSelectedDate(day);
                    setDayModal(day);
                }
              }}
              month={currentMonth}
              onMonthChange={setCurrentMonth}
              locale={ptBR}
              weekStartsOn={0}
              today={today}
              formatters={{ formatWeekdayName }}
              components={{ DayContent: CustomDayContent }}
              classNames={{
                  root: 'flex-1 flex flex-col',
                  months: "flex flex-col flex-1",
                  month: "flex flex-col flex-1 space-y-4",
                  caption: "flex justify-center items-center relative px-4 pt-4 pb-2",
                  caption_label: "text-xl font-bold capitalize",
                  nav: 'space-x-1 flex items-center',
                  nav_button: cn(buttonVariants({ variant: 'outline' }), 'h-8 w-8 bg-transparent p-0'),
                  nav_button_previous: 'absolute left-4 top-4',
                  nav_button_next: 'absolute right-4 top-4',
                  table: 'w-full border-collapse',
                  head_row: 'grid grid-cols-7',
                  head_cell: "text-muted-foreground capitalize font-medium text-sm text-center py-2 border",
                  row: 'grid grid-cols-7',
                  cell: "h-32 text-sm p-0 relative border align-top",
                  day: "h-full w-full p-0 rounded-none focus-visible:outline-none focus:ring-1 focus:ring-ring focus:z-10",
                  day_selected: "bg-primary/10",
                  day_today: "",
                  day_outside: "text-muted-foreground/50 pointer-events-none",
              }}
            />
          ) : (
            <div className="h-full w-full flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          )}
        </Card>
      </div>

       <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-[625px]">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <DialogHeader>
                <DialogTitle>{editingEvent ? 'Editar Evento' : 'Novo Evento'}</DialogTitle>
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
                        name="eventType"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Tipo de Evento</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Selecione um tipo" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        {Object.entries(eventTypes).map(([key, { label }]) => (
                                          <SelectItem key={key} value={key}>{label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>
                 <FormField
                    control={form.control}
                    name="reminder"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Lembrete</FormLabel>
                            <Select onValueChange={(val) => field.onChange(Number(val))} value={String(field.value)}>
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
              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setIsFormOpen(false)}>Cancelar</Button>
                <Button type="submit">{editingEvent ? 'Salvar Alterações' : 'Agendar'}</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      <AlertDialog open={!!deletingEvent} onOpenChange={() => setDeletingEvent(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
                <AlertDialogDescription>
                    Esta ação não pode ser desfeita. O evento será excluído permanentemente.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={confirmDelete}>Confirmar</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      <Dialog open={!!dayModal} onOpenChange={() => setDayModal(null)}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Eventos para {dayModal && format(dayModal, 'PPP', { locale: ptBR })}</DialogTitle>
                 <DialogDescription>
                    Todos os eventos agendados para este dia.
                </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-2 max-h-[60vh] overflow-y-auto">
                {dayModal && events
                    .filter(evt => isSameDay(evt.dateTime, dayModal) && visibleEventTypes.includes(evt.eventType))
                    .sort((a,b) => a.dateTime.getTime() - b.dateTime.getTime())
                    .map(evt => {
                        const customer = initialCustomers.find(c => c.id === evt.customerId);
                        return (
                            <div key={evt.id} className="p-3 rounded-lg border bg-card/50 flex items-start gap-4">
                                <div className="flex-1 space-y-1">
                                    <p className="font-semibold">{evt.title}</p>
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                        <Clock className="h-3.5 w-3.5" />
                                        <span>{format(evt.dateTime, 'HH:mm')}</span>
                                    </div>
                                    {customer && (
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                            <Users className="h-3.5 w-3.5" />
                                            <span>{customer.name}</span>
                                        </div>
                                    )}
                                    <Badge variant="outline" className={cn("mt-2", eventTypes[evt.eventType].className)}>
                                      {eventTypes[evt.eventType].label}
                                    </Badge>
                                </div>
                                <Button variant="outline" size="sm" onClick={() => {
                                    setDayModal(null);
                                    handleOpenForm(evt);
                                }}>
                                    Editar
                                </Button>
                            </div>
                        )
                    })
                }
                {dayModal && events.filter(evt => isSameDay(evt.dateTime, dayModal)).length === 0 && (
                    <p className="text-center text-muted-foreground py-8">Nenhum evento para este dia.</p>
                )}
            </div>
             <DialogFooter>
                <Button variant="outline" onClick={() => setDayModal(null)}>Fechar</Button>
                <Button onClick={() => {
                    setDayModal(null);
                    handleOpenForm(null);
                }}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Novo Evento
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
