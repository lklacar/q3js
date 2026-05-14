package com.q3js.service;

import io.vertx.core.http.HttpServerRequest;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.ws.rs.core.HttpHeaders;

import java.net.InetAddress;

@ApplicationScoped
public class IpAddressResolver {
    public String resolve(HttpHeaders headers, HttpServerRequest request) {
        return resolve(
                header(headers, "X-Forwarded-For"),
                header(headers, "X-Real-IP"),
                header(headers, "Forwarded"),
                request
        );
    }

    public String resolve(String xForwardedFor, String xRealIp, String forwarded, HttpServerRequest request) {
        String resolved = firstPresent(
                firstForwardedFor(xForwardedFor),
                publicAddress(xRealIp),
                forwardedFor(forwarded)
        );

        if (resolved != null) {
            return resolved;
        }

        if (request == null || request.remoteAddress() == null) {
            return null;
        }

        return normalize(request.remoteAddress().host());
    }

    private String header(HttpHeaders headers, String name) {
        return headers != null ? headers.getHeaderString(name) : null;
    }

    private String firstForwardedFor(String header) {
        if (header == null) {
            return null;
        }

        for (String value : header.split(",")) {
            String normalized = publicAddress(value);
            if (normalized != null) {
                return normalized;
            }
        }

        return null;
    }

    private String forwardedFor(String header) {
        if (header == null) {
            return null;
        }

        for (String forwardedElement : header.split(",")) {
            for (String part : forwardedElement.split(";")) {
                String trimmed = part.trim();
                if (trimmed.regionMatches(true, 0, "for=", 0, 4)) {
                    String normalized = publicAddress(trimmed.substring(4));
                    if (normalized != null) {
                        return normalized;
                    }
                }
            }
        }

        return null;
    }

    private String normalize(String value) {
        if (value == null) {
            return null;
        }

        String normalized = value.trim();
        if (normalized.isEmpty() || "unknown".equalsIgnoreCase(normalized)) {
            return null;
        }

        if (normalized.startsWith("\"") && normalized.endsWith("\"") && normalized.length() > 1) {
            normalized = normalized.substring(1, normalized.length() - 1);
        }

        if (normalized.startsWith("[") && normalized.contains("]")) {
            return normalized.substring(1, normalized.indexOf(']'));
        }

        int colon = normalized.lastIndexOf(':');
        if (colon > 0 && normalized.indexOf(':') == colon && normalized.indexOf('.') >= 0) {
            return normalized.substring(0, colon);
        }

        return normalized;
    }

    private String publicAddress(String value) {
        String normalized = normalize(value);
        if (normalized == null) {
            return null;
        }

        try {
            InetAddress address = InetAddress.getByName(normalized);
            if (address.isAnyLocalAddress()
                    || address.isLoopbackAddress()
                    || address.isLinkLocalAddress()
                    || address.isSiteLocalAddress()
                    || address.isMulticastAddress()) {
                return null;
            }
        } catch (Exception e) {
            return null;
        }

        return normalized;
    }

    private String firstPresent(String... values) {
        for (String value : values) {
            if (value != null) {
                return value;
            }
        }

        return null;
    }
}
