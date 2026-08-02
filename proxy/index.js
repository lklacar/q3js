const dgram = require('dgram');
const fs = require('fs');
const http = require('http');
const path = require('path');
const WebSocket = require('ws');
const { env } = require('./env');

const MASTER_SERVER_BASE = env.MASTER_SERVER_BASE;
const HEARTBEAT_INTERVAL_MS = env.HEARTBEAT_INTERVAL_MS;
const BAN_REFRESH_INTERVAL_MS = env.BAN_REFRESH_INTERVAL_MS;
const COUNTRY_CACHE_TTL_MS = env.COUNTRY_CACHE_TTL_MS;
const COUNTRY_LOOKUP_TIMEOUT_MS = env.COUNTRY_LOOKUP_TIMEOUT_MS;
const GEO_BLOCK_FAIL_CLOSED = env.GEO_BLOCK_FAIL_CLOSED;
const TARGET_HOST = env.TARGET_HOST;
const TARGET_PORT = env.TARGET_PORT;
const PROXY_PORT = env.PROXY_PORT;
const SECURE = env.SECURE;
const Q3JS_VM_PK3_PATH = path.resolve(env.Q3JS_VM_PK3_PATH);
const Q3JS_VM_PK3_ROUTE = '/q3js/zz-q3js-vm-v1.pk3';

let publishHost = env.PUBLISH_HOST;
const publishPort = env.PUBLISH_PORT || PROXY_PORT;

const HEARTBEAT_URL = `${MASTER_SERVER_BASE}/api/servers/heartbeat`;
const BANS_URL = `${MASTER_SERVER_BASE}/api/bans`;
const COUNTRY_LOOKUP_URL = `${MASTER_SERVER_BASE}/api/country/lookup`;
const MAX_WS_BUFFERED_BYTES = 1_000_000;
const Q3_CONNECTIONLESS_DISCONNECT = Buffer.from([
    0xff, 0xff, 0xff, 0xff,
    ...Buffer.from('disconnect\n', 'ascii'),
]);
const blockedCountryCodes = parseCountryCodes(env.BLOCKED_COUNTRY_CODES);

let heartbeatBodyJson = null;
let heartbeatInFlight = false;
let banRefreshInFlight = false;
let bannedIps = new Set();
const countryCache = new Map();
const activeClients = new Map();

function parseCountryCodes(value) {
    return new Set(
        String(value || '')
            .split(',')
            .map(code => code.trim().toUpperCase())
            .filter(Boolean)
    );
}

function rebuildHeartbeatBody() {
    if (!publishHost) {
        heartbeatBodyJson = null;
        return;
    }

    heartbeatBodyJson = JSON.stringify({
        targetHost: publishHost,
        proxyPort: publishPort,
        targetPort: TARGET_PORT,
        secure: SECURE,
    });
}

async function initPublishHost() {
    if (publishHost) {
        rebuildHeartbeatBody();
        return;
    }

    const res = await fetch('https://api.ipify.org');
    publishHost = await res.text();
    rebuildHeartbeatBody();
    console.log(`Resolved public IP: ${publishHost}`);
}

async function sendHeartbeat() {
    if (!heartbeatBodyJson || heartbeatInFlight) {
        return;
    }

    heartbeatInFlight = true;
    try {
        const res = await fetch(HEARTBEAT_URL, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: heartbeatBodyJson,
        });

        if (!res.ok) {
            console.warn('Heartbeat failed:', res.status, res.statusText);
        }
    } catch (e) {
        console.warn('Heartbeat error:', e.message);
    } finally {
        heartbeatInFlight = false;
    }
}

async function heartbeatLoop() {
    for (;;) {
        await sendHeartbeat();
        await new Promise(resolve => setTimeout(resolve, HEARTBEAT_INTERVAL_MS));
    }
}

