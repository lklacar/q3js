package com.q3js.master.country.service;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

class IpAddressResolverTest {
    private final IpAddressResolver resolver = new IpAddressResolver();

    @Test
    void selectsFirstPublicForwardedAddress() {
        assertEquals(
            "203.0.113.20",
            resolver.resolve("10.0.0.4, 203.0.113.20, 198.51.100.5", null, null, null)
        );
    }

    @Test
    void fallsBackToRemoteAddress() {
        assertEquals("127.0.0.1", resolver.resolve(null, null, null, "127.0.0.1"));
    }
}
