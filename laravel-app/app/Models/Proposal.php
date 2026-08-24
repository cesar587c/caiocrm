<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable([
    'document_type', 'client_id', 'client_name', 'contact_name', 'client_phone',
    'proposal_date', 'validity_date', 'payment_method', 'installments',
    'first_as_down_payment', 'total_one_time', 'total_monthly',
    'total_one_time_alt', 'total_monthly_alt', 'has_alternative', 'observations',
])]
class Proposal extends Model
{
    use HasFactory;

    protected function casts(): array
    {
        return [
            'proposal_date' => 'date',
            'validity_date' => 'date',
            'first_as_down_payment' => 'boolean',
            'has_alternative' => 'boolean',
            'total_one_time' => 'decimal:2',
            'total_monthly' => 'decimal:2',
            'total_one_time_alt' => 'decimal:2',
            'total_monthly_alt' => 'decimal:2',
        ];
    }

    public function client(): BelongsTo
    {
        return $this->belongsTo(Customer::class, 'client_id');
    }

    public function items(): HasMany
    {
        return $this->hasMany(ProposalItem::class)->where('is_alternative', false)->orderBy('position');
    }

    public function alternativeItems(): HasMany
    {
        return $this->hasMany(ProposalItem::class)->where('is_alternative', true)->orderBy('position');
    }

    public function allItems(): HasMany
    {
        return $this->hasMany(ProposalItem::class)->orderBy('position');
    }
}
