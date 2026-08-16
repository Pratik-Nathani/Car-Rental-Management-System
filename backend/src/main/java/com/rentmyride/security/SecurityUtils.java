package com.rentmyride.security;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

/**
 * Small helper for the ownership checks used across the *ServiceImpl classes (Customer,
 * Driver, Payment, Reservation, Rental, Notification) to close the "any logged-in customer
 * can read/edit any OTHER customer's data just by changing the ID in the URL" gap — a valid
 * JWT only proves "this is SOME logged-in user", not that the resource being requested is
 * actually theirs.
 *
 * This was previously copy-pasted into each service with slightly different variable names;
 * pulling out just the "who is making this request" part here removes that duplication. Each
 * service still does its own entity lookup (by email) since the owning entity type differs
 * (Customer vs Driver), but the boilerplate around it is now in one place.
 */
public final class SecurityUtils {

    private SecurityUtils() { }

    /** True if there's no authenticated admin/customer/driver context at all (e.g. an internal call). */
    public static boolean isAdmin() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null) return false;
        return auth.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
    }

    /** The email on the current JWT (the "username" Spring Security authenticated), or null if none. */
    public static String currentEmail() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return auth != null ? auth.getName() : null;
    }
}
