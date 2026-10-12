/* Native WebSocket transport. Game packets still use the Quake netchan. */
#include "q_shared.h"
#include "qcommon.h"
#include "../server/server.h"
#include <libwebsockets.h>
#include <limits.h>
#include <errno.h>
#ifndef _WIN32
#include <arpa/inet.h>
#include <fcntl.h>
#include <unistd.h>
#else
#include <winsock2.h>
#include <ws2tcpip.h>
#endif

#define WS_CONTROL_LIMIT (1024 * 1024)
#define WS_BUFFER_LIMIT 1000000

struct ws_packet {
    struct ws_packet *next;
    size_t length, offset;
    netadr_t address;
    unsigned char data[];
};
struct ws_peer {
    struct ws_peer *next;
    struct lws *wsi;
    netadr_t address;
    unsigned char *receive;
    size_t received, buffered;
    struct ws_packet *head, *tail;
    int lastActivity;
    enum lws_close_status closeStatus;
    const char *closeReason;
    const char *httpBody;
    qboolean reported;
};

static struct lws_context *ws_context;
static struct ws_peer *ws_peers;
static struct lws_pollfd *ws_pollfds;
static int ws_pollcount, ws_pollcapacity, ws_count;
static unsigned int ws_nextId;
static cvar_t *ws_port, *ws_host, *ws_maxConnections, *ws_maxPacket, *ws_idle, *ws_trustedHops;
static int ws_packetLimit;
static int ws_control = -1;
static qboolean ws_controlInitialized, ws_policyReady = qtrue;
static netadr_t *ws_bans;
static size_t ws_banCount;
static unsigned char ws_controlInput[WS_CONTROL_LIMIT + 4];
static size_t ws_controlReceived;
static struct ws_packet *ws_controlHead, *ws_controlTail;
static struct ws_packet *ws_inputHead, *ws_inputTail;
static size_t ws_inputBuffered;
static size_t ws_controlBuffered;

static qboolean WS_ParseIp(const char *text, netadr_t *address) {
    struct in6_addr ipv6;
    memset(address, 0, sizeof(*address));
    if (inet_pton(AF_INET, text, address->ip) == 1) {
        address->type = NA_IP;
        return qtrue;
    }
    if (inet_pton(AF_INET6, text, &ipv6) != 1)
        return qfalse;
    if (IN6_IS_ADDR_V4MAPPED(&ipv6)) {
        address->type = NA_IP;
        memcpy(address->ip, ((unsigned char *)&ipv6) + 12, 4);
    } else {
        address->type = NA_IP6;
        memcpy(address->ip6, &ipv6, 16);
    }
    return qtrue;
}

static qboolean WS_ClientAddress(struct lws *wsi, netadr_t *address) {
    char peer[NET_ADDRSTRMAXLEN], forwarded[4096], *cursor, *end;
    netadr_t chain[16];
    int count = 0, hops = ws_trustedHops->integer;
    if (!lws_get_peer_simple(wsi, peer, sizeof(peer)) || !WS_ParseIp(peer, address))
        return qfalse;
    if (!hops)
        return qtrue;
    if (hops < 0 || hops > 16 ||
        lws_hdr_copy(wsi, forwarded, sizeof(forwarded), WSI_TOKEN_X_FORWARDED_FOR) <= 0)
        return qfalse;
    cursor = forwarded;
    while (cursor) {
        netadr_t parsed;
        end = strchr(cursor, ',');
        if (end) *end++ = 0;
        while (*cursor == ' ' || *cursor == '\t') cursor++;
        {
            char *last = cursor + strlen(cursor);
            while (last > cursor && (last[-1] == ' ' || last[-1] == '\t')) *--last = 0;
        }
        if (!WS_ParseIp(cursor, &parsed)) return qfalse;
        chain[count++ % 16] = parsed;
        cursor = end;
    }
    if (count < hops) return qfalse;
    *address = chain[(count - hops) % 16];
    return qtrue;
}

static qboolean WS_Banned(netadr_t address) {
    size_t index;
    for (index = 0; index < ws_banCount; index++)
        if (NET_CompareBaseAdrMask(address, ws_bans[index], -1)) return qtrue;
    return qfalse;
}

