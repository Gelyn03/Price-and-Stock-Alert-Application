<?php

// database/migrations/xxxx_xx_xx_add_profile_photo_to_users_table.php
// Run with: php artisan migrate

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
    if (!Schema::hasColumn('users', 'is_active')) {
        $table->boolean('is_active')->default(true);
    }
});
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('profile_photo');
        });
    }
};