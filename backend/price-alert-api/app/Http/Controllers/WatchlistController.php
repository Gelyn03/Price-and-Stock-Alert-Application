<?php

// app/Http/Controllers/WatchlistController.php

namespace App\Http\Controllers;

use App\Models\Product;
use App\Models\WatchlistItem;
use App\Services\ProductScraperService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use App\Models\PriceHistory;
use Illuminate\Support\Str;
use App\Models\AdminActivityLog;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\Rule;

class WatchlistController extends Controller
{
    public function __construct(
        private ProductScraperService $scraper
    ) {}

    // ── Detect platform from URL ───────────────────────────────────────────────
    private function detectPlatform(string $url): ?string
    {
        $url = strtolower($url);

        $shopeePatterns = ['shopee.ph', 'shp.ee', 's.shopee.ph'];
        $lazadaPatterns = [
            'lazada.com.ph',
            's.lazada.com.ph',
            'm.lazada.com.ph',
            's.lazada',
            'lazada.com',
        ];

        if (str_contains($url, 'dummyjson.com/products')) return 'dummyjson';

        foreach ($shopeePatterns as $pattern) {
            if (str_contains($url, $pattern)) return 'shopee';
        }
        foreach ($lazadaPatterns as $pattern) {
            if (str_contains($url, $pattern)) return 'lazada';
        }

        return null;
    }

    // ── Resolve Lazada short URLs ──────────────────────────────────────────────
    private function resolveShortUrl(string $url): string
    {
        try {
            $response = Http::withHeaders([
                'User-Agent' => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
            ])->withOptions([
                'allow_redirects' => [
                    'max'             => 10,
                    'track_redirects' => true,
                ],
            ])->timeout(10)->get($url);

            $effectiveUri = $response->effectiveUri();
            if ($effectiveUri) {
                $resolved = (string) $effectiveUri;
                Log::info("Resolved short URL: {$url} → {$resolved}");
                return $resolved;
            }
        } catch (\Throwable $e) {
            Log::warning("Could not resolve short URL {$url}: " . $e->getMessage());
        }

        return $url;
    }

    // ── Fetch product data from DummyJSON API ──────────────────────────────────
    private function fetchDummyJsonProduct(string $url): array
    {
        try {
            preg_match('/dummyjson\.com\/products\/(\d+)/i', $url, $matches);
            $productId = $matches[1] ?? null;

            if (!$productId) return [];

            $response = Http::timeout(10)->get("https://dummyjson.com/products/{$productId}");

            if (!$response->ok()) return [];

            $data = $response->json();

            return [
                'name'      => $data['title']    ?? null,
                'price'     => $data['price']    ?? null,
                'image_url' => $data['thumbnail'] ?? null,
                'stock'     => $data['stock']    ?? null,
            ];
        } catch (\Throwable $e) {
            Log::warning("DummyJSON fetch failed for {$url}: " . $e->getMessage());
            return [];
        }
    }

    // ── Sanitize category — falls back to 'uncategorized' if invalid ──────────
    private function sanitizeCategory(?string $category): string
    {
        if (!$category) return 'uncategorized';
        return in_array($category, WatchlistItem::CATEGORIES, true)
            ? $category
            : 'uncategorized';
    }

    // ── GET /api/watchlist ─────────────────────────────────────────────────────
    public function index(Request $request): JsonResponse
    {
        $items = WatchlistItem::with('product')
            ->where('user_id', $request->user()->id)
            ->latest()
            ->get();

        return response()->json($items);
    }

