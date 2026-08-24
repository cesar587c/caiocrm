<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('customers', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('nome_fantasia')->nullable();
            $table->string('contact_name')->nullable();
            $table->string('telefone')->nullable();
            $table->string('contact_name_2')->nullable();
            $table->string('phone_2')->nullable();
            $table->string('cnpj')->nullable();
            $table->string('email')->nullable();
            $table->text('endereco')->nullable();
            $table->string('cep')->nullable();
            $table->string('status')->default('new');
            $table->string('responsible')->nullable();
            $table->string('potential')->default('medium');
            $table->timestamp('last_contact')->nullable();
            $table->string('type')->default('one_time');
            $table->json('service_categories')->nullable();
            $table->text('observations')->nullable();
            $table->decimal('one_time_value', 12, 2)->nullable();
            $table->decimal('monthly_value', 12, 2)->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('customers');
    }
};
