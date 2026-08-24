<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;

class CnpjLookupController extends Controller
{
    public function __invoke(Request $request): JsonResponse
    {
        $cnpj = preg_replace('/\D/', '', $request->string('cnpj')->toString());

        if (strlen($cnpj) !== 14) {
            return response()->json(['error' => 'CNPJ inválido.'], 422);
        }

        $data = Cache::remember("cnpj:{$cnpj}", 3600, function () use ($cnpj) {
            $response = Http::withHeaders([
                'User-Agent' => 'VendasPro/1.0 (CRM System; contact@vendaspro.com)',
                'Accept' => 'application/json',
            ])->get("https://brasilapi.com.br/api/cnpj/v1/{$cnpj}");

            return [
                'status' => $response->status(),
                'body' => $response->successful() ? $response->json() : null,
            ];
        });

        if ($data['status'] === 404) {
            return response()->json(['error' => 'CNPJ não encontrado na base de dados.'], 404);
        }
        if ($data['status'] === 429) {
            return response()->json(['error' => 'Muitas consultas em pouco tempo. Tente novamente mais tarde.'], 429);
        }
        if ($data['status'] === 403) {
            return response()->json(['error' => 'O serviço de consulta bloqueou o acesso temporariamente. Tente em alguns minutos.'], 403);
        }
        if (! $data['body']) {
            return response()->json(['error' => "Erro na consulta (Código {$data['status']})."], 502);
        }

        return response()->json(['success' => $data['body']]);
    }
}
