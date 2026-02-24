
'use client';

import { useState, useEffect } from 'react';
import { useSettings } from '@/contexts/SettingsContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { isPast, isToday, parse } from 'date-fns';
import { AlertTriangle, Clock, CalendarCheck } from 'lucide-react';
import { Badge } from '../ui/badge';
import { ScrollArea } from '../ui/scroll-area';

type Notification = {
    type: 'overdue_os' | 'today_appointment';
    message: string;
    customerName: string;
}

export function TaskNotificationPopup() {
  const { currentUser, serviceOrders, appointments, isLoaded, customers } = useSettings();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  // Use a state to track which user session we've shown the dialog for
  const [shownForUserId, setShownForUserId] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoaded || !currentUser || currentUser.id === shownForUserId) {
      return;
    }

    const newNotifications: Notification[] = [];
    const customerMap = new Map(customers.map(c => [c.id, c.name]));

    if (currentUser.role === 'admin') {
      const overdueServiceOrders = serviceOrders.filter(os => {
        if (os.status === 'Finalizada' || os.status === 'Cancelada' || !os.deliveryDate) return false;
        try {
          const deliveryDate = new Date(os.deliveryDate);
          return !isNaN(deliveryDate.getTime()) && isPast(deliveryDate);
        } catch (e) {
          return false;
        }
      });

      overdueServiceOrders.forEach(os => {
        newNotifications.push({
            type: 'overdue_os',
            message: `OS #${os.number} está atrasada.`,
            customerName: customerMap.get(os.clientId) || 'Cliente desconhecido'
        });
      });

    } else if (currentUser.role === 'technician') {
      const myOverdueServiceOrders = serviceOrders.filter(os => {
        if (os.technicianId !== currentUser.id || os.status === 'Finalizada' || os.status === 'Cancelada' || !os.deliveryDate) {
          return false;
        }
        try {
          const deliveryDate = new Date(os.deliveryDate);
          return !isNaN(deliveryDate.getTime()) && isPast(deliveryDate);
        } catch (e) {
          return false;
        }
      });
      
      const myTodaysAppointments = appointments.filter(app => {
        if (!app.assignedTo.endsWith(currentUser.id) || app.status !== 'scheduled') {
          return false;
        }
        try {
            const appDate = parse(app.date, 'yyyy-MM-dd', new Date());
            return isToday(appDate);
        } catch(e) {
            return false;
        }
      });

      myOverdueServiceOrders.forEach(os => {
        newNotifications.push({
            type: 'overdue_os',
            message: `Sua OS #${os.number} está atrasada.`,
            customerName: customerMap.get(os.clientId) || 'Cliente desconhecido'
        });
      });
      myTodaysAppointments.forEach(app => {
        newNotifications.push({
            type: 'today_appointment',
            message: `Visita agendada para hoje às ${app.time}.`,
            customerName: app.clientName
        });
      });
    }

    if (newNotifications.length > 0) {
      setNotifications(newNotifications);
      setIsDialogOpen(true);
      setShownForUserId(currentUser.id); // Mark as shown for the current user
    }
  }, [currentUser, isLoaded, appointments, serviceOrders, shownForUserId, customers]);

  if (!isDialogOpen || notifications.length === 0) {
    return null;
  }

  const getIconForType = (type: Notification['type']) => {
    switch (type) {
        case 'overdue_os': return <Clock className="h-5 w-5 text-destructive" />;
        case 'today_appointment': return <CalendarCheck className="h-5 w-5 text-blue-500" />;
        default: return <AlertTriangle className="h-5 w-5" />;
    }
  };

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="text-yellow-500 h-6 w-6" />
            Alertas e Tarefas Pendentes
          </DialogTitle>
          <DialogDescription>
            Olá, {currentUser?.name}! Você tem as seguintes tarefas que requerem sua atenção.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh] -mx-6 px-6">
          <ul className="space-y-3 py-4">
            {notifications.map((note, index) => (
              <li key={index} className="flex items-start gap-4 text-sm rounded-lg border p-3 bg-muted/50">
                <div className="mt-1 flex-shrink-0">
                    {getIconForType(note.type)}
                </div>
                <div className="flex-1">
                    <p className="font-medium">{note.message}</p>
                    <p className="text-muted-foreground text-xs">{note.customerName}</p>
                </div>
              </li>
            ))}
          </ul>
        </ScrollArea>
        <DialogFooter>
          <Button onClick={() => setIsDialogOpen(false)}>Entendido</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