static qboolean WS_Ready(void) {
    return ws_policyReady && com_sv_running && com_sv_running->integer;
}

static struct ws_packet *WS_Packet(const void *data, size_t length, size_t padding) {
    struct ws_packet *packet = malloc(sizeof(*packet) + padding + length);
    if (!packet) Com_Error(ERR_FATAL, "WebSocket packet allocation failed");
    packet->next = NULL;
    packet->length = length;
    packet->offset = 0;
    memcpy(packet->data + padding, data, length);
    return packet;
}

static void WS_Close(struct ws_peer *peer, enum lws_close_status status, const char *reason) {
    if (peer->closeReason) return;
    peer->closeStatus = status;
    peer->closeReason = reason;
    /* Async timeout also closes a peer whose send buffer never becomes writable. */
    lws_set_timeout(peer->wsi, PENDING_TIMEOUT_CLOSE_SEND, 1);
    lws_callback_on_writable(peer->wsi);
}

static void WS_ApplyPolicy(unsigned char *payload, size_t length) {
    netadr_t *next;
    size_t count = 0, capacity = 0;
    char *cursor = (char *)payload + 1, *end;
    struct ws_peer *peer;
    if (!length || payload[0] > 1 || memchr(payload + 1, 0, length - 1))
        Com_Error(ERR_FATAL, "Invalid native WebSocket policy");
    payload[length] = 0;
    for (end = cursor; *end; end++) if (*end == '\n') capacity++;
    next = capacity ? malloc(capacity * sizeof(*next)) : NULL;
    if (capacity && !next) Com_Error(ERR_FATAL, "WebSocket ban allocation failed");
    while (*cursor) {
        end = strchr(cursor, '\n');
        if (!end) { free(next); Com_Error(ERR_FATAL, "Incomplete WebSocket ban policy"); return; }
        *end = 0;
        if (!WS_ParseIp(cursor, &next[count])) {
            free(next);
            Com_Error(ERR_FATAL, "Invalid WebSocket ban address");
            return;
        }
        count++;
        cursor = end + 1;
    }
    free(ws_bans);
    ws_bans = next;
    ws_banCount = count;
    ws_policyReady = payload[0] ? qtrue : qfalse;
    for (peer = ws_peers; peer; peer = peer->next)
        if (WS_Banned(peer->address)) WS_Close(peer, LWS_CLOSE_STATUS_POLICY_VIOLATION, "IP address banned");
}

#ifndef _WIN32
static void WS_ControlService(void) {
    int budget;
    if (ws_control < 0) return;
    for (budget = 0; budget < 16; budget++) {
        ssize_t received;
        uint32_t length;
        size_t remaining = ws_controlReceived < 4 ? 4 - ws_controlReceived : 0;
        if (ws_controlReceived >= 4) {
            memcpy(&length, ws_controlInput, 4);
            length = ntohl(length);
            if (length < 1 || length >= WS_CONTROL_LIMIT)
                Com_Error(ERR_FATAL, "Invalid native WebSocket control length");
            remaining = 4 + length - ws_controlReceived;
            if (!remaining) {
                WS_ApplyPolicy(ws_controlInput + 4, length);
                ws_controlReceived = 0;
                continue;
            }
        }
        received = read(ws_control, ws_controlInput + ws_controlReceived, remaining);
        if (!received) Com_Error(ERR_FATAL, "Native WebSocket supervisor disconnected");
        if (received < 0) {
            if (errno == EAGAIN || errno == EWOULDBLOCK) break;
            if (errno == EINTR) continue;
            Com_Error(ERR_FATAL, "Native WebSocket control read failed");
        }
        ws_controlReceived += received;
    }
    for (budget = 0; ws_controlHead && budget < 16; budget++) {
        struct ws_packet *packet = ws_controlHead;
        ssize_t sent = write(ws_control, packet->data + packet->offset, packet->length - packet->offset);
        if (sent < 0) {
            if (errno == EAGAIN || errno == EWOULDBLOCK) break;
            if (errno == EINTR) continue;
            Com_Error(ERR_FATAL, "Native WebSocket control write failed");
        }
        packet->offset += sent;
        if (packet->offset == packet->length) {
            ws_controlHead = packet->next;
            if (!ws_controlHead) ws_controlTail = NULL;
            ws_controlBuffered -= packet->length;
            free(packet);
        }
    }
}
#endif

