<?php

// app/Jobs/CheckStockAvailability.php
// Notifies users when an out-of-stock product becomes available again.
// Sends both push and email notifications.

namespace App\Jobs;

use App\Mail\StockAvailableMail;
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

class CheckStockAvailability implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function __construct(
        private int $productId,
        private string $prevStock,
        private string $newStock,
    ) {}

    public function handle(ExpoPushService $push): void
    {
        // Only alert when transitioning from out_of_stock → in_stock
        if ($this->prevStock !== 'out_of_stock' || $this->newStock !== 'in_stock') {
            return;
        }

        $product = Product::find($this->productId);
        if (! $product) return;

        $items = WatchlistItem::with('user')
            ->where('product_id', $this->productId)
            ->where('notif_stock', true)
            ->get();

        foreach ($items as $item) {
            $user = $item->user;
            if (! $user) continue;

            // ── Create in-app notification record ──────────────────────────
            Notification::create([
                'user_id'      => $user->id,
                'product_id'   => $product->id,
                'type'         => 'stock_available',
                'message'      => "{$product->name} is back in stock! Tap to view.",
                'product_link' => $product->url,
                'is_read'      => false,
            ]);

            // ── Send push notification ─────────────────────────────────────
            if ($user->expo_push_token) {
                $push->send(
                    $user->expo_push_token,
                    '✅ Back in Stock!',
                    "{$product->name} is now available again!",
                    ['product_id' => $product->id, 'type' => 'stock_available']
                );
            }

            // ── Send email notification ────────────────────────────────────
            if ($user->email) {
                try {
                    Mail::to($user->email)->send(new StockAvailableMail(
                        userName:     $user->name,
                        productName:  $product->name,
                        productUrl:   $product->url,
                        currentPrice: $product->current_price ?? null,
                    ));
                    Log::info("Stock available email sent to {$user->email} for product #{$product->id}");
                } catch (\Exception $e) {
                    Log::error("Failed to send stock email to {$user->email}: " . $e->getMessage());
                }
            }

            Log::info("Stock alert sent to user #{$user->id} for product #{$product->id}");
        }
    }
}