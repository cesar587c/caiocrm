<?php

namespace App\Http\Middleware;

use App\Models\RolePermission;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureRoleHasAccess
{
    /**
     * Mirrors the original app's client-side role gate, but enforced
     * server-side: a role may only reach the /dashboard/* routes listed
     * in its RolePermission row (admin's Configurações/Usuários access
     * is enforced separately and can never be revoked).
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (! $user) {
            return $next($request);
        }

        $path = '/'.trim($request->path(), '/');

        if ($user->role === 'admin') {
            return $next($request);
        }

        $allowedPaths = RolePermission::query()->find($user->role)?->paths ?? ['/dashboard'];

        // Every role implicitly has '/dashboard' (the landing page) in its
        // list, so it must NOT be treated as a wildcard prefix for every
        // other /dashboard/* route — only an exact match. All other allowed
        // paths do act as prefixes, so a module's sub-action routes (e.g.
        // POST /dashboard/usuarios, PUT /dashboard/usuarios/5) inherit the
        // permission granted for that module's menu path.
        $isAllowed = collect($allowedPaths)->contains(function ($allowed) use ($path) {
            if ($path === $allowed) {
                return true;
            }

            return $allowed !== '/dashboard' && str_starts_with($path, $allowed.'/');
        });

        if (! $isAllowed) {
            return redirect('/dashboard');
        }

        return $next($request);
    }
}
