<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('monitoring_logs', function (Blueprint $table) {
            $table->id();
            $table->string('event_type');
            $table->foreignId('product_id')->nullable()->constrained()->nullOnDelete();
            $table->string('product_name')->nullable();
            $table->string('platform')->nullable();
            $table->text('message')->nullable();
            $table->integer('items_count')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('monitoring_logs');
    }
};