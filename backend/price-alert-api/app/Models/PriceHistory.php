<?php

// app/Models/PriceHistory.php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PriceHistory extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'product_id',
        'price',
        'stock_status',
        'recorded_at',
    ];

    protected $casts = [
        'price'       => 'decimal:2',
        'recorded_at' => 'datetime',
    ];

    public function product()
    {
        return $this->belongsTo(Product::class);
    }
}