    // ── POST /api/watchlist ────────────────────────────────────────────────────
    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'url'           => 'required|string',
            'name'          => 'nullable|string|max:150',
            'current_price' => 'nullable|numeric|min:0.01',
            'target_price'  => 'nullable|numeric|min:0.01',
            'category'      => ['nullable', 'string', Rule::in(WatchlistItem::CATEGORIES)],  // ← NEW
        ]);

        $url = trim($request->url);

        // ── Resolve Lazada short links before platform detection ───────────────
        if (
            str_contains(strtolower($url), 's.lazada.com.ph') ||
            str_contains(strtolower($url), 's.lazada.com.ph/s.')
        ) {
            $url = $this->resolveShortUrl($url);
        }

        if (!str_starts_with($url, 'http://') && !str_starts_with($url, 'https://')) {
            return response()->json([
                'message' => 'Please paste a valid product link starting with https://',
            ], 422);
        }

        $platform = $this->detectPlatform($url);

        if (!$platform) {
            return response()->json([
                'message' => 'Only Shopee, Lazada, and DummyJSON product links are supported.',
            ], 422);
        }

        $product = Product::where('url', $url)->first();

        if (!$product) {
            $scraped = [];

            if ($platform === 'dummyjson') {
                $scraped = $this->fetchDummyJsonProduct($url);
            } else {
                try {
                    $scraped = $this->scraper->scrape($url, $platform);
                } catch (\Throwable $e) {
                    Log::warning("Scraper failed for {$url}: " . $e->getMessage());
                }
            }

            $productName = trim($request->name ?? $scraped['name'] ?? '');
            if (empty($productName)) $productName = 'Unknown Product';

            $initialPrice = $request->current_price ?? $scraped['price'] ?? null;

            $product = Product::create([
                'name'            => $productName,
                'url'             => $url,
                'platform'        => $platform,
                'image_url'       => $scraped['image_url'] ?? null,
                'current_price'   => $initialPrice,
                'prev_price'      => $initialPrice,
                'stock_status'    => isset($scraped['stock']) && $scraped['stock'] > 0
                                        ? 'in_stock'
                                        : 'in_stock',
                'is_valid'        => true,
                'last_checked_at' => now(),
            ]);
        }

        if ($product) {
            $updates = [];
            if ($request->name && (empty($product->name) || $product->name === 'Unknown Product')) {
                $updates['name'] = trim($request->name);
            }
            if ($request->current_price && empty($product->current_price)) {
                $updates['current_price'] = $request->current_price;
                $updates['prev_price']    = $request->current_price;
                $updates['stock_status']  = 'in_stock';
            }
            if (!empty($updates)) {
                $product->update($updates);
                $product->refresh();
            }
        }

        $existing = WatchlistItem::where('user_id', $request->user()->id)
            ->where('product_id', $product->id)
            ->first();

        if ($existing) {
            return response()->json([
                'message' => 'This product is already in your watchlist.',
            ], 409);
        }

        $item = WatchlistItem::create([
            'user_id'      => $request->user()->id,
            'product_id'   => $product->id,
            'target_price' => $request->target_price,
            'category'     => $this->sanitizeCategory($request->category),  // ← NEW
        ]);

        if ($product->current_price) {
            PriceHistory::create([
                'product_id'   => $product->id,
                'price'        => $product->current_price,
                'stock_status' => $product->stock_status ?? 'in_stock',
                'recorded_at'  => now(),
            ]);
        }

        try {
            AdminActivityLog::create([
                'event_type' => 'watchlist_added',
                'title'      => 'Product added to watchlist',
                'message'    => "{$request->user()->name} added \"{$product->name}\" to their watchlist.",
                'user_id'    => $request->user()->id,
                'product_id' => $product->id,
            ]);
        } catch (\Throwable $e) {
            Log::warning('AdminActivityLog failed: ' . $e->getMessage());
        }

        return response()->json([
            'message' => 'Product added to watchlist successfully.',
            'data'    => $item->load('product'),
        ], 201);
    }

    // ── DELETE /api/watchlist/{id} ─────────────────────────────────────────────
    public function destroy(Request $request, int $id): JsonResponse
    {
        $item = WatchlistItem::where('id', $id)
            ->where('user_id', $request->user()->id)
            ->firstOrFail();

        $item->delete();

        return response()->json(['message' => 'Product removed from watchlist.']);
    }

    // ── PUT /api/watchlist/{id} ────────────────────────────────────────────────
    public function update(Request $request, int $id): JsonResponse
    {
        $request->validate([
            'name'         => 'sometimes|string|max:150',
            'url'          => 'sometimes|string',
            'target_price' => 'nullable|numeric|min:0.01',
            'category'     => ['sometimes', 'nullable', 'string', Rule::in(WatchlistItem::CATEGORIES)],  // ← NEW
        ]);

        $item = WatchlistItem::where('id', $id)
            ->where('user_id', $request->user()->id)
            ->firstOrFail();

        // ── Update watchlist item fields ───────────────────────────────────────
        $itemUpdates = [];

        if ($request->has('target_price')) {
            $itemUpdates['target_price'] = $request->target_price;
        }

        if ($request->has('category')) {                                          // ← NEW
            $itemUpdates['category'] = $this->sanitizeCategory($request->category);
        }

        if (!empty($itemUpdates)) {
            $item->update($itemUpdates);
        }

        // ── Update product fields ──────────────────────────────────────────────
        $productUpdates = [];

        if ($request->has('name') && !empty(trim($request->name))) {
            $productUpdates['name'] = trim($request->name);
        }

        if ($request->has('url') && !empty(trim($request->url))) {
            $newUrl = trim($request->url);

            if (!str_starts_with($newUrl, 'http://') && !str_starts_with($newUrl, 'https://')) {
                return response()->json([
                    'message' => 'Please paste a valid product link starting with https://',
                ], 422);
            }

            $platform = $this->detectPlatform($newUrl);
            if (!$platform) {
                return response()->json([
                    'message' => 'Only Shopee, Lazada, and DummyJSON product links are supported.',
                ], 422);
            }

            $productUpdates['url']      = $newUrl;
            $productUpdates['platform'] = $platform;
        }

        if (!empty($productUpdates)) {
            $item->product->update($productUpdates);
        }

        return response()->json([
            'message' => 'Watchlist item updated successfully.',
            'data'    => $item->load('product'),
        ]);
    }

    // ── PUT /api/watchlist/{id}/target-price ───────────────────────────────────
    public function updateTargetPrice(Request $request, int $id): JsonResponse
    {
        $request->validate([
            'target_price' => 'nullable|numeric|min:0.01',
        ]);

        $item = WatchlistItem::where('id', $id)
            ->where('user_id', $request->user()->id)
            ->firstOrFail();

        $item->update(['target_price' => $request->target_price]);

        return response()->json([
            'message' => 'Target price updated.',
            'data'    => $item,
        ]);
    }

    // ── PUT /api/watchlist/{id}/preferences ────────────────────────────────────
    public function updatePreferences(Request $request, int $id): JsonResponse
    {
        $request->validate([
            'notif_price_drop'   => 'sometimes|boolean',
            'notif_stock'        => 'sometimes|boolean',
            'notif_target_price' => 'sometimes|boolean',
        ]);

        $item = WatchlistItem::where('id', $id)
            ->where('user_id', $request->user()->id)
            ->firstOrFail();

        $item->update($request->only(
            'notif_price_drop',
            'notif_stock',
            'notif_target_price'
        ));

        return response()->json([
            'message' => 'Notification preferences updated.',
            'data'    => $item,
        ]);
    }

    // ── GET /api/watchlist/{id}/price-history ──────────────────────────────────
    public function priceHistory(Request $request, int $id): JsonResponse
    {
        $item = WatchlistItem::where('id', $id)
            ->where('user_id', $request->user()->id)
            ->firstOrFail();

        $history = $item->product
            ->priceHistories()
            ->latest('recorded_at')
            ->limit(7)
            ->get()
            ->reverse()
            ->values();

        return response()->json($history);
    }

    // ── POST /api/watchlist/share ──────────────────────────────────────────────
    public function generateShareToken(Request $request): JsonResponse
    {
        $user = $request->user();

        if (!$user->share_token) {
            $user->update(['share_token' => Str::uuid()->toString()]);
        }

        return response()->json([
            'share_token' => $user->share_token,
            'share_url'   => url('/api/watchlist/share/' . $user->share_token),
        ]);
    }

    // ── GET /api/watchlist/share/{token} ──────────────────────────────────────
    public function viewShared(string $token): JsonResponse
    {
        $user = \App\Models\User::where('share_token', $token)->firstOrFail();

        $items = WatchlistItem::with('product')
            ->where('user_id', $user->id)
            ->latest()
            ->get();

        return response()->json([
            'owner' => $user->name,
            'data'  => $items,
        ]);
    }
}