<?php

namespace App\Http\Controllers;

use App\Models\Appointment;
use App\Models\CompanyProfile;
use App\Models\Proposal;
use App\Models\ServiceOrder;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function index(Request $request): Response
    {
        $filter = $request->string('filter', 'month')->toString();
        $from = $request->date('from');
        $to = $request->date('to');

        [$start, $end] = match ($filter) {
            '30days' => [now()->subDays(30)->startOfDay(), now()->endOfDay()],
            'year' => [now()->startOfYear(), now()->endOfMonth()],
            'custom' => [
                $from ? $from->copy()->startOfDay() : now()->startOfMonth(),
                $to ? $to->copy()->endOfDay() : now()->endOfMonth(),
            ],
            default => [now()->startOfMonth(), now()->endOfMonth()],
        };

        $proposalsInRange = Proposal::query()->whereBetween('proposal_date', [$start, $end])->get();
        $pedidos = $proposalsInRange->where('document_type', 'pedido');
        $faturamentoTotal = (float) $pedidos->sum('total_one_time');
        $ticketMedio = $pedidos->count() > 0 ? $faturamentoTotal / $pedidos->count() : 0;
        $conversao = $proposalsInRange->count() > 0 ? ($pedidos->count() / $proposalsInRange->count()) * 100 : 0;
        $metaMensal = (float) CompanyProfile::current()->monthly_goal;

        $serviceOrdersInRange = ServiceOrder::query()->whereBetween('opening_date', [$start, $end])->get();

        $appointmentsInRange = Appointment::query()->whereBetween('date', [$start->toDateString(), $end->toDateString()])->get();
        $completed = $appointmentsInRange->where('status', 'completed')->count();

        $technicianRanking = $pedidos->whereNotNull('influenced_by_technician_id')
            ->groupBy('influenced_by_technician_id')
            ->map(fn ($group) => [
                'technicianId' => $group->first()->influenced_by_technician_id,
                'count' => $group->count(),
                'total' => (float) $group->sum('total_one_time'),
            ])
            ->sortByDesc('total')
            ->values()
            ->take(5);
        $technicianNames = User::query()->whereIn('id', $technicianRanking->pluck('technicianId'))->pluck('name', 'id');
        $technicianRanking = $technicianRanking->map(fn ($row) => [
            ...$row,
            'name' => $technicianNames[$row['technicianId']] ?? 'N/A',
        ])->values();

        return Inertia::render('Dashboard', [
            'filter' => $filter,
            'range' => ['from' => $start->toDateString(), 'to' => $end->toDateString()],
            'salesStats' => [
                'totalSales' => $faturamentoTotal,
                'averageTicket' => $ticketMedio,
                'conversion' => round($conversao, 1),
                'goalProgress' => $metaMensal > 0 ? round(min($faturamentoTotal / $metaMensal * 100, 100), 1) : 0,
            ],
            'serviceStats' => [
                'volume' => $serviceOrdersInRange->count(),
            ],
            'agendaStats' => [
                'total' => $appointmentsInRange->count(),
                'completed' => $completed,
                'completionRate' => $appointmentsInRange->count() > 0 ? round($completed / $appointmentsInRange->count() * 100, 1) : 0,
            ],
            'volumeChart' => [
                'pedidos' => $pedidos->count(),
                'propostas' => $proposalsInRange->where('document_type', 'proposta')->count(),
                'os' => $serviceOrdersInRange->count(),
            ],
            'technicianRanking' => $technicianRanking,
        ]);
    }
}
