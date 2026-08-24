<?php

namespace App\Http\Controllers;

use App\Models\Customer;
use Inertia\Inertia;
use Inertia\Response;

class ReportController extends Controller
{
    public function index(): Response
    {
        $customers = Customer::all();

        $total = $customers->count();
        $active = $customers->whereIn('status', ['active', 'new'])->count();
        $leads = $customers->where('status', 'lead')->count();
        $inactive = $customers->whereIn('status', ['inactive', 'discarded'])->count();
        $contracts = $customers->where('type', 'active_contract')->where('status', '!=', 'inactive')->count();
        $oneTime = $customers->where('type', 'one_time')->where('status', '!=', 'inactive')->count();

        $labels = ['ponto' => 'Ponto', 'manutencao' => 'Manut. PC', 'gestao' => 'Gestão', 'acesso' => 'Acesso', 'catraca' => 'Catraca'];
        $servicesData = collect(Customer::SERVICE_CATEGORIES)->map(fn ($cat) => [
            'id' => $cat,
            'name' => $labels[$cat],
            'count' => $customers->filter(fn ($c) => in_array($cat, $c->service_categories ?? []))->count(),
        ])->sortByDesc('count')->values();

        return Inertia::render('Relatorios', [
            'stats' => [
                'total' => $total,
                'active' => $active,
                'leads' => $leads,
                'inactive' => $inactive,
                'contracts' => $contracts,
                'oneTime' => $oneTime,
            ],
            'servicesData' => $servicesData,
        ]);
    }
}
