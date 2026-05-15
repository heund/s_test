const crypto = require('node:crypto');
const http = require('node:http');
const { URL } = require('node:url');
const { EventStore } = require('./event-store');
const { calculateState } = require('./calculator');
const { createFanOutput, createPwaOutput } = require('./output-coordinator');

const DEFAULT_PORT = 3000;
const JSON_LIMIT_BYTES = 10 * 1024;
const ALLOWED_EVENT_TYPE = 'qr_scan';
const PUBLIC_RECENT_WINDOW_MS = 60 * 1000;
const PUBLIC_BURST_THRESHOLD = 3;
const PUBLIC_LOCATIONS = [
    {
        label: 'Code 1',
        locationId: 'loc-001'
    },
    {
        label: 'Code 2',
        locationId: 'loc-002'
    }
];
const FIELD_MAX_LENGTHS = {
    qrId: 512,
    locationId: 128,
    deityId: 128,
    occurredAt: 64
};
const SENSITIVE_FIELDS = new Set([
    'name',
    'email',
    'phone',
    'gps',
    'userId',
    'deviceId',
    'ip',
    'photo',
    'cameraFrame',
    'address',
    'lat',
    'lng',
    'latitude',
    'longitude',
    'location',
    'userAgent',
    'sessionId',
    'cookie',
    'cookies'
]);
const ALLOWED_EVENT_FIELDS = new Set([
    'eventType',
    'qrId',
    'locationId',
    'deityId',
    'occurredAt'
]);

const eventStore = new EventStore();

async function handleRequest(req, res) {
    try {
        setCorsHeaders(res);

        if (req.method === 'OPTIONS') {
            sendNoContent(res);
            return;
        }

        const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
        const path = url.pathname;

        if (path === '/health') {
            if (req.method !== 'GET') return sendMethodNotAllowed(res, ['GET', 'OPTIONS']);
            return sendJson(res, 200, { ok: true });
        }

        if (path === '/status') {
            if (req.method !== 'GET') return sendMethodNotAllowed(res, ['GET', 'OPTIONS']);
            return sendHtml(res, 200, createStatusPageHtml());
        }

        if (path === '/api/events') {
            if (req.method !== 'POST') return sendMethodNotAllowed(res, ['POST', 'OPTIONS']);
            return handlePostEvent(req, res);
        }

        if (path === '/api/control/fan-stop') {
            if (req.method !== 'POST') return sendMethodNotAllowed(res, ['POST', 'OPTIONS']);
            return handleFanStop(req, res);
        }

        if (path === '/api/public/locations') {
            if (req.method !== 'GET') return sendMethodNotAllowed(res, ['GET', 'OPTIONS']);
            const now = new Date();
            const events = await eventStore.readAll();
            const controlState = await eventStore.readControlState();
            return sendJson(res, 200, createPublicLocationsState(events, now, {
                ignoreEventsBefore: controlState.fanStoppedAt
            }));
        }

        if (path === '/api/state/current') {
            if (req.method !== 'GET') return sendMethodNotAllowed(res, ['GET', 'OPTIONS']);
            const now = new Date();
            const events = await eventStore.readAll();
            const controlState = await eventStore.readControlState();
            return sendJson(res, 200, calculateState(events, now, {
                ignoreEventsBefore: controlState.fanStoppedAt
            }));
        }

        if (path === '/api/outputs/fan') {
            if (req.method !== 'GET') return sendMethodNotAllowed(res, ['GET', 'OPTIONS']);
            const now = new Date();
            const events = await eventStore.readAll();
            const controlState = await eventStore.readControlState();
            const state = calculateState(events, now, {
                ignoreEventsBefore: controlState.fanStoppedAt
            });
            return sendJson(res, 200, createFanOutput(state, now));
        }

        if (path === '/api/outputs/pwa') {
            if (req.method !== 'GET') return sendMethodNotAllowed(res, ['GET', 'OPTIONS']);
            const now = new Date();
            const events = await eventStore.readAll();
            const controlState = await eventStore.readControlState();
            const state = calculateState(events, now, {
                ignoreEventsBefore: controlState.fanStoppedAt
            });
            return sendJson(res, 200, createPwaOutput(state, now));
        }

        return sendJson(res, 404, {
            ok: false,
            error: 'Route not found.'
        });
    } catch {
        return sendJson(res, 500, {
            ok: false,
            error: 'Internal server error.'
        });
    }
}

