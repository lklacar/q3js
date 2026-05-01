package com.q3js.controller;

import com.q3js.service.EventService;
import com.q3js.service.dto.CreateEventRequest;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.HeaderParam;
import jakarta.ws.rs.NotAuthorizedException;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import lombok.RequiredArgsConstructor;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import org.jboss.logging.Logger;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;

@ApplicationScoped
@Path("/api/events")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
@RequiredArgsConstructor
public class EventController {
    static final String CLIENT_SECRET_HEADER = "X-Q3JS-Client-Secret";
    private static final Logger LOG = Logger.getLogger(EventController.class);
    private final EventService eventService;

    @ConfigProperty(name = "q3js.events.client-secret")
    String clientSecret;

    @POST
    public void ingestEvent(CreateEventRequest event, @HeaderParam(CLIENT_SECRET_HEADER) String headerClientSecret) {
        if (!isAuthorized(headerClientSecret, event != null ? event.getClientSecret() : null)) {
            throw new NotAuthorizedException("Fuck you!");
        }

        LOG.infof("Received event: %s", event);
        eventService.ingestEvent(event);
    }

    boolean isAuthorized(String headerClientSecret, String bodyClientSecret) {
        if (clientSecret == null || clientSecret.isBlank()) {
            return true;
        }

        return matchesClientSecret(headerClientSecret) || matchesClientSecret(bodyClientSecret);
    }

    private boolean matchesClientSecret(String suppliedClientSecret) {
        if (suppliedClientSecret == null) {
            return false;
        }

        return MessageDigest.isEqual(
                clientSecret.getBytes(StandardCharsets.UTF_8),
                suppliedClientSecret.getBytes(StandardCharsets.UTF_8)
        );
    }
}
