<?php

namespace App\Http\Controllers;

use App\Models\Customer;
use App\Models\Product;
use App\Models\ServiceOrder;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class ServiceOrderController extends Controller
{
    public function index(): Response
    {
        $serviceOrders = ServiceOrder::with(['items', 'history', 'client:id,name,email,telefone', 'technician:id,name'])
            ->orderByDesc('opening_date')
            ->get();

        $assignedTechnicianIds = $serviceOrders->pluck('technician_id')->filter()->unique()->values();

        return Inertia::render('Chamados', [
            'serviceOrders' => $serviceOrders,
            'customers' => Customer::query()->orderBy('name')->get(['id', 'name', 'email', 'telefone']),
            'technicians' => User::query()
                ->where(fn ($q) => $q
                    ->whereHas('sectors', fn ($q2) => $q2->where('sectors.name', 'Técnico'))
                    ->orWhereIn('id', $assignedTechnicianIds))
                ->orderBy('name')
                ->get(['id', 'name']),
            'products' => Product::query()->orderBy('name')->get(['id', 'name', 'price']),
        ]);
    }

    private function rules(): array
    {
        return [
            'client_id' => ['required', 'exists:customers,id'],
            'technician_id' => ['required', 'exists:users,id'],
            'status' => ['required', 'in:'.implode(',', ServiceOrder::STATUSES)],
            'problem_description' => ['required', 'string', 'min:10'],
            'technical_diagnosis' => ['nullable', 'string'],
            'executed_services' => ['nullable', 'string'],
            'delivery_date' => ['nullable', 'date'],
            'items' => ['nullable', 'array'],
            'items.*.name' => ['required', 'string'],
            'items.*.quantity' => ['required', 'numeric', 'min:1'],
            'items.*.price' => ['required', 'numeric', 'min:0'],
        ];
    }

    private function saveItems(ServiceOrder $order, array $items): void
    {
        $order->items()->delete();
        foreach ($items as $item) {
            $order->items()->create($item);
        }
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate($this->rules());
        $items = $data['items'] ?? [];
        unset($data['items']);

        $order = DB::transaction(function () use ($data, $items) {
            $order = ServiceOrder::create($data);
            $this->saveItems($order, $items);
            $order->history()->create([
                'user_id' => Auth::id(),
                'user_name' => Auth::user()->name,
                'action' => 'criou a Ordem de Serviço',
                'happened_at' => now(),
            ]);

            return $order;
        });

        return back()->with('success', "OS #{$order->number} criada!");
    }

    public function update(Request $request, ServiceOrder $serviceOrder): RedirectResponse
    {
        $data = $request->validate($this->rules());
        $items = $data['items'] ?? [];
        unset($data['items']);

        $justification = $request->string('justification')->toString() ?: null;
        $user = Auth::user();

        // Technician reassignment requires a justification and is the only
        // change applied on this submit (mirrors the original app: the
        // reassignment dialog must be confirmed before status/other fields
        // are saved together with it).
        if ((int) $data['technician_id'] !== $serviceOrder->technician_id) {
            if (! $justification) {
                return back()->withErrors(['justification' => 'Justificativa é obrigatória.'])->with('reassignment_pending', true);
            }
            $oldTech = User::find($serviceOrder->technician_id)?->name ?? 'N/A';
            $newTech = User::find($data['technician_id'])?->name ?? 'N/A';

            DB::transaction(function () use ($serviceOrder, $data, $items, $user, $justification, $oldTech, $newTech) {
                $serviceOrder->update($data);
                $this->saveItems($serviceOrder, $items);
                $serviceOrder->history()->create([
                    'user_id' => $user->id,
                    'user_name' => $user->name,
                    'action' => 'alterou o técnico responsável',
                    'from_value' => $oldTech,
                    'to_value' => $newTech,
                    'details' => $justification,
                    'happened_at' => now(),
                ]);
            });

            return back()->with('success', 'Técnico reatribuído!');
        }

        if ($data['status'] === 'Finalizada' && $serviceOrder->status !== 'Finalizada') {
            if (! $justification) {
                return back()->withErrors(['justification' => 'Justificativa é obrigatória.'])->with('finalization_pending', true);
            }

            DB::transaction(function () use ($serviceOrder, $data, $items, $user, $justification) {
                $oldStatus = $serviceOrder->status;
                $serviceOrder->update($data);
                $this->saveItems($serviceOrder, $items);
                $serviceOrder->history()->create([
                    'user_id' => $user->id,
                    'user_name' => $user->name,
                    'action' => 'alterou o status',
                    'from_value' => $oldStatus,
                    'to_value' => $data['status'],
                    'details' => $justification,
                    'happened_at' => now(),
                ]);
            });

            return back()->with('success', 'Ordem de Serviço finalizada!');
        }

        DB::transaction(function () use ($serviceOrder, $data, $items, $user) {
            $original = $serviceOrder->only(['status', 'technical_diagnosis', 'executed_services']);
            $serviceOrder->update($data);
            $this->saveItems($serviceOrder, $items);

            $entries = [];
            $now = now();
            if ($original['status'] !== $data['status']) {
                $entries[] = ['action' => 'alterou o status', 'from_value' => $original['status'], 'to_value' => $data['status']];
            }
            if ($original['technical_diagnosis'] !== ($data['technical_diagnosis'] ?? null)) {
                $entries[] = ['action' => 'atualizou o diagnóstico técnico'];
            }
            if ($original['executed_services'] !== ($data['executed_services'] ?? null)) {
                $entries[] = ['action' => 'atualizou os serviços executados'];
            }
            foreach ($entries as $entry) {
                $serviceOrder->history()->create([
                    'user_id' => $user->id,
                    'user_name' => $user->name,
                    'happened_at' => $now,
                    ...$entry,
                ]);
            }
        });

        return back()->with('success', 'Ordem de Serviço atualizada!');
    }

    public function clone(ServiceOrder $serviceOrder): RedirectResponse
    {
        $clone = DB::transaction(function () use ($serviceOrder) {
            $clone = ServiceOrder::create([
                'client_id' => $serviceOrder->client_id,
                'technician_id' => $serviceOrder->technician_id,
                'status' => 'Aberta',
                'problem_description' => $serviceOrder->problem_description,
            ]);

            foreach ($serviceOrder->items as $item) {
                $clone->items()->create($item->only(['name', 'quantity', 'price']));
            }

            $clone->history()->create([
                'user_id' => Auth::id(),
                'user_name' => Auth::user()->name,
                'action' => "clonou a OS #{$serviceOrder->number}",
                'happened_at' => now(),
            ]);

            return $clone;
        });

        return back()->with('success', "OS clonada como #{$clone->number}!");
    }

    public function destroy(ServiceOrder $serviceOrder): RedirectResponse
    {
        $serviceOrder->delete();

        return back()->with('success', 'Ordem de Serviço excluída.');
    }
}
