package com.rentmyride.security;

import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.security.Key;
import java.util.Date;

/**
 * Everything to do with creating and reading JWTs lives in this one class.
 *
 * The mental model, for explaining this in an interview:
 *   1. On login, we GENERATE a token — a signed, self-contained string that says
 *      "this is user X, with role Y, and it's valid until time Z".
 *   2. On every later request, we READ that token back out (see JwtFilter) instead
 *      of hitting the database to check who's logged in. That's the whole point of
 *      JWT auth: the server stays stateless — no session table, no server-side
 *      "logged in users" list. The token itself carries everything needed.
 *   3. The token can't be forged because it's signed with a secret key (jwt.secret,
 *      in application.properties) that only this server knows. Anyone can READ a
 *      JWT's contents (it's just Base64, not encrypted), but they can't FAKE one
 *      without the secret — parsing it re-checks the signature and throws if it
 *      doesn't match.
 */
@Component
public class JwtUtil {

    @Value("${jwt.secret}")
    private String secret;

    @Value("${jwt.expiration}")
    private long expiration; // in milliseconds

    // Turns the plain-text secret from properties into the Key object the JWT library
    // needs for HMAC-SHA256 signing.
    private Key getSigningKey() {
        return Keys.hmacShaKeyFor(secret.getBytes());
    }

    // Called once, right after a successful login. Packs the three things every
    // request will need to know about the user (email, role, id) into the token,
    // signs it, and hands back the compact string ("header.payload.signature")
    // that the frontend stores and sends back on every future request.
    public String generateToken(String email, String role, Long userId) {
        return Jwts.builder()
                .setSubject(email)                 // "who" — standard JWT field
                .claim("role", role)                // "what they're allowed to do" — our own custom field
                .claim("userId", userId)            // our own custom field, avoids an extra DB lookup by email
                .setIssuedAt(new Date())
                .setExpiration(new Date(System.currentTimeMillis() + expiration))
                .signWith(getSigningKey(), SignatureAlgorithm.HS256)
                .compact();
    }

    public String extractEmail(String token) {
        return getClaims(token).getSubject();
    }

    public String extractRole(String token) {
        return (String) getClaims(token).get("role");
    }

    public Long extractUserId(String token) {
        return ((Number) getClaims(token).get("userId")).longValue();
    }

    // "Valid" here means: signature matches (so it wasn't tampered with or forged)
    // AND it hasn't expired yet. The JWT library checks both inside parseClaimsJws()
    // and throws if either fails — we just turn that into a plain true/false.
    public boolean isTokenValid(String token) {
        try {
            getClaims(token);
            return true;
        } catch (JwtException | IllegalArgumentException e) {
            return false; // expired, malformed, or signature doesn't match
        }
    }

    // Verifies the signature and decodes the payload in one step. If someone edited
    // the token's contents (e.g. changed role to ADMIN) without the secret key, the
    // signature check here fails and this throws — that's the actual security check.
    private Claims getClaims(String token) {
        return Jwts.parserBuilder()
                .setSigningKey(getSigningKey())
                .build()
                .parseClaimsJws(token)
                .getBody();
    }
}