void NET_WSPlayerConnected(netadr_t from, const char *userinfo) {
    struct ws_peer *peer;
    struct ws_packet *packet;
    unsigned char payload[NET_ADDRSTRMAXLEN + MAX_INFO_STRING + 4];
    const char *ip;
    size_t ipLength, infoLength, length;
    uint32_t encodedLength;
    if (!from.websocketId || ws_control < 0) return;
    for (peer = ws_peers; peer && peer->address.websocketId != from.websocketId; peer = peer->next) {}
    if (!peer || peer->reported) return;
    ip = NET_AdrToString(from);
    ipLength = strlen(ip) + 1;
    infoLength = strlen(userinfo);
    length = ipLength + infoLength;
    encodedLength = htonl((uint32_t)length);
    memcpy(payload, &encodedLength, 4);
    memcpy(payload + 4, ip, ipLength);
    memcpy(payload + 4 + ipLength, userinfo, infoLength);
    if (ws_controlBuffered + length + 4 > WS_CONTROL_LIMIT)
        Com_Error(ERR_FATAL, "Native WebSocket reporting queue exceeded its limit");
    packet = WS_Packet(payload, length + 4, 0);
    if (ws_controlTail) ws_controlTail->next = packet;
    else ws_controlHead = packet;
    ws_controlTail = packet;
    ws_controlBuffered += packet->length;
    peer->reported = qtrue;
}

static int WS_Http(struct lws *wsi, struct ws_peer *peer, int status, const char *body) {
    unsigned char headers[LWS_PRE + 512], *cursor = headers + LWS_PRE;
    unsigned char *end = headers + sizeof(headers);
    peer->httpBody = body;
    if (lws_add_http_common_headers(wsi, status, "application/json", strlen(body), &cursor, end) ||
        lws_finalize_write_http_header(wsi, headers + LWS_PRE, &cursor, end)) return -1;
    lws_callback_on_writable(wsi);
    return 0;
}

