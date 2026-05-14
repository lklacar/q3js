package com.q3js.service;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

class IpAddressResolverTest {
    private final IpAddressResolver resolver = new IpAddressResolver();

    @Test
    void resolveUsesFirstForwardedAddress() {
        assertEquals("203.0.113.7", resolver.resolve("203.0.113.7, 10.0.0.5", null, null, null));
    }

    @Test
    void resolveSkipsNonPublicForwardedAddresses() {
        assertEquals("203.0.113.7", resolver.resolve("0:0:0:0:0:0:0:1, 10.0.0.5, 203.0.113.7", null, null, null));
    }

    @Test
    void resolveStripsIpv4Port() {
        assertEquals("203.0.113.7", resolver.resolve("203.0.113.7:443", null, null, null));
    }

    @Test
    void resolveStripsBracketedIpv6Port() {
        assertEquals("2001:db8::1", resolver.resolve("[2001:db8::1]:443", null, null, null));
    }

    @Test
    void resolveFallsBackToRealIp() {
        assertEquals("203.0.113.8", resolver.resolve(null, "203.0.113.8", null, null));
    }

    @Test
    void resolveFallsBackToForwardedHeader() {
        assertEquals("203.0.113.9", resolver.resolve(null, null, "proto=https;for=\"203.0.113.9\"", null));
    }

    @Test
    void resolveSkipsNonPublicForwardedHeaderAddresses() {
        assertEquals("203.0.113.9", resolver.resolve(null, null, "for=\"[::1]\";proto=https, for=203.0.113.9", null));
    }

    @Test
    void resolveUsesFirstForwardedElement() {
        assertEquals("203.0.113.10", resolver.resolve(null, null, "for=203.0.113.10;proto=https, for=10.0.0.5", null));
    }

    @Test
    void resolveReturnsNullForOnlyNonPublicAddresses() {
        assertEquals(null, resolver.resolve("0:0:0:0:0:0:0:1, 10.0.0.5", null, null, null));
    }
}
