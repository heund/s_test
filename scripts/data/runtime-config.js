const FALLBACK_RUNTIME_CONFIG = {
    eventServerUrl: 'http://localhost:3000',
    debugEventLogger: false,
    requirePasscode: false,
    accessPasscode: ''
};

let runtimeConfigPromise = null;

export function getRuntimeConfig() {
    if (!runtimeConfigPromise) {
        runtimeConfigPromise = loadRuntimeConfig();
    }

    return runtimeConfigPromise;
}

async function loadRuntimeConfig() {
    try {
        const response = await fetch('./data/runtime-config.json', {
            cache: 'no-store'
        });

        if (!response.ok) {
            return FALLBACK_RUNTIME_CONFIG;
        }

        return normalizeRuntimeConfig(await response.json());
    } catch {
        return FALLBACK_RUNTIME_CONFIG;
    }
}

function normalizeRuntimeConfig(config) {
    if (!config || typeof config !== 'object') {
        return FALLBACK_RUNTIME_CONFIG;
    }

    const accessPasscode = typeof config.accessPasscode === 'string'
        ? config.accessPasscode
        : '';

    return {
        eventServerUrl: typeof config.eventServerUrl === 'string' && config.eventServerUrl.trim()
            ? config.eventServerUrl.trim().replace(/\/+$/, '')
            : FALLBACK_RUNTIME_CONFIG.eventServerUrl,
        debugEventLogger: config.debugEventLogger === true,
        requirePasscode: config.requirePasscode === true && accessPasscode.length > 0,
        accessPasscode
    };
}
