import { getRuntimeConfig } from '../data/runtime-config.js';

export class LocalServerEventLogger {
    constructor() {
        this.configPromise = getRuntimeConfig();
    }

    log(event) {
        if (event.eventType !== 'qr_scan_valid') {
            void this.debug('Skipping non-server event.', {
                eventType: event.eventType
            });
            return;
        }

        if (!event.qrId || !event.locationId) {
            void this.debug('Skipping incomplete QR event.', {
                hasQrId: Boolean(event.qrId),
                hasLocationId: Boolean(event.locationId)
            });
            return;
        }

        const payload = {
            eventType: 'qr_scan',
            qrId: event.qrId,
            locationId: event.locationId,
            occurredAt: event.occurredAt || new Date().toISOString()
        };

        if (event.deityId) {
            payload.deityId = event.deityId;
        }

        void this.debug('Queueing QR scan event POST.', payload);
        void this.send(payload);
    }

    async send(payload) {
        const config = await this.configPromise;

        try {
            const response = await fetch(`${config.eventServerUrl}/api/events`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload),
                credentials: 'omit',
                cache: 'no-store',
                referrerPolicy: 'no-referrer'
            });

            if (response.ok) {
                void this.debug('QR scan event POST accepted.', {
                    status: response.status,
                    qrId: payload.qrId,
                    locationId: payload.locationId,
                    deityId: payload.deityId || null
                });
                return;
            }

            void this.debug('QR scan event POST rejected.', {
                status: response.status,
                qrId: payload.qrId,
                locationId: payload.locationId,
                deityId: payload.deityId || null
            });
        } catch {
            void this.debug('QR scan event POST failed; local app flow continues.', {
                qrId: payload.qrId,
                locationId: payload.locationId,
                deityId: payload.deityId || null
            });
            // Event logging is best-effort; local reveal and collection must keep working.
        }
    }

    async debug(message, details = {}) {
        const config = await this.configPromise;
        debugEventLogger(config, message, details);
    }
}

function debugEventLogger(config, message, details = {}) {
    if (!config.debugEventLogger) {
        return;
    }

    console.info('[PWA event logger]', message, details);
}
