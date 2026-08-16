package com.rentmyride.controller;

import com.rentmyride.dtos.AuthResponseDTO;
import com.rentmyride.entities.Admin;
import com.rentmyride.entities.Customer;
import com.rentmyride.entities.Driver;
import com.rentmyride.repository.AdminRepository;
import com.rentmyride.repository.CustomerRepository;
import com.rentmyride.repository.DriverRepository;
import com.rentmyride.security.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.Optional;

// Single, role-agnostic login endpoint. The person just enters their email/mobile + password —
// we work out whether they're a customer, driver, or admin by looking up the identifier across
// all three tables (customers first, since that's by far the most common login), and return the
// same AuthResponseDTO the old per-role endpoints used, with `role` telling the frontend where
// to route them. The old /api/customers/login, /api/drivers/login and /api/admin/login endpoints
// are left in place (unused by the new unified form) so nothing else breaks.
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final CustomerRepository customerRepository;
    private final DriverRepository driverRepository;
    private final AdminRepository adminRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;

    @PostMapping("/login")
    public AuthResponseDTO login(@RequestBody LoginRequest req) {
        String identifier = req.getUsername() == null ? "" : req.getUsername().trim();
        String password = req.getPassword();

        if (identifier.isBlank() || password == null || password.isBlank()) {
            return AuthResponseDTO.failure("Email/mobile and password are required.");
        }

        // 1) Customer — matches by email OR mobile number
        Optional<Customer> customerOpt = customerRepository.findByEmailOrMobile(identifier);
        if (customerOpt.isPresent()) {
            Customer customer = customerOpt.get();
            if (!passwordEncoder.matches(password, customer.getPassword())) {
                return AuthResponseDTO.failure("Invalid password.");
            }
            if (customer.getAccountStatus() == Customer.AccountStatus.BLOCKED) {
                return AuthResponseDTO.failure("Your account has been blocked. Contact support.");
            }
            String token = jwtUtil.generateToken(customer.getEmail(), "CUSTOMER", customer.getCustomerId());
            return AuthResponseDTO.success(token, "CUSTOMER", customer.getCustomerId(),
                    customer.getFirstName() + " " + customer.getLastName(), customer.getEmail());
        }

        // 2) Driver — matches by email only
        Optional<Driver> driverOpt = driverRepository.findByEmail(identifier);
        if (driverOpt.isPresent()) {
            Driver driver = driverOpt.get();
            if (!passwordEncoder.matches(password, driver.getPassword())) {
                return AuthResponseDTO.failure("Invalid password.");
            }
            if (driver.getStatus() != Driver.Status.ACTIVE) {
                return AuthResponseDTO.failure("Account inactive. Contact admin.");
            }
            String token = jwtUtil.generateToken(driver.getEmail(), "DRIVER", driver.getDriverId());
            return AuthResponseDTO.success(token, "DRIVER", driver.getDriverId(),
                    driver.getFirstName() + " " + driver.getLastName(), driver.getEmail());
        }

        // 3) Admin — matches by email only
        Optional<Admin> adminOpt = adminRepository.findByEmail(identifier);
        if (adminOpt.isPresent()) {
            Admin admin = adminOpt.get();
            if (!passwordEncoder.matches(password, admin.getPassword())) {
                return AuthResponseDTO.failure("Invalid password.");
            }
            String token = jwtUtil.generateToken(admin.getEmail(), "ADMIN", admin.getAdminId());
            return AuthResponseDTO.success(token, "ADMIN", admin.getAdminId(), admin.getName(), admin.getEmail());
        }

        return AuthResponseDTO.failure("No account found with: " + identifier);
    }

    @lombok.Data
    @lombok.NoArgsConstructor
    @lombok.AllArgsConstructor
    public static class LoginRequest {
        private String username;
        private String password;
    }
}
