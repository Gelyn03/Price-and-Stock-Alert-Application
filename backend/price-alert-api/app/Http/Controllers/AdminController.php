<?php

// app/Http/Controllers/AdminController.php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\Product;
use App\Models\Notification;
use App\Models\WatchlistItem;
use App\Models\MonitoringLog;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Carbon\Carbon;
use App\Models\AdminActivityLog;

class AdminController extends Controller
{
    // ── POST /api/admin/profile/photo ─────────────────────────────────────────
    public function uploadProfilePhoto(Request $request): JsonResponse
    {
        $request->validate([
            'profile_photo' => 'required|image|mimes:jpeg,png,jpg,webp|max:2048',
        ]);

        $admin = $request->user();

        if ($admin->profile_photo) {
            \Storage::disk('public')->delete($admin->profile_photo);
        }

        $path = $request->file('profile_photo')->store('profile-photos', 'public');
        $admin->update(['profile_photo' => $path]);

        return response()->json([
            'message'           => 'Profile photo updated successfully.',
            'profile_photo_url' => $admin->profile_photo_url,
        ]);
    }

    // ── GET /api/admin/dashboard ──────────────────────────────────────────────
    public function dashboard(Request $request): JsonResponse
    {
        $month = (int) $request->query('month', now()->month);
        $year  = (int) $request->query('year',  now()->year);

        $startOfMonth = Carbon::createFromDate($year, $month, 1)->startOfDay();
        $endOfMonth   = $startOfMonth->copy()->endOfMonth()->endOfDay();
        $endDate      = $endOfMonth->gt(now()) ? now()->endOfDay() : $endOfMonth;

        $activity_labels = [];
        $activity_counts = [];

        $cursor = $startOfMonth->copy();
        while ($cursor->lte($endDate)) {
            $activity_labels[] = $cursor->format('j');

            $count = User::where('role', 'user')
                         ->whereDate('last_login_at', $cursor->toDateString())
                         ->count();

            $activity_counts[] = (int) $count;
            $cursor->addDay();
        }

        return response()->json([
            'total_users'           => (int) User::where('role', 'user')->count(),
            'active_users'          => (int) User::where('role', 'user')->where('is_active', true)->count(),
            'inactive_users'        => (int) User::where('role', 'user')->where('is_active', false)->count(),
            'total_products'        => (int) Product::count(),
            'valid_products'        => (int) Product::where('is_valid', true)->count(),
            'invalid_products'      => (int) Product::where('is_valid', false)->count(),
            'total_watchlist_items' => (int) WatchlistItem::count(),
            'total_notifications'   => (int) Notification::count(),
            'activity_labels'       => $activity_labels,
            'activity_counts'       => $activity_counts,
        ]);
    }

