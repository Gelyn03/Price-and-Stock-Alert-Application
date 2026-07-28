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
        Schema::table('users', function (Blueprint $table) {
            // Idagdag ang is_active column pagkatapos ng 'role'
            // Default ay 1 (true) para hindi ma-deactivate ang mga existing users
            $table->boolean('is_active')->default(true)->after('role');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            // Tanggalin ang column kapag ni-rollback ang migration
            $table->dropColumn('is_active');
        });
    }
};