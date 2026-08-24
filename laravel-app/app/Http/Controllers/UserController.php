<?php

namespace App\Http\Controllers;

use App\Models\Sector;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class UserController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('Usuarios', [
            'users' => User::with('sectors:id,name')->orderBy('name')->get(),
            'sectors' => Sector::orderBy('name')->get(),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'min:2', Rule::unique('users', 'name')],
            'email' => ['nullable', 'email'],
            'whatsapp' => ['nullable', 'string'],
            'role' => ['required', Rule::in(User::ROLES)],
            'sector_ids' => ['required', 'array', 'min:1'],
            'sector_ids.*' => ['exists:sectors,id'],
            'password' => ['required', 'string', 'min:8'],
        ]);

        $user = User::create(collect($data)->except('sector_ids')->all());
        $user->sectors()->sync($data['sector_ids']);

        return back()->with('success', 'Usuário adicionado!');
    }

    public function update(Request $request, User $user): RedirectResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'min:2', Rule::unique('users', 'name')->ignore($user->id)],
            'email' => ['nullable', 'email'],
            'whatsapp' => ['nullable', 'string'],
            'role' => ['required', Rule::in(User::ROLES)],
            'sector_ids' => ['required', 'array', 'min:1'],
            'sector_ids.*' => ['exists:sectors,id'],
            'password' => ['nullable', 'string', 'min:8'],
        ]);

        $user->update(collect($data)->except(['sector_ids', 'password'])->all());
        if (! empty($data['password'])) {
            $user->update(['password' => $data['password']]);
        }
        $user->sectors()->sync($data['sector_ids']);

        return back()->with('success', 'Dados atualizados!');
    }

    public function destroy(User $user): RedirectResponse
    {
        if ($user->id === Auth::id()) {
            throw ValidationException::withMessages(['user' => 'Você não pode excluir seu próprio usuário.']);
        }

        $user->delete();

        return back()->with('success', 'Usuário removido.');
    }
}
