package com.q3js.master.country.service;

import io.vertx.core.http.HttpServerRequest;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.ws.rs.core.HttpHeaders;

import java.net.InetAddress;

@ApplicationScoped
public class IpAddressResolver {
    public String resolve(HttpHeaders headers, HttpServerRequest request) {
        String remoteAddress = request == null || request.remoteAddress() == null
            ? null
            : request.remoteAddress().host();
        return resolve(
            header(headers, "X-Forwarded-For"),
            header(headers, "X-Real-IP"),
            header(headers, "Forwarded"),
            remoteAddress
        );
    }

    String resolve(String xForwardedFor, String xRealIp, String forwarded, String remoteAddress) {
        String resolved = firstPresent(
            firstPublicAddress(xForwardedFor),
            publicAddress(xRealIp),
            forwardedAddress(forwarded)
        );

        if (resolved != null) {
            return resolved;
        }
        return normalize(remoteAddress);
    }

    private String header(HttpHeaders headers, String name) {
        return headers == null ? null : headers.getHeaderString(name);
    }

    private String firstPublicAddress(String header) {
        if (header == null) {
            return null;
        }
        for (String value : header.split(",")) {
            String address = publicAddress(value);
            if (address != null) {
                return address;
            }
        }
        return null;
    }

    private String forwardedAddress(String header) {
        if (header == null) {
            return null;
        }
        for (String element : header.split(",")) {
            for (String part : element.split(";")) {
                String value = part.trim();
                if (value.regionMatches(true, 0, "for=", 0, 4)) {
                    String address = publicAddress(value.substring(4));
                    if (address != null) {
                        return address;
                    }
                }
            }
        }
        return null;
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
            return normalized;
        } catch (Exception ignored) {
            return null;
        }
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

    private String firstPresent(String... values) {
        for (String value : values) {
            if (value != null) {
                return value;
            }
        }
        return null;
    }
}
