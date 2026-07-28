<?php
// ============================================================
//  app/Http/Controllers/UserProfileController.php
//  Handle profile update and password change
//  Price and Stock Alert Application
// ============================================================

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class UserProfileController extends Controller
{
    // ── Update name and email ─────────────────────────────────────────────────
    public function updateProfile(Request $request)
    {
        $request->validate([
            'name'  => 'required|string|max:255',
            'email' => 'required|email|unique:users,email,' . $request->user()->id,
        ]);

        $user = $request->user();
        $user->update([
            'name'  => $request->name,
            'email' => $request->email,
        ]);

        return response()->json([
            'message' => 'Profile updated successfully.',
            'user'    => $user,
        ]);
    }

    // ── Change password ───────────────────────────────────────────────────────
    public function updatePassword(Request $request)
    {
        $request->validate([
            'current_password'      => 'required|string',
            'password'              => 'required|string|min:8|confirmed',
        ]);

        $user = $request->user();

        if (!Hash::check($request->current_password, $user->password)) {
            throw ValidationException::withMessages([
                'current_password' => ['Current password is incorrect.'],
            ]);
        }

        $user->update([
            'password' => Hash::make($request->password),
        ]);

        return response()->json([
            'message' => 'Password changed successfully.',
        ]);
    }
}