<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;

#[Fillable(['role', 'paths'])]
class RolePermission extends Model
{
    protected $primaryKey = 'role';

    protected $keyType = 'string';

    public $incrementing = false;

    protected function casts(): array
    {
        return [
            'paths' => 'array',
        ];
    }

    public const DEFAULTS = [
        'admin' => ['/dashboard', '/dashboard/clientes', '/dashboard/funil-vendas', '/dashboard/propostas', '/dashboard/agenda', '/dashboard/chamados', '/dashboard/relatorios', '/dashboard/manual', '/dashboard/configuracoes', '/dashboard/usuarios'],
        'technician' => ['/dashboard', '/dashboard/clientes', '/dashboard/agenda', '/dashboard/chamados', '/dashboard/manual'],
        'finance' => ['/dashboard', '/dashboard/clientes', '/dashboard/funil-vendas', '/dashboard/propostas', '/dashboard/relatorios', '/dashboard/manual'],
        'service' => ['/dashboard', '/dashboard/clientes', '/dashboard/agenda', '/dashboard/chamados', '/dashboard/manual'],
    ];

    /**
     * Admin must always keep access to Configurações and Usuários.
     */
    public const REQUIRED_ADMIN_PATHS = ['/dashboard/configuracoes', '/dashboard/usuarios'];
}
