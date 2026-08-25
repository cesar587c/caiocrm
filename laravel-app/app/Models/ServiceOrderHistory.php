<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['service_order_id', 'user_id', 'user_name', 'happened_at', 'action', 'from_value', 'to_value', 'details'])]
class ServiceOrderHistory extends Model
{
    use HasFactory;

    protected $table = 'service_order_history';

    public $timestamps = false;

    protected function casts(): array
    {
        return [
            'happened_at' => 'datetime',
        ];
    }

    public function serviceOrder(): BelongsTo
    {
        return $this->belongsTo(ServiceOrder::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
