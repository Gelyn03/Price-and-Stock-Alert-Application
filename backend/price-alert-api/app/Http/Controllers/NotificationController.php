<?php

// app/Http/Controllers/NotificationController.php

namespace App\Http\Controllers;

use App\Models\Notification;
use App\Models\WatchlistItem;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class NotificationController extends Controller
{
    // ── GET /api/notifications ─────────────────────────────────────────────────
    public function index(Request $request): JsonResponse
{
    $notifications = Notification::with('product')
        ->where('user_id', $request->user()->id)
        ->latest()
        ->get();  // ← PALITAN ng get() para makuha lahat

    return response()->json(['data' => $notifications]);
}
    // ── PUT /api/notifications/{id}/read ──────────────────────────────────────
    public function markAsRead(Request $request, int $id): JsonResponse
    {
        $notification = Notification::where('id', $id)
            ->where('user_id', $request->user()->id)
            ->firstOrFail();

        $notification->update(['is_read' => true]);

        return response()->json(['message' => 'Marked as read.']);
    }

    // ── PUT /api/notifications/read-all ───────────────────────────────────────
    public function markAllAsRead(Request $request): JsonResponse
    {
        Notification::where('user_id', $request->user()->id)
            ->where('is_read', false)
            ->update(['is_read' => true]);

        return response()->json(['message' => 'All notifications marked as read.']);
    }

    // ── GET /api/notifications/unread-count ───────────────────────────────────
    public function unreadCount(Request $request): JsonResponse
    {
        $count = Notification::where('user_id', $request->user()->id)
            ->where('is_read', false)
            ->count();

        return response()->json(['count' => $count]);
    }

    // ── GET /api/notifications/preferences ────────────────────────────────────
    // Returns the user's current global notification preferences
    // Based on majority of their watchlist items' settings
    public function getGlobalPrefs(Request $request): JsonResponse
    {
        $user  = $request->user();
        $items = WatchlistItem::where('user_id', $user->id)->get();

        if ($items->isEmpty()) {
            // No watchlist items — return defaults
            return response()->json([
                'notif_price_drop'   => true,
                'notif_target_price' => true,
                'notif_stock'        => false,
                'enable_all'         => true,
            ]);
        }

        // Use the first item's settings as the "current global" preference
        // (or majority vote if you prefer)
        $first = $items->first();

        return response()->json([
            'notif_price_drop'   => (bool) $first->notif_price_drop,
            'notif_target_price' => (bool) $first->notif_target_price,
            'notif_stock'        => (bool) $first->notif_stock,
            'enable_all'         => true,
        ]);
    }

    // ── PUT /api/notifications/preferences ────────────────────────────────────
    // Updates the user's GLOBAL notification preferences
    // Applies to ALL watchlist items for this user
    public function updateGlobalPrefs(Request $request): JsonResponse
    {
        $request->validate([
            'notif_price_drop'   => 'sometimes|boolean',
            'notif_target_price' => 'sometimes|boolean',
            'notif_stock'        => 'sometimes|boolean',
            'enable_all'         => 'sometimes|boolean',
        ]);

        $user    = $request->user();
        $updates = [];

        if ($request->has('notif_price_drop')) {
            $updates['notif_price_drop'] = $request->notif_price_drop;
        }
        if ($request->has('notif_target_price')) {
            $updates['notif_target_price'] = $request->notif_target_price;
        }
        if ($request->has('notif_stock')) {
            $updates['notif_stock'] = $request->notif_stock;
        }

        // If enable_all is false — turn off ALL preferences for all items
        if ($request->has('enable_all') && !$request->enable_all) {
            $updates = [
                'notif_price_drop'   => false,
                'notif_target_price' => false,
                'notif_stock'        => false,
            ];
        }

        if (!empty($updates)) {
            WatchlistItem::where('user_id', $user->id)->update($updates);
        }

        return response()->json([
            'message' => 'Global notification preferences updated successfully.',
        ]);
    }
}