    // ── GET /api/admin/dashboard/platform-stats ───────────────────────────────
    public function platformStats(Request $request): JsonResponse
    {
        $year = (int) $request->query('year', now()->year);

        $rows = DB::table('products')
            ->selectRaw("
                DATE_FORMAT(created_at, '%b') AS month,
                MONTH(created_at)             AS month_num,
                SUM(CASE WHEN platform = 'shopee' THEN 1 ELSE 0 END) AS shopee,
                SUM(CASE WHEN platform = 'lazada' THEN 1 ELSE 0 END) AS lazada
            ")
            ->whereYear('created_at', $year)
            ->groupBy('month', 'month_num')
            ->orderBy('month_num')
            ->get()
            ->keyBy('month');

        $allMonths      = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        $platform_stats = [];

        foreach ($allMonths as $m) {
            $row              = $rows->get($m);
            $platform_stats[] = [
                'month'  => $m,
                'shopee' => $row ? (int) $row->shopee : 0,
                'lazada' => $row ? (int) $row->lazada : 0,
            ];
        }

        return response()->json([
            'year'           => $year,
            'platform_stats' => $platform_stats,
        ]);
    }

    // ── GET /api/admin/users ──────────────────────────────────────────────────
    public function users(Request $request): JsonResponse
    {
        $users = User::withCount(['watchlistItems', 'notifications'])
            ->latest()
            ->paginate(20);

        return response()->json($users);
    }

    // ── GET /api/admin/users/{id}/activity ───────────────────────────────────
    public function userActivity(int $id): JsonResponse
    {
        $user = User::withCount(['watchlistItems', 'notifications'])->findOrFail($id);

        $recentWatchlist = WatchlistItem::where('user_id', $id)
            ->with('product:id,name,current_price,platform,stock_status')
            ->latest()
            ->take(5)
            ->get()
            ->map(fn($item) => [
                'name'          => $item->product->name          ?? 'Unknown',
                'current_price' => $item->product->current_price ?? 0,
                'platform'      => $item->product->platform      ?? 'Unknown',
                'stock_status'  => $item->product->stock_status  ?? 'Unknown',
            ]);

        $sharedWatchlists      = $user->share_token ? 1 : 0;
        $notificationsReceived = Notification::where('user_id', $id)->count();

        $lastNotif     = Notification::where('user_id', $id)->latest()->first();
        $lastWatchlist = WatchlistItem::where('user_id', $id)->latest()->first();

        $lastActiveDate = null;
        if ($lastNotif && $lastWatchlist) {
            $lastActiveDate = $lastNotif->created_at->gt($lastWatchlist->created_at)
                ? $lastNotif->created_at : $lastWatchlist->created_at;
        } elseif ($lastNotif)     { $lastActiveDate = $lastNotif->created_at; }
        elseif ($lastWatchlist)   { $lastActiveDate = $lastWatchlist->created_at; }
        else                      { $lastActiveDate = $user->updated_at; }

        return response()->json([
            'watchlist_count'        => $user->watchlist_items_count,
            'notifications_received' => $notificationsReceived,
            'shared_watchlists'      => $sharedWatchlists,
            'last_active'            => $lastActiveDate?->toDateString() ?? 'N/A',
            'recent_watchlist'       => $recentWatchlist,
        ]);
    }

    // ── PUT /api/admin/users/{id} ─────────────────────────────────────────────
    // Edit user: name, email, role, and optionally reset password.
    // Admins cannot have their role changed by this endpoint for safety.
    public function updateUser(Request $request, int $id): JsonResponse
    {
        $user = User::findOrFail($id);

        $request->validate([
            'name'                  => 'required|string|max:255',
            'email'                 => ['required', 'email', Rule::unique('users', 'email')->ignore($id)],
            'role'                  => 'sometimes|in:user,moderator,admin',
            'password'              => 'sometimes|nullable|min:8|confirmed',
            'password_confirmation' => 'sometimes|nullable',
        ]);

        $data = [
            'name'  => $request->name,
            'email' => $request->email,
        ];

        // Role change — guard: cannot demote an admin via this endpoint
        if ($request->has('role') && !($user->isAdmin() && $request->role !== 'admin')) {
            $data['role'] = $request->role;
        }

        // Optional password reset
        if ($request->filled('password')) {
            $data['password'] = Hash::make($request->password);
        }

        $user->update($data);

        return response()->json([
            'message' => 'User updated successfully.',
            'data'    => $user->fresh(),
        ]);
    }

    // ── PATCH /api/admin/users/{id}/toggle-status ────────────────────────────
    public function toggleUserStatus(int $id): JsonResponse
    {
        $user = User::findOrFail($id);

        if ($user->isAdmin()) {
            return response()->json(['message' => 'Cannot deactivate an admin account.'], 403);
        }

        $user->update(['is_active' => !$user->is_active]);
        $status = $user->is_active ? 'activated' : 'deactivated';

        return response()->json([
            'message'   => "User {$status} successfully.",
            'is_active' => $user->is_active,
        ]);
    }

    // ── DELETE /api/admin/users/{id} ─────────────────────────────────────────
    public function deleteUser(int $id): JsonResponse
    {
        $user = User::findOrFail($id);

        if ($user->isAdmin()) {
            return response()->json(['message' => 'Cannot delete an admin account.'], 403);
        }

        $user->delete();

        return response()->json(['message' => 'User deleted successfully.']);
    }

    // ── GET /api/admin/products ───────────────────────────────────────────────
    public function products(Request $request): JsonResponse
    {
        $products = Product::withCount('watchlistItems')->latest()->paginate(20);
        return response()->json($products);
    }

    // ── PATCH /api/admin/products/{id}/flag ──────────────────────────────────
    public function flagProduct(int $id): JsonResponse
    {
        $product = Product::findOrFail($id);
        $product->update(['is_valid' => false]);
        return response()->json(['message' => 'Product flagged as invalid.', 'data' => $product]);
    }

    // ── PATCH /api/admin/products/{id}/restore ───────────────────────────────
    public function restoreProduct(int $id): JsonResponse
    {
        $product = Product::findOrFail($id);
        $product->update(['is_valid' => true, 'stock_status' => 'in_stock']);
        return response()->json(['message' => 'Product restored.', 'data' => $product]);
    }

    // ── POST /api/admin/products/{id}/validate-url ───────────────────────────
    public function validateProductUrl(int $id): JsonResponse
    {
        $product = Product::findOrFail($id);
        $url     = $product->url;

        if (!$url) {
            return response()->json(['message' => 'No URL to validate.', 'is_valid' => false], 422);
        }

        try {
            $response    = Http::timeout(10)->withHeaders(['User-Agent' => 'Mozilla/5.0'])->head($url);
            $isReachable = $response->successful() || $response->status() === 405;
            return response()->json([
                'is_valid'    => $isReachable,
                'status_code' => $response->status(),
                'message'     => $isReachable ? 'URL is reachable.' : 'URL returned an error.',
                'url'         => $url,
            ]);
        } catch (\Exception $e) {
            return response()->json(['is_valid' => false, 'message' => 'Could not reach URL.', 'url' => $url]);
        }
    }

    // ── PUT /api/admin/products/{id}/validate ────────────────────────────────
    public function validateProduct(Request $request, int $id): JsonResponse
    {
        $request->validate(['is_valid' => 'required|boolean']);
        $product = Product::findOrFail($id);
        $product->update(['is_valid' => $request->is_valid]);
        return response()->json([
            'message' => $request->is_valid ? 'Product marked as valid.' : 'Product flagged as invalid.',
            'data'    => $product,
        ]);
    }

    // ── DELETE /api/admin/products/{id} ──────────────────────────────────────
    public function deleteProduct(int $id): JsonResponse
    {
        Product::findOrFail($id)->delete();
        return response()->json(['message' => 'Product removed.']);
    }

    // ── GET /api/admin/notifications ─────────────────────────────────────────
public function notifications(Request $request): JsonResponse
{
    $notifications = Notification::with(['user:id,name,email', 'product:id,name'])
    ->latest()
    ->get()
    ->map(fn($n) => [
        'id'           => $n->id,
        'type'         => $n->type,
        'message'      => $n->message,
        'channel'      => $n->channel,
        'status'       => $n->is_read ? 'Read' : 'Unread',
        'product_name' => $n->product->name  ?? null,
        'user_name'    => $n->user->name     ?? null,
        'user_email'   => $n->user->email    ?? null,
        'created_at'   => $n->created_at,
    ]);

return response()->json(['data' => $notifications]);
}

// ── PATCH /api/admin/notifications/{id}/read ─────────────────────────────
public function markNotificationRead(int $id): JsonResponse
{
    $notif = Notification::findOrFail($id);
    $notif->update(['is_read' => true]);

    return response()->json([
        'message' => 'Notification marked as read.',
        'data'    => $notif,
    ]);
}

// ── PATCH /api/admin/notifications/read-all ──────────────────────────────
public function markAllNotificationsRead(): JsonResponse
{
    Notification::where('is_read', false)->update(['is_read' => true]);

    return response()->json(['message' => 'All notifications marked as read.']);
}

// ── DELETE /api/admin/notifications/{id} ─────────────────────────────────
public function deleteNotification(int $id): JsonResponse
{
    Notification::findOrFail($id)->delete();

    return response()->json(['message' => 'Notification deleted.']);
}

// ── DELETE /api/admin/notifications ──────────────────────────────────────
public function deleteAllNotifications(): JsonResponse
{
    Notification::query()->delete();

    return response()->json(['message' => 'All notifications deleted.']);
}

    // ── GET /api/admin/monitoring-logs ───────────────────────────────────────
    public function monitoringLogs(Request $request): JsonResponse
    {
        $logs = MonitoringLog::with('product')
            ->latest()->limit(100)->get()
            ->map(fn($log) => [
                'id'           => $log->id,
                'event_type'   => $log->event_type,
                'product_id'   => $log->product_id,
                'product_name' => $log->product_name,
                'platform'     => $log->platform,
                'message'      => $log->message,
                'items_count'  => $log->items_count,
                'timestamp'    => $log->created_at,
                'created_at'   => $log->created_at,
            ]);

        return response()->json(['logs' => $logs]);
    }

    // ── DELETE /api/admin/monitoring-logs/{id} ────────────────────────────────
    public function deleteMonitoringLog(int $id): JsonResponse
    {
        MonitoringLog::findOrFail($id)->delete();
 
        return response()->json(['message' => 'Log deleted successfully.']);
    }
 
    // ── DELETE /api/admin/monitoring-logs ─────────────────────────────────────
    // Pass { "ids": [1,2,3] } to delete specific logs, or no body to delete ALL.
    public function bulkDeleteMonitoringLogs(Request $request): JsonResponse
    {
        $ids = $request->input('ids');
 
        if (!empty($ids) && is_array($ids)) {
            $deleted = MonitoringLog::whereIn('id', $ids)->delete();
        } else {
            $deleted = MonitoringLog::query()->delete();
        }
 
        return response()->json([
            'message' => 'Logs cleared successfully.',
            'deleted' => $deleted,
        ]);
    }

    // ── GET /api/admin/scheduler-status ──────────────────────────────────────
    public function schedulerStatus(): JsonResponse
    {
        $totalProducts   = Product::count();
        $validProducts   = Product::where('is_valid', true)->count();
        $invalidProducts = Product::where('is_valid', false)->count();
        $lastRun         = Cache::get('scheduler_last_run');
        $nextRun         = Cache::get('scheduler_next_run');

        $nextRunInSeconds = null;
        if ($nextRun) {
            $nextRunInSeconds = max(0, now()->diffInSeconds(Carbon::parse($nextRun), false));
        } elseif ($lastRun) {
            $elapsed          = now()->diffInSeconds(Carbon::parse($lastRun));
            $nextRunInSeconds = max(0, (30 * 60) - $elapsed);
        }

        return response()->json([
            'status'              => 'running',
            'is_running'          => true,
            'last_run_at'         => $lastRun,
            'next_run_at'         => $nextRun,
            'next_run_in_seconds' => $nextRunInSeconds,
            'products_count'      => $totalProducts,
            'stats'               => [
                'total_monitored' => $totalProducts,
                'valid'           => $validProducts,
                'invalid'         => $invalidProducts,
            ],
        ]);
    }

    // ── GET /api/admin/bell-notifications ─────────────────────────────────────
public function bellNotifications(): JsonResponse
{
    $logs = AdminActivityLog::with(['user:id,name,email', 'product:id,name'])
        ->latest()
        ->take(10)
        ->get()
        ->map(fn($log) => [
            'id'           => $log->id,
            'event_type'   => $log->event_type,
            'title'        => $log->title,
            'message'      => $log->message,
            'is_read'      => $log->is_read,
            'user_name'    => $log->user?->name,
            'product_name' => $log->product?->name,
            'created_at'   => $log->created_at,
        ]);

    $unread_count = AdminActivityLog::where('is_read', false)->count();

    return response()->json([
        'notifications' => $logs,
        'unread_count'  => $unread_count,
    ]);
}

// ── PATCH /api/admin/bell-notifications/read-all ──────────────────────────
public function markBellNotificationsRead(): JsonResponse
{
    AdminActivityLog::where('is_read', false)->update(['is_read' => true]);
    return response()->json(['message' => 'All marked as read.']);
}

// ── DELETE /admin/bell-notifications/clear-all ─────────────────────────────
public function clearAllBellNotifications(): JsonResponse
{
    AdminActivityLog::truncate();
    return response()->json(['message' => 'All bell notifications cleared.']);
}
}