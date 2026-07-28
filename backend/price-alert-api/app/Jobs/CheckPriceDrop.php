<?php

// app/Jobs/CheckPriceDrop.php
// Checks if a product price dropped and sends push + email notifications.

namespace App\Jobs;

use App\Mail\PriceDropMail;
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

class CheckPriceDrop implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function __construct(
        private int $productId,
        private ?float $prevPrice,
        private ?float $newPrice,
    ) {}

    public function handle(ExpoPushService $push): void
    {
        // Only proceed if price actually dropped
        if (! $this->newPrice || ! $this->prevPrice || $this->newPrice >= $this->prevPrice) {
            return;
        }

        $product = Product::find($this->productId);
        if (! $product) return;

        $drop    = $this->prevPrice - $this->newPrice;
        $percent = round(($drop / $this->prevPrice) * 100, 1);

        // Get all users watching this product with price drop alerts ON
        $items = WatchlistItem::with('user')
            ->where('product_id', $this->productId)
            ->where('notif_price_drop', true)
            ->get();

        foreach ($items as $item) {
            $user = $item->user;
            if (! $user) continue;

            // ── Create in-app notification record ──────────────────────────
            Notification::create([
                'user_id'      => $user->id,
                'product_id'   => $product->id,
                'type'         => 'price_drop',
                'message'      => "Price dropped by {$percent}%! Now ₱" . number_format($this->newPrice, 2),
                'product_link' => $product->url,
                'is_read'      => false,
            ]);

            // ── Send push notification ─────────────────────────────────────
            if ($user->expo_push_token) {
                $push->send(
                    $user->expo_push_token,
                    '📉 Price Drop Alert!',
                    "{$product->name} is now ₱" . number_format($this->newPrice, 2) . " (↓{$percent}%)",
                    ['product_id' => $product->id, 'type' => 'price_drop']
                );
            }

            // ── Send email notification ────────────────────────────────────
            if ($user->email) {
                try {
                    Mail::to($user->email)->send(new PriceDropMail(
                        userName:    $user->name,
                        productName: $product->name,
                        productUrl:  $product->url,
                        prevPrice:   $this->prevPrice,
                        newPrice:    $this->newPrice,
                        percent:     $percent,
                    ));
                    Log::info("Price drop email sent to {$user->email} for product #{$product->id}");
                } catch (\Exception $e) {
                    // Log error but don't fail the job — push already sent
                    Log::error("Failed to send price drop email to {$user->email}: " . $e->getMessage());
                }
            }

            Log::info("Price drop notification sent to user #{$user->id} for product #{$product->id}");
        }
    }
}