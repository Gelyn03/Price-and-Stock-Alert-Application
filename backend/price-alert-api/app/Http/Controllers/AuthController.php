<?php

// app/Http/Controllers/AuthController.php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Carbon\Carbon;
use App\Models\AdminActivityLog;
use Illuminate\Auth\Events\Registered;

class AuthController extends Controller
{
    // ── POST /api/register ─────────────────────────────────────────────────────
    public function register(Request $request): JsonResponse
    {
        $request->validate([
            'name'     => 'required|string|max:255',
            'email'    => 'required|email|unique:users,email',
            'password' => 'required|string|min:8|confirmed',
        ]);

        $verificationCode = strtoupper(Str::random(6));

        $user = User::create([
            'name'                 => $request->name,
            'email'                => $request->email,
            'password'             => Hash::make($request->password),
            'role'                 => 'user',
            'is_active'            => true,
            'email_verified_at'    => null,
            'verification_code'    => Hash::make($verificationCode),
            'verification_sent_at' => now(),
        ]);

        Mail::send([], [], function ($mail) use ($user, $verificationCode) {
            $mail->to($user->email)
                ->subject('Verify Your Email — Price and Stock Alert')
                ->html("
                    <div style='font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px;'>
                        <div style='background:#0F4C81;padding:24px;border-radius:12px 12px 0 0;text-align:center;'>
                            <h2 style='color:white;margin:0;'>Price and Stock Alert</h2>
                        </div>
                        <div style='background:#fff;padding:32px;border-radius:0 0 12px 12px;border:1px solid #e2e8f0;'>
                            <h3 style='color:#1e293b;'>Verify Your Email Address</h3>
                            <p style='color:#64748b;'>Hi <strong>{$user->name}</strong>, thank you for registering!</p>
                            <p style='color:#64748b;'>Enter the code below to verify your email:</p>
                            <div style='background:#f0f4f8;border-radius:12px;padding:24px;text-align:center;margin:24px 0;'>
                                <span style='font-size:36px;font-weight:bold;letter-spacing:8px;color:#0F4C81;font-family:monospace;'>
                                    {$verificationCode}
                                </span>
                            </div>
                            <p style='color:#64748b;'>This code expires in <strong>15 minutes</strong>.</p>
                            <p style='color:#94a3b8;font-size:12px;'>If you did not create an account, please ignore this email.</p>
                        </div>
                    </div>
                ");
        });

        AdminActivityLog::create([
            'event_type' => 'user_registered',
            'title'      => 'New user registered',
            'message'    => "{$user->name} ({$user->email}) just created an account.",
            'user_id'    => $user->id,
        ]);

        return response()->json([
            'message' => 'Registration successful. Please check your email for the verification code.',
            'email'   => $user->email,
        ], 201);
    }

    // ── PUT /api/admin/users/{id}/toggle-status ────────────────────────────────
    public function toggleStatus(Request $request, $id): JsonResponse
    {
        $request->validate([
            'reason' => 'nullable|string|max:255',
        ]);

        $user     = User::findOrFail($id);
        $isActive = $user->isActive();

        $user->update([
            'is_active'           => !$isActive,
            'deactivation_reason' => $isActive
                ? ($request->reason ?? 'No reason provided.')
                : null,
        ]);

        return response()->json([
            'message' => $isActive ? 'User deactivated.' : 'User activated.',
            'user'    => $user->fresh(),
        ]);
    }

    // ── POST /api/login ────────────────────────────────────────────────────────
    public function login(Request $request): JsonResponse
    {
        $request->validate([
            'email'    => 'required|email',
            'password' => 'required|string',
            'source'   => 'nullable|string',
        ]);

        $user = User::where('email', $request->email)->first();

        if (!$user) {
            return response()->json(['message' => 'The provided credentials are incorrect.'], 401);
        }

        // ── STEP 1: Check password first ───────────────────────────────────────
        // Do this before any other check so we don't leak account status
        // to someone who doesn't know the password.
        if (!Hash::check($request->password, $user->password)) {
            $user->increment('login_attempts');
            $attemptsLeft = 3 - $user->login_attempts;

            if ($user->login_attempts >= 3) {
                $user->update(['login_attempts' => 0]);
                return response()->json(['message' => 'Too many failed attempts. Please try again later.'], 429);
            }

            return response()->json([
                'message'       => "Incorrect password. {$attemptsLeft} attempt(s) remaining.",
                'attempts_left' => $attemptsLeft,
            ], 401);
        }


        // ── STEP 3: Check if account is deactivated ────────────────────────────
        // Uses isActive() helper from User model which correctly treats
        // null as active — only explicitly deactivated accounts (is_active = 0)
        // are blocked here.
        if (!$user->isActive()) {
            return response()->json([
                'message' => 'Your account has been deactivated. Please contact support.',
                'reason'  => $user->deactivation_reason ?? null,
            ], 403);
        }

        // ── STEP 4: Block admin login on user-facing screens ───────────────────
        $source = $request->input('source');
        if ($user->role === 'admin' && $source !== 'admin-panel') {
            return response()->json([
                'message' => 'Admin access is restricted. Please use the Admin Panel to log in.',
            ], 403);
        }

        // ── STEP 5: Successful login ───────────────────────────────────────────
        $user->update([
            'login_attempts' => 0,
            'locked_until'   => null,
            'last_login_at'  => now(),
        ]);

        AdminActivityLog::create([
            'event_type' => 'user_logged_in',
            'title'      => 'User logged in',
            'message'    => "{$user->name} ({$user->email}) logged in.",
            'user_id'    => $user->id,
        ]);

        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'message' => 'Login successful.',
            'token'   => $token,
            'user'    => $user,
        ]);
    }

    // ── POST /api/logout ───────────────────────────────────────────────────────
    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();
        return response()->json(['message' => 'Logged out successfully.']);
    }

    // ── GET /api/profile ───────────────────────────────────────────────────────
    public function profile(Request $request): JsonResponse
    {
        return response()->json(['user' => $request->user()]);
    }

    // ── PUT /api/profile ───────────────────────────────────────────────────────
    public function updateProfile(Request $request): JsonResponse
    {
        $user = $request->user();

        $request->validate([
            'name'  => 'sometimes|string|max:255',
            'email' => 'sometimes|email|unique:users,email,' . $user->id,
        ]);

        $user->update($request->only('name', 'email'));

        return response()->json([
            'message' => 'Profile updated successfully.',
            'user'    => $user->fresh(),
        ]);
    }

    // ── PUT /api/profile/password ──────────────────────────────────────────────
    public function updatePassword(Request $request): JsonResponse
    {
        $request->validate([
            'current_password' => 'required|string',
            'password'         => 'required|string|min:8|confirmed',
        ]);

        $user = $request->user();

        if (!Hash::check($request->current_password, $user->password)) {
            return response()->json(['message' => 'Current password is incorrect.'], 422);
        }

        $user->update(['password' => Hash::make($request->password)]);

        return response()->json(['message' => 'Password changed successfully.']);
    }

    // ── PUT /api/profile/push-token ────────────────────────────────────────────
    public function savePushToken(Request $request): JsonResponse
    {
        $request->validate(['expo_push_token' => 'required|string']);

        $request->user()->update(['expo_push_token' => $request->expo_push_token]);

        return response()->json(['message' => 'Push token saved.']);
    }

    // ── POST /api/forgot-password ──────────────────────────────────────────────
    public function forgotPassword(Request $request): JsonResponse
    {
        $request->validate(['email' => 'required|email']);

        $user = User::where('email', $request->email)->first();

        if (!$user) {
            return response()->json([
                'message' => 'If this email is registered, a password reset link has been sent.',
            ]);
        }

        $token = Str::random(64);

        DB::table('password_reset_tokens')->where('email', $request->email)->delete();

        DB::table('password_reset_tokens')->insert([
            'email'      => $request->email,
            'token'      => Hash::make($token),
            'created_at' => Carbon::now(),
        ]);

        $resetCode = strtoupper(substr($token, 0, 6));

        DB::table('password_reset_tokens')->where('email', $request->email)->update([
            'token' => Hash::make($resetCode),
        ]);

        Mail::send([], [], function ($mail) use ($request, $resetCode) {
            $mail->to($request->email)
                ->subject('Password Reset Code — Price and Stock Alert')
                ->html("
                    <div style='font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px;'>
                        <div style='background:#0F4C81;padding:24px;border-radius:12px 12px 0 0;text-align:center;'>
                            <h2 style='color:white;margin:0;'>Price and Stock Alert</h2>
                        </div>
                        <div style='background:#fff;padding:32px;border-radius:0 0 12px 12px;border:1px solid #e2e8f0;'>
                            <h3 style='color:#1e293b;'>Password Reset Request</h3>
                            <p style='color:#64748b;'>You requested to reset your password for your <strong>Price and Stock Alert</strong> account.</p>
                            <p style='color:#64748b;'>Use the code below to reset your password:</p>
                            <div style='background:#f0f4f8;border-radius:12px;padding:24px;text-align:center;margin:24px 0;'>
                                <span style='font-size:36px;font-weight:bold;letter-spacing:8px;color:#0F4C81;font-family:monospace;'>
                                    {$resetCode}
                                </span>
                            </div>
                            <p style='color:#64748b;'>This code expires in <strong>15 minutes</strong>.</p>
                            <p style='color:#94a3b8;font-size:12px;'>If you did not request a password reset, please ignore this email.</p>
                        </div>
                    </div>
                ");
        });

        return response()->json([
            'message' => 'If this email is registered, a password reset code has been sent.',
        ]);
    }

    // ── POST /api/reset-password ───────────────────────────────────────────────
    public function resetPassword(Request $request): JsonResponse
    {
        $request->validate([
            'email'    => 'required|email',
            'code'     => 'required|string',
            'password' => 'required|string|min:8|confirmed',
        ]);

        $record = DB::table('password_reset_tokens')
            ->where('email', $request->email)
            ->first();

        if (!$record) {
            return response()->json(['message' => 'Invalid or expired reset code.'], 422);
        }

        if (Carbon::parse($record->created_at)->addMinutes(15)->lt(Carbon::now())) {
            DB::table('password_reset_tokens')->where('email', $request->email)->delete();
            return response()->json(['message' => 'Reset code has expired. Please request a new one.'], 422);
        }

        if (!Hash::check(strtoupper($request->code), $record->token)) {
            return response()->json(['message' => 'Invalid reset code.'], 422);
        }

        $user = User::where('email', $request->email)->first();
        if (!$user) {
            return response()->json(['message' => 'User not found.'], 404);
        }

        $user->update([
            'password'       => Hash::make($request->password),
            'login_attempts' => 0,
            'locked_until'   => null,
        ]);

        DB::table('password_reset_tokens')->where('email', $request->email)->delete();

        return response()->json(['message' => 'Password reset successfully. You can now log in.']);
    }

    // ── POST /api/ping ─────────────────────────────────────────────────────────
    public function ping(Request $request): JsonResponse
    {
        $request->user()->update(['last_login_at' => now()]);
        return response()->json(['status' => 'ok']);
    }

    // ── POST /api/verify-email ─────────────────────────────────────────────────
    public function verifyEmail(Request $request): JsonResponse
    {
        $request->validate([
            'email' => 'required|email',
            'code'  => 'required|string',
        ]);

        $user = User::where('email', $request->email)->first();

        if (!$user) {
            return response()->json(['message' => 'User not found.'], 404);
        }

        if ($user->email_verified_at) {
            return response()->json(['message' => 'Email already verified.']);
        }

        if (
            $user->verification_sent_at &&
            Carbon::parse($user->verification_sent_at)->addMinutes(15)->lt(now())
        ) {
            return response()->json([
                'message' => 'Verification code has expired. Please request a new one.',
            ], 422);
        }

        if (!Hash::check(strtoupper($request->code), $user->verification_code)) {
            return response()->json(['message' => 'Invalid verification code.'], 422);
        }

        $user->update([
            'email_verified_at'    => now(),
            'verification_code'    => null,
            'verification_sent_at' => null,
        ]);

        AdminActivityLog::create([
            'event_type' => 'email_verified',
            'title'      => 'User verified email',
            'message'    => "{$user->name} ({$user->email}) verified their email address.",
            'user_id'    => $user->id,
        ]);

        return response()->json(['message' => 'Email verified successfully. You can now log in.']);
    }

    // ── POST /api/resend-verification ─────────────────────────────────────────
    public function resendVerification(Request $request): JsonResponse
    {
        $request->validate(['email' => 'required|email']);

        $user = User::where('email', $request->email)->first();

        if (!$user || $user->email_verified_at) {
            return response()->json(['message' => 'Invalid request.'], 422);
        }

        if (
            $user->verification_sent_at &&
            Carbon::parse($user->verification_sent_at)->addMinute()->gt(now())
        ) {
            $secondsLeft = (int) now()->diffInSeconds(
                Carbon::parse($user->verification_sent_at)->addMinute()
            );
            return response()->json([
                'message' => "Please wait {$secondsLeft} second(s) before requesting a new code.",
            ], 429);
        }

        $verificationCode = strtoupper(Str::random(6));

        $user->update([
            'verification_code'    => Hash::make($verificationCode),
            'verification_sent_at' => now(),
        ]);

        Mail::send([], [], function ($mail) use ($user, $verificationCode) {
            $mail->to($user->email)
                ->subject('New Verification Code — Price and Stock Alert')
                ->html("
                    <div style='font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px;'>
                        <div style='background:#0F4C81;padding:24px;border-radius:12px 12px 0 0;text-align:center;'>
                            <h2 style='color:white;margin:0;'>Price and Stock Alert</h2>
                        </div>
                        <div style='background:#fff;padding:32px;border-radius:0 0 12px 12px;border:1px solid #e2e8f0;'>
                            <h3 style='color:#1e293b;'>New Verification Code</h3>
                            <p style='color:#64748b;'>Hi <strong>{$user->name}</strong>, here is your new verification code:</p>
                            <div style='background:#f0f4f8;border-radius:12px;padding:24px;text-align:center;margin:24px 0;'>
                                <span style='font-size:36px;font-weight:bold;letter-spacing:8px;color:#0F4C81;font-family:monospace;'>
                                    {$verificationCode}
                                </span>
                            </div>
                            <p style='color:#64748b;'>This code expires in <strong>15 minutes</strong>.</p>
                            <p style='color:#94a3b8;font-size:12px;'>If you did not request this code, please ignore this email.</p>
                        </div>
                    </div>
                ");
        });

        return response()->json(['message' => 'New verification code sent. Please check your email.']);
    }

} // ── END AuthController ──────────────────────────────────────────────────────