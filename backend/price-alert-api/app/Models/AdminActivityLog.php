<?php
// app/Models/AdminActivityLog.php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AdminActivityLog extends Model
{
    protected $fillable = [
        'event_type', 'title', 'message',
        'user_id', 'product_id', 'is_read',
    ];

    public function user()    { return $this->belongsTo(User::class); }
    public function product() { return $this->belongsTo(Product::class); }
}