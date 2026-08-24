<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\DB;

#[Fillable([
    'number', 'opening_date', 'delivery_date', 'client_id', 'technician_id',
    'status', 'problem_description', 'technical_diagnosis', 'executed_services',
])]
class ServiceOrder extends Model
{
    use HasFactory;

    public const STATUSES = ['Aberta', 'Em andamento', 'Aguardando peça', 'Finalizada', 'Cancelada'];

    protected function casts(): array
    {
        return [
            'opening_date' => 'datetime',
            'delivery_date' => 'date',
        ];
    }

    protected static function booted(): void
    {
        static::creating(function (ServiceOrder $order) {
            if (empty($order->number)) {
                $order->number = static::nextNumber();
            }
            if (empty($order->opening_date)) {
                $order->opening_date = now();
            }
        });
    }

    public static function nextNumber(): string
    {
        // Mirrors the original app: a global sequential counter (not reset per
        // year) taken from the last 4 digits of every existing OS number,
        // prefixed with the current year.
        $lastNum = DB::table('service_orders')
            ->selectRaw('MAX(CAST(RIGHT(number, 4) AS UNSIGNED)) as max_num')
            ->value('max_num') ?? 0;

        return now()->format('Y').str_pad((string) ($lastNum + 1), 4, '0', STR_PAD_LEFT);
    }

    public function client(): BelongsTo
    {
        return $this->belongsTo(Customer::class, 'client_id');
    }

    public function technician(): BelongsTo
    {
        return $this->belongsTo(User::class, 'technician_id');
    }

    public function items(): HasMany
    {
        return $this->hasMany(ServiceOrderItem::class);
    }

    public function history(): HasMany
    {
        return $this->hasMany(ServiceOrderHistory::class)->orderBy('happened_at');
    }
}
