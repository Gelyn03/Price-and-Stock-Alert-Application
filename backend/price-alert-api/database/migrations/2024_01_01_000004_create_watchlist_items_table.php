<?php

// database/migrations/2024_01_01_000004_create_watchlist_items_table.php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('watchlist_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->foreignId('product_id')->constrained()->onDelete('cascade');
            $table->decimal('target_price', 12, 2)->nullable();

            // Per-product notification preferences
            $table->boolean('notif_price_drop')->default(true);
            $table->boolean('notif_stock')->default(true);
            $table->boolean('notif_target_price')->default(true);

            $table->timestamps();

            // A user cannot add the same product URL twice
            $table->unique(['user_id', 'product_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('watchlist_items');
    }
};