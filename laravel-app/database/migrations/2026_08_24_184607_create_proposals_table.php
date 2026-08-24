<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('proposals', function (Blueprint $table) {
            $table->id();
            $table->string('document_type')->default('proposta');
            $table->foreignId('client_id')->nullable()->constrained('customers')->nullOnDelete();
            $table->string('client_name');
            $table->string('contact_name')->nullable();
            $table->string('client_phone')->nullable();
            $table->date('proposal_date');
            $table->date('validity_date');
            $table->string('payment_method')->default('boleto');
            $table->unsignedTinyInteger('installments')->default(1);
            $table->boolean('first_as_down_payment')->default(false);
            $table->decimal('total_one_time', 12, 2)->default(0);
            $table->decimal('total_monthly', 12, 2)->default(0);
            $table->decimal('total_one_time_alt', 12, 2)->nullable();
            $table->decimal('total_monthly_alt', 12, 2)->nullable();
            $table->boolean('has_alternative')->default(false);
            $table->text('observations')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('proposals');
    }
};
