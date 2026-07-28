<?php

// app/Jobs/FetchProductData.php
// UPDATED: Tracks delivery channels (push, email) in the notifications table.

namespace App\Jobs;

use App\Models\Product;
use App\Models\WatchlistItem;
use App\Models\PriceHistory;
use App\Models\Notification;
use App\Models\MonitoringLog;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Mail;

class FetchProductData implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries   = 3;
    public int $timeout = 300;

    public function handle(): void
    {
        $startTime    = now();
        $products     = Product::where('is_valid', true)->get();
        $count        = $products->count();
        $forceTrigger = Cache::pull('demo_force_trigger', false);

        if ($forceTrigger) {
            Log::info("[Monitor] 🎯 DEMO FORCE TRIGGER MODE ACTIVATED (ONE-TIME)");
        }
        Log::info("[Monitor] Starting fetch cycle for {$count} products.");

        MonitoringLog::create([
            'event_type'  => 'fetch_cycle_start',
            'message'     => "Fetch cycle started ({$count} items)" . ($forceTrigger ? ' [DEMO MODE]' : ''),
            'items_count' => $count,
        ]);

        $processed = 0;
        $errors    = 0;

        foreach ($products as $product) {
            try {
                $this->processProduct($product, $forceTrigger);
                $processed++;
            } catch (\Throwable $e) {
                $errors++;
                Log::error("[Monitor] Error processing product #{$product->id}: " . $e->getMessage());
                MonitoringLog::create([
                    'event_type'   => 'error',
                    'product_id'   => $product->id,
                    'product_name' => $product->name,
                    'message'      => "Error: " . $e->getMessage(),
                ]);
            }
        }

        $duration = now()->diffInSeconds($startTime);

        MonitoringLog::create([
            'event_type'  => 'fetch_cycle_complete',
            'message'     => "Fetch cycle completed ({$count} items) in {$duration}s. Errors: {$errors}",
            'items_count' => $count,
        ]);

        Cache::put('scheduler_last_run',  now()->toIso8601String(),              3600);
        Cache::put('scheduler_next_run',  now()->addMinutes(5)->toIso8601String(), 3600);
        Cache::put('scheduler_status',    'running',                              3600);
        Cache::put('scheduler_products',  $count,                                 3600);

        Log::info("[Monitor] Fetch cycle complete. Processed: {$processed}, Errors: {$errors}");
    }

    // ── Process single product ─────────────────────────────────────────────────
    private function processProduct(Product $product, bool $forceTrigger = false): void
    {
        $fetched = $this->fetchFromPlatform($product, $forceTrigger);
        if (!$fetched) return;

        $newPrice       = (float) $fetched['price'];
        $newStockStatus = $fetched['stock_status'];
        $oldPrice       = (float) $product->current_price;
        $oldStockStatus = $product->stock_status ?? 'in_stock';

        if ($newPrice !== $oldPrice) {
            PriceHistory::create([
                'product_id'  => $product->id,
                'price'       => $newPrice,
                'recorded_at' => now(),
            ]);
        }

        $product->update([
            'prev_price'      => $oldPrice,
            'current_price'   => $newPrice,
            'stock_status'    => $newStockStatus,
            'last_checked_at' => now(),
        ]);

        $watchers = WatchlistItem::with('user')
            ->where('product_id', $product->id)
            ->get();

        foreach ($watchers as $item) {
            $this->checkAndNotify(
                $item, $product,
                $oldPrice, $newPrice,
                $oldStockStatus, $newStockStatus,
                $forceTrigger
            );
        }
    }

    // ── Check conditions and send notifications ────────────────────────────────
    private function checkAndNotify(
        WatchlistItem $item,
        Product       $product,
        float         $oldPrice,
        float         $newPrice,
        string        $oldStockStatus,
        string        $newStockStatus,
        bool          $forceTrigger = false
    ): void {
        $pct = $oldPrice > 0
            ? round((abs($newPrice - $oldPrice) / $oldPrice) * 100, 1)
            : 0;

        // 1. Price Drop
        if ($item->notif_price_drop && ($newPrice < $oldPrice || $forceTrigger) && $oldPrice > 0) {
            $title   = "Price Drop Alert! 📉 {$product->name}";
            $message = "Now ₱" . number_format($newPrice, 2) . " — was ₱" . number_format($oldPrice, 2) . " (-{$pct}%)";
            $this->createNotification($item, $product, 'price_drop', $title, $message, $oldPrice, $newPrice, $pct);
            MonitoringLog::create([
                'event_type'   => 'price_drop',
                'product_id'   => $product->id,
                'product_name' => $product->name,
                'platform'     => $product->platform,
                'message'      => "Price drop: ₱{$oldPrice} → ₱{$newPrice} (-{$pct}%)",
            ]);
        }

        // 2. Price Increase
        if ($item->notif_price_drop && $newPrice > $oldPrice && $oldPrice > 0) {
            $title   = "Price Increase 📈 {$product->name}";
            $message = "Now ₱" . number_format($newPrice, 2) . " — was ₱" . number_format($oldPrice, 2) . " (+{$pct}%)";
            $this->createNotification($item, $product, 'price_increase', $title, $message, $oldPrice, $newPrice, $pct);
            MonitoringLog::create([
                'event_type'   => 'price_increase',
                'product_id'   => $product->id,
                'product_name' => $product->name,
                'platform'     => $product->platform,
                'message'      => "Price increase: ₱{$oldPrice} → ₱{$newPrice} (+{$pct}%)",
            ]);
        }

        // 3. Target Price Reached
        if ($item->notif_target_price && $item->target_price > 0 && (
            ($newPrice <= $item->target_price && $oldPrice > $item->target_price) || $forceTrigger
        )) {
            $title   = "🎯 Target Price Reached! {$product->name}";
            $message = "Current ₱" . number_format($newPrice, 2) . " reached your target of ₱" . number_format($item->target_price, 2);
            $this->createNotification($item, $product, 'target_price', $title, $message, $oldPrice, $newPrice, $pct);
            MonitoringLog::create([
                'event_type'   => 'target_price',
                'product_id'   => $product->id,
                'product_name' => $product->name,
                'platform'     => $product->platform,
                'message'      => "Target price reached: ₱{$newPrice} ≤ target ₱{$item->target_price}",
            ]);
        }

        // 4. Back in Stock
        if ($item->notif_stock && (
            ($oldStockStatus === 'out_of_stock' && $newStockStatus === 'in_stock') || $forceTrigger
        )) {
            $title   = "✅ Back in Stock! {$product->name}";
            $message = "Now available — Current price: ₱" . number_format($newPrice, 2);
            $this->createNotification($item, $product, 'stock_available', $title, $message, $oldPrice, $newPrice, $pct);
            MonitoringLog::create([
                'event_type'   => 'stock_available',
                'product_id'   => $product->id,
                'product_name' => $product->name,
                'platform'     => $product->platform,
                'message'      => "Stock restored: {$product->name}",
            ]);
        }

        // 5. Out of Stock
        if ($item->notif_stock &&
            $oldStockStatus === 'in_stock' &&
            $newStockStatus === 'out_of_stock'
        ) {
            $title   = "❌ Out of Stock! {$product->name}";
            $message = "No longer available on " . ucfirst($product->platform);
            $this->createNotification($item, $product, 'out_of_stock', $title, $message, $oldPrice, $newPrice, $pct);
            MonitoringLog::create([
                'event_type'   => 'out_of_stock',
                'product_id'   => $product->id,
                'product_name' => $product->name,
                'platform'     => $product->platform,
                'message'      => "Out of stock: {$product->name}",
            ]);
        }
    }

    // ── Create notification + send push + email + track channels ──────────────
    private function createNotification(
        WatchlistItem $item,
        Product       $product,
        string        $type,
        string        $title,
        string        $message,
        float         $oldPrice,
        float         $newPrice,
        float         $pct
    ): void {
        $channels = [];

        // ── Push notification ──────────────────────────────────────────────────
        $pushToken = $item->user->expo_push_token ?? null;
        if ($pushToken) {
            $this->sendPushNotification($pushToken, $title, $message);
            $channels[] = 'push';
        }

        // ── Email notification ─────────────────────────────────────────────────
        $emailSent = $this->sendEmailNotification(
            $item, $product, $type, $title, $message, $oldPrice, $newPrice, $pct
        );
        if ($emailSent) {
            $channels[] = 'email';
        }

        // ── Record in-app notification with channels ───────────────────────────
        $channels[] = 'in-app'; // ← DAGDAG LANG ITO
        Notification::create([
            'user_id'           => $item->user_id,
            'product_id'        => $product->id,
            'watchlist_item_id' => $item->id,
            'type'              => $type,
            'message'           => $message,
            'is_read'           => false,
            'channel'           => implode(',', $channels),
        ]);
    }

    // ── Send HTML Email — returns true if sent successfully ───────────────────
    private function sendEmailNotification(
        WatchlistItem $item,
        Product       $product,
        string        $type,
        string        $title,
        string        $message,
        float         $oldPrice,
        float         $newPrice,
        float         $pct
    ): bool {
        $userEmail = $item->user->email ?? null;
        if (!$userEmail) return false;

        $icon  = match($type) {
            'price_drop'      => '📉',
            'price_increase'  => '📈',
            'target_price'    => '🎯',
            'stock_available' => '✅',
            'out_of_stock'    => '❌',
            default           => '🔔',
        };
        $color = match($type) {
            'price_drop'      => '#16a34a',
            'price_increase'  => '#dc2626',
            'target_price'    => '#7c3aed',
            'stock_available' => '#0891b2',
            'out_of_stock'    => '#dc2626',
            default           => '#0F4C81',
        };
        $typeLabel = match($type) {
            'price_drop'      => 'Price Drop Alert',
            'price_increase'  => 'Price Increase',
            'target_price'    => 'Target Price Reached',
            'stock_available' => 'Back in Stock',
            'out_of_stock'    => 'Out of Stock',
            default           => 'Alert',
        };

        $priceChangeHtml = $oldPrice !== $newPrice
            ? "<p style='color:#94a3b8;font-size:13px;margin:6px 0 0;'>
                Was: <span style='text-decoration:line-through;'>₱" . number_format($oldPrice, 2) . "</span>
                &nbsp;({$icon} {$pct}%)
               </p>"
            : '';

        try {
            Mail::send([], [], function ($mail) use (
                $userEmail, $product, $type, $title, $message,
                $oldPrice, $newPrice, $pct,
                $icon, $color, $typeLabel, $priceChangeHtml
            ) {
                $mail->to($userEmail)
                    ->subject("{$icon} {$typeLabel} — {$product->name}")
                    ->html("
                        <div style='font-family:Arial,sans-serif;max-width:520px;margin:0 auto;background:#f8fafc;padding:0;'>
                            <div style='background:#0F4C81;padding:24px 32px;border-radius:12px 12px 0 0;'>
                                <h2 style='color:white;margin:0;font-size:20px;'>💰 Price and Stock Alert</h2>
                                <p style='color:rgba(255,255,255,0.75);margin:4px 0 0;font-size:13px;'>Your personal price monitoring app</p>
                            </div>
                            <div style='background:white;padding:32px;border-radius:0 0 12px 12px;border:1px solid #e2e8f0;border-top:none;'>
                                <div style='display:inline-block;background:{$color}18;border-radius:20px;padding:6px 16px;margin-bottom:20px;'>
                                    <span style='color:{$color};font-weight:bold;font-size:13px;'>{$icon} {$typeLabel}</span>
                                </div>
                                <h3 style='color:#1e293b;font-size:18px;margin:0 0 4px;'>{$product->name}</h3>
                                <p style='color:#64748b;font-size:13px;margin:0 0 20px;'>
                                    Platform: <strong>" . ucfirst($product->platform) . "</strong>
                                </p>
                                <div style='background:#f0f4f8;border-radius:10px;padding:20px;margin-bottom:24px;border-left:4px solid {$color};'>
                                    <p style='color:#64748b;font-size:11px;margin:0 0 8px;font-weight:bold;letter-spacing:0.8px;'>CURRENT PRICE</p>
                                    <p style='color:{$color};font-size:32px;font-weight:900;margin:0;'>
                                        ₱" . number_format($newPrice, 2) . "
                                    </p>
                                    {$priceChangeHtml}
                                </div>
                                <p style='color:#475569;font-size:14px;line-height:1.7;margin:0 0 24px;'>{$message}</p>
                               <p style='text-align:center;margin:24px 0;font-size:14px;'>
                                        Visit us at: <a href='https://web.priceandstockalert.online' 
                                style='color:#0F4C81;font-weight:bold;'>
                                        https://web.priceandstockalert.online
                                    </a>
                                </p>
                                <hr style='border:none;border-top:1px solid #e2e8f0;margin:24px 0;'>
                                <p style='color:#94a3b8;font-size:12px;text-align:center;margin:0;line-height:1.6;'>
                                    You received this because you are watching this product.<br>
                                    To stop alerts, update your notification preferences in the app.
                                </p>
                            </div>
                        </div>
                    ");
            });
            return true;
        } catch (\Throwable $e) {
            Log::warning("[Monitor] Email failed for {$userEmail}: " . $e->getMessage());
            return false;
        }
    }

    // ── Expo Push Notification ─────────────────────────────────────────────────
    private function sendPushNotification(string $token, string $title, string $body): void
    {
        try {
            Http::timeout(10)->post('https://exp.host/--/api/v2/push/send', [
                'to'    => $token,
                'title' => $title,
                'body'  => $body,
                'sound' => 'default',
            ]);
        } catch (\Throwable $e) {
            Log::warning("[Monitor] Push failed: " . $e->getMessage());
        }
    }

    // ── Realistic Simulated Price & Stock Fetch ────────────────────────────────
    private function fetchFromPlatform(Product $product, bool $forceTrigger = false): ?array
    {
        $currentPrice = (float) $product->current_price;
        if ($currentPrice <= 0) return null;

        if ($forceTrigger) {
            return [
                'price'        => round($currentPrice * 0.90, 2),
                'stock_status' => 'in_stock',
            ];
        }

        $roll = rand(1, 100);
        $changePct = match(true) {
            $roll <= 55 => 0,
            $roll <= 75 => rand(-5,  -1)  / 100,
            $roll <= 85 => rand(-15, -5)  / 100,
            $roll <= 90 => rand(-30, -15) / 100,
            $roll <= 98 => rand(1,   3)   / 100,
            default     => rand(3,   8)   / 100,
        };

        $newPrice     = max(1, round($currentPrice * (1 + $changePct), 2));
        $currentStock = $product->stock_status ?? 'in_stock';
        $newStock     = $currentStock;
        if (rand(1, 100) <= 3) {
            $newStock = $currentStock === 'in_stock' ? 'out_of_stock' : 'in_stock';
        }

        return [
            'price'        => $newPrice,
            'stock_status' => $newStock,
        ];
    }
}
