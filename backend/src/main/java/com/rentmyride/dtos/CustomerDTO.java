package com.rentmyride.dtos;

import com.rentmyride.entities.Customer;
import lombok.*;
import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CustomerDTO {

    private Long customerId;
    private String firstName;
    private String lastName;
    private String email;
    private String mobileNumber;
    private String alternateMobile;
    private LocalDate dateOfBirth;
    private Customer.Gender gender;
    private String address;
    private String city;
    private String state;
    private String pincode;
    private String drivingLicenseNumber;
    private LocalDate drivingLicenseExpiry;
    private String aadharNumber;
    private String profileImageUrl;
    private String drivingLicenseImageUrl;
    private String aadharImageUrl;
    private Integer trustScore;
    private String referralCode;
    private Double walletBalance;
    private Customer.AccountStatus accountStatus;
    private String role;

    // Registration Request (password included only for registration)
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class RegisterRequest {
        private String firstName;
        private String lastName;
        private String email;
        private String password;
        private String mobileNumber;
        private String alternateMobile;
        private LocalDate dateOfBirth;
        private String gender; // MALE / FEMALE / OTHER
        private String address;
        private String city;
        private String state;
        private String pincode;
        private String drivingLicenseNumber;
        private LocalDate drivingLicenseExpiry;
        private String aadharNumber;
        private String drivingLicenseImageUrl;
        private String aadharImageUrl;
        private String referredByCode; // optional — a friend's referral code entered at signup
    }

    // Login Request
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class LoginRequest {
        private String username; // email or mobile
        private String password;
    }

    // Referral program summary shown on the customer's referral page
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class ReferralInfo {
        private String referralCode;
        private Double walletBalance;
        private long referredCount;
        private double bonusPerReferral;
    }
}
