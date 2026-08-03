package com.q3js.master.event;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class EventAuthenticatorTest {
    private static final String SECRET = "0123456789abcdef0123456789abcdef";

    @Test
    void authenticatesOnlyTheConfiguredSecret() {
        var authenticator = new EventAuthenticator(SECRET);

        assertTrue(authenticator.isAuthorized(SECRET));
        assertFalse(authenticator.isAuthorized(null));
        assertFalse(authenticator.isAuthorized("0123456789abcdef0123456789abcdee"));
    }

    @Test
    void rejectsUnsafeConfiguration() {
        assertThrows(IllegalStateException.class, () -> new EventAuthenticator("short"));
        assertThrows(IllegalStateException.class, () -> new EventAuthenticator(SECRET + "\n"));
    }
}
