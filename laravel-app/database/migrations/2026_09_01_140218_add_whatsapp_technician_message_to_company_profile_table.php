<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('company_profile', function (Blueprint $table) {
            $table->text('whatsapp_technician_message')->nullable()->after('whatsapp_reminder_message');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('company_profile', function (Blueprint $table) {
            $table->dropColumn('whatsapp_technician_message');
        });
    }
};
