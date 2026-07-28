<?php

// database/migrations/2025_01_01_000010_add_channels_to_notifications_table.php
// Adds a `channels` column to track which delivery methods were used
// for each notification (e.g. 'push', 'email', 'push,email').

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('notifications', function (Blueprint $table) {
            // Comma-separated list of channels used: 'push', 'email', 'push,email'
            // Nullable — old records before this migration will show null → 'In-App'
            $table->string('channels', 50)->nullable()->after('is_read');
        });
    }

    public function down(): void
    {
        Schema::table('notifications', function (Blueprint $table) {
            $table->dropColumn('channels');
        });
    }
};