function normalizeIp(value) {
    if (!value) return null;

    let normalized = String(value).trim();
    if (!normalized) return null;

    if (normalized.includes(',')) {
        normalized = normalized.split(',')[0].trim();
    }

    if (normalized.startsWith('[') && normalized.includes(']')) {
        normalized = normalized.slice(1, normalized.indexOf(']'));
    }

    if (normalized.startsWith('::ffff:')) {
        normalized = normalized.slice('::ffff:'.length);
    }

    const lastColon = normalized.lastIndexOf(':');
    if (lastColon > 0 && normalized.indexOf(':') === lastColon && normalized.includes('.')) {
        normalized = normalized.slice(0, lastColon);
    }

    return normalized;
}

function clientIp(req) {
    return normalizeIp(
        req.headers['x-forwarded-for']
        || req.headers['x-real-ip']
        || req.socket?.remoteAddress
    );
}

function isCountryCacheFresh(entry) {
    return entry && Date.now() - entry.checkedAt < COUNTRY_CACHE_TTL_MS;
}

async function lookupCountry(ip) {
    const cached = countryCache.get(ip);
    if (isCountryCacheFresh(cached)) {
        return cached.countryCode;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), COUNTRY_LOOKUP_TIMEOUT_MS);

    try {
        const url = new URL(COUNTRY_LOOKUP_URL);
        url.searchParams.set('ip', ip);
        const res = await fetch(url, {signal: controller.signal});

        if (!res.ok) {
            throw new Error(`HTTP ${res.status}`);
        }

        const body = await res.json();
        const countryCode = typeof body?.countryCode === 'string'
            ? body.countryCode.trim().toUpperCase()
            : null;
        countryCache.set(ip, {countryCode, checkedAt: Date.now()});
        return countryCode;
    } finally {
        clearTimeout(timeout);
    }
}

async function clientBlockReason(ip) {
    if (!ip) {
        return null;
    }

    if (bannedIps.has(ip)) {
        return 'Banned';
    }

    if (blockedCountryCodes.size === 0) {
        return null;
    }

    try {
        const countryCode = await lookupCountry(ip);
        if (countryCode && blockedCountryCodes.has(countryCode)) {
            return `Region blocked (${countryCode})`;
        }
    } catch (e) {
        console.warn(`Country lookup failed for ${ip}:`, e.message);
        if (GEO_BLOCK_FAIL_CLOSED) {
            return 'Region check unavailable';
        }
    }

    return null;
}

async function refreshBannedIps() {
    if (banRefreshInFlight) {
        return;
    }

    banRefreshInFlight = true;
    try {
        const res = await fetch(BANS_URL);
        if (!res.ok) {
            console.warn('Ban refresh failed:', res.status, res.statusText);
            return;
        }

        const bans = await res.json();
        bannedIps = new Set(
            (Array.isArray(bans) ? bans : [])
                .map(ban => normalizeIp(ban.ipAddress))
                .filter(Boolean)
        );

        for (const [ws, ip] of activeClients.entries()) {
            if (ip && bannedIps.has(ip) && ws.readyState === WebSocket.OPEN) {
                console.warn(`Closing banned client ${ip}`);
                try {
                    ws.close(1008, 'Banned');
                } catch {}
            }
        }
    } catch (e) {
        console.warn('Ban refresh error:', e.message);
    } finally {
        banRefreshInFlight = false;
    }
}

async function banRefreshLoop() {
    for (;;) {
        await refreshBannedIps();
        await new Promise(resolve => setTimeout(resolve, BAN_REFRESH_INTERVAL_MS));
    }
}

function setCorsHeaders(res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function sendJson(res, statusCode, payload) {
    setCorsHeaders(res);
    res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(payload));
}

function serveQ3JSVmPak(req, res) {
    fs.stat(Q3JS_VM_PK3_PATH, (statError, stat) => {
        if (statError || !stat.isFile()) {
            if (statError && statError.code !== 'ENOENT') {
                console.warn(`Unable to inspect Q3JS VM pk3 at ${Q3JS_VM_PK3_PATH}:`, statError.message);
            }
            sendJson(res, 404, {error: 'Q3JS VM pk3 not found'});
            return;
        }

        setCorsHeaders(res);
        res.writeHead(200, {
            'Content-Type': 'application/zip',
            'Content-Length': stat.size,
            'Cache-Control': 'no-store',
        });

        if (req.method === 'HEAD') {
            res.end();
            return;
        }

        const stream = fs.createReadStream(Q3JS_VM_PK3_PATH);
        stream.on('error', error => {
            console.warn('Q3JS VM pk3 read failed:', error.message);
            res.destroy(error);
        });
        stream.pipe(res);
    });
}

