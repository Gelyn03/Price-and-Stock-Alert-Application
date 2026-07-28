<?php

// app/Models/MonitoringLog.php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class MonitoringLog extends Model
{
    protected $fillable = [
        'event_type',
        'product_id',
        'product_name',
        'message',
        'items_count',
        'platform',
    ];

    public function product()
    {
        return $this->belongsTo(Product::class);
    }
}