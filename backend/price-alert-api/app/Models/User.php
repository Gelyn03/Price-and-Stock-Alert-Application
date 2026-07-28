<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use Carbon\Carbon;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    protected $fillable = [
        'name',
        'email',
        'password',
        'role',
        'is_active',
        'profile_photo',
        'expo_push_token',
        'share_token',
        'last_login_at',
        // ✅ Required for email verification flow
        'email_verified_at',
        'verification_code',
        'verification_sent_at',
    ];

    protected $hidden = [
        'password',
        'remember_token',
        // ✅ Never expose verification internals to frontend
        'verification_code',
        'verification_sent_at',
    ];

    protected $casts = [
        'email_verified_at'    => 'datetime',
        'password'             => 'hashed',
        // ✅ REMOVED 'boolean' cast on is_active — casting null→false was
        //    causing newly registered users to appear deactivated.
        //    isActive() helper below handles null correctly.
        'last_login_at'        => 'datetime',
        'verification_sent_at' => 'datetime',
    ];

    // ── Appended attributes ────────────────────────────────────────────────────
    protected $appends = ['profile_photo_url', 'is_online'];

    // ── Accessor: Online Status ────────────────────────────────────────────────
    public function getIsOnlineAttribute(): bool
    {
        return $this->last_login_at && $this->last_login_at->diffInMinutes(now()) < 5;
    }

    // ── Accessor: Full URL for profile photo ───────────────────────────────────
    public function getProfilePhotoUrlAttribute(): ?string
    {
        if (!$this->profile_photo) return null;
        return asset('storage/' . $this->profile_photo);
    }

    // ── Relationships ──────────────────────────────────────────────────────────

    public function watchlistItems()
    {
        return $this->hasMany(WatchlistItem::class);
    }

    public function notifications()
    {
        return $this->hasMany(Notification::class)->latest();
    }

    // ── Helpers ────────────────────────────────────────────────────────────────

    public function isAdmin(): bool
    {
        return $this->role === 'admin';
    }

    // ✅ FIX: null = not explicitly deactivated = treat as active.
    //         Only returns false when is_active is explicitly 0/false in DB.
    public function isActive(): bool
    {
        return $this->is_active !== false && $this->is_active != 0;
    }
}