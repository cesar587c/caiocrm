<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable([
    'name', 'nome_fantasia', 'contact_name', 'telefone', 'contact_name_2', 'phone_2',
    'cnpj', 'email', 'endereco', 'cep', 'status', 'responsible', 'potential',
    'last_contact', 'type', 'service_categories', 'observations',
    'one_time_value', 'monthly_value',
])]
class Customer extends Model
{
    use HasFactory;

    public const SERVICE_CATEGORIES = ['ponto', 'manutencao', 'gestao', 'acesso', 'catraca'];

    protected function casts(): array
    {
        return [
            'service_categories' => 'array',
            'last_contact' => 'datetime',
            'one_time_value' => 'decimal:2',
            'monthly_value' => 'decimal:2',
        ];
    }

    public function interactions(): HasMany
    {
        return $this->hasMany(Interaction::class);
    }

    public function proposals(): HasMany
    {
        return $this->hasMany(Proposal::class, 'client_id');
    }

    public function serviceOrders(): HasMany
    {
        return $this->hasMany(ServiceOrder::class, 'client_id');
    }
}
