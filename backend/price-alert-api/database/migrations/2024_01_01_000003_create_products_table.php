<?php

// database/migrations/2024_01_01_000002_create_products_table.php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('products', function (Blueprint $table) {
            $table->id();
            $table->string('name')->nullable();
            $table->text('url');
            $table->string('platform'); // 'shopee' or 'lazada'
            $table->string('image_url')->nullable();
            $table->decimal('current_price', 12, 2)->nullable();
            $table->decimal('prev_price', 12, 2)->nullable();
            $table->enum('stock_status', ['in_stock', 'out_of_stock', 'unknown'])->default('unknown');
            $table->boolean('is_valid')->default(true); // false = admin flagged, skip monitoring
            $table->timestamp('last_checked_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('products');
    }
};