static int WS_Callback(struct lws *wsi, enum lws_callback_reasons reason,
                       void *user, void *input, size_t length) {
    struct ws_peer *peer = user;
    struct lws_pollargs *args = input;
    int index;
    switch (reason) {
    case LWS_CALLBACK_ADD_POLL_FD:
        if (ws_pollcount == ws_pollcapacity) return -1;
#ifndef _WIN32
        if (args->fd >= FD_SETSIZE) return -1;
#endif
        ws_pollfds[ws_pollcount].fd = args->fd;
        ws_pollfds[ws_pollcount++].events = args->events;
        break;
    case LWS_CALLBACK_DEL_POLL_FD:
        for (index = 0; index < ws_pollcount; index++)
            if (ws_pollfds[index].fd == args->fd) {
                ws_pollfds[index] = ws_pollfds[--ws_pollcount];
                break;
            }
        break;
    case LWS_CALLBACK_CHANGE_MODE_POLL_FD:
        for (index = 0; index < ws_pollcount; index++)
            if (ws_pollfds[index].fd == args->fd) ws_pollfds[index].events = args->events;
        break;
    case LWS_CALLBACK_HTTP:
        if (!strcmp(input, "/healthz") && lws_hdr_total_length(wsi, WSI_TOKEN_GET_URI)) {
            qboolean ready = WS_Ready();
            return WS_Http(wsi, peer, ready ? 200 : 503, ready ?
                "{\"status\":\"ready\",\"gateway\":\"up\",\"gameServer\":\"up\"}" :
                "{\"status\":\"starting\",\"gateway\":\"up\",\"gameServer\":\"starting\"}");
        }
        return WS_Http(wsi, peer, 404, "{\"error\":\"Not found\"}");
    case LWS_CALLBACK_HTTP_WRITEABLE:
        if (peer->httpBody) {
            unsigned char body[LWS_PRE + 128];
            size_t size = strlen(peer->httpBody);
            memcpy(body + LWS_PRE, peer->httpBody, size);
            if (lws_write(wsi, body + LWS_PRE, size, LWS_WRITE_HTTP_FINAL) < 0) return -1;
            return lws_http_transaction_completed(wsi) ? -1 : 0;
        }
        break;
    case LWS_CALLBACK_HTTP_CONFIRM_UPGRADE:
        {
            char path[128];
            netadr_t address;
            int status = 0;
            if (lws_hdr_copy(wsi, path, sizeof(path), WSI_TOKEN_GET_URI) <= 0 ||
                (strcmp(path, "/") && strcmp(path, "/ws")) ||
                lws_hdr_total_length(wsi, WSI_TOKEN_HTTP_URI_ARGS)) status = 404;
            else if (!WS_Ready() || ws_count >= ws_maxConnections->integer) status = 503;
            else if (!WS_ClientAddress(wsi, &address)) status = 400;
            else if (WS_Banned(address)) status = 403;
            if (status) {
                lws_return_http_status(wsi, status, NULL);
                return 1;
            }
        }
        break;
    case LWS_CALLBACK_ESTABLISHED:
        if (!WS_ClientAddress(wsi, &peer->address) || !WS_Ready() ||
            WS_Banned(peer->address) || ws_count >= ws_maxConnections->integer) return -1;
        /* Never reuse an ID: queued replies must not reach a later connection. */
        if (ws_nextId == UINT_MAX) return -1;
        peer->address.websocketId = ++ws_nextId;
        peer->wsi = wsi;
        peer->receive = malloc(ws_packetLimit);
        if (!peer->receive) return -1;
        peer->lastActivity = Sys_Milliseconds();
        peer->next = ws_peers;
        ws_peers = peer;
        ws_count++;
        break;
    case LWS_CALLBACK_RECEIVE:
        if (!lws_frame_is_binary(wsi)) return 0;
        if (peer->closeReason) return -1;
        if (length > (size_t)ws_packetLimit - peer->received) {
            lws_close_reason(wsi, LWS_CLOSE_STATUS_MESSAGE_TOO_LARGE, NULL, 0);
            return -1;
        }
        memcpy(peer->receive + peer->received, input, length);
        peer->received += length;
        peer->lastActivity = Sys_Milliseconds();
        if (lws_is_final_fragment(wsi) && !lws_remaining_packet_payload(wsi)) {
            struct ws_packet *packet;
            if (ws_inputBuffered + peer->received > WS_BUFFER_LIMIT) {
                lws_close_reason(wsi, LWS_CLOSE_STATUS_POLICY_VIOLATION, NULL, 0);
                return -1;
            }
            packet = WS_Packet(peer->receive, peer->received, 0);
            packet->address = peer->address;
            if (ws_inputTail) ws_inputTail->next = packet;
            else ws_inputHead = packet;
            ws_inputTail = packet;
            ws_inputBuffered += packet->length;
            peer->received = 0;
        }
        break;
    case LWS_CALLBACK_SERVER_WRITEABLE:
        if (peer->closeReason) {
            lws_close_reason(wsi, peer->closeStatus, (unsigned char *)peer->closeReason, strlen(peer->closeReason));
            return -1;
        }
        if (peer->head) {
            struct ws_packet *packet = peer->head;
            if (lws_write(wsi, packet->data + LWS_PRE, packet->length, LWS_WRITE_BINARY) != (int)packet->length)
                return -1;
            peer->head = packet->next;
            if (!peer->head) peer->tail = NULL;
            peer->buffered -= packet->length;
            free(packet);
            peer->lastActivity = Sys_Milliseconds();
            if (peer->head) lws_callback_on_writable(wsi);
        }
        break;
    case LWS_CALLBACK_CLOSED:
        if (peer && peer->receive) {
            struct ws_peer **link = &ws_peers;
            client_t *client;
            while (*link && *link != peer) link = &(*link)->next;
            if (*link) *link = peer->next;
            for (index = 0; svs.clients && index < sv_maxclients->integer; index++) {
                client = &svs.clients[index];
                if (client->state >= CS_CONNECTED && client->netchan.remoteAddress.websocketId == peer->address.websocketId)
                    SV_DropClient(client, peer->closeReason ? peer->closeReason : "disconnected");
            }
            while (peer->head) {
                struct ws_packet *packet = peer->head;
                peer->head = packet->next;
                free(packet);
            }
            free(peer->receive);
            peer->receive = NULL;
            ws_count--;
        }
        break;
    default:
        break;
    }
    return 0;
}

