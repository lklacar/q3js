const dgram = require('dgram');
const http = require('http');
const WebSocket = require('ws');
const { env } = require('./env');

const MASTER_SERVER_BASE = env.MASTER_SERVER_BASE;
const HEARTBEAT_INTERVAL_MS = env.HEARTBEAT_INTERVAL_MS;
const BAN_REFRESH_INTERVAL_MS = env.BAN_REFRESH_INTERVAL_MS;
const TARGET_HOST = env.TARGET_HOST;
const TARGET_PORT = env.TARGET_PORT;
const PROXY_PORT = env.PROXY_PORT;
const SECURE = env.SECURE;

let publishHost = env.PUBLISH_HOST;
const publishPort = env.PUBLISH_PORT || PROXY_PORT;

const HEARTBEAT_URL = `${MASTER_SERVER_BASE}/api/servers/heartbeat`;
const BANS_URL = `${MASTER_SERVER_BASE}/api/bans`;
const MAX_WS_BUFFERED_BYTES = 1_000_000;

let heartbeatBodyJson = null;
let heartbeatInFlight = false;
let banRefreshInFlight = false;
let bannedIps = new Set();
const activeClients = new Map();

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
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function sendJson(res, statusCode, payload) {
    setCorsHeaders(res);
    res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(payload));
}

const httpServer = http.createServer((req, res) => {
    if (req.method === 'OPTIONS') {
        setCorsHeaders(res);
        res.writeHead(204);
        res.end();
        return;
    }

    const path = req.url || '/';

    if (req.method === 'GET' && path === '/healthz') {
        sendJson(res, 200, { ok: true });
        return;
    }

    sendJson(res, 404, { error: 'Not found' });
});

const wss = new WebSocket.Server({
    server: httpServer,
    perMessageDeflate: false,
    verifyClient(info, done) {
        const ip = clientIp(info.req);
        if (ip && bannedIps.has(ip)) {
            console.warn(`Rejected banned client ${ip}`);
            done(false, 403, 'Banned');
            return;
        }

        done(true);
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
    function close() {
        if (closed) return;
        closed = true;
        activeClients.delete(ws);
        try {
            udp.close();
        } catch {}
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

        udp.send(data, TARGET_PORT, TARGET_HOST, err => {
            if (err) console.warn('UDP send error:', err.message);
        });
    });

    ws.on('close', close);
    ws.on('error', close);
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
