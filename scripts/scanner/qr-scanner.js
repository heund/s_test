export const SCANNER_STATES = {
    IDLE: 'idle',
    REQUESTING_PERMISSION: 'requestingPermission',
    ACTIVE: 'active',
    PAUSED_FOR_REVEAL: 'pausedForReveal',
    PAUSED_FOR_INVENTORY: 'pausedForInventory',
    PAUSED_FOR_MAP: 'pausedForMap',
    COOLDOWN: 'cooldown',
    ERROR: 'error'
};

const PAUSE_STATES = new Set([
    SCANNER_STATES.PAUSED_FOR_REVEAL,
    SCANNER_STATES.PAUSED_FOR_INVENTORY,
    SCANNER_STATES.PAUSED_FOR_MAP
]);

export class QRScanner {
    constructor({
        videoElement,
        onScan,
        onError,
        scanIntervalMs = 200,
        duplicateCooldownMs = 3000,
        resumeCooldownMs = 1500,
        invalidCooldownMs = 800
    }) {
        this.videoElement = videoElement;
        this.onScan = onScan;
        this.onError = onError;
        this.scanIntervalMs = scanIntervalMs;
        this.duplicateCooldownMs = duplicateCooldownMs;
        this.resumeCooldownMs = resumeCooldownMs;
        this.invalidCooldownMs = invalidCooldownMs;

        this.state = SCANNER_STATES.IDLE;
        this.stream = null;
        this.scanTimer = null;
        this.resumeTimer = null;
        this.canvas = document.createElement('canvas');
        this.context = this.canvas.getContext('2d', { willReadFrequently: true });
        this.lastScanAttemptAt = 0;
        this.lastAcceptedValue = null;
        this.lastAcceptedAt = 0;
        this.lastInvalidValue = null;
        this.lastInvalidAt = 0;
    }

    async start() {
        if (this.state === SCANNER_STATES.ACTIVE || this.state === SCANNER_STATES.REQUESTING_PERMISSION) {
            return;
        }

        if (!this.videoElement) {
            this.enterError('Camera surface is unavailable.');
            return;
        }

        if (!window.isSecureContext && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
            this.enterError('Camera access requires HTTPS.');
            return;
        }

        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            this.enterError('Camera API is not available in this browser.');
            return;
        }

        if (typeof window.jsQR === 'undefined') {
            this.enterError('QR scanner library did not load.');
            return;
        }

        this.setState(SCANNER_STATES.REQUESTING_PERMISSION);

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: { ideal: 'environment' }
                },
                audio: false
            });

            this.stream = stream;
            this.videoElement.srcObject = this.stream;
            await this.videoElement.play();
            this.setState(SCANNER_STATES.ACTIVE);
            this.scheduleScan();
        } catch (error) {
            this.stop();
            this.enterError(error.message || 'Camera permission was denied.');
        }
    }

    stop() {
        window.clearTimeout(this.scanTimer);
        window.clearTimeout(this.resumeTimer);
        this.scanTimer = null;
        this.resumeTimer = null;

        if (this.stream) {
            for (const track of this.stream.getTracks()) {
                track.stop();
            }
        }

        this.stream = null;

        if (this.videoElement) {
            this.videoElement.srcObject = null;
        }

        this.setState(SCANNER_STATES.IDLE);
    }

    pause(reason) {
        window.clearTimeout(this.resumeTimer);

        if (reason === 'inventory') {
            this.setState(SCANNER_STATES.PAUSED_FOR_INVENTORY);
        } else if (reason === 'map') {
            this.setState(SCANNER_STATES.PAUSED_FOR_MAP);
        } else {
            this.setState(SCANNER_STATES.PAUSED_FOR_REVEAL);
        }
    }

    resumeAfterCooldown() {
        window.clearTimeout(this.resumeTimer);
        this.setState(SCANNER_STATES.COOLDOWN);

        if (this.lastAcceptedValue) {
            this.lastAcceptedAt = Date.now();
        }

        this.resumeTimer = window.setTimeout(() => {
            if (this.state === SCANNER_STATES.COOLDOWN) {
                if (this.stream) {
                    this.setState(SCANNER_STATES.ACTIVE);
                    this.scheduleScan();
                } else {
                    this.setState(SCANNER_STATES.IDLE);
                }
            }
        }, this.resumeCooldownMs);
    }

    markInvalid(rawValue) {
        this.lastInvalidValue = rawValue;
        this.lastInvalidAt = Date.now();
    }

    markAccepted(rawValue) {
        this.lastAcceptedValue = rawValue;
        this.lastAcceptedAt = Date.now();
    }

    canProcess(rawValue) {
        const now = Date.now();

        if (rawValue === this.lastAcceptedValue && now - this.lastAcceptedAt < this.duplicateCooldownMs) {
            return false;
        }

        if (rawValue === this.lastInvalidValue && now - this.lastInvalidAt < this.invalidCooldownMs) {
            return false;
        }

        return true;
    }

    scheduleScan() {
        window.clearTimeout(this.scanTimer);

        this.scanTimer = window.setTimeout(() => {
            this.scan();
        }, this.scanIntervalMs);
    }

    scan() {
        if (this.state !== SCANNER_STATES.ACTIVE) {
            if (PAUSE_STATES.has(this.state) || this.state === SCANNER_STATES.COOLDOWN) {
                return;
            }
            this.scheduleScan();
            return;
        }

        if (this.videoElement.readyState === this.videoElement.HAVE_ENOUGH_DATA) {
            this.canvas.height = this.videoElement.videoHeight;
            this.canvas.width = this.videoElement.videoWidth;
            this.context.drawImage(this.videoElement, 0, 0, this.canvas.width, this.canvas.height);

            const imageData = this.context.getImageData(0, 0, this.canvas.width, this.canvas.height);
            const code = window.jsQR(imageData.data, imageData.width, imageData.height, {
                inversionAttempts: 'dontInvert'
            });

            const rawValue = code && code.data ? code.data.trim() : '';
            if (rawValue && this.canProcess(rawValue)) {
                this.onScan(rawValue);
            }
        }

        this.scheduleScan();
    }

    enterError(message) {
        if (this.stream) {
            this.stop();
        }
        this.setState(SCANNER_STATES.ERROR);
        if (this.onError) {
            this.onError(message);
        }
    }

    setState(nextState) {
        this.state = nextState;
    }
}
