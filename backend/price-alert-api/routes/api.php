<?php

// routes/api.php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\WatchlistController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\AdminController;

// ── PUBLIC ROUTES ─────────────────────────────────────────────────────────────
Route::post('/register',         [AuthController::class, 'register']);
Route::post('/login',            [AuthController::class, 'login']);
Route::post('/forgot-password',  [AuthController::class, 'forgotPassword']);
Route::post('/reset-password',   [AuthController::class, 'resetPassword']);
Route::post('/verify-email',         [AuthController::class, 'verifyEmail']);
Route::post('/resend-verification',  [AuthController::class, 'resendVerification']);

Route::get('/watchlist/share/{token}', [WatchlistController::class, 'viewShared']);

// ── PROTECTED ROUTES ──────────────────────────────────────────────────────────
Route::middleware('auth:sanctum')->group(function () {

    // ── Auth ──────────────────────────────────────────────────────────────────
    Route::post('/logout',               [AuthController::class, 'logout']);
    Route::get('/profile',               [AuthController::class, 'profile']);
    Route::put('/profile',               [AuthController::class, 'updateProfile']);
    Route::put('/profile/password',      [AuthController::class, 'updatePassword']);
    Route::put('/profile/push-token',    [AuthController::class, 'savePushToken']);
    Route::post('/ping',                 [AuthController::class, 'ping']);

    // ── Watchlist ─────────────────────────────────────────────────────────────
    Route::get('/watchlist',                         [WatchlistController::class, 'index']);
    Route::post('/watchlist',                        [WatchlistController::class, 'store']);
    Route::delete('/watchlist/{id}',                 [WatchlistController::class, 'destroy']);
    Route::put('/watchlist/{id}/target-price',       [WatchlistController::class, 'updateTargetPrice']);
    Route::put('/watchlist/{id}/preferences',        [WatchlistController::class, 'updatePreferences']);
    Route::get('/watchlist/{id}/price-history',      [WatchlistController::class, 'priceHistory']);
    Route::post('/watchlist/share',                  [WatchlistController::class, 'generateShareToken']);
    Route::put('/watchlist/{id}',                    [WatchlistController::class, 'update']);

    // ── Notifications ─────────────────────────────────────────────────────────
    Route::get('/notifications',                     [NotificationController::class, 'index']);
    Route::get('/notifications/unread-count',        [NotificationController::class, 'unreadCount']);
    Route::put('/notifications/read-all',            [NotificationController::class, 'markAllAsRead']);
    Route::put('/notifications/{id}/read',           [NotificationController::class, 'markAsRead']);
    Route::get('/notifications/preferences',         [NotificationController::class, 'getGlobalPrefs']);
    Route::put('/notifications/preferences',         [NotificationController::class, 'updateGlobalPrefs']);
    Route::delete('/notifications/{id}',             [NotificationController::class, 'destroy']);

    // ── Admin Routes ──────────────────────────────────────────────────────────
    Route::middleware('admin')->prefix('admin')->group(function () {
        Route::get('/dashboard',                    [AdminController::class, 'dashboard']);
        Route::get('/dashboard/platform-stats',     [AdminController::class, 'platformStats']);
        Route::post('/profile/photo',               [AdminController::class, 'uploadProfilePhoto']);
        Route::get('/bell-notifications',            [AdminController::class, 'bellNotifications']);
        Route::patch('/bell-notifications/read-all', [AdminController::class, 'markBellNotificationsRead']);
        Route::delete('/bell-notifications/clear-all', [AdminController::class, 'clearAllBellNotifications']);
        // Users
        Route::get('/users',                        [AdminController::class, 'users']);
        Route::get('/users/{id}/activity',          [AdminController::class, 'userActivity']);
        Route::put('/users/{id}',                   [AdminController::class, 'updateUser']);
        Route::patch('/users/{id}/toggle-status',   [AdminController::class, 'toggleUserStatus']);
        Route::delete('/users/{id}',                [AdminController::class, 'deleteUser']);

        // Products
        Route::get('/products',                     [AdminController::class, 'products']);
        Route::patch('/products/{id}/flag',         [AdminController::class, 'flagProduct']);
        Route::patch('/products/{id}/restore',      [AdminController::class, 'restoreProduct']);
        Route::post('/products/{id}/validate-url',  [AdminController::class, 'validateProductUrl']);
        Route::put('/products/{id}/validate',       [AdminController::class, 'validateProduct']);
        Route::delete('/products/{id}',             [AdminController::class, 'deleteProduct']);

        // Notifications CRUD ← dapat nandito, inside admin group!
        Route::get('/notifications',                [AdminController::class, 'notifications']);
        Route::patch('/notifications/read-all',     [AdminController::class, 'markAllNotificationsRead']);
        Route::patch('/notifications/{id}/read',    [AdminController::class, 'markNotificationRead']);
        Route::delete('/notifications',             [AdminController::class, 'deleteAllNotifications']);
        Route::delete('/notifications/{id}',        [AdminController::class, 'deleteNotification']);

        // Other
        Route::get('/monitoring-logs',              [AdminController::class, 'monitoringLogs']);
        Route::delete('/monitoring-logs/{id}',      [AdminController::class, 'deleteMonitoringLog']);
        Route::delete('/monitoring-logs',           [AdminController::class, 'bulkDeleteMonitoringLogs']);
        Route::get('/scheduler-status',             [AdminController::class, 'schedulerStatus']);
    });
});