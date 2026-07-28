<?php

// app/Models/Product.php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Product extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'url',
        'platform',
        'image_url',
        'current_price',
        'prev_price',
        'stock_status',
        'is_valid',
        'last_checked_at',
    ];

    protected $casts = [
        'current_price'   => 'decimal:2',
        'prev_price'      => 'decimal:2',
        'is_valid'        => 'boolean',
        'last_checked_at' => 'datetime',
    ];

    // ── Relationships ──────────────────────────────────────────────────────────

    public function watchlistItems()
    {
        return $this->hasMany(WatchlistItem::class);
    }

    public function priceHistories()
    {
        return $this->hasMany(PriceHistory::class)->latest('recorded_at');
    }

    public function notifications()
    {
        return $this->hasMany(Notification::class);
    }

    // ── Helpers ────────────────────────────────────────────────────────────────

    public function detectPlatform(): string
    {
        if (str_contains($this->url, 'shopee.ph'))  return 'shopee';
        if (str_contains($this->url, 'lazada.com.ph')) return 'lazada';
        return 'unknown';
    }
}