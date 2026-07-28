<?php

// app/Mail/TargetPriceMail.php
// Email notification sent when a product reaches the user's target price.

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class TargetPriceMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public string $userName,
        public string $productName,
        public string $productUrl,
        public float  $currentPrice,
        public float  $targetPrice,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: '🎯 Target Price Reached — ' . $this->productName,
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.target-price',
        );
    }

    public function build(): static
    {
        return $this->html($this->buildHtml());
    }

    private function buildHtml(): string
    {
        $name    = e($this->userName);
        $product = e($this->productName);
        $url     = e($this->productUrl);
        $current = number_format($this->currentPrice, 2);
        $target  = number_format($this->targetPrice,  2);
        $savings = number_format($this->targetPrice - $this->currentPrice, 2);

        return <<<HTML
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Target Price Reached</title>
</head>
<body style="margin:0;padding:0;background:#f0f4f8;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f4f8;padding:32px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#b45309 0%,#d97706 100%);padding:32px 40px;text-align:center;">
            <div style="display:inline-block;background:rgba(255,255,255,0.15);border-radius:50%;width:64px;height:64px;line-height:64px;font-size:32px;margin-bottom:12px;">🎯</div>
            <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:800;letter-spacing:-0.3px;">Target Price Reached!</h1>
            <p style="margin:6px 0 0;color:rgba(255,255,255,0.75);font-size:13px;">Price and Stock Alert</p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:32px 40px;">
            <p style="margin:0 0 8px;color:#334155;font-size:15px;">Hi <strong>{$name}</strong>,</p>
            <p style="margin:0 0 24px;color:#64748b;font-size:14px;line-height:1.6;">
              Your target price has been reached! The product you've been watching is now at or below your goal.
            </p>

            <!-- Product Card -->
            <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:12px;padding:20px;margin-bottom:24px;">
              <p style="margin:0 0 16px;color:#0f172a;font-size:15px;font-weight:700;line-height:1.4;">{$product}</p>

              <!-- Price info -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px;">
                <tr>
                  <td style="width:48%;background:#fff;border:1px solid #fde68a;border-radius:8px;padding:12px;text-align:center;">
                    <div style="color:#92400e;font-size:11px;font-weight:600;letter-spacing:0.5px;margin-bottom:4px;">YOUR TARGET</div>
                    <div style="color:#92400e;font-size:18px;font-weight:800;">₱{$target}</div>
                  </td>
                  <td style="width:4%;text-align:center;">
                    <span style="color:#d97706;font-size:18px;">✓</span>
                  </td>
                  <td style="width:48%;background:#f0fdf4;border-radius:8px;padding:12px;text-align:center;">
                    <div style="color:#94a3b8;font-size:11px;font-weight:600;letter-spacing:0.5px;margin-bottom:4px;">CURRENT PRICE</div>
                    <div style="color:#16a34a;font-size:24px;font-weight:800;">₱{$current}</div>
                  </td>
                </tr>
              </table>

              <!-- Savings badge -->
              <div style="text-align:center;">
                <span style="display:inline-block;background:linear-gradient(135deg,#d97706,#b45309);color:#fff;font-size:13px;font-weight:700;padding:6px 18px;border-radius:20px;">
                  ₱{$savings} below your target!
                </span>
              </div>
            </div>

            <!-- Urgency message -->
            <div style="background:#fff7ed;border-left:4px solid #f97316;border-radius:0 8px 8px 0;padding:12px 16px;margin-bottom:24px;">
              <p style="margin:0;color:#9a3412;font-size:13px;font-weight:600;">
                ⚡ Act fast — prices can change at any time!
              </p>
            </div>

            <!-- CTA Button -->
            <div style="text-align:center;margin-bottom:24px;">
              <a href="{$url}" style="display:inline-block;background:linear-gradient(135deg,#b45309,#d97706);color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;padding:14px 32px;border-radius:10px;letter-spacing:0.3px;">
                Buy Now →
              </a>
            </div>

            <p style="margin:0;color:#94a3b8;font-size:12px;text-align:center;line-height:1.6;">
              You received this because you have a target price set for this product.<br>
              Open the app to manage your notification settings.
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:20px 40px;text-align:center;">
            <p style="margin:0;color:#94a3b8;font-size:11px;">
              © Price and Stock Alert • Track. Alert. Save.
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>
HTML;
    }
}