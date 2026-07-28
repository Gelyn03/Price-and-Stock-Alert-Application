<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class UpdateUserLastSeen
{
    /**
     * Trabaho nito na i-record ang huling oras na nag-request ang user.
     */
    public function handle(Request $request, Closure $next): Response
    {
        // I-check kung ang tumatawag sa API ay naka-login
        if (Auth::check()) {
            // I-update ang timestamp sa database (last_seen_at column)
            // Ginagamit ang 'quietly' para hindi mag-update ang 'updated_at' column
            Auth::user()->updateQuietly([
                'last_seen_at' => now(),
            ]);
        }

        return $next($request);
    }
}