<?php

// app/Services/ProductScraperService.php
// MERGED: Best of both versions — retry logic, improved stock check,
//         detailed Lazada parsing with regex fallback, full logging

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class ProductScraperService
{
    /**
     * Main entry — detects platform and scrapes accordingly.
     */
    public function scrape(string $url, string $platform): array
    {
        try {
            return match ($platform) {
                'shopee' => $this->scrapeShopee($url),
                'lazada' => $this->scrapeLazada($url),
                default  => $this->fallback(),
            };
        } catch (\Throwable $e) {
            Log::error("Scraper error [{$platform}] for {$url}: " . $e->getMessage());
            return $this->fallback();
        }
    }

    // ── Shopee ─────────────────────────────────────────────────────────────────
    private function scrapeShopee(string $url): array
    {
        // Extract shop_id and item_id from Shopee URL
        // Format: https://shopee.ph/product-name-i.{shopId}.{itemId}
        preg_match('/i\.(\d+)\.(\d+)/', $url, $matches);

        if (!isset($matches[1], $matches[2])) {
            Log::warning("Shopee: Could not extract IDs from URL: {$url}");
            return $this->fallback();
        }

        $shopId = $matches[1];
        $itemId = $matches[2];
        $apiUrl = "https://shopee.ph/api/v4/item/get?itemid={$itemId}&shopid={$shopId}";

        // ✅ retry(3, 1000) = retry 3 times with 1 second delay between attempts
        $response = Http::retry(3, 1000)
            ->withHeaders([
                'User-Agent'       => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Referer'          => 'https://shopee.ph/',
                'X-API-Source'     => 'pc',
                'X-Requested-With' => 'XMLHttpRequest',
                'Accept'           => 'application/json',
                'Accept-Language'  => 'en-US,en;q=0.9',
            ])
            ->timeout(15)
            ->get($apiUrl);

        if (!$response->successful()) {
            Log::warning("Shopee request failed [{$response->status()}]: {$apiUrl}");
            return $this->fallback();
        }

        $data = $response->json('data') ?? [];

        // Price in Shopee API is stored as integer cents × 100000
        $price = isset($data['price_min']) ? $data['price_min'] / 100000 : null;

        // ✅ Check both 'stock' and 'normal_stock' — Shopee uses either depending on item type
        $stockCount = $data['stock'] ?? $data['normal_stock'] ?? 0;

        $image = !empty($data['image'])
            ? "https://cf.shopee.ph/file/{$data['image']}"
            : null;

        Log::info("Shopee scraped: {$data['name']} — ₱{$price} — stock: {$stockCount}");

        return [
            'name'         => $data['name'] ?? null,
            'price'        => $price,
            'stock_status' => $stockCount > 0 ? 'in_stock' : 'out_of_stock',
            'image_url'    => $image,
        ];
    }

    // ── Lazada ─────────────────────────────────────────────────────────────────
    private function scrapeLazada(string $url): array
    {
        // ✅ retry(3, 1000) = retry 3 times with 1 second delay between attempts
        $response = Http::retry(3, 1000)
            ->withHeaders([
                'User-Agent' => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept'     => 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            ])
            ->timeout(15)
            ->get($url);

        if (!$response->successful()) {
            Log::warning("Lazada request failed [{$response->status()}]: {$url}");
            return $this->fallback();
        }

        $html = $response->body();

        // ── Attempt 1: Parse embedded app.run() JSON (most complete data) ──────
        preg_match('/app\.run\(({.+?})\)/', $html, $matches);

        if (isset($matches[1])) {
            try {
                $appData = json_decode($matches[1], true);
                $fields  = $appData['data']['root']['fields'] ?? [];

                $price = $fields['price']['value'] ?? null;
                $name  = $fields['productOption']['product']['name'] ?? null;
                $stock = ($fields['stock']['value'] ?? 0) > 0 ? 'in_stock' : 'out_of_stock';
                $image = $fields['gallery']['videos'][0]['img'] ?? null;

                if ($price && $name) {
                    Log::info("Lazada scraped (JSON): {$name} — ₱{$price}");
                    return [
                        'name'         => $name,
                        'price'        => (float) str_replace(',', '', $price),
                        'stock_status' => $stock,
                        'image_url'    => $image,
                    ];
                }
            } catch (\Throwable $e) {
                Log::warning("Lazada JSON parse failed, trying regex fallback: " . $e->getMessage());
            }
        }

        // ── Attempt 2: Regex fallback (simpler, more stable) ─────────────────
        // Tries multiple price patterns found in Lazada's HTML
        preg_match('/"price"\s*:\s*"([^"]+)"/', $html, $priceMatch);
        if (!$priceMatch) {
            preg_match('/class="pdp-price[^"]*"[^>]*>₱([\d,]+)/', $html, $priceMatch);
        }

        preg_match('/"title"\s*:\s*"([^"]+)"/', $html, $nameMatch);
        if (!$nameMatch) {
            preg_match('/"name"\s*:\s*"([^"]+)"/', $html, $nameMatch);
        }

        $cleanPrice = isset($priceMatch[1])
            ? (float) preg_replace('/[^\d.]/', '', $priceMatch[1])
            : null;

        $name = $nameMatch[1] ?? null;

        if ($cleanPrice || $name) {
            Log::info("Lazada scraped (regex): {$name} — ₱{$cleanPrice}");
        } else {
            Log::warning("Lazada: Could not extract data from {$url}");
        }

        return [
            'name'         => $name,
            'price'        => $cleanPrice ?: null,
            // Note: Lazada stock is difficult to determine from HTML alone
            // 'in_stock' is assumed if page loaded — update if you find a reliable pattern
            'stock_status' => $cleanPrice ? 'in_stock' : 'unknown',
            'image_url'    => null,
        ];
    }

    // ── Fallback ───────────────────────────────────────────────────────────────
    private function fallback(): array
    {
        return [
            'name'         => null,
            'price'        => null,
            'stock_status' => 'unknown',
            'image_url'    => null,
        ];
    }
}