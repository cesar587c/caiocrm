<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;

#[Fillable(['name', 'email', 'phone', 'address', 'logo_url', 'whatsapp_reminder_message', 'google_calendar_email'])]
class CompanyProfile extends Model
{
    protected $table = 'company_profile';

    /**
     * The company profile is a single settings row; always fetch/update row #1.
     */
    public static function current(): self
    {
        return static::firstOrCreate(['id' => 1], [
            'name' => 'Sua Empresa de CRM',
            'email' => 'contato@suaempresa.com',
            'phone' => '',
            'address' => 'Sua Rua, 123, Sua Cidade - UF',
            'whatsapp_reminder_message' => "Olá, {cliente}! 👋\n\nEste é um lembrete do seu agendamento com a {empresa} no dia {data} às {hora}.\n\nAté breve!",
        ]);
    }
}
