<?php

namespace App\Http\Middleware;

use App\Models\CompanyProfile;
use App\Models\RolePermission;
use App\Services\DailyNotificationService;
use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    protected $rootView = 'app';

    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        $user = $request->user();

        return [
            ...parent::share($request),
            'auth' => [
                'user' => $user ? [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'whatsapp' => $user->whatsapp,
                    'role' => $user->role,
                    'sector_ids' => $user->sectors()->pluck('sectors.id'),
                ] : null,
            ],
            'rolePermissions' => fn () => RolePermission::query()->pluck('paths', 'role'),
            'companyProfile' => fn () => CompanyProfile::current(),
            'notifications' => fn () => $user ? app(DailyNotificationService::class)->forUser($user) : [],
            'flash' => [
                'success' => fn () => $request->session()->get('success'),
                'error' => fn () => $request->session()->get('error'),
                'created_id' => fn () => $request->session()->get('created_id'),
                'reassignment_pending' => fn () => $request->session()->get('reassignment_pending'),
                'finalization_pending' => fn () => $request->session()->get('finalization_pending'),
            ],
        ];
    }
}
