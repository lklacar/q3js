const dgram = require('dgram');
const http = require('http');
const WebSocket = require('ws');
const { env } = require('./env');

const MASTER_SERVER_BASE = env.MASTER_SERVER_BASE;
const HEARTBEAT_INTERVAL_MS = env.HEARTBEAT_INTERVAL_MS;
const TARGET_HOST = env.TARGET_HOST;
const TARGET_PORT = env.TARGET_PORT;
const PROXY_PORT = env.PROXY_PORT;
const SECURE = env.SECURE;

let publishHost = env.PUBLISH_HOST;
const publishPort = env.PUBLISH_PORT || PROXY_PORT;

const HEARTBEAT_URL = `${MASTER_SERVER_BASE}/api/servers/heartbeat`;
const MAX_WS_BUFFERED_BYTES = 1_000_000;

let heartbeatBodyJson = null;
let heartbeatInFlight = false;

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
});

httpServer.listen(PROXY_PORT, () => {
    console.log(`WS<->UDP proxy on ws://0.0.0.0:${PROXY_PORT}/`);
    console.log(`Default target: ${TARGET_HOST}:${TARGET_PORT}`);
});

wss.on('connection', ws => {
    const udp = dgram.createSocket('udp4');
    udp.connect(TARGET_PORT, TARGET_HOST);

    let closed = false;
    function close() {
        if (closed) return;
        closed = true;
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
        await sendHeartbeat();
        heartbeatLoop().catch(err => {
            console.error('Heartbeat loop crashed:', err);
        });
    } catch (e) {
        console.error('Startup failed:', e);
        process.exit(1);
    }
})();
