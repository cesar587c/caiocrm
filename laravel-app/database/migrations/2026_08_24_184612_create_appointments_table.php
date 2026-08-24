<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('appointments', function (Blueprint $table) {
            $table->id();
            $table->date('date');
            $table->string('time');
            $table->string('client_name');
            $table->string('address');
            $table->string('phone')->nullable();
            $table->string('contact');
            $table->text('summary')->nullable();
            $table->string('status')->default('scheduled');
            $table->text('justification')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('appointments');
    }
};
