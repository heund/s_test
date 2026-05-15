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
    }

    normalize(value) {
        return String(value || '').trim();
    }

    resolve(rawValue) {
        const normalizedValue = this.normalize(rawValue);
        const qrCode = this.qrCodesByValue.get(normalizedValue);

        if (!qrCode) {
            return { status: 'invalid', rawValue: normalizedValue };
        }

        const mapping = this.mappingsByQrId.get(qrCode.id);
        if (!mapping) {
            return { status: 'unmapped', qrCode };
        }

        const location = this.locationsById.get(mapping.locationId);
        const deityId = mapping.deityId || mapping.defaultDeityId;
        const deity = this.deitiesById.get(deityId);

        if (!location || !deity) {
            return { status: 'incomplete', qrCode, mapping, location, deity };
        }

        return {
            status: 'resolved',
            qrCode,
            location,
            deity,
            mapping
        };
    }
}
