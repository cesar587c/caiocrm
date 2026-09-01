<?php

namespace App\Http\Controllers;

use App\Models\Customer;
use App\Models\Product;
use App\Models\Proposal;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\URL;
use Inertia\Inertia;
use Inertia\Response;

class ProposalController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('Propostas', [
            'proposals' => Proposal::query()->with('items')->orderByDesc('id')->get()->map(function (Proposal $proposal) {
                $proposal->public_url = URL::signedRoute('propostas.public', ['proposal' => $proposal->id]);

                return $proposal;
            }),
            'customers' => Customer::query()->orderBy('name')->get(['id', 'name', 'nome_fantasia', 'contact_name', 'telefone']),
            'products' => Product::query()->orderBy('name')->get(['id', 'name', 'price']),
            'technicians' => User::query()
                ->whereHas('sectors', fn ($q) => $q->where('sectors.name', 'Técnico'))
                ->orderBy('name')
                ->get(['id', 'name']),
        ]);
    }

    public function showPublic(Proposal $proposal): Response
    {
        return Inertia::render('PropostaPublica', [
            'proposal' => $proposal->load('items'),
            'companyProfile' => \App\Models\CompanyProfile::current(),
        ]);
    }

    private function rules(): array
    {
        return [
            'document_type' => ['required', 'in:proposta,pedido'],
            'client_id' => ['nullable', 'exists:customers,id'],
            'influenced_by_technician_id' => ['nullable', 'exists:users,id'],
            'client_name' => ['required', 'string'],
            'contact_name' => ['nullable', 'string'],
            'client_phone' => ['nullable', 'string'],
            'save_to_contacts' => ['nullable', 'boolean'],
            'contact_type' => ['nullable', 'in:lead,one_time'],
            'proposal_date' => ['required', 'date'],
            'validity_date' => ['required', 'date'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.name' => ['required', 'string'],
            'items.*.quantity' => ['required', 'numeric', 'min:1'],
            'items.*.price' => ['required', 'numeric', 'min:0'],
            'items.*.is_monthly' => ['nullable', 'boolean'],
            'payment_method' => ['required', 'string'],
            'installments' => ['required', 'integer', 'min:1', 'max:12'],
            'first_as_down_payment' => ['nullable', 'boolean'],
            'observations' => ['nullable', 'string'],
        ];
    }

    private function totals(array $items): array
    {
        $oneTime = 0;
        $monthly = 0;
        foreach ($items as $item) {
            $subtotal = ($item['quantity'] ?? 0) * ($item['price'] ?? 0);
            if (! empty($item['is_monthly'])) {
                $monthly += $subtotal;
            } else {
                $oneTime += $subtotal;
            }
        }

        return [$oneTime, $monthly];
    }

    private function growCatalog(array $items): void
    {
        foreach ($items as $item) {
            $name = trim($item['name']);
            if (mb_strlen($name) <= 2) {
                continue;
            }
            $exists = Product::query()->whereRaw('LOWER(TRIM(name)) = ?', [mb_strtolower($name)])->exists();
            if (! $exists) {
                Product::create(['name' => $item['name'], 'price' => $item['price'], 'price_history' => [$item['price']]]);
            }
        }
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate($this->rules());

        if (empty($data['client_id']) && ! empty($data['save_to_contacts'])) {
            $customer = Customer::create([
                'name' => $data['client_name'],
                'nome_fantasia' => $data['client_name'],
                'contact_name' => $data['contact_name'] ?? null,
                'telefone' => $data['client_phone'] ?? null,
                'email' => '',
                'status' => ($data['contact_type'] ?? 'lead') === 'lead' ? 'lead' : 'new',
                'type' => ($data['contact_type'] ?? 'lead') === 'lead' ? 'lead' : 'one_time',
                'responsible' => Auth::user()->name,
                'potential' => 'medium',
                'last_contact' => now(),
            ]);
            $data['client_id'] = $customer->id;
        }

        $this->growCatalog($data['items']);
        [$oneTime, $monthly] = $this->totals($data['items']);

        $proposal = DB::transaction(function () use ($data, $oneTime, $monthly) {
            $proposal = Proposal::create([
                ...$data,
                'total_one_time' => $oneTime,
                'total_monthly' => $monthly,
            ]);

            foreach ($data['items'] as $position => $item) {
                $proposal->items()->create([
                    'name' => $item['name'],
                    'quantity' => $item['quantity'],
                    'price' => $item['price'],
                    'is_monthly' => ! empty($item['is_monthly']),
                    'position' => $position,
                ]);
            }

            return $proposal;
        });

        return back()->with('success', "Documento #{$proposal->id} salvo!");
    }

    public function update(Request $request, Proposal $proposal): RedirectResponse
    {
        $data = $request->validate($this->rules());

        $this->growCatalog($data['items']);
        [$oneTime, $monthly] = $this->totals($data['items']);

        DB::transaction(function () use ($data, $oneTime, $monthly, $proposal) {
            $proposal->update([
                ...$data,
                'total_one_time' => $oneTime,
                'total_monthly' => $monthly,
            ]);

            $proposal->items()->delete();
            foreach ($data['items'] as $position => $item) {
                $proposal->items()->create([
                    'name' => $item['name'],
                    'quantity' => $item['quantity'],
                    'price' => $item['price'],
                    'is_monthly' => ! empty($item['is_monthly']),
                    'position' => $position,
                ]);
            }
        });

        return back()->with('success', 'Documento atualizado!');
    }

    public function clone(Proposal $proposal): RedirectResponse
    {
        $clone = $proposal->replicate(['id']);
        $clone->proposal_date = now()->toDateString();
        $clone->validity_date = now()->addDays(10)->toDateString();
        $clone->save();

        foreach ($proposal->items as $item) {
            $clone->items()->create($item->only(['name', 'quantity', 'price', 'is_monthly', 'is_alternative', 'position']));
        }

        return back()->with('success', 'Proposta clonada!');
    }

    public function destroy(Proposal $proposal): RedirectResponse
    {
        abort_unless(Auth::user()?->isAdmin(), 403);
        $proposal->delete();

        return back()->with('success', 'Documento excluído.');
    }
}
