package com.q3js.master.event.security;

import jakarta.enterprise.context.ApplicationScoped;
import org.eclipse.microprofile.config.inject.ConfigProperty;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;

@ApplicationScoped
public class EventAuthenticator {
    public static final String CLIENT_SECRET_HEADER = "X-Q3JS-Client-Secret";

    private final byte[] expectedSecret;

    public EventAuthenticator(
        @ConfigProperty(name = "q3js.master.event-client-secret") String configuredSecret
    ) {
        if (configuredSecret == null || configuredSecret.length() < 32 || configuredSecret.length() > 512) {
            throw new IllegalStateException("The event client secret must contain between 32 and 512 characters.");
        }
        if (configuredSecret.chars().anyMatch(Character::isISOControl)) {
            throw new IllegalStateException("The event client secret must not contain control characters.");
        }
        expectedSecret = configuredSecret.getBytes(StandardCharsets.UTF_8);
    }

    public boolean isAuthorized(String suppliedSecret) {
        return suppliedSecret != null && MessageDigest.isEqual(
            expectedSecret,
            suppliedSecret.getBytes(StandardCharsets.UTF_8)
        );
    }
}