async function handlePostEvent(req, res) {
    const bodyResult = await readJsonBody(req);

    if (!bodyResult.ok) {
        logEventDebug('Rejected event request body.', {
            status: bodyResult.status,
            error: bodyResult.error
        });
        return sendJson(res, bodyResult.status, {
            ok: false,
            error: bodyResult.error
        });
    }

    const validation = validateEventPayload(bodyResult.body);
    if (!validation.ok) {
        logEventDebug('Rejected event payload.', {
            error: validation.error
        });
        return sendJson(res, 400, {
            ok: false,
            error: validation.error
        });
    }

    const now = new Date().toISOString();
    const event = {
        eventId: crypto.randomUUID(),
        eventType: ALLOWED_EVENT_TYPE,
        qrId: validation.event.qrId,
        locationId: validation.event.locationId,
        serverReceivedAt: now
    };

    if (validation.event.deityId) {
        event.deityId = validation.event.deityId;
    }

    if (validation.event.occurredAt) {
        event.occurredAt = validation.event.occurredAt;
    }

    await eventStore.append(event);
    logEventDebug('Stored QR scan event.', {
        eventId: event.eventId,
        qrId: event.qrId,
        locationId: event.locationId,
        deityId: event.deityId || null
    });

    return sendJson(res, 201, {
        ok: true,
        event
    });
}

async function handleFanStop(req, res) {
    if (!isControlAuthorized(req)) {
        req.resume();
        return sendJson(res, 401, {
            ok: false,
            error: 'Unauthorized.'
        });
    }

    req.resume();

    const stoppedAt = new Date().toISOString();
    await eventStore.writeControlState({
        fanStoppedAt: stoppedAt,
        updatedAt: stoppedAt
    });

    return sendJson(res, 200, {
        ok: true,
        fanStoppedAt: stoppedAt
    });
}

function readJsonBody(req) {
    return new Promise(resolve => {
        const contentType = req.headers['content-type'] || '';
        if (!contentType.toLowerCase().includes('application/json')) {
            resolve({
                ok: false,
                status: 415,
                error: 'Content-Type must be application/json.'
            });
            req.resume();
            return;
        }

        let size = 0;
        let raw = '';
        let settled = false;

        req.setEncoding('utf8');

        req.on('data', chunk => {
            if (settled) return;
            size += Buffer.byteLength(chunk, 'utf8');

            if (size > JSON_LIMIT_BYTES) {
                settled = true;
                resolve({
                    ok: false,
                    status: 413,
                    error: 'Payload too large'
                });
                return;
            }

            raw += chunk;
        });

        req.on('end', () => {
            if (settled) return;
            settled = true;

            try {
                resolve({
                    ok: true,
                    body: raw.length ? JSON.parse(raw) : null
                });
            } catch {
                resolve({
                    ok: false,
                    status: 400,
                    error: 'Malformed JSON payload.'
                });
            }
        });

        req.on('error', () => {
            if (settled) return;
            settled = true;
            resolve({
                ok: false,
                status: 400,
                error: 'Could not read request body.'
            });
        });
    });
}

function validateEventPayload(payload) {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
        return {
            ok: false,
            error: 'Event payload must be a JSON object.'
        };
    }

    const sensitiveField = findSensitiveField(payload);
    if (sensitiveField) {
        return {
            ok: false,
            error: `Sensitive field is not allowed: ${sensitiveField}.`
        };
    }

    const unexpectedField = findUnexpectedField(payload);
    if (unexpectedField) {
        return {
            ok: false,
            error: `Unexpected field is not allowed: ${unexpectedField}.`
        };
    }

    if (payload.eventType !== ALLOWED_EVENT_TYPE) {
        return {
            ok: false,
            error: 'Unknown or missing eventType.'
        };
    }

    if (!isNonEmptyString(payload.qrId)) {
        return {
            ok: false,
            error: 'Missing or invalid qrId.'
        };
    }

    if (!isWithinMaxLength(payload.qrId, FIELD_MAX_LENGTHS.qrId)) {
        return {
            ok: false,
            error: `qrId must be ${FIELD_MAX_LENGTHS.qrId} characters or fewer.`
        };
    }

    if (!isNonEmptyString(payload.locationId)) {
        return {
            ok: false,
            error: 'Missing or invalid locationId.'
        };
    }

    if (!isWithinMaxLength(payload.locationId, FIELD_MAX_LENGTHS.locationId)) {
        return {
            ok: false,
            error: `locationId must be ${FIELD_MAX_LENGTHS.locationId} characters or fewer.`
        };
    }

    if ('deityId' in payload && !isNonEmptyString(payload.deityId)) {
        return {
            ok: false,
            error: 'Invalid deityId.'
        };
    }

    if ('deityId' in payload && !isWithinMaxLength(payload.deityId, FIELD_MAX_LENGTHS.deityId)) {
        return {
            ok: false,
            error: `deityId must be ${FIELD_MAX_LENGTHS.deityId} characters or fewer.`
        };
    }

    if ('occurredAt' in payload && !isWithinMaxLength(payload.occurredAt, FIELD_MAX_LENGTHS.occurredAt)) {
        return {
            ok: false,
            error: `occurredAt must be ${FIELD_MAX_LENGTHS.occurredAt} characters or fewer.`
        };
    }

    if ('occurredAt' in payload && !isValidTimestampString(payload.occurredAt)) {
        return {
            ok: false,
            error: 'Invalid occurredAt timestamp.'
        };
    }

    return {
        ok: true,
        event: {
            qrId: payload.qrId.trim(),
            locationId: payload.locationId.trim(),
            deityId: payload.deityId ? payload.deityId.trim() : null,
            occurredAt: payload.occurredAt || null
        }
    };
}

