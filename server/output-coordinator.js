const PWA_OVERRIDE_DURATION_MS = 60 * 1000;

function createFanOutput(state, now = new Date()) {
    let pattern = 'idle';
    let intensity = 0;

    if (state.burstActive) {
        pattern = 'active_burst';
        intensity = 1.0;
    } else if (state.recentScansLast60Seconds > 0) {
        pattern = 'soft_burst';
        intensity = 0.4;
    }

    return {
        target: 'fan',
        pattern,
        intensity,
        durationMs: 5000,
        generatedAt: now.toISOString()
    };
}

function createPwaOutput(state, now = new Date()) {
    const generatedAt = now.toISOString();

    if (!state.burstActive || !state.burstLocationId) {
        return {
            target: 'pwa',
            active: false,
            generatedAt
        };
    }

    const expiresAt = new Date(now.getTime() + PWA_OVERRIDE_DURATION_MS).toISOString();

    return {
        target: 'pwa',
        active: true,
        type: 'deity_override',
        startsAt: generatedAt,
        expiresAt,
        payload: {
            affectedLocationId: state.burstLocationId,
            textVariant: 'collective_burst'
        },
        generatedAt
    };
}

module.exports = {
    createFanOutput,
    createPwaOutput
};
