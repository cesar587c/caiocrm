<?php

namespace Database\Seeders;

use App\Models\CompanyProfile;
use App\Models\RolePermission;
use App\Models\Sector;
use App\Models\User;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $sectors = collect([
            'Administrativo',
            'Comercial',
            'Técnico',
            'Financeiro',
        ])->mapWithKeys(fn ($name) => [$name => Sector::create(['name' => $name])]);

        $admin = User::create([
            'name' => 'admin',
            'email' => 'admin@vendaspro.com',
            'whatsapp' => '5511999999999',
            'role' => 'admin',
            'password' => 'AdmPwd20',
        ]);
        $admin->sectors()->attach($sectors->values()->pluck('id'));

        $technician = User::create([
            'name' => 'Carlos Pereira',
            'email' => 'carlos@vendaspro.com',
            'whatsapp' => '5521988888888',
            'role' => 'technician',
            'password' => 'password123',
        ]);
        $technician->sectors()->attach($sectors['Técnico']->id);

        foreach (RolePermission::DEFAULTS as $role => $paths) {
            RolePermission::create(['role' => $role, 'paths' => $paths]);
        }

        CompanyProfile::current();
    }
}
