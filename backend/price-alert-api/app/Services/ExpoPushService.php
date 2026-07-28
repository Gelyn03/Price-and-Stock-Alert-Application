<?php

// app/Services/ExpoPushService.php
// Sends push notifications to users via the Expo Push Notification Service

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class ExpoPushService
{
    private string $url;

    public function __construct()
    {
        $this->url = config('services.expo.push_url', 'https://exp.host/--/api/v2/push/send');
    }

    /**
     * Send a single push notification.
     */
    public function send(string $expoPushToken, string $title, string $body, array $data = []): bool
    {
        if (! $expoPushToken || ! str_starts_with($expoPushToken, 'ExponentPushToken')) {
            Log::warning("Invalid Expo push token: {$expoPushToken}");
            return false;
        }

        try {
            $response = Http::withHeaders([
                'Accept'       => 'application/json',
                'Content-Type' => 'application/json',
            ])->post($this->url, [
                'to'    => $expoPushToken,
                'title' => $title,
                'body'  => $body,
                'data'  => $data,
                'sound' => 'default',
                'badge' => 1,
            ]);

            if ($response->successful()) {
                $result = $response->json('data');
                if (isset($result['status']) && $result['status'] === 'error') {
                    Log::error('Expo push error: ' . $result['message']);
                    return false;
                }
                return true;
            }

            Log::error('Expo push HTTP error: ' . $response->status());
            return false;

        } catch (\Throwable $e) {
            Log::error('Expo push exception: ' . $e->getMessage());
            return false;
        }
    }

    /**
     * Send to multiple tokens at once (batch).
     */
    public function sendBatch(array $messages): void
    {
        try {
            Http::withHeaders([
                'Accept'       => 'application/json',
                'Content-Type' => 'application/json',
            ])->post($this->url, $messages);
        } catch (\Throwable $e) {
            Log::error('Expo push batch exception: ' . $e->getMessage());
        }
    }
}