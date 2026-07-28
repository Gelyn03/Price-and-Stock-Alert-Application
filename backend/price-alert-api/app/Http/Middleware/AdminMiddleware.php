<?php

// app/Http/Middleware/AdminMiddleware.php
// Restricts routes to admin users only

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class AdminMiddleware
{
    public function handle(Request $request, Closure $next): Response
    {
        if (! $request->user() || ! $request->user()->isAdmin()) {
            return response()->json([
                'message' => 'Access denied. Admin privileges required.',
            ], 403);
        }

        return $next($request);
    }
}