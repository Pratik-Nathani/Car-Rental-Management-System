package com.rentmyride.security;

import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

/**
 * The single place that wires Spring Security together for this app. Three jobs:
 *   1. List which endpoints are PUBLIC (no login needed) — everything else requires a
 *      valid JWT by default (see .anyRequest().authenticated() below).
 *   2. Plug our own JwtFilter into the request pipeline, so it runs before Spring's
 *      normal login-form filter (which we don't use — see STATELESS below).
 *   3. Provide the password encoder and AuthenticationManager beans other classes
 *      (like login logic) depend on.
 *
 * @EnableMethodSecurity is what makes @PreAuthorize("hasRole('ADMIN')") on controller
 * methods actually get enforced — without it those annotations would be silently ignored.
 */
@Configuration
@EnableWebSecurity
@EnableMethodSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtFilter jwtFilter;

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            // CSRF protection exists to stop OTHER WEBSITES from silently submitting forms
            // using a browser's saved session cookie. We don't use cookies for auth (JWT is
            // sent explicitly in an Authorization header by our own frontend code), so there's
            // no cookie for a malicious site to piggyback on — CSRF protection doesn't apply.
            .csrf(csrf -> csrf.disable())

            // STATELESS = Spring Security will never create or read an HTTP session for us.
            // This is the other half of "JWT auth is stateless" — every request must carry
            // its own proof of identity (the token), nothing is remembered between requests
            // server-side. This is also exactly why multiple people (admin/customer/driver)
            // can be logged in "at once" from the backend's point of view: there's no shared
            // session state to collide on, only whatever token each request happens to carry.
            .sessionManagement(session ->
                session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))

            .authorizeHttpRequests(auth -> auth
                // Endpoints reachable WITHOUT a token — registration, every role's login,
                // OTP flows, and read-only public browsing (car listings, locations, ratings).
                .requestMatchers(
                    "/api/customers/register",
                    "/api/customers/login",
                    "/api/customers/login/otp/send",
                    "/api/customers/login/otp/verify",
                    "/api/auth/login",
                    "/api/customers/forgot-password/send-otp",
                    "/api/customers/forgot-password/verify-otp",
                    "/api/customers/forgot-password/reset",
                    "/api/drivers/login",
                    "/api/admin/login",
                    "/api/cars",
                    "/api/cars/{carId}",
                    "/api/cars/available",
                    "/api/cars/search",
                    "/api/cars/available-between",
                    "/api/cars/category/**",
                    "/api/locations/**",
                    "/api/reservations/car/*/availability",
                    "/api/feedback/ratings",
                    "/api/feedback/car/*",
                    "/uploads/**",
                    "/swagger-ui/**",
                    "/swagger-ui.html",
                    "/v3/api-docs/**"
                ).permitAll()
                // Everything else needs a valid JWT — JwtFilter (below) is what actually
                // reads and validates that token before this check runs.
                .anyRequest().authenticated()
            )
            // Run our JWT check before Spring's built-in username/password filter, since
            // we're not using that flow at all (login is a plain @RestController endpoint,
            // not Spring Security's form-login mechanism).
            .addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    // BCrypt: one-way hashing with a built-in random salt, so two users with the same
    // password never produce the same stored hash. Used when registering (hash the
    // password) and when logging in (check the entered password against the hash).
    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public AuthenticationManager authenticationManager(
            AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }
}
