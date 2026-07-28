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
        // Add 'profile_photo' column only if it does not exist
        if (!Schema::hasColumn('users', 'profile_photo')) {
            Schema::table('users', function (Blueprint $table) {
                $table->string('profile_photo')->nullable()->after('is_active');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Drop 'profile_photo' column if it exists
        if (Schema::hasColumn('users', 'profile_photo')) {
            Schema::table('users', function (Blueprint $table) {
                $table->dropColumn('profile_photo');
            });
        }
    }
};