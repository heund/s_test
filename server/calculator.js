const WINDOW_MS = 60 * 1000;
const BURST_THRESHOLD = 3;

function toTimestamp(value) {
    const timestamp = Date.parse(value);
    return Number.isNaN(timestamp) ? null : timestamp;
}

function calculateState(events, now = new Date()) {
    const generatedAt = now.toISOString();
    const nowMs = now.getTime();
    const countByLocationId = {};
    const recentCountByLocationId = {};

    for (const event of events) {
        if (!event || event.eventType !== 'qr_scan' || typeof event.locationId !== 'string') {
            continue;
        }

        countByLocationId[event.locationId] = (countByLocationId[event.locationId] || 0) + 1;

        const receivedAtMs = toTimestamp(event.serverReceivedAt);
        if (receivedAtMs !== null && nowMs - receivedAtMs <= WINDOW_MS && nowMs >= receivedAtMs) {
            recentCountByLocationId[event.locationId] = (recentCountByLocationId[event.locationId] || 0) + 1;
        }
    }

    const mostActiveLocationId = findTopLocation(countByLocationId);
    const burstLocationId = findBurstLocation(recentCountByLocationId);
    const recentScansLast60Seconds = Object.values(recentCountByLocationId).reduce((total, count) => total + count, 0);

    return {
        totalQrScanCount: Object.values(countByLocationId).reduce((total, count) => total + count, 0),
        countByLocationId,
        mostActiveLocationId,
        recentScansLast60Seconds,
        burstActive: Boolean(burstLocationId),
        burstLocationId,
        generatedAt
    };
}

function findTopLocation(counts) {
    let topLocationId = null;
    let topCount = 0;

    for (const [locationId, count] of Object.entries(counts)) {
        if (count > topCount) {
            topLocationId = locationId;
            topCount = count;
        }
    }

    return topLocationId;
}

function findBurstLocation(counts) {
    let burstLocationId = null;
    let burstCount = BURST_THRESHOLD - 1;

    for (const [locationId, count] of Object.entries(counts)) {
        if (count > burstCount) {
            burstLocationId = locationId;
            burstCount = count;
        }
    }

    return burstLocationId;
}

module.exports = {
    calculateState
};
