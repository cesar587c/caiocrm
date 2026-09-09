<?php

namespace App\Http\Controllers;

use App\Models\Customer;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class CustomerController extends Controller
{
    public function index(Request $request): Response
    {
        return Inertia::render('Clientes', [
            'customers' => Customer::query()->orderBy('name')->get(),
        ]);
    }

    /**
     * Downloads a CSV skeleton (UTF-8 BOM, ";" separator) users fill in Excel
     * and send back through import().
     */
    public function importTemplate(): StreamedResponse
    {
        $rows = [
            ['razao_social', 'nome_fantasia', 'cnpj', 'endereco', 'telefone'],
            ['EMPRESA EXEMPLO LTDA', 'Exemplo', '00.000.000/0001-91', 'Rua das Flores, 123 - Centro, Sao Paulo - SP', '(11) 91234-5678'],
        ];

        return response()->streamDownload(function () use ($rows) {
            echo "\xEF\xBB\xBF";
            $out = fopen('php://output', 'w');
            foreach ($rows as $row) {
                fputcsv($out, $row, ';', '"', '');
            }
            fclose($out);
        }, 'modelo-importacao-clientes.csv', ['Content-Type' => 'text/csv; charset=UTF-8']);
    }

    /**
     * Bulk-creates customers from an uploaded CSV. Accepts ";" or "," as the
     * separator, UTF-8 or Windows-1252 encoding, and a flexible header row
     * (accent/case-insensitive, with a few aliases per column). Rows without a
     * razao_social, or whose CNPJ already exists, are skipped and reported.
     */
    public function import(Request $request): RedirectResponse
    {
        $request->validate([
            'file' => ['required', 'file', 'max:5120'],
        ]);

        // MIME sniffing for .csv is unreliable (Windows/Excel report it as
        // application/vnd.ms-excel), so gate on the extension instead.
        $extension = strtolower($request->file('file')->getClientOriginalExtension());
        if (! in_array($extension, ['csv', 'txt'], true)) {
            return back()->withErrors(['file' => 'Envie um arquivo .csv (no Excel: Salvar Como → CSV UTF-8).']);
        }

        $raw = (string) file_get_contents($request->file('file')->getRealPath());
        $raw = preg_replace('/^\xEF\xBB\xBF/', '', $raw);
        if (! mb_check_encoding($raw, 'UTF-8')) {
            $raw = mb_convert_encoding($raw, 'UTF-8', 'Windows-1252');
        }

        $firstLine = strtok($raw, "\r\n") ?: '';
        $delimiter = substr_count($firstLine, ';') >= substr_count($firstLine, ',') ? ';' : ',';

        $handle = fopen('php://temp', 'r+');
        fwrite($handle, $raw);
        rewind($handle);

        $header = fgetcsv($handle, 0, $delimiter, '"', '');
        if (! $header) {
            fclose($handle);

            return back()->with('error', 'Arquivo vazio ou ilegível.');
        }

        $aliases = [
            'razao_social' => 'razao_social', 'razao' => 'razao_social', 'nome' => 'razao_social', 'cliente' => 'razao_social',
            'nome_fantasia' => 'nome_fantasia', 'fantasia' => 'nome_fantasia',
            'cnpj' => 'cnpj', 'cnpj_cpf' => 'cnpj', 'documento' => 'cnpj', 'cpf' => 'cnpj',
            'endereco' => 'endereco', 'endereco_completo' => 'endereco',
            'telefone' => 'telefone', 'telefone_de_contato' => 'telefone', 'telefone_contato' => 'telefone',
            'fone' => 'telefone', 'celular' => 'telefone', 'whatsapp' => 'telefone', 'contato' => 'telefone',
        ];

        $map = [];
        foreach ($header as $i => $col) {
            $key = $this->normalizeHeader((string) $col);
            $map[$aliases[$key] ?? $key] = $i;
        }

        if (! isset($map['razao_social'])) {
            fclose($handle);

            return back()->with('error', 'A planilha precisa de uma coluna "razao_social" (ou "nome"/"cliente").');
        }

        $created = 0;
        $skipped = 0;
        $reasons = [];
        $line = 1;

        while (($row = fgetcsv($handle, 0, $delimiter, '"', '')) !== false) {
            $line++;
            if (count(array_filter($row, fn ($v) => trim((string) $v) !== '')) === 0) {
                continue;
            }

            $get = fn (string $col) => isset($map[$col]) ? trim((string) ($row[$map[$col]] ?? '')) : '';

            $name = $get('razao_social');
            if ($name === '') {
                $skipped++;
                $reasons[] = "Linha {$line}: sem razão social.";

                continue;
            }

            $cnpj = preg_replace('/\D/', '', $get('cnpj'));
            if ($cnpj !== '' && Customer::query()->where('cnpj', $cnpj)->exists()) {
                $skipped++;
                $reasons[] = "Linha {$line}: CNPJ {$cnpj} já cadastrado.";

                continue;
            }

            Customer::create([
                'name' => $name,
                'nome_fantasia' => $get('nome_fantasia') ?: null,
                'cnpj' => $cnpj ?: null,
                'endereco' => $get('endereco') ?: null,
                'telefone' => preg_replace('/\D/', '', $get('telefone')) ?: null,
                'type' => 'one_time',
                'status' => 'new',
                'responsible' => Auth::user()->name,
                'potential' => 'medium',
                'last_contact' => now(),
            ]);
            $created++;
        }
        fclose($handle);

        $summary = "Importação concluída: {$created} cliente(s) adicionado(s)"
            .($skipped > 0 ? ", {$skipped} ignorado(s)." : '.');
        if (! empty($reasons)) {
            $summary .= ' '.implode(' ', array_slice($reasons, 0, 5));
            if (count($reasons) > 5) {
                $summary .= ' …';
            }
        }

        return back()->with($created > 0 ? 'success' : 'error', $summary);
    }

    private function normalizeHeader(string $value): string
    {
        $value = preg_replace('/^\xEF\xBB\xBF/', '', $value);
        $value = mb_strtolower(trim($value));
        $value = strtr($value, [
            'á' => 'a', 'à' => 'a', 'â' => 'a', 'ã' => 'a', 'ä' => 'a',
            'é' => 'e', 'è' => 'e', 'ê' => 'e',
            'í' => 'i', 'ï' => 'i',
            'ó' => 'o', 'ò' => 'o', 'ô' => 'o', 'õ' => 'o', 'ö' => 'o',
            'ú' => 'u', 'ü' => 'u',
            'ç' => 'c',
        ]);
        $value = preg_replace('/[^a-z0-9]+/', '_', $value);

        return trim($value, '_');
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
