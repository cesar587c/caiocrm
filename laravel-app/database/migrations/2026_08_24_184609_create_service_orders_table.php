<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('service_orders', function (Blueprint $table) {
            $table->id();
            $table->string('number')->unique();
            $table->timestamp('opening_date')->useCurrent();
            $table->date('delivery_date')->nullable();
            $table->foreignId('client_id')->constrained('customers')->cascadeOnDelete();
            $table->foreignId('technician_id')->constrained('users')->cascadeOnDelete();
            $table->string('status')->default('Aberta');
            $table->text('problem_description');
            $table->text('technical_diagnosis')->nullable();
            $table->text('executed_services')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('service_orders');
    }
};
