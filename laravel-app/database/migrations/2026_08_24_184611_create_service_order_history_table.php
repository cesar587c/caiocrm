<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('service_order_history', function (Blueprint $table) {
            $table->id();
            $table->foreignId('service_order_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('user_name');
            $table->timestamp('happened_at')->useCurrent();
            $table->string('action');
            $table->string('from_value')->nullable();
            $table->string('to_value')->nullable();
            $table->text('details')->nullable();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('service_order_history');
    }
};
