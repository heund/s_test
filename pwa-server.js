const fs = require('node:fs/promises');
const http = require('node:http');
const path = require('node:path');
const { URL } = require('node:url');

const DEFAULT_PORT = 3000;
const rootDir = __dirname;

const MIME_TYPES = {
    '.css': 'text/css; charset=utf-8',
    '.html': 'text/html; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.md': 'text/markdown; charset=utf-8',
    '.png': 'image/png',
    '.svg': 'image/svg+xml',
    '.txt': 'text/plain; charset=utf-8',
    '.webmanifest': 'application/manifest+json; charset=utf-8'
};
const ALLOWED_FILES = new Set([
    'index.html',
    'manifest.json',
    'qr_code_1.png',
    'qr_code_2.png'
]);
const ALLOWED_DIRS = [
    'data/',
    'q/',
    'qrcode/',
    'scripts/',
    'shared/',
    'styles/'
];

function runtimeConfig() {
    const accessPasscode = process.env.PWA_ACCESS_PASSCODE || '';

    return {
        eventServerUrl: (process.env.EVENT_SERVER_URL || 'https://server-production-930ca.up.railway.app').replace(/\/+$/, ''),
        debugEventLogger: process.env.DEBUG_EVENT_LOGGER === 'true',
        requirePasscode: accessPasscode.length > 0,
        accessPasscode
    };
}

function parsePort(value) {
    if (!value) return DEFAULT_PORT;

    const port = Number(value);
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
        throw new Error(`Invalid PORT value: ${value}`);
    }

    return port;
}

function send(res, statusCode, headers, body) {
    res.writeHead(statusCode, {
        'Cache-Control': 'no-store',
        ...headers
    });
    res.end(body);
}

function sendJson(res, statusCode, value) {
    send(res, statusCode, {
        'Content-Type': 'application/json; charset=utf-8'
    }, `${JSON.stringify(value)}\n`);
}

function safeFilePath(urlPathname) {
    const decodedPath = decodeURIComponent(urlPathname);
    const relativePath = (decodedPath === '/' ? 'index.html' : decodedPath.replace(/^\/+/, '')).replace(/\\/g, '/');
    const isAllowed = ALLOWED_FILES.has(relativePath) || ALLOWED_DIRS.some(dir => relativePath.startsWith(dir));

    if (!isAllowed || relativePath.includes('..')) {
        return null;
    }

    const filePath = path.resolve(rootDir, relativePath);

    if (!filePath.startsWith(rootDir)) {
        return null;
    }

    return filePath;
}

async function handleRequest(req, res) {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
        return sendJson(res, 405, {
            ok: false,
            error: 'Method not allowed.'
        });
    }

    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

    if (url.pathname === '/data/runtime-config.json') {
        return sendJson(res, 200, runtimeConfig());
    }

    const filePath = safeFilePath(url.pathname);
    if (!filePath) {
        return sendJson(res, 403, {
            ok: false,
            error: 'Forbidden.'
        });
    }

    try {
        const stat = await fs.stat(filePath);
        if (!stat.isFile()) {
            return sendJson(res, 404, {
                ok: false,
                error: 'Not found.'
            });
        }

        const ext = path.extname(filePath);
        const body = req.method === 'HEAD' ? '' : await fs.readFile(filePath);
        send(res, 200, {
            'Content-Type': MIME_TYPES[ext] || 'application/octet-stream'
        }, body);
    } catch {
        sendJson(res, 404, {
            ok: false,
            error: 'Not found.'
        });
    }
}

if (require.main === module) {
    const port = parsePort(process.env.PORT);
    http.createServer((req, res) => {
        handleRequest(req, res).catch(() => {
            sendJson(res, 500, {
                ok: false,
                error: 'Internal server error.'
            });
        });
    }).listen(port, () => {
        console.log(`PWA demo server listening on http://localhost:${port}`);
    });
}