function createPublicLocationsState(events, now = new Date(), options = {}) {
    const nowMs = now.getTime();
    const ignoreBeforeMs = Date.parse(options.ignoreEventsBefore);
    const recentCountByLocationId = {};

    for (const event of events) {
        if (!event || event.eventType !== 'qr_scan' || typeof event.locationId !== 'string') {
            continue;
        }

        const receivedAtMs = Date.parse(event.serverReceivedAt);
        if (!Number.isNaN(ignoreBeforeMs) && !Number.isNaN(receivedAtMs) && receivedAtMs <= ignoreBeforeMs) {
            continue;
        }

        if (Number.isNaN(receivedAtMs) || nowMs < receivedAtMs || nowMs - receivedAtMs > PUBLIC_RECENT_WINDOW_MS) {
            continue;
        }

        recentCountByLocationId[event.locationId] = (recentCountByLocationId[event.locationId] || 0) + 1;
    }

    const burstLocationId = findPublicBurstLocation(recentCountByLocationId);

    return {
        generatedAt: now.toISOString(),
        locations: PUBLIC_LOCATIONS.map(location => {
            const recentCount = recentCountByLocationId[location.locationId] || 0;
            let status = 'idle';

            if (location.locationId === burstLocationId) {
                status = 'burst';
            } else if (recentCount > 0) {
                status = 'active';
            }

            return {
                label: location.label,
                locationId: location.locationId,
                status,
                recentCount
            };
        })
    };
}

function findPublicBurstLocation(recentCountByLocationId) {
    let burstLocationId = null;
    let burstCount = PUBLIC_BURST_THRESHOLD - 1;

    for (const location of PUBLIC_LOCATIONS) {
        const recentCount = recentCountByLocationId[location.locationId] || 0;
        if (recentCount > burstCount) {
            burstLocationId = location.locationId;
            burstCount = recentCount;
        }
    }

    return burstLocationId;
}

function isControlAuthorized(req) {
    const expectedToken = process.env.CONTROL_TOKEN;
    if (!expectedToken) {
        return true;
    }

    const header = req.headers.authorization || '';
    const [scheme, token] = header.split(' ');

    if (scheme !== 'Bearer' || typeof token !== 'string') {
        return false;
    }

    const left = Buffer.from(token, 'utf8');
    const right = Buffer.from(expectedToken, 'utf8');

    return left.length === right.length && crypto.timingSafeEqual(left, right);
}

function findSensitiveField(payload) {
    if (!payload || typeof payload !== 'object') {
        return null;
    }

    for (const [key, value] of Object.entries(payload)) {
        if (SENSITIVE_FIELDS.has(key)) {
            return key;
        }

        if (value && typeof value === 'object') {
            const nested = findSensitiveField(value);
            if (nested) {
                return nested;
            }
        }
    }

    return null;
}

function findUnexpectedField(payload) {
    for (const key of Object.keys(payload)) {
        if (!ALLOWED_EVENT_FIELDS.has(key)) {
            return key;
        }
    }

    return null;
}

function isNonEmptyString(value) {
    return typeof value === 'string' && value.trim().length > 0;
}

function isWithinMaxLength(value, maxLength) {
    return typeof value === 'string' && value.length <= maxLength;
}

function isValidTimestampString(value) {
    return typeof value === 'string' && !Number.isNaN(Date.parse(value));
}

