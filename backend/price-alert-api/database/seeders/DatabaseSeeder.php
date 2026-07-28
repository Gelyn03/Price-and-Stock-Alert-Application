<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
{
    // Gagawa ng Admin Account
    User::factory()->create([
        'name' => 'Admin',
        'email' => 'admin@pricestockalert.com',
        'password' => bcrypt('admin1234'), // Dito iseset ang password mo
        'role' => 'admin',                // Dito iseset ang pagiging admin
        'is_active' => 1,
    ]);

    // Gagawa rin tayo ng normal Test User para sa mobile testing mo
    User::factory()->create([
        'name' => 'Test User',
        'email' => 'test@example.com',
        'password' => bcrypt('user1234'),
        'role' => 'user',
        'is_active' => 1,
    ]);
}
}
