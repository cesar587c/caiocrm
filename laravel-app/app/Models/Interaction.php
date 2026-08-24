<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['customer_id', 'user_id', 'user_name', 'summary', 'next_contact_date', 'next_contact_time', 'happened_at'])]
class Interaction extends Model
{
    use HasFactory;

    protected function casts(): array
    {
        return [
            'next_contact_date' => 'date',
            'happened_at' => 'datetime',
        ];
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
