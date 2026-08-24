<?php

namespace App\Http\Controllers;

use App\Models\Appointment;
use App\Models\Sector;
use App\Models\User;
use App\Services\WhatsAppService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class AppointmentController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('Agenda', [
            'appointments' => Appointment::with(['users:id,name', 'sectors:id,name'])->get()->map(fn (Appointment $a) => [
                ...$a->toArray(),
                'assigned_to' => $a->assignedToTokens(),
            ]),
            'customers' => \App\Models\Customer::query()->orderBy('name')->get(['id', 'name', 'nome_fantasia', 'contact_name', 'contact_name_2', 'telefone', 'phone_2', 'endereco']),
            'sectors' => Sector::query()->orderBy('name')->get(['id', 'name']),
            'users' => User::query()->orderBy('name')->get(['id', 'name', 'whatsapp']),
        ]);
    }

    private function rules(): array
    {
        return [
            'date' => ['required', 'date'],
            'time' => ['required', 'string'],
            'client_name' => ['required', 'string'],
            'address' => ['required', 'string'],
            'phone' => ['nullable', 'string'],
            'contact' => ['required', 'string'],
            'summary' => ['nullable', 'string'],
            'assigned_to' => ['required', 'array', 'min:1'],
            'assigned_to.*' => ['string'],
        ];
    }

    private function syncAssignees(Appointment $appointment, array $tokens): void
    {
        $userIds = collect($tokens)->filter(fn ($t) => str_starts_with($t, 'user:'))->map(fn ($t) => (int) substr($t, 5));
        $sectorIds = collect($tokens)->filter(fn ($t) => str_starts_with($t, 'sector:'))->map(fn ($t) => (int) substr($t, 7));

        $appointment->users()->sync($userIds);
        $appointment->sectors()->sync($sectorIds);
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate($this->rules());

        $appointment = Appointment::create([
            ...collect($data)->except('assigned_to')->all(),
            'status' => 'scheduled',
        ]);
        $this->syncAssignees($appointment, $data['assigned_to']);

        return back()->with('success', 'Agendamento criado!')->with('created_id', $appointment->id);
    }

    public function update(Request $request, Appointment $appointment): RedirectResponse
    {
        $data = $request->validate($this->rules());

        $appointment->update(collect($data)->except('assigned_to')->all());
        $this->syncAssignees($appointment, $data['assigned_to']);

        return back()->with('success', 'Agendamento atualizado!');
    }

    public function updateStatus(Request $request, Appointment $appointment): RedirectResponse
    {
        $data = $request->validate([
            'status' => ['required', 'in:scheduled,completed,missed,cancelled'],
            'justification' => ['nullable', 'string'],
        ]);

        $appointment->update($data);

        return back()->with('success', 'Status atualizado!');
    }

    public function destroy(Appointment $appointment): RedirectResponse
    {
        $appointment->delete();

        return back()->with('success', 'Agendamento removido.');
    }

    public function notify(Request $request, Appointment $appointment, WhatsAppService $whatsapp): JsonResponse
    {
        $companyProfile = \App\Models\CompanyProfile::current();
        $template = $companyProfile->whatsapp_reminder_message
            ?: "Olá, {cliente}! 👋\n\nEste é um lembrete do seu agendamento com a {empresa} no dia {data} às {hora}.\n\nAté breve!";

        $dateStr = \Carbon\Carbon::parse($appointment->date)->translatedFormat('d/m/Y');
        $details = [];
        $allSimulated = true;

        if ($appointment->phone) {
            $message = str_replace(
                ['{cliente}', '{empresa}', '{data}', '{hora}'],
                [$appointment->contact, $companyProfile->name, $dateStr, $appointment->time],
                $template
            );
            $result = $whatsapp->send(preg_replace('/\D/', '', $appointment->phone), $message);
            $details[] = ['to' => 'client', 'name' => $appointment->contact, 'phone' => $appointment->phone, 'message' => $message, ...$result];
            if (empty($result['isSimulated'])) {
                $allSimulated = false;
            }
        }

        foreach ($appointment->users as $tech) {
            if (! $tech->whatsapp) {
                continue;
            }
            $message = "*Novo Agendamento Técnico (Automático)*\n\nOlá {$tech->name}, você foi escalado para uma visita.\n\n*Cliente:* {$appointment->client_name}\n*Contato:* {$appointment->contact}\n*Data:* {$dateStr}\n*Horário:* {$appointment->time}\n*Local:* {$appointment->address}";
            if ($appointment->summary) {
                $message .= "\n*Resumo:* {$appointment->summary}";
            }
            $result = $whatsapp->send(preg_replace('/\D/', '', $tech->whatsapp), $message);
            $details[] = ['to' => "tech:{$tech->id}", 'name' => $tech->name, 'phone' => $tech->whatsapp, 'message' => $message, ...$result];
            if (empty($result['isSimulated'])) {
                $allSimulated = false;
            }
        }

        return response()->json([
            'success' => true,
            'isSimulated' => $allSimulated,
            'details' => $details,
        ]);
    }
}
