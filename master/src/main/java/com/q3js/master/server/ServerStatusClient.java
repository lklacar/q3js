package com.q3js.master.server;

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
    private static final byte[] GET_STATUS = {
        (byte) 0xff, (byte) 0xff, (byte) 0xff, (byte) 0xff,
        'g', 'e', 't', 's', 't', 'a', 't', 'u', 's', ' ', 'q', '3', 'j', 's', '\n'
    };

    private final HttpClient httpClient;
    private final ServerStatusParser parser;
    private final Duration timeout;

    public ServerStatusClient(
        ServerStatusParser parser,
        @ConfigProperty(name = "q3js.master.server-status-timeout") Duration timeout
    ) {
        this.parser = parser;
        this.timeout = timeout;
        this.httpClient = HttpClient.newBuilder()
            .connectTimeout(timeout)
            .build();
    }

    public Optional<ServerInfo> query(RegisteredServer server) {
        WebSocket webSocket = null;
        try {
            long startedAt = System.nanoTime();
            var response = new CompletableFuture<byte[]>();
            webSocket = httpClient.newWebSocketBuilder()
                .connectTimeout(timeout)
                .buildAsync(serverUri(server), new StatusListener(response))
                .orTimeout(timeout.toMillis(), TimeUnit.MILLISECONDS)
                .join();

            webSocket.sendBinary(ByteBuffer.wrap(GET_STATUS), true)
                .orTimeout(timeout.toMillis(), TimeUnit.MILLISECONDS)
                .join();

            byte[] payload = response
                .orTimeout(timeout.toMillis(), TimeUnit.MILLISECONDS)
                .join();
            int ping = Math.toIntExact(Duration.ofNanos(System.nanoTime() - startedAt).toMillis());
            return parser.parse(new String(payload, StandardCharsets.UTF_8), server, ping);
        } catch (RuntimeException exception) {
            LOG.debugf(
                exception,
                "Unable to query Q3JS server %s:%d",
                server.host(),
                server.proxyPort()
            );
            return Optional.empty();
        } finally {
            if (webSocket != null) {
                webSocket.abort();
            }
        }
    }

    private static URI serverUri(RegisteredServer server) {
        String scheme = server.secure() ? "wss" : "ws";
        String host = server.host().contains(":") && !server.host().startsWith("[")
            ? "[" + server.host() + "]"
            : server.host();
        return URI.create(scheme + "://" + host + ":" + server.proxyPort() + "/ws");
    }

    private static final class StatusListener implements WebSocket.Listener {
        private final CompletableFuture<byte[]> response;
        private final ByteArrayOutputStream binary = new ByteArrayOutputStream();
        private final StringBuilder text = new StringBuilder();

        private StatusListener(CompletableFuture<byte[]> response) {
            this.response = response;
        }

        @Override
        public void onOpen(WebSocket webSocket) {
            webSocket.request(1);
        }

        @Override
        public CompletionStage<?> onBinary(WebSocket webSocket, ByteBuffer data, boolean last) {
            byte[] chunk = new byte[data.remaining()];
            data.get(chunk);
            binary.writeBytes(chunk);
            if (last) {
                response.complete(binary.toByteArray());
            }
            webSocket.request(1);
            return CompletableFuture.completedFuture(null);
        }

        @Override
        public CompletionStage<?> onText(WebSocket webSocket, CharSequence data, boolean last) {
            text.append(data);
            if (last) {
                response.complete(text.toString().getBytes(StandardCharsets.UTF_8));
            }
            webSocket.request(1);
            return CompletableFuture.completedFuture(null);
        }

        @Override
        public void onError(WebSocket webSocket, Throwable error) {
            response.completeExceptionally(error);
        }

        @Override
        public CompletionStage<?> onClose(WebSocket webSocket, int statusCode, String reason) {
            if (!response.isDone()) {
                response.completeExceptionally(
                    new IllegalStateException("Server closed before returning its status")
                );
            }
            return CompletableFuture.completedFuture(null);
        }
    }
}
