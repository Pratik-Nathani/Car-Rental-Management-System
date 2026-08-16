package com.rentmyride.dtos;

import com.rentmyride.entities.Driver;
import lombok.*;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DriverDTO {
    private Long driverId;
    private String firstName;
    private String lastName;
    private String email;
    private String mobileNumber;
    private String licenseNumber;
    private Driver.Status status;
    private java.time.LocalDate dateOfJoining;
    private LocalDateTime createdAt;

    // Admin creates a driver account
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RegisterRequest {
        private String firstName;
        private String lastName;
        private String email;
        private String password;
        private String mobileNumber;
        private String licenseNumber;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class LoginRequest {
        private String email;
        private String password;
    }
}
