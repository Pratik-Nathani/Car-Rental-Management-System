package com.rentmyride.security;

import com.rentmyride.entities.Admin;
import com.rentmyride.entities.Customer;
import com.rentmyride.entities.Driver;
import com.rentmyride.repository.AdminRepository;
import com.rentmyride.repository.CustomerRepository;
import com.rentmyride.repository.DriverRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.*;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * Spring Security calls loadUserByUsername() whenever it needs to know "who is this
 * email, and what are they allowed to do" — that happens once at login (see AuthService)
 * and again on every authenticated request (see JwtFilter, which uses this to rebuild
 * the user's identity from the email stored inside their JWT).
 *
 * The one thing worth explaining in an interview: this app has THREE separate login
 * tables (Customer, Driver, Admin) instead of one shared "users" table. So this class's
 * only real job is trying each table in turn until it finds a match, then wrapping
 * whichever one it found into the single UserDetails shape Spring Security expects —
 * that's what lets one JwtFilter/SecurityConfig handle all three roles uniformly.
 */
@Service
@RequiredArgsConstructor
public class CustomUserDetailsService implements UserDetailsService {

    private final CustomerRepository customerRepository;
    private final DriverRepository driverRepository;
    private final AdminRepository adminRepository;

    @Override
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {

        // 1. Check Customer table
        var customerOpt = customerRepository.findByEmail(email);
        if (customerOpt.isPresent()) {
            Customer c = customerOpt.get();
            return User.builder()
                    .username(c.getEmail())
                    .password(c.getPassword())
                    // "ROLE_" prefix is a Spring Security convention — hasRole('CUSTOMER')
                    // in a @PreAuthorize check is really matching against "ROLE_CUSTOMER" here.
                    .authorities(List.of(new SimpleGrantedAuthority("ROLE_" + c.getRole())))
                    .build();
        }

        // 2. Check Driver table
        var driverOpt = driverRepository.findByEmail(email);
        if (driverOpt.isPresent()) {
            Driver d = driverOpt.get();
            return User.builder()
                    .username(d.getEmail())
                    .password(d.getPassword())
                    .authorities(List.of(new SimpleGrantedAuthority("ROLE_DRIVER")))
                    .build();
        }

        // 3. Check Admin table
        var adminOpt = adminRepository.findByEmail(email);
        if (adminOpt.isPresent()) {
            Admin a = adminOpt.get();
            return User.builder()
                    .username(a.getEmail())
                    .password(a.getPassword())
                    .authorities(List.of(new SimpleGrantedAuthority("ROLE_ADMIN")))
                    .build();
        }

        throw new UsernameNotFoundException("User not found: " + email);
    }
}
