package com.rentmyride.dtos;

import lombok.*;

public class OtpDTO {

    // Step 1: request an OTP to be sent (login OTP or forgot-password OTP)
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SendRequest {
        private String identifier; // email (or mobile) of the customer
    }

    // Step 2: verify the OTP that was sent
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class VerifyRequest {
        private String identifier;
        private String otp;
    }

    // Step 3 (forgot password only): reset the password after OTP is verified
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ResetPasswordRequest {
        private String identifier;
        private String otp;
        private String newPassword;
    }
}
