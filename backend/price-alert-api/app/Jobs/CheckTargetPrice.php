<?php

// app/Jobs/CheckTargetPrice.php
// Checks if a product's price has reached any user's target price.
// Sends both push and email notifications.

namespace App\Jobs;

use App\Mail\TargetPriceMail;
use App\Models\Product;
use App\Models\WatchlistItem;
use App\Models\Notification;
use App\Services\ExpoPushService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class CheckTargetPrice implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function __construct(
        private int $productId,
        private ?float $newPrice,
    ) {}

    public function handle(ExpoPushService $push): void
    {
        if (! $this->newPrice) return;

        $product = Product::find($this->productId);
        if (! $product) return;

        // Get watchlist items with a target price set, notif enabled,
        // and where the new price is at or below the target
        $items = WatchlistItem::with('user')
            ->where('product_id', $this->productId)
            ->where('notif_target_price', true)
            ->whereNotNull('target_price')
            ->where('target_price', '>=', $this->newPrice)
            ->get();

        foreach ($items as $item) {
            $user = $item->user;
            if (! $user) continue;

            // ── Create in-app notification record ──────────────────────────
            Notification::create([
                'user_id'      => $user->id,
                'product_id'   => $product->id,
                'type'         => 'target_price',
                'message'      => "🎯 Target price reached! {$product->name} is now ₱" . number_format($this->newPrice, 2),
                'product_link' => $product->url,
                'is_read'      => false,
            ]);

            // ── Send push notification ─────────────────────────────────────
            if ($user->expo_push_token) {
                $push->send(
                    $user->expo_push_token,
                    '🎯 Target Price Reached!',
                    "{$product->name} is now ₱" . number_format($this->newPrice, 2) . " — your target was ₱" . number_format($item->target_price, 2),
                    ['product_id' => $product->id, 'type' => 'target_price']
                );
            }

            // ── Send email notification ────────────────────────────────────
            if ($user->email) {
                try {
                    Mail::to($user->email)->send(new TargetPriceMail(
                        userName:     $user->name,
                        productName:  $product->name,
                        productUrl:   $product->url,
                        currentPrice: $this->newPrice,
                        targetPrice:  $item->target_price,
                    ));
                    Log::info("Target price email sent to {$user->email} for product #{$product->id}");
                } catch (\Exception $e) {
                    Log::error("Failed to send target price email to {$user->email}: " . $e->getMessage());
                }
            }

            Log::info("Target price notification sent to user #{$user->id} for product #{$product->id}");
        }
    }
}