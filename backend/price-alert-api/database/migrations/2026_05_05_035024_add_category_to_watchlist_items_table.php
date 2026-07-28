<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('watchlist_items', function (Blueprint $table) {
            $table->string('category', 50)
                  ->default('uncategorized')
                  ->after('target_price');
        });
    }

    public function down(): void
    {
        Schema::table('watchlist_items', function (Blueprint $table) {
            $table->dropColumn('category');
        });
    }
};