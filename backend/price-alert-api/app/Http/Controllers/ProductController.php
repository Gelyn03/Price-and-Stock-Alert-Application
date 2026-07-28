<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;

class ProductController extends Controller
{
    public function fetch(Request $request)
    {
        $platform = $request->input('platform');

        if ($platform === 'shopee') {
            return $this->fetchShopee(
                $request->input('shopId'),
                $request->input('itemId')
            );
        } elseif ($platform === 'lazada') {
            return $this->fetchLazada($request->input('url'));
        }

        return response()->json(['message' => 'Platform not supported'], 422);
    }

    // ── Shopee ────────────────────────────────────────────────────────────────
    private function fetchShopee($shopId, $itemId)
    {
        $response = Http::withHeaders([
            'User-Agent' => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
            'Referer'    => 'https://shopee.ph',
        ])->get("https://shopee.ph/api/v4/item/get?itemid=$itemId&shopid=$shopId");

        $data = $response->json()['data'] ?? null;

        if (!$data) {
            return response()->json(['message' => 'Shopee block detected'], 403);
        }

        return response()->json([
            'name'  => $data['name'],
            'price' => $data['price'] / 100000,
        ]);
    }

    // ── Lazada ────────────────────────────────────────────────────────────────
    private function fetchLazada(?string $url)
    {
        if (!$url) {
            return response()->json(['message' => 'No URL provided'], 422);
        }

        // Step 1 — Resolve short links (s.lazada.com.ph or shp links)
        // App share links are often short links that redirect to the full URL
        $resolvedUrl = $this->resolveRedirect($url);

        // Step 2 — Extract item ID from resolved URL
        // Supports formats:
        //   /products/product-name-i123456-s789.html
        //   /products/i123456-s789.html
        $itemId = $this->extractLazadaItemId($resolvedUrl);

        if (!$itemId) {
            return response()->json([
                'message' => 'Could not extract Lazada item ID from URL.',
                'url'     => $resolvedUrl,
            ], 422);
        }

        // Step 3 — Fetch product page HTML
        $response = Http::withHeaders([
            'User-Agent'      => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept'          => 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language' => 'en-US,en;q=0.5',
            'Accept-Encoding' => 'gzip, deflate, br',
        ])->timeout(15)->get($resolvedUrl);

        $body = $response->body();

        // Step 4 — Extract name and price from HTML
        $name  = $this->extractLazadaName($body);
        $price = $this->extractLazadaPrice($body);

        return response()->json([
            'name'  => $name  ?? 'Lazada Product',
            'price' => $price ?? 0,
        ]);
    }

    // ── Resolve redirect (for short links from Lazada app) ────────────────────
    private function resolveRedirect(string $url): string
    {
        try {
            // Follow redirects and get the final URL
            $response = Http::withHeaders([
                'User-Agent' => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
            ])->withOptions([
                'allow_redirects' => [
                    'max'             => 10,
                    'track_redirects' => true,
                ],
            ])->timeout(10)->get($url);

            // Get the final URL after redirects
            $redirects = $response->transferStats?->getHandlerStats();
            $finalUrl  = $response->effectiveUri()?->__toString()
                      ?? $redirects['url']
                      ?? $url;

            return $finalUrl;
        } catch (\Throwable $e) {
            return $url; // fallback to original
        }
    }

    // ── Extract Lazada item ID from URL ───────────────────────────────────────
    private function extractLazadaItemId(string $url): ?string
    {
        // Pattern 1: /products/some-name-i123456789-s987654.html
        if (preg_match('/-i(\d+)-s\d+\.html/i', $url, $m)) {
            return $m[1];
        }

        // Pattern 2: /products/i123456789-s987654.html
        if (preg_match('/\/i(\d+)-s\d+\.html/i', $url, $m)) {
            return $m[1];
        }

        // Pattern 3: itemId as query param (?itemId=123)
        $parsed = parse_url($url);
        if (!empty($parsed['query'])) {
            parse_str($parsed['query'], $params);
            if (!empty($params['itemId'])) {
                return $params['itemId'];
            }
        }

        return null;
    }

    // ── Extract name from Lazada HTML ─────────────────────────────────────────
    private function extractLazadaName(string $html): ?string
    {
        // Try JSON-LD first (most reliable)
        if (preg_match('/"name"\s*:\s*"([^"]{5,})"/', $html, $m)) {
            return html_entity_decode($m[1], ENT_QUOTES);
        }

        // Try og:title meta tag
        if (preg_match('/<meta[^>]+property=["\']og:title["\'][^>]+content=["\'](.*?)["\']/i', $html, $m)) {
            return html_entity_decode(trim($m[1]), ENT_QUOTES);
        }

        // Try title tag
        if (preg_match('/<title>(.*?)<\/title>/i', $html, $m)) {
            $title = trim($m[1]);
            // Remove " - Lazada Philippines" suffix
            $title = preg_replace('/\s*[-|]\s*Lazada.*$/i', '', $title);
            return html_entity_decode($title, ENT_QUOTES);
        }

        return null;
    }

    // ── Extract price from Lazada HTML ────────────────────────────────────────
    private function extractLazadaPrice(string $html): ?float
    {
        // Try JSON price format
        if (preg_match('/"price"\s*:\s*"?([\d.]+)"?/', $html, $m)) {
            return (float) $m[1];
        }

        // Try priceCurrency format
        if (preg_match('/"priceCurrency"\s*:\s*"PHP"\s*,\s*"price"\s*:\s*"?([\d.]+)"?/', $html, $m)) {
            return (float) $m[1];
        }

        // Try data-price attribute
        if (preg_match('/data-price=["\']?([\d.]+)["\']?/i', $html, $m)) {
            return (float) $m[1];
        }

        return null;
    }
}