void NET_WSSendPacket(int length, const void *data, netadr_t to) {
    struct ws_peer *peer;
    struct ws_packet *packet;
    if (length < 0 || length > MAX_MSGLEN) return;
    for (peer = ws_peers; peer && peer->address.websocketId != to.websocketId; peer = peer->next) {}
    if (!peer || peer->closeReason) return;
    if (peer->buffered + length > WS_BUFFER_LIMIT) {
        WS_Close(peer, LWS_CLOSE_STATUS_POLICY_VIOLATION, "Client is too slow");
        return;
    }
    packet = WS_Packet(data, length, LWS_PRE);
    if (peer->tail) peer->tail->next = packet;
    else peer->head = packet;
    peer->tail = packet;
    peer->buffered += length;
    lws_callback_on_writable(peer->wsi);
}

qboolean NET_WSGetCvars(void) {
    int modified;
    ws_port = Cvar_Get("net_wsPort", "0", CVAR_LATCH);
    ws_host = Cvar_Get("net_wsHost", "0.0.0.0", CVAR_LATCH);
    ws_maxConnections = Cvar_Get("net_wsMaxConnections", "128", CVAR_LATCH);
    ws_maxPacket = Cvar_Get("net_wsMaxPacketBytes", "65535", CVAR_LATCH);
    ws_idle = Cvar_Get("net_wsIdleTimeoutMs", "120000", CVAR_LATCH);
    ws_trustedHops = Cvar_Get("net_wsTrustedProxyHops", "0", CVAR_LATCH);
    modified = ws_port->modified || ws_host->modified || ws_maxConnections->modified ||
        ws_maxPacket->modified || ws_idle->modified || ws_trustedHops->modified;
    ws_port->modified = ws_host->modified = ws_maxConnections->modified = qfalse;
    ws_maxPacket->modified = ws_idle->modified = ws_trustedHops->modified = qfalse;
    return modified ? qtrue : qfalse;
}

void NET_WSInit(void) {
    struct lws_context_creation_info info;
    static const struct lws_protocols protocols[] = {
        { "binary", WS_Callback, sizeof(struct ws_peer), MAX_MSGLEN, 0, NULL, MAX_MSGLEN },
        LWS_PROTOCOL_LIST_TERM
    };
    const char *control;
    if (ws_context) return;
    NET_WSGetCvars();
    if (!ws_port->integer) return;
    if (ws_port->integer < 1 || ws_port->integer > 65535 ||
        ws_maxConnections->integer < 1 || ws_maxConnections->integer > 4096 ||
        ws_maxPacket->integer < 1024 || ws_maxPacket->integer > WS_CONTROL_LIMIT ||
        ws_idle->integer < 1000 || ws_idle->integer > 3600000 ||
        ws_trustedHops->integer < 0 || ws_trustedHops->integer > 16)
        Com_Error(ERR_FATAL, "Invalid native WebSocket configuration");
    ws_packetLimit = ws_maxPacket->integer < MAX_MSGLEN ? ws_maxPacket->integer : MAX_MSGLEN;
    if (!ws_controlInitialized) {
        control = getenv("Q3JS_NATIVE_CONTROL_FD");
        if (control) {
            // shortcut: supervision uses POSIX descriptors; add Windows IPC when packaging for Windows.
#ifdef _WIN32
            Com_Error(ERR_FATAL, "Native WebSocket supervisor requires POSIX inherited descriptors");
#else
            int flags;
            if (strcmp(control, "3")) Com_Error(ERR_FATAL, "Invalid native WebSocket control descriptor");
            ws_control = 3;
            flags = fcntl(ws_control, F_GETFL, 0);
            if (flags < 0 || fcntl(ws_control, F_SETFL, flags | O_NONBLOCK) < 0)
                Com_Error(ERR_FATAL, "Cannot configure native WebSocket control descriptor");
            ws_policyReady = qfalse;
#endif
        }
        ws_controlInitialized = qtrue;
    }
    ws_pollcapacity = ws_maxConnections->integer + 32;
    ws_pollfds = calloc(ws_pollcapacity, sizeof(*ws_pollfds));
    if (!ws_pollfds) Com_Error(ERR_FATAL, "WebSocket poll allocation failed");
    memset(&info, 0, sizeof(info));
    info.port = ws_port->integer;
    info.iface = ws_host->string;
    info.protocols = protocols;
    info.fd_limit_per_thread = ws_pollcapacity;
    info.max_http_header_pool = ws_maxConnections->integer;
    info.max_http_header_data = 4096;
    info.timeout_secs = 10;
    info.options = LWS_SERVER_OPTION_FAIL_UPON_UNABLE_TO_BIND;
    lws_set_log_level(LLL_ERR | LLL_WARN, NULL);
    ws_context = lws_create_context(&info);
    if (!ws_context) Com_Error(ERR_FATAL, "Cannot listen for native WebSockets on %s:%d", ws_host->string, ws_port->integer);
    Com_Printf("Native WebSocket listener: ws://%s:%d/ws\n", ws_host->string, ws_port->integer);
}

