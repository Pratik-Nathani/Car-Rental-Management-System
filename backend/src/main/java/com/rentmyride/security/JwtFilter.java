package com.rentmyride.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * Runs once per incoming request, before it reaches any @Controller. Spring Security
 * calls this automatically because it's wired into the filter chain (see SecurityConfig).
 *
 * The job here is simple, in three steps:
 *   1. Look for "Authorization: Bearer <token>" on the request.
 *   2. If it's there and it's a valid token (see JwtUtil), figure out who the user is.
 *   3. Tell Spring Security "this request is authenticated as this user" — that's what
 *      SecurityContextHolder.setAuthentication(...) does. Every @PreAuthorize check
 *      further down the chain (in the controllers) reads from that same context.
 *
 * If there's no token, or it's invalid, we just do nothing and let the request continue
 * unauthenticated — it's SecurityConfig's job to decide which endpoints require login
 * at all (e.g. /api/auth/login doesn't, /api/admin/** does).
 */
@Component
@RequiredArgsConstructor
public class JwtFilter extends OncePerRequestFilter {

    private final JwtUtil jwtUtil;
    private final CustomUserDetailsService userDetailsService;

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain)
            throws ServletException, IOException {

        String authHeader = request.getHeader("Authorization");

        // Every JWT request looks like: Authorization: Bearer eyJhbGciOiJIUzI1NiJ9...
        // so we strip the "Bearer " prefix (7 characters) to get the raw token.
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            String token = authHeader.substring(7);

            if (jwtUtil.isTokenValid(token)) {
                String email = jwtUtil.extractEmail(token);

                // We still look the user up (by email, from the token) rather than trusting
                // the token's claims blindly — this way, if an account gets deactivated
                // between login and this request, CustomUserDetailsService can reflect that.
                UserDetails userDetails = userDetailsService.loadUserByUsername(email);

                UsernamePasswordAuthenticationToken authentication =
                        new UsernamePasswordAuthenticationToken(
                                userDetails, null, userDetails.getAuthorities());
                authentication.setDetails(
                        new WebAuthenticationDetailsSource().buildDetails(request));

                // This is the actual "log this request in" step — from here on,
                // @PreAuthorize("hasRole('ADMIN')") etc. on controller methods will work.
                SecurityContextHolder.getContext().setAuthentication(authentication);
            }
        }

        // Always continue the chain — whether or not we authenticated the request.
        filterChain.doFilter(request, response);
    }
}
