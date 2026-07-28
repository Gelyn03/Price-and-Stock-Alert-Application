<?php

// app/Mail/StockAvailableMail.php
// Email notification sent when an out-of-stock product becomes available again.

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class StockAvailableMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public string $userName,
        public string $productName,
        public string $productUrl,
        public ?float $currentPrice,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: '✅ Back in Stock — ' . $this->productName,
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.stock-available',
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
        $price   = $this->currentPrice
            ? '₱' . number_format($this->currentPrice, 2)
            : 'Check current price';

        return <<<HTML
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Back in Stock</title>
</head>
<body style="margin:0;padding:0;background:#f0f4f8;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f4f8;padding:32px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#15803d 0%,#16a34a 100%);padding:32px 40px;text-align:center;">
            <div style="display:inline-block;background:rgba(255,255,255,0.15);border-radius:50%;width:64px;height:64px;line-height:64px;font-size:32px;margin-bottom:12px;">✅</div>
            <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:800;letter-spacing:-0.3px;">Back in Stock!</h1>
            <p style="margin:6px 0 0;color:rgba(255,255,255,0.75);font-size:13px;">Price and Stock Alert</p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:32px 40px;">
            <p style="margin:0 0 8px;color:#334155;font-size:15px;">Hi <strong>{$name}</strong>,</p>
            <p style="margin:0 0 24px;color:#64748b;font-size:14px;line-height:1.6;">
              The product you've been waiting for is back in stock! Don't miss out — stock may be limited.
            </p>

            <!-- Product Card -->
            <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:24px;margin-bottom:24px;text-align:center;">

              <!-- Stock badge -->
              <div style="margin-bottom:16px;">
                <span style="display:inline-block;background:#16a34a;color:#fff;font-size:12px;font-weight:700;padding:4px 14px;border-radius:20px;letter-spacing:0.5px;">
                  ● IN STOCK
                </span>
              </div>

              <p style="margin:0 0 16px;color:#0f172a;font-size:16px;font-weight:700;line-height:1.4;">{$product}</p>

              <!-- Price -->
              <div style="background:#fff;border:1px solid #bbf7d0;border-radius:8px;padding:14px;display:inline-block;min-width:160px;">
                <div style="color:#94a3b8;font-size:11px;font-weight:600;letter-spacing:0.5px;margin-bottom:4px;">CURRENT PRICE</div>
                <div style="color:#16a34a;font-size:26px;font-weight:800;">{$price}</div>
              </div>
            </div>

            <!-- Urgency message -->
            <div style="background:#f0fdf4;border-left:4px solid #16a34a;border-radius:0 8px 8px 0;padding:12px 16px;margin-bottom:24px;">
              <p style="margin:0;color:#15803d;font-size:13px;font-weight:600;">
                🏃 Stock may be limited — grab it before it sells out again!
              </p>
            </div>

            <!-- CTA Button -->
            <div style="text-align:center;margin-bottom:24px;">
              <a href="{$url}" style="display:inline-block;background:linear-gradient(135deg,#15803d,#16a34a);color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;padding:14px 32px;border-radius:10px;letter-spacing:0.3px;">
                View Product →
              </a>
            </div>

            <p style="margin:0;color:#94a3b8;font-size:12px;text-align:center;line-height:1.6;">
              You received this because you have stock alerts enabled for this product.<br>
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