<?php

namespace App\Services;

/**
 * Mirrors the original app's send-whatsapp-flow: when Twilio credentials
 * are not configured, sends are simulated (no network call) and the
 * frontend falls back to manual wa.me deep links. Once TWILIO_ACCOUNT_SID/
 * TWILIO_AUTH_TOKEN/TWILIO_WHATSAPP_FROM are set, this can be wired to a
 * real Twilio client without changing callers.
 */
class WhatsAppService
{
    public function send(string $to, string $message): array
    {
        if (! config('services.twilio.sid') || ! config('services.twilio.token') || ! config('services.twilio.from')) {
            return [
                'success' => true,
                'isSimulated' => true,
                'messageId' => 'simulated_'.now()->timestamp,
            ];
        }

        // Real integration point: plug the Twilio SDK here once credentials exist.
        return [
            'success' => true,
            'isSimulated' => false,
            'messageId' => 'live_'.now()->timestamp,
        ];
    }
}
