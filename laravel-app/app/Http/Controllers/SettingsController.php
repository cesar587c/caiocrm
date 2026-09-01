<?php

namespace App\Http\Controllers;

use App\Models\Appointment;
use App\Models\CompanyProfile;
use App\Models\Customer;
use App\Models\Product;
use App\Models\Proposal;
use App\Models\RolePermission;
use App\Models\Sector;
use App\Models\ServiceOrder;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class SettingsController extends Controller
{
    /**
     * These actions manage other users' access, org structure, or wipe/replace
     * all operational data — the page-level role middleware only gates whether
     * a role can see /dashboard/configuracoes at all, not which actions on it
     * are safe to expose, so every sensitive write here re-checks admin itself.
     */
    private function requireAdmin(): void
    {
        abort_unless(Auth::user()?->isAdmin(), 403);
    }

    public function index(): Response
    {
        return Inertia::render('Configuracoes', [
            'companyProfile' => CompanyProfile::current(),
            'sectors' => Sector::with('users:id,name')->orderBy('name')->get(),
            'users' => User::orderBy('name')->get(['id', 'name', 'role']),
        ]);
    }

    public function updateCompanyProfile(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string'],
            'email' => ['required', 'email'],
            'phone' => ['required', 'string'],
            'address' => ['required', 'string'],
            'whatsapp_reminder_message' => ['nullable', 'string'],
            'whatsapp_technician_message' => ['nullable', 'string'],
            'google_calendar_email' => ['nullable', 'email'],
            'monthly_goal' => ['required', 'numeric', 'min:0'],
            'logo' => ['nullable', 'image', 'max:2048'],
        ]);

        $profile = CompanyProfile::current();

        if ($request->hasFile('logo')) {
            $path = $request->file('logo')->store('logos', 'public');
            $data['logo_url'] = Storage::disk('public')->url($path);
        }

        $profile->update(collect($data)->except('logo')->all());

        return back()->with('success', 'Configurações salvas!');
    }

    public function storeSector(Request $request): RedirectResponse
    {
        $this->requireAdmin();
        $data = $request->validate(['name' => ['required', 'string']]);
        Sector::create($data);

        return back()->with('success', 'Setor criado!');
    }

    public function destroySector(Sector $sector): RedirectResponse
    {
        $this->requireAdmin();
        $sector->delete();

        return back()->with('success', 'Setor removido.');
    }

    public function attachSectorMember(Request $request, Sector $sector): RedirectResponse
    {
        $this->requireAdmin();
        $data = $request->validate(['user_id' => ['required', 'exists:users,id']]);
        $sector->users()->syncWithoutDetaching([$data['user_id']]);

        return back()->with('success', 'Membro vinculado!');
    }

    public function detachSectorMember(Sector $sector, User $user): RedirectResponse
    {
        $this->requireAdmin();
        $sector->users()->detach($user->id);

        return back()->with('success', 'Membro removido do setor.');
    }

    public function updateRolePermissions(Request $request): RedirectResponse
    {
        $this->requireAdmin();
        $data = $request->validate([
            'role' => ['required', Rule::in(User::ROLES)],
            'paths' => ['required', 'array'],
            'paths.*' => ['string'],
        ]);

        $paths = $data['paths'];
        if ($data['role'] === 'admin') {
            $paths = array_values(array_unique([...$paths, ...RolePermission::REQUIRED_ADMIN_PATHS]));
        }

        RolePermission::updateOrCreate(['role' => $data['role']], ['paths' => $paths]);

        return back()->with('success', 'Permissões atualizadas!');
    }

    public function export(): JsonResponse
    {
        $this->requireAdmin();

        return response()->json([
            'companyProfile' => CompanyProfile::current(),
            'sectors' => Sector::all(),
            'users' => User::all(),
            'appointments' => Appointment::with(['users:id', 'sectors:id'])->get(),
            'serviceOrders' => ServiceOrder::with(['items', 'history'])->get(),
            'customers' => Customer::all(),
            'products' => Product::all(),
            'proposals' => Proposal::with('items')->get(),
            'rolePermissions' => RolePermission::all(),
            'timestamp' => now()->toIso8601String(),
            'version' => '1.0-laravel',
        ]);
    }

    public function import(Request $request): RedirectResponse
    {
        $this->requireAdmin();
        $request->validate(['backup' => ['required', 'file', 'mimetypes:application/json,text/plain']]);

        $backup = json_decode($request->file('backup')->get(), true);
        if (! is_array($backup)) {
            return back()->with('error', 'O arquivo selecionado é inválido.');
        }

        DB::transaction(function () use ($backup) {
            if (isset($backup['companyProfile'])) {
                CompanyProfile::current()->update(collect($backup['companyProfile'])->only([
                    'name', 'email', 'phone', 'address', 'logo_url', 'whatsapp_reminder_message', 'whatsapp_technician_message', 'google_calendar_email', 'monthly_goal',
                ])->all());
            }

            foreach (($backup['customers'] ?? []) as $row) {
                Customer::updateOrCreate(['id' => $row['id'] ?? null], collect($row)->except(['id', 'created_at', 'updated_at'])->all());
            }

            foreach (($backup['products'] ?? []) as $row) {
                Product::updateOrCreate(['id' => $row['id'] ?? null], collect($row)->except(['id', 'created_at', 'updated_at'])->all());
            }
        });

        return back()->with('success', 'Backup restaurado com sucesso!');
    }

    public function clearAll(): RedirectResponse
    {
        $this->requireAdmin();
        DB::transaction(function () {
            Appointment::query()->delete();
            ServiceOrder::query()->delete();
            Customer::query()->delete();
            Product::query()->delete();
            Proposal::query()->delete();
        });

        return back()->with('success', 'Dados operacionais removidos.');
    }
}
