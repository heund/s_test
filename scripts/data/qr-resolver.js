export class QRResolver {
    constructor(config) {
        this.qrCodesByValue = new Map();
        this.locationsById = new Map();
        this.deitiesById = new Map();
        this.mappingsByQrId = new Map();

        for (const qrCode of config.qrCodes) {
            if (qrCode.active) {
                this.qrCodesByValue.set(this.normalize(qrCode.value), qrCode);
            }
        }

        for (const location of config.locations) {
            this.locationsById.set(location.id, location);
        }

        for (const deity of config.deities) {
            this.deitiesById.set(deity.id, deity);
        }

        for (const mapping of config.mappings) {
            this.mappingsByQrId.set(mapping.qrId, mapping);
        }

        debugResolver('initialized', {
            activeQrValues: this.qrCodesByValue.size,
            locations: this.locationsById.size,
            deities: this.deitiesById.size,
            mappings: this.mappingsByQrId.size
        });
    }

    normalize(value) {
        return String(value || '').trim();
    }

    resolve(rawValue) {
        const normalizedValue = this.normalize(rawValue);
        const qrCode = this.qrCodesByValue.get(normalizedValue);

        if (!qrCode) {
            debugResolver('QR value did not match configured values', {
                rawValue: normalizedValue,
                configuredValues: Array.from(this.qrCodesByValue.keys())
            });
            return { status: 'invalid', rawValue: normalizedValue };
        }

        const mapping = this.mappingsByQrId.get(qrCode.id);
        if (!mapping) {
            debugResolver('QR record has no mapping', {
                qrId: qrCode.id
            });
            return { status: 'unmapped', qrCode };
        }

        const location = this.locationsById.get(mapping.locationId);
        const deityId = mapping.deityId || mapping.defaultDeityId;
        const deity = this.deitiesById.get(deityId);

        if (!location || !deity) {
            debugResolver('QR mapping is incomplete', {
                qrId: qrCode.id,
                locationId: mapping.locationId,
                deityId,
                hasLocation: Boolean(location),
                hasDeity: Boolean(deity)
            });
            return { status: 'incomplete', qrCode, mapping, location, deity };
        }

        debugResolver('QR resolved successfully', {
            qrId: qrCode.id,
            locationId: location.id,
            deityId: deity.id
        });

        return {
            status: 'resolved',
            qrCode,
            location,
            deity,
            mapping
        };
    }
}

function debugResolver(message, details = {}) {
    console.info('[QR resolver]', message, details);
}
