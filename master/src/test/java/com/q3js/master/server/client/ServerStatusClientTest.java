package com.q3js.master.server.client;

import com.q3js.master.server.domain.RegisteredServer;
import com.q3js.master.server.service.ServerStatusParser;

import org.junit.jupiter.api.Test;

import java.net.DatagramPacket;
import java.net.DatagramSocket;
import java.net.InetAddress;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.OffsetDateTime;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CompletionException;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class ServerStatusClientTest {
    @Test
    void queriesTheNativeQuakeUdpPort() throws Exception {
        InetAddress loopback = InetAddress.getLoopbackAddress();
        try (var serverSocket = new DatagramSocket(0, loopback)) {
            var responder = CompletableFuture.runAsync(() -> {
                try {
                    byte[] requestBytes = new byte[256];
                    var request = new DatagramPacket(requestBytes, requestBytes.length);
                    serverSocket.receive(request);
                    String requestText = new String(
                        request.getData(),
                        request.getOffset() + 4,
                        request.getLength() - 4,
                        StandardCharsets.US_ASCII
                    );
                    assertTrue(requestText.startsWith("getstatus q3js"));

                    byte[] responseBytes = (
                        "\u00ff\u00ff\u00ff\u00ffstatusResponse\n"
                            + "\\sv_hostname\\Direct UDP\\mapname\\q3dm17\\sv_maxclients\\8\n"
                    ).getBytes(StandardCharsets.UTF_8);
                    serverSocket.send(new DatagramPacket(
                        responseBytes,
                        responseBytes.length,
                        request.getAddress(),
                        request.getPort()
                    ));
                } catch (Exception exception) {
                    throw new CompletionException(exception);
                }
            });

            var registeredServer = new RegisteredServer(
                loopback.getHostAddress(),
                27961,
                serverSocket.getLocalPort(),
                true,
                false,
                OffsetDateTime.now()
            );
            var client = new ServerStatusClient(new ServerStatusParser(), Duration.ofSeconds(2));

            var info = client.query(registeredServer).orElseThrow();

            assertEquals("Direct UDP", info.sv_hostname());
            assertEquals(serverSocket.getLocalPort(), info.targetPort());
            responder.join();
        }
    }
}
