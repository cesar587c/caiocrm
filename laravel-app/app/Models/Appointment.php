<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

#[Fillable(['date', 'time', 'client_name', 'address', 'phone', 'contact', 'summary', 'status', 'justification'])]
class Appointment extends Model
{
    use HasFactory;

    public const STATUSES = ['scheduled', 'completed', 'missed', 'cancelled'];

    protected function casts(): array
    {
        return [
            'date' => 'date:Y-m-d',
        ];
    }

    public function users(): BelongsToMany
    {
        return $this->belongsToMany(User::class);
    }

    public function sectors(): BelongsToMany
    {
        return $this->belongsToMany(Sector::class);
    }

    /**
     * Flattened list of "user:<id>" / "sector:<id>" tokens, mirroring the
     * original app's mixed assignedTo[] array shape.
     */
    public function assignedToTokens(): array
    {
        return [
            ...$this->users->map(fn ($u) => "user:{$u->id}")->all(),
            ...$this->sectors->map(fn ($s) => "sector:{$s->id}")->all(),
        ];
    }
}
