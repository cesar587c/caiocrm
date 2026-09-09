<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class CnpjLookupController extends Controller
{
    public function __invoke(Request $request): JsonResponse
    {
        $cnpj = preg_replace('/\D/', '', $request->string('cnpj')->toString());

        if (strlen($cnpj) !== 14) {
            return response()->json(['error' => 'CNPJ inválido.'], 422);
        }

        $cacheKey = "cnpj:{$cnpj}";
        $data = Cache::get($cacheKey);

        if (! $data) {
            $data = $this->fetch($cnpj);
            // Only cache definitive answers, never transient upstream failures.
            if ($data['body'] !== null || $data['status'] === 404) {
                Cache::put($cacheKey, $data, 3600);
            }
        }

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

    /**
     * Calls BrasilAPI with a raw cURL/stream request instead of Laravel's HTTP
     * client: this host ships a native `psr` PHP extension whose UriInterface
     * signature clashes with guzzlehttp/psr7, so any Guzzle-backed call fatals
     * when the request object is built.
     *
     * @return array{status: int, body: array<string, mixed>|null}
     */
    private function fetch(string $cnpj): array
    {
        $url = "https://brasilapi.com.br/api/cnpj/v1/{$cnpj}";
        $headers = [
            'User-Agent: VendasPro/1.0 (CRM System; contact@vendaspro.com)',
            'Accept: application/json',
        ];

        if (function_exists('curl_init')) {
            $ch = curl_init($url);
            curl_setopt_array($ch, [
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_CONNECTTIMEOUT => 8,
                CURLOPT_TIMEOUT => 15,
                CURLOPT_HTTPHEADER => $headers,
            ]);
            $response = curl_exec($ch);
            $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);
        } else {
            $context = stream_context_create(['http' => [
                'method' => 'GET',
                'header' => implode("\r\n", $headers),
                'timeout' => 15,
                'ignore_errors' => true,
            ]]);
            $response = @file_get_contents($url, false, $context);
            $status = 0;
            foreach ($http_response_header ?? [] as $line) {
                if (preg_match('#^HTTP/\S+\s+(\d{3})#', $line, $m)) {
                    $status = (int) $m[1];
                }
            }
        }

        if ($response === false || $status === 0) {
            return ['status' => 503, 'body' => null];
        }

        $decoded = json_decode((string) $response, true);

        return [
            'status' => $status,
            'body' => ($status >= 200 && $status < 300 && is_array($decoded)) ? $decoded : null,
        ];
    }
}
