<?php

namespace App\Services;

use App\Models\Appointment;
use App\Models\ServiceOrder;
use App\Models\User;

/**
 * Mirrors TaskNotificationPopup's "morning briefing": today's appointments
 * assigned to the current user, plus overdue service orders (all of them
 * for admins, only the technician's own for technicians).
 */
class DailyNotificationService
{
    public function forUser(User $user): array
    {
        $notifications = [];

        $today = now()->toDateString();
        $appointments = Appointment::query()
            ->where('status', 'scheduled')
            ->where('date', $today)
            ->whereHas('users', fn ($q) => $q->where('users.id', $user->id))
            ->get();

        foreach ($appointments as $appointment) {
            $isReturn = str_starts_with($appointment->summary ?? '', 'Retorno CRM');
            $notifications[] = [
                'type' => 'appointment',
                'message' => ($isReturn ? 'Contato de Retorno às ' : 'Visita Técnica às ').$appointment->time,
                'customerName' => $appointment->client_name,
            ];
        }

        $overdueQuery = ServiceOrder::query()
            ->whereNotNull('delivery_date')
            ->whereNotIn('status', ['Finalizada', 'Cancelada'])
            ->where('delivery_date', '<', $today);

        if ($user->role === 'admin') {
            foreach ($overdueQuery->get() as $order) {
                $notifications[] = ['type' => 'overdue_os', 'message' => "OS #{$order->number} está atrasada.", 'customerName' => $order->client?->name];
            }
        } elseif ($user->role === 'technician') {
            foreach ($overdueQuery->where('technician_id', $user->id)->get() as $order) {
                $notifications[] = ['type' => 'overdue_os', 'message' => "Sua OS #{$order->number} está atrasada.", 'customerName' => $order->client?->name];
            }
        }

        return $notifications;
    }
}