void NET_WSShutdown(void) {
    if (!ws_context) return;
    lws_context_destroy(ws_context);
    ws_context = NULL;
    free(ws_pollfds);
    ws_pollfds = NULL;
    ws_pollcount = 0;
    while (ws_inputHead) {
        struct ws_packet *packet = ws_inputHead;
        ws_inputHead = packet->next;
        free(packet);
    }
    ws_inputTail = NULL;
    ws_inputBuffered = 0;
}

void NET_WSService(void) {
    struct ws_peer *peer;
    int now, budget;
    if (!ws_context) return;
#ifndef _WIN32
    WS_ControlService();
#endif
    now = Sys_Milliseconds();
    for (peer = ws_peers; peer; peer = peer->next)
        if ((unsigned int)(now - peer->lastActivity) >= (unsigned int)ws_idle->integer)
            WS_Close(peer, LWS_CLOSE_STATUS_NORMAL, "Idle timeout");
    /* Negative timeout is the library's nonblocking service mode. */
    lws_service(ws_context, -1);
    /* Engine commands may restart networking; run packets outside library callbacks. */
    for (budget = 0; ws_inputHead && budget < 128; budget++) {
        struct ws_packet *packet = ws_inputHead;
        ws_inputHead = packet->next;
        if (!ws_inputHead) ws_inputTail = NULL;
        ws_inputBuffered -= packet->length;
        for (peer = ws_peers; peer && peer->address.websocketId != packet->address.websocketId; peer = peer->next) {}
        if (peer && !peer->closeReason) {
            unsigned char data[MAX_MSGLEN];
            msg_t message;
            memcpy(data, packet->data, packet->length);
            MSG_Init(&message, data, sizeof(data));
            message.cursize = packet->length;
            Com_RunAndTimeServerPacket(&packet->address, &message);
        }
        free(packet);
    }
}

int NET_WSSetFds(fd_set *readfds, fd_set *writefds, int highestfd, int *msec) {
    int index;
    if (!ws_context) return highestfd;
    for (index = 0; index < ws_pollcount; index++) {
        int fd = ws_pollfds[index].fd;
        if (ws_pollfds[index].events & LWS_POLLIN) FD_SET(fd, readfds);
        if (ws_pollfds[index].events & LWS_POLLOUT) FD_SET(fd, writefds);
        if (fd > highestfd) highestfd = fd;
    }
    if (ws_control >= 0) {
        FD_SET(ws_control, readfds);
        if (ws_controlHead) FD_SET(ws_control, writefds);
        if (ws_control > highestfd) highestfd = ws_control;
    }
    /* Bound timer latency even with no packet traffic. */
    if (*msec > 10) *msec = 10;
    if (!lws_service_adjust_timeout(ws_context, 1, 0)) *msec = 0;
    return highestfd;
}
