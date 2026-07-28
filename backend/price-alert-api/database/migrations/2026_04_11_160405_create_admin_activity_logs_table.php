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
    Schema::create('admin_activity_logs', function (Blueprint $table) {
        $table->id();
        $table->string('event_type');
        // e.g. user_registered, user_logged_in, price_drop,
        //      target_price, stock_available, product_flagged
        $table->string('title');
        $table->string('message');
        $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
        $table->foreignId('product_id')->nullable()->constrained()->nullOnDelete();
        $table->boolean('is_read')->default(false);
        $table->timestamps();
    });
}

public function down(): void
{
    Schema::dropIfExists('admin_activity_logs');
}
};
