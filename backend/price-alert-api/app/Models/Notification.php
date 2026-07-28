<?php

// app/Models/Notification.php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Notification extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'product_id',
        'watchlist_item_id',
        'type',
        'title',
        'message',
        'product_link',
        'is_read',
        'channel',     // ← NEW: 'push', 'email', or 'push,email'
    ];

    protected $casts = [
        'is_read' => 'boolean',
    ];

    protected $appends = ['created_at_human'];

    public function getCreatedAtHumanAttribute(): string
    {
        return $this->created_at
            ? $this->created_at->diffForHumans()
            : '';
    }

    // ── Relationships ─────────────────────────────────────────────────────────
    public function user(): \Illuminate\Database\Eloquent\Relations\BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function product(): \Illuminate\Database\Eloquent\Relations\BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function watchlistItem(): \Illuminate\Database\Eloquent\Relations\BelongsTo
    {
        return $this->belongsTo(WatchlistItem::class);
    }
}
