<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('notifications', function (Blueprint $table) {
            if (!Schema::hasColumn('notifications', 'watchlist_item_id')) {
                $table->foreignId('watchlist_item_id')->nullable()->constrained('watchlist_items')->nullOnDelete();
            }
        });
    }

    public function down(): void
    {
        Schema::table('notifications', function (Blueprint $table) {
            $table->dropForeignIdFor(\App\Models\WatchlistItem::class);
            $table->dropColumn('watchlist_item_id');
        });
    }
};