<?php

namespace App\Http\Controllers;

use App\Models\Customer;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class CustomerController extends Controller
{
    public function index(Request $request): Response
    {
        return Inertia::render('Clientes', [
            'customers' => Customer::query()->orderBy('name')->get(),
        ]);
    }

    public function funil(): Response
    {
        return Inertia::render('FunilVendas', [
            'customers' => Customer::query()->where('type', 'lead')->get(),
        ]);
    }

    private function rules(): array
    {
        return [
            'cnpj' => ['nullable', 'string'],
            'name' => ['required', 'string'],
            'nome_fantasia' => ['nullable', 'string'],
            'contact_name' => ['nullable', 'string'],
            'telefone' => ['nullable', 'string'],
            'email' => ['nullable', 'email'],
            'endereco' => ['nullable', 'string'],
            'type' => ['required', 'in:lead,active_contract,one_time'],
            'status' => ['nullable', 'string'],
            'service_categories' => ['nullable', 'array'],
            'service_categories.*' => ['string', 'in:'.implode(',', Customer::SERVICE_CATEGORIES)],
            'observations' => ['nullable', 'string'],
            'one_time_value' => ['nullable', 'numeric'],
            'monthly_value' => ['nullable', 'numeric'],
        ];
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate($this->rules());
        $data['status'] = $data['type'] === 'lead' ? 'lead' : ($data['status'] ?? 'new');
        $data['responsible'] = Auth::user()->name;
        $data['potential'] = 'medium';
        $data['last_contact'] = now();

        Customer::create($data);

        return back()->with('success', 'Cliente cadastrado!');
    }

    public function update(Request $request, Customer $customer): RedirectResponse
    {
        $data = $request->validate($this->rules());
        $data['status'] = $data['type'] === 'lead' ? 'lead' : ($data['status'] ?? $customer->status);
        $data['responsible'] = Auth::user()->name;
        $data['last_contact'] = now();

        $customer->update($data);

        return back()->with('success', 'Cadastro atualizado!');
    }

    /**
     * Lightweight update used by the sales funnel drag-and-drop board
     * (status/type change only, no full form validation).
     */
    public function updateStage(Request $request, Customer $customer): RedirectResponse
    {
        $data = $request->validate([
            'status' => ['required', 'string'],
            'type' => ['nullable', 'in:lead,active_contract,one_time'],
        ]);

        $customer->update($data);

        return back();
    }

    public function destroy(Customer $customer): RedirectResponse
    {
        abort_unless(Auth::user()?->isAdmin(), 403);
        $customer->delete();

        return back()->with('success', 'Cliente removido.');
    }
}
