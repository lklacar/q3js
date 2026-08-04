package com.q3js.master.server.client;

import com.q3js.master.server.domain.RegisteredServer;
import com.q3js.master.server.dto.ServerInfo;
import com.q3js.master.server.service.ServerStatusParser;

import jakarta.enterprise.context.ApplicationScoped;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import org.jboss.logging.Logger;

import java.io.IOException;
import java.net.DatagramPacket;
import java.net.DatagramSocket;
import java.net.InetAddress;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Optional;

@ApplicationScoped
public class ServerStatusClient {
    private static final Logger LOG = Logger.getLogger(ServerStatusClient.class);
    private static final int MAX_RESPONSE_BYTES = 65_535;
    private static final byte[] GET_STATUS = {
        (byte) 0xff, (byte) 0xff, (byte) 0xff, (byte) 0xff,
        'g', 'e', 't', 's', 't', 'a', 't', 'u', 's', ' ', 'q', '3', 'j', 's', '\n'
    };

    private final ServerStatusParser parser;
    private final Duration timeout;

    public ServerStatusClient(
        ServerStatusParser parser,
        @ConfigProperty(name = "q3js.master.server-status-timeout") Duration timeout
    ) {
        this.parser = parser;
        this.timeout = timeout;
    }

    public Optional<ServerInfo> query(RegisteredServer server) {
        try (var socket = new DatagramSocket()) {
            socket.setSoTimeout(Math.toIntExact(timeout.toMillis()));
            var address = InetAddress.getByName(server.host());
            long startedAt = System.nanoTime();
            socket.send(new DatagramPacket(GET_STATUS, GET_STATUS.length, address, server.targetPort()));

            byte[] buffer = new byte[MAX_RESPONSE_BYTES];
            var response = new DatagramPacket(buffer, buffer.length);
            socket.receive(response);
            int ping = Math.toIntExact(Duration.ofNanos(System.nanoTime() - startedAt).toMillis());
            return parser.parse(
                new String(response.getData(), response.getOffset(), response.getLength(), StandardCharsets.UTF_8),
                server,
                ping
            );
        } catch (IOException | RuntimeException exception) {
            LOG.debugf(
                exception,
                "Unable to query Q3JS server %s:%d over UDP",
                server.host(),
                server.targetPort()
            );
            return Optional.empty();
        }
    }
}
