<?php

// app/Console/Kernel.php
// Registers the scheduled monitoring job to run every 30 minutes.

namespace App\Console;

use App\Jobs\FetchProductData;
use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Foundation\Console\Kernel as ConsoleKernel;

class Kernel extends ConsoleKernel
{
    /**
     * Define the application's command schedule.
     * Run: php artisan schedule:work  (to start the scheduler locally)
     */
    protected function schedule(Schedule $schedule): void
    {
        // Fetch updated price and stock data every 5 minutes
        $schedule->job(new FetchProductData)->everyFiveMinutes();
    }

    protected function commands(): void
    {
        $this->load(__DIR__ . '/Commands');

        require base_path('routes/console.php');
    }
}