const httpServer = http.createServer((req, res) => {
    if (req.method === 'OPTIONS') {
        setCorsHeaders(res);
        res.writeHead(204);
        res.end();
        return;
    }

    const requestPath = new URL(req.url || '/', 'http://localhost').pathname;

    if (req.method === 'GET' && requestPath === '/healthz') {
        sendJson(res, 200, { ok: true });
        return;
    }

    if ((req.method === 'GET' || req.method === 'HEAD') && requestPath === Q3JS_VM_PK3_ROUTE) {
        serveQ3JSVmPak(req, res);
        return;
    }

    sendJson(res, 404, { error: 'Not found' });
});

const wss = new WebSocket.Server({
    server: httpServer,
    perMessageDeflate: false,
    verifyClient(info, done) {
        const ip = clientIp(info.req);
        clientBlockReason(ip)
            .then(reason => {
                if (reason) {
                    console.warn(`Rejected client ${ip}: ${reason}`);
                    done(false, 403, reason);
                    return;
                }

                done(true);
            })
            .catch(e => {
                console.warn(`Client access check failed for ${ip || 'unknown IP'}:`, e.message);
                done(true);
            });
    },
});

httpServer.listen(PROXY_PORT, () => {
    console.log(`WS<->UDP proxy on ws://0.0.0.0:${PROXY_PORT}/`);
    console.log(`Default target: ${TARGET_HOST}:${TARGET_PORT}`);
});

wss.on('connection', (ws, req) => {
    const ip = clientIp(req);
    if (ip && bannedIps.has(ip)) {
        console.warn(`Rejected banned client ${ip}`);
        try {
            ws.close(1008, 'Banned');
        } catch {}
        return;
    }

    if (ip) {
        activeClients.set(ws, ip);
    }

    const udp = dgram.createSocket('udp4');

    let closed = false;
    let sentToUdp = false;

    function closeUdp() {
        try {
            udp.close();
        } catch {}
    }

    function close(notifyTarget = false) {
        if (closed) return;
        closed = true;
        activeClients.delete(ws);

        if (!notifyTarget || !sentToUdp) {
            closeUdp();
            return;
        }

        const closeTimer = setTimeout(closeUdp, 100);
        closeTimer.unref?.();

        try {
            udp.send(Q3_CONNECTIONLESS_DISCONNECT, TARGET_PORT, TARGET_HOST, err => {
                clearTimeout(closeTimer);
                if (err) {
                    console.warn('UDP disconnect send error:', err.message);
                }
                closeUdp();
            });
        } catch (e) {
            clearTimeout(closeTimer);
            console.warn('UDP disconnect send error:', e.message);
            closeUdp();
        }
    }

    udp.on('message', msg => {
        if (ws.readyState !== WebSocket.OPEN) return;
        if (ws.bufferedAmount > MAX_WS_BUFFERED_BYTES) return;

        ws.send(msg, { binary: true }, err => {
            if (err) console.warn('WS send error:', err.message);
        });
    });

    udp.on('error', err => {
        console.warn('UDP error:', err.message);
        close();
        try {
            ws.close();
        } catch {}
    });

    ws.on('message', (data, isBinary) => {
        if (!isBinary) return;

        sentToUdp = true;
        udp.send(data, TARGET_PORT, TARGET_HOST, err => {
            if (err) console.warn('UDP send error:', err.message);
        });
    });

    ws.on('close', () => close(true));
    ws.on('error', () => close(true));
});

(async () => {
    try {
        await initPublishHost();
        await refreshBannedIps();
        await sendHeartbeat();
        heartbeatLoop().catch(err => {
            console.error('Heartbeat loop crashed:', err);
        });
        banRefreshLoop().catch(err => {
            console.error('Ban refresh loop crashed:', err);
        });
    } catch (e) {
        console.error('Startup failed:', e);
        process.exit(1);
    }
})();
