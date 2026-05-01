package com.q3js.client;

import com.q3js.domain.Server;
import com.q3js.service.dto.ServerInfoResponse;
import jakarta.enterprise.context.ApplicationScoped;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import org.jboss.logging.Logger;

import java.io.ByteArrayOutputStream;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.WebSocket;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Optional;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CompletionStage;
import java.util.concurrent.TimeUnit;

@ApplicationScoped
public class ServerStatusClient {
    private static final Logger LOG = Logger.getLogger(ServerStatusClient.class);
    private static final byte[] GETSTATUS_PAYLOAD = new byte[]{
            (byte) 0xff, (byte) 0xff, (byte) 0xff, (byte) 0xff,
            'g', 'e', 't', 's', 't', 'a', 't', 'u', 's', ' ', 'x', 'x', 'x', '\n'
    };

    private final HttpClient httpClient;
    private final long timeoutMs;

    public ServerStatusClient(
            @ConfigProperty(name = "q3js.server-info.timeout-ms", defaultValue = "3000") long timeoutMs
    ) {
        this.timeoutMs = timeoutMs;
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofMillis(timeoutMs))
                .build();
    }

    public Optional<ServerInfoResponse> query(Server server) {
        try {
            var status = queryStatus(server);
            return Optional.ofNullable(ServerStatusParser.parse(status.rawStatus(), server, status.ping()));
        } catch (Exception e) {
            LOG.debugf(e, "Failed to query server status via websocket for %s:%d", server.getHost(), server.getProxyPort());
            return Optional.empty();
        }
    }

    private StatusQueryResult queryStatus(Server server) {
        long startedAt = System.currentTimeMillis();
        var responseFuture = new CompletableFuture<byte[]>();
        var listener = new StatusWebSocketListener(responseFuture);

        CompletableFuture<WebSocket> connectFuture = httpClient.newWebSocketBuilder()
                .connectTimeout(Duration.ofMillis(timeoutMs))
                .buildAsync(URI.create(buildWebSocketUrl(server)), listener);

        WebSocket webSocket;
        try {
            webSocket = connectFuture
                    .orTimeout(timeoutMs, TimeUnit.MILLISECONDS)
                    .join();
        } catch (Exception exception) {
            connectFuture.whenComplete((lateWebSocket, ignored) -> {
                if (lateWebSocket != null) {
                    lateWebSocket.abort();
                }
            });
            throw exception;
        }

        try {
            webSocket.sendBinary(ByteBuffer.wrap(GETSTATUS_PAYLOAD), true)
                    .orTimeout(timeoutMs, TimeUnit.MILLISECONDS)
                    .join();

            byte[] rawResponse = responseFuture
                    .orTimeout(timeoutMs, TimeUnit.MILLISECONDS)
                    .join();

            return new StatusQueryResult(
                    new String(rawResponse, StandardCharsets.UTF_8),
                    Math.toIntExact(System.currentTimeMillis() - startedAt)
            );
        } finally {
            webSocket.abort();
        }
    }

    private String buildWebSocketUrl(Server server) {
        var wsScheme = server.isSecure() ? "wss" : "ws";
        return wsScheme + "://" + server.getHost() + ":" + server.getProxyPort() + "/";
    }

    private record StatusQueryResult(String rawStatus, int ping) {
    }

    private static final class StatusWebSocketListener implements WebSocket.Listener {
        private final CompletableFuture<byte[]> responseFuture;
        private final ByteArrayOutputStream binaryBuffer = new ByteArrayOutputStream();
        private final StringBuilder textBuffer = new StringBuilder();

        private StatusWebSocketListener(CompletableFuture<byte[]> responseFuture) {
            this.responseFuture = responseFuture;
        }

        @Override
        public void onOpen(WebSocket webSocket) {
            webSocket.request(1);
        }

        @Override
        public CompletionStage<?> onBinary(WebSocket webSocket, ByteBuffer data, boolean last) {
            byte[] chunk = new byte[data.remaining()];
            data.get(chunk);
            binaryBuffer.writeBytes(chunk);
            if (last) {
                responseFuture.complete(binaryBuffer.toByteArray());
            }
            webSocket.request(1);
            return CompletableFuture.completedFuture(null);
        }

        @Override
        public CompletionStage<?> onText(WebSocket webSocket, CharSequence data, boolean last) {
            textBuffer.append(data);
            if (last) {
                responseFuture.complete(textBuffer.toString().getBytes(StandardCharsets.UTF_8));
            }
            webSocket.request(1);
            return CompletableFuture.completedFuture(null);
        }

        @Override
        public void onError(WebSocket webSocket, Throwable error) {
            responseFuture.completeExceptionally(error);
        }

        @Override
        public CompletionStage<?> onClose(WebSocket webSocket, int statusCode, String reason) {
            if (!responseFuture.isDone()) {
                responseFuture.completeExceptionally(new IllegalStateException("WebSocket closed before status response"));
            }
            return CompletableFuture.completedFuture(null);
        }
    }
}