function parsePort(value) {
    if (value === undefined || value === '') {
        return DEFAULT_PORT;
    }

    const port = Number(value);
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
        throw new Error(`Invalid PORT value: ${value}`);
    }

    return port;
}

function setCorsHeaders(res) {
    res.setHeader('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGIN || '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function sendJson(res, statusCode, body) {
    const payload = JSON.stringify(body);
    res.writeHead(statusCode, {
        'Cache-Control': 'no-store',
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Length': Buffer.byteLength(payload)
    });
    res.end(payload);
}

function sendHtml(res, statusCode, html) {
    res.writeHead(statusCode, {
        'Cache-Control': 'no-store',
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Length': Buffer.byteLength(html)
    });
    res.end(html);
}

function createStatusPageHtml() {
    return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>QR Location Status</title>
  <style>
    :root {
      color-scheme: light;
      font-family: Arial, sans-serif;
      background: #f4f4f4;
      color: #111;
    }

    body {
      margin: 0;
      padding: 24px;
    }

    main {
      max-width: 720px;
      margin: 0 auto;
    }

    h1 {
      margin: 0 0 8px;
      font-size: 24px;
    }

    #message {
      margin: 0 0 16px;
      min-height: 20px;
      color: #444;
    }

    .location-list {
      display: grid;
      gap: 12px;
    }

    .location {
      border: 2px solid #999;
      background: #fff;
      padding: 16px;
    }

    .location h2 {
      margin: 0 0 8px;
      font-size: 20px;
    }

    .location p {
      margin: 4px 0;
    }

    .status-idle {
      border-color: #999;
    }

    .status-active {
      border-color: #1c6ed0;
    }

    .status-burst {
      border-color: #b00020;
      font-weight: bold;
    }
  </style>
</head>
<body>
  <main>
    <h1>QR Location Status</h1>
    <p id="message">Loading...</p>
    <div id="locations" class="location-list"></div>
  </main>
  <script>
    const message = document.getElementById('message');
    const locations = document.getElementById('locations');

    function render(data) {
      message.textContent = 'Last updated: ' + data.generatedAt;
      locations.innerHTML = '';

      for (const location of data.locations) {
        const block = document.createElement('section');
        block.className = 'location status-' + location.status;
        block.innerHTML =
          '<h2>' + escapeHtml(location.label) + '</h2>' +
          '<p>locationId: ' + escapeHtml(location.locationId) + '</p>' +
          '<p>status: ' + escapeHtml(location.status) + '</p>' +
          '<p>recent scan count: ' + Number(location.recentCount || 0) + '</p>';
        locations.appendChild(block);
      }
    }

    function escapeHtml(value) {
      return String(value).replace(/[&<>"']/g, character => {
        return {
          '&': '&amp;',
          '<': '&lt;',
          '>': '&gt;',
          '"': '&quot;',
          "'": '&#39;'
        }[character];
      });
    }

    async function refresh() {
      try {
        const response = await fetch('/api/public/locations', {
          cache: 'no-store'
        });

        if (!response.ok) {
          throw new Error('Request failed');
        }

        render(await response.json());
      } catch {
        message.textContent = 'Status unavailable. Retrying...';
      }
    }

    refresh();
    setInterval(refresh, 2000);
  </script>
</body>
</html>`;
}

function logEventDebug(message, details = {}) {
    console.info('[event server]', message, details);
}

function sendNoContent(res) {
    res.writeHead(204);
    res.end();
}

function sendMethodNotAllowed(res, allowedMethods) {
    res.setHeader('Allow', allowedMethods.join(', '));
    return sendJson(res, 405, {
        ok: false,
        error: 'Method not allowed.'
    });
}

function createServer() {
    return http.createServer((req, res) => {
        handleRequest(req, res).catch(() => {
            if (!res.headersSent) {
                setCorsHeaders(res);
                sendJson(res, 500, {
                    ok: false,
                    error: 'Internal server error.'
                });
            } else {
                res.end();
            }
        });
    });
}

if (require.main === module) {
    let port;

    try {
        port = parsePort(process.env.PORT);
    } catch (error) {
        console.error(error.message);
        process.exit(1);
    }

    eventStore.ensureStore()
        .then(() => {
            createServer().listen(port, () => {
                console.log(`Event server listening on http://localhost:${port}`);
            });
        })
        .catch(() => {
            process.exit(1);
        });
}

module.exports = {
    createServer,
    validateEventPayload
};
