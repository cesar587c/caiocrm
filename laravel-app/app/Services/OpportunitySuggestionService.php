<?php

namespace App\Services;

/**
 * Simulated stand-in for the original Genkit/Google GenAI opportunity
 * suggestion flow (kept simulated per product decision — no external LLM
 * call). Produces a deterministic, template-based analysis from the
 * client profile / historical sales data so the UI/UX stays identical;
 * swap the body for a real LLM call later without touching callers.
 */
class OpportunitySuggestionService
{
    public function suggest(string $clientProfile, string $historicalSalesData): array
    {
        $keywords = collect(preg_split('/[\s,.;]+/', mb_strtolower($clientProfile.' '.$historicalSalesData)))
            ->filter(fn ($w) => mb_strlen($w) > 4)
            ->unique()
            ->values();

        $templates = [
            'Ampliar o contrato atual com um pacote de manutenção preventiva recorrente.',
            'Oferecer um upgrade de infraestrutura com base no histórico de chamados técnicos.',
            'Propor um plano de suporte mensal para reduzir o tempo de resposta em incidentes.',
            'Apresentar módulos complementares que já são usados por clientes de perfil semelhante.',
            'Agendar uma visita consultiva para mapear novas necessidades do cliente.',
        ];

        $opportunities = collect($templates)->shuffle()->take(3)->values()->all();

        $reasoning = sprintf(
            'Com base no perfil informado (%s) e no histórico descrito (%s), identificamos padrões que sugerem espaço para expansão de serviços e maior recorrência de faturamento.',
            $keywords->take(3)->implode(', ') ?: 'dados gerais do cliente',
            mb_strlen($historicalSalesData) > 60 ? mb_substr($historicalSalesData, 0, 60).'...' : $historicalSalesData
        );

        return [
            'opportunities' => $opportunities,
            'reasoning' => $reasoning,
        ];
    }
}
