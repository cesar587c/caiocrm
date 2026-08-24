<?php

namespace App\Http\Controllers;

use App\Services\OpportunitySuggestionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class OpportunitySuggestionController extends Controller
{
    public function __invoke(Request $request, OpportunitySuggestionService $service): JsonResponse
    {
        $data = $request->validate([
            'client_profile' => ['required', 'string', 'min:50'],
            'historical_sales_data' => ['required', 'string', 'min:50'],
        ]);

        return response()->json([
            'success' => $service->suggest($data['client_profile'], $data['historical_sales_data']),
        ]);
    }
}
