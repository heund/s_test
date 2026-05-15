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

const SCANNER_DEBUG = true;
const SCAN_HEARTBEAT_MS = 2000;

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
        this.lastHeartbeatAt = 0;
    }

    async start() {
        debugScanner('start requested', {
            state: this.state,
            isSecureContext: window.isSecureContext,
            hostname: window.location.hostname,
            hasVideoElement: Boolean(this.videoElement),
            hasMediaDevices: Boolean(navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
            hasJsQR: typeof window.jsQR !== 'undefined'
        });

        if (this.state === SCANNER_STATES.ACTIVE || this.state === SCANNER_STATES.REQUESTING_PERMISSION) {
            debugScanner('start ignored because scanner is already active or requesting permission', {
                state: this.state
            });
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
        debugScanner('requesting camera permission');

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: { ideal: 'environment' }
                },
                audio: false
            });

            this.stream = stream;
            debugScanner('camera stream received', {
                videoTracks: stream.getVideoTracks().length,
                audioTracks: stream.getAudioTracks().length
            });
            this.videoElement.srcObject = this.stream;
            await this.videoElement.play();
            this.setState(SCANNER_STATES.ACTIVE);
            debugScanner('video playback started', {
                readyState: this.videoElement.readyState,
                videoWidth: this.videoElement.videoWidth,
                videoHeight: this.videoElement.videoHeight
            });
            this.scheduleScan();
        } catch (error) {
            debugScanner('camera start failed', {
                message: error.message || 'Unknown camera error'
            });
            this.stop();
            this.enterError(error.message || 'Camera permission was denied.');
        }
    }

    stop() {
        debugScanner('stop requested', {
            state: this.state,
            hasStream: Boolean(this.stream)
        });
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
        debugScanner('pause requested', {
            reason,
            state: this.state
        });

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
        debugScanner('resume cooldown started', {
            resumeCooldownMs: this.resumeCooldownMs,
            hasStream: Boolean(this.stream)
        });

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
        debugScanner('marked invalid QR value', {
            rawValue
        });
    }

    markAccepted(rawValue) {
        this.lastAcceptedValue = rawValue;
        this.lastAcceptedAt = Date.now();
        debugScanner('marked accepted QR value', {
            rawValue
        });
    }

    canProcess(rawValue) {
        const now = Date.now();

        if (rawValue === this.lastAcceptedValue && now - this.lastAcceptedAt < this.duplicateCooldownMs) {
            debugScanner('duplicate accepted QR suppressed by cooldown', {
                rawValue,
                remainingMs: this.duplicateCooldownMs - (now - this.lastAcceptedAt)
            });
            return false;
        }

        if (rawValue === this.lastInvalidValue && now - this.lastInvalidAt < this.invalidCooldownMs) {
            debugScanner('duplicate invalid QR suppressed by cooldown', {
                rawValue,
                remainingMs: this.invalidCooldownMs - (now - this.lastInvalidAt)
            });
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
            this.logHeartbeat('scanning frame', {
                readyState: this.videoElement.readyState,
                videoWidth: this.videoElement.videoWidth,
                videoHeight: this.videoElement.videoHeight
            });
            this.canvas.height = this.videoElement.videoHeight;
            this.canvas.width = this.videoElement.videoWidth;
            this.context.drawImage(this.videoElement, 0, 0, this.canvas.width, this.canvas.height);

            const imageData = this.context.getImageData(0, 0, this.canvas.width, this.canvas.height);
            const code = window.jsQR(imageData.data, imageData.width, imageData.height, {
                inversionAttempts: 'dontInvert'
            });

            const rawValue = code && code.data ? code.data.trim() : '';
            if (rawValue && this.canProcess(rawValue)) {
                debugScanner('QR value detected', {
                    rawValue
                });
                this.onScan(rawValue);
            }
        } else {
            this.logHeartbeat('video not ready for scanning', {
                readyState: this.videoElement.readyState,
                requiredReadyState: this.videoElement.HAVE_ENOUGH_DATA
            });
        }

        this.scheduleScan();
    }

    enterError(message) {
        debugScanner('entering scanner error state', {
            message
        });
        if (this.stream) {
            this.stop();
        }
        this.setState(SCANNER_STATES.ERROR);
        if (this.onError) {
            this.onError(message);
        }
    }

    setState(nextState) {
        if (this.state !== nextState) {
            debugScanner('state changed', {
                from: this.state,
                to: nextState
            });
        }
        this.state = nextState;
    }

    logHeartbeat(message, details = {}) {
        const now = Date.now();
        if (now - this.lastHeartbeatAt < SCAN_HEARTBEAT_MS) {
            return;
        }

        this.lastHeartbeatAt = now;
        debugScanner(message, details);
    }
}

function debugScanner(message, details = {}) {
    if (!SCANNER_DEBUG) {
        return;
    }

    console.info('[QR scanner]', message, details);
}
