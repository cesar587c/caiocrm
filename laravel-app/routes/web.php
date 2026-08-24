<?php

use App\Http\Controllers\AppointmentController;
use App\Http\Controllers\CnpjLookupController;
use App\Http\Controllers\CustomerController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\OpportunitySuggestionController;
use App\Http\Controllers\ProposalController;
use App\Http\Controllers\ReportController;
use App\Http\Controllers\ServiceOrderController;
use App\Http\Controllers\SettingsController;
use App\Http\Controllers\UserController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', function () {
    return redirect(auth()->check() ? '/dashboard' : '/login');
});

Route::middleware(['auth', 'role.access'])->group(function () {
    Route::get('/dashboard', [DashboardController::class, 'index'])->name('dashboard');

    Route::get('/dashboard/clientes', [CustomerController::class, 'index'])->name('clientes.index');
    Route::post('/dashboard/clientes', [CustomerController::class, 'store'])->name('clientes.store');
    Route::put('/dashboard/clientes/{customer}', [CustomerController::class, 'update'])->name('clientes.update');
    Route::delete('/dashboard/clientes/{customer}', [CustomerController::class, 'destroy'])->name('clientes.destroy');

    Route::get('/dashboard/funil-vendas', [CustomerController::class, 'funil'])->name('funil.index');
    Route::patch('/dashboard/funil-vendas/{customer}', [CustomerController::class, 'updateStage'])->name('funil.updateStage');

    Route::get('/dashboard/propostas', [ProposalController::class, 'index'])->name('propostas.index');
    Route::post('/dashboard/propostas', [ProposalController::class, 'store'])->name('propostas.store');
    Route::put('/dashboard/propostas/{proposal}', [ProposalController::class, 'update'])->name('propostas.update');
    Route::post('/dashboard/propostas/{proposal}/clone', [ProposalController::class, 'clone'])->name('propostas.clone');
    Route::delete('/dashboard/propostas/{proposal}', [ProposalController::class, 'destroy'])->name('propostas.destroy');

    Route::get('/dashboard/agenda', [AppointmentController::class, 'index'])->name('agenda.index');
    Route::post('/dashboard/agenda', [AppointmentController::class, 'store'])->name('agenda.store');
    Route::put('/dashboard/agenda/{appointment}', [AppointmentController::class, 'update'])->name('agenda.update');
    Route::patch('/dashboard/agenda/{appointment}/status', [AppointmentController::class, 'updateStatus'])->name('agenda.updateStatus');
    Route::delete('/dashboard/agenda/{appointment}', [AppointmentController::class, 'destroy'])->name('agenda.destroy');
    Route::post('/dashboard/agenda/{appointment}/notify', [AppointmentController::class, 'notify'])->name('agenda.notify');

    Route::get('/dashboard/chamados', [ServiceOrderController::class, 'index'])->name('chamados.index');
    Route::post('/dashboard/chamados', [ServiceOrderController::class, 'store'])->name('chamados.store');
    Route::put('/dashboard/chamados/{serviceOrder}', [ServiceOrderController::class, 'update'])->name('chamados.update');
    Route::post('/dashboard/chamados/{serviceOrder}/clone', [ServiceOrderController::class, 'clone'])->name('chamados.clone');
    Route::delete('/dashboard/chamados/{serviceOrder}', [ServiceOrderController::class, 'destroy'])->name('chamados.destroy');

    Route::get('/dashboard/relatorios', [ReportController::class, 'index'])->name('relatorios.index');

    Route::get('/dashboard/manual', fn () => Inertia::render('Manual'))->name('manual.index');

    Route::get('/dashboard/configuracoes', [SettingsController::class, 'index'])->name('configuracoes.index');
    Route::post('/dashboard/configuracoes/empresa', [SettingsController::class, 'updateCompanyProfile'])->name('configuracoes.empresa');
    Route::post('/dashboard/configuracoes/setores', [SettingsController::class, 'storeSector'])->name('configuracoes.setores.store');
    Route::delete('/dashboard/configuracoes/setores/{sector}', [SettingsController::class, 'destroySector'])->name('configuracoes.setores.destroy');
    Route::post('/dashboard/configuracoes/setores/{sector}/membros', [SettingsController::class, 'attachSectorMember'])->name('configuracoes.setores.attach');
    Route::delete('/dashboard/configuracoes/setores/{sector}/membros/{user}', [SettingsController::class, 'detachSectorMember'])->name('configuracoes.setores.detach');
    Route::post('/dashboard/configuracoes/permissoes', [SettingsController::class, 'updateRolePermissions'])->name('configuracoes.permissoes');
    Route::get('/dashboard/configuracoes/exportar', [SettingsController::class, 'export'])->name('configuracoes.exportar');
    Route::post('/dashboard/configuracoes/importar', [SettingsController::class, 'import'])->name('configuracoes.importar');
    Route::post('/dashboard/configuracoes/limpar', [SettingsController::class, 'clearAll'])->name('configuracoes.limpar');

    Route::get('/dashboard/usuarios', [UserController::class, 'index'])->name('usuarios.index');
    Route::post('/dashboard/usuarios', [UserController::class, 'store'])->name('usuarios.store');
    Route::put('/dashboard/usuarios/{user}', [UserController::class, 'update'])->name('usuarios.update');
    Route::delete('/dashboard/usuarios/{user}', [UserController::class, 'destroy'])->name('usuarios.destroy');

    Route::get('/cnpj-lookup', CnpjLookupController::class)->name('cnpj.lookup');
    Route::post('/opportunity-suggestions', OpportunitySuggestionController::class)->name('opportunity.suggestions');
});

require __DIR__.'/auth.php';
