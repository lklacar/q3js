package com.q3js.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.q3js.service.dto.AdminLoginResponse;
import com.q3js.service.dto.AdminPlayersResponse;
import jakarta.annotation.PostConstruct;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.ws.rs.NotAuthorizedException;
import lombok.RequiredArgsConstructor;
import org.jboss.logging.Logger;
import org.eclipse.microprofile.config.inject.ConfigProperty;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.Base64;
import java.util.List;
import java.util.Map;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

@ApplicationScoped
@RequiredArgsConstructor
public class AdminService {
    private static final Logger LOG = Logger.getLogger(AdminService.class);
    private static final Base64.Encoder BASE64_URL_ENCODER = Base64.getUrlEncoder().withoutPadding();
    private static final Base64.Decoder BASE64_URL_DECODER = Base64.getUrlDecoder();
    private static final TypeReference<Map<String, Object>> MAP_TYPE = new TypeReference<>() {
    };

    private final PageVisitService pageVisitService;
    private final ObjectMapper objectMapper;

    @ConfigProperty(name = "q3js.admin.password")
    String adminPassword;

    @ConfigProperty(name = "q3js.admin.jwt-secret")
    String jwtSecret;

    @ConfigProperty(name = "q3js.admin.jwt-ttl-seconds", defaultValue = "43200")
    long jwtTtlSeconds;

    private String effectiveAdminPassword;
    private String effectiveJwtSecret;

    @PostConstruct
    void initializeSecrets() {
        currentAdminPassword();
        currentJwtSecret();
    }

    public AdminLoginResponse login(String password) {
        if (!isAuthorized(password)) {
            throw new NotAuthorizedException("Invalid admin password.");
        }

        long expiresAt = nowSeconds() + jwtTtlSeconds;
        return AdminLoginResponse.builder()
                .token(createToken(expiresAt))
                .expiresAt(expiresAt)
                .build();
    }

    public AdminPlayersResponse getPlayers(String authorizationHeader) {
        requireValidToken(authorizationHeader);

        var players = pageVisitService.getLatestPlayers();
        return AdminPlayersResponse.builder()
                .serversChecked(0)
                .players(players)
                .serverErrors(List.of())
                .build();
    }

    boolean isAuthorized(String password) {
        if (password == null) {
            return false;
        }

        return MessageDigest.isEqual(
                currentAdminPassword().getBytes(StandardCharsets.UTF_8),
                password.getBytes(StandardCharsets.UTF_8)
        );
    }

    private String createToken(long expiresAt) {
        String header = "{\"alg\":\"HS256\",\"typ\":\"JWT\"}";
        String payload = "{\"sub\":\"admin\",\"iat\":" + nowSeconds() + ",\"exp\":" + expiresAt + "}";
        String encodedHeader = base64Url(header.getBytes(StandardCharsets.UTF_8));
        String encodedPayload = base64Url(payload.getBytes(StandardCharsets.UTF_8));
        String signingInput = encodedHeader + "." + encodedPayload;
        return signingInput + "." + base64Url(sign(signingInput));
    }

    private void requireValidToken(String authorizationHeader) {
        if (authorizationHeader == null || !authorizationHeader.regionMatches(true, 0, "Bearer ", 0, 7)) {
            throw new NotAuthorizedException("Missing admin token.");
        }

        String token = authorizationHeader.substring(7).trim();
        String[] parts = token.split("\\.", -1);
        if (parts.length != 3 || parts[0].isBlank() || parts[1].isBlank() || parts[2].isBlank()) {
            throw new NotAuthorizedException("Invalid admin token.");
        }

        String signingInput = parts[0] + "." + parts[1];
        byte[] expectedSignature = sign(signingInput);
        byte[] suppliedSignature;
        try {
            suppliedSignature = BASE64_URL_DECODER.decode(parts[2]);
        } catch (IllegalArgumentException exception) {
            throw new NotAuthorizedException("Invalid admin token.");
        }

        if (!MessageDigest.isEqual(expectedSignature, suppliedSignature)) {
            throw new NotAuthorizedException("Invalid admin token.");
        }

        Map<String, Object> claims;
        try {
            claims = objectMapper.readValue(BASE64_URL_DECODER.decode(parts[1]), MAP_TYPE);
        } catch (Exception exception) {
            throw new NotAuthorizedException("Invalid admin token.");
        }

        if (!"admin".equals(claims.get("sub")) || claimLong(claims.get("exp")) <= nowSeconds()) {
            throw new NotAuthorizedException("Expired admin token.");
        }
    }

    private long claimLong(Object value) {
        if (value instanceof Number number) {
            return number.longValue();
        }

        return -1;
    }

    private byte[] sign(String signingInput) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(currentJwtSecret().getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            return mac.doFinal(signingInput.getBytes(StandardCharsets.UTF_8));
        } catch (Exception exception) {
            throw new IllegalStateException("Failed to sign admin token", exception);
        }
    }

    private String base64Url(byte[] bytes) {
        return BASE64_URL_ENCODER.encodeToString(bytes);
    }

    private long nowSeconds() {
        return System.currentTimeMillis() / 1000L;
    }

    private synchronized String currentAdminPassword() {
        if (effectiveAdminPassword != null) {
            return effectiveAdminPassword;
        }

        if (adminPassword != null && !adminPassword.isBlank()) {
            effectiveAdminPassword = adminPassword;
            return effectiveAdminPassword;
        }

        effectiveAdminPassword = randomSecret(24);
        LOG.warnf(
                "Q3JS_ADMIN_PASSWORD is not set. Generated temporary admin password for this process: %s",
                effectiveAdminPassword
        );
        return effectiveAdminPassword;
    }

    private synchronized String currentJwtSecret() {
        if (effectiveJwtSecret != null) {
            return effectiveJwtSecret;
        }

        if (jwtSecret != null && !jwtSecret.isBlank()) {
            effectiveJwtSecret = jwtSecret;
            return effectiveJwtSecret;
        }

        effectiveJwtSecret = randomSecret(32);
        LOG.warn("Q3JS_ADMIN_JWT_SECRET is not set. Generated temporary admin JWT signing secret for this process. "
                + "For a stable secret, set Q3JS_ADMIN_JWT_SECRET from: openssl rand -base64 32");
        return effectiveJwtSecret;
    }

    private String randomSecret(int byteCount) {
        byte[] randomBytes = new byte[byteCount];
        new SecureRandom().nextBytes(randomBytes);
        return BASE64_URL_ENCODER.encodeToString(randomBytes);
    }
}
