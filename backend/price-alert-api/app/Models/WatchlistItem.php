<?php

// app/Models/WatchlistItem.php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class WatchlistItem extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'product_id',
        'target_price',
        'category',           // ← NEW
        'notif_price_drop',
        'notif_stock',
        'notif_target_price',
    ];

    protected $casts = [
        'target_price'       => 'decimal:2',
        'notif_price_drop'   => 'boolean',
        'notif_stock'        => 'boolean',
        'notif_target_price' => 'boolean',
    ];

    // Valid category values — mirrors the CATEGORIES constant in the React Native app
    public const CATEGORIES = [
        'uncategorized',
        'food',
        'shoes',
        'shirts',
        'pants',
        'furniture',
        'electronics',
        'beauty',
        'sports',
        'toys',
        'books',
        'home',
        'bags',
        'health',
        'other',
    ];

    // ── Relationships ──────────────────────────────────────────────────────────

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function product()
    {
        return $this->belongsTo(Product::class);
    }
}