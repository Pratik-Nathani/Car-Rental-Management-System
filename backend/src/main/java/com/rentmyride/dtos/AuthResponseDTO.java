package com.rentmyride.dtos;

import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AuthResponseDTO {

    private String token;
    private String tokenType = "Bearer";
    private String role;
    private Long userId;
    private String name;
    private String email;
    private String message;
    private boolean success;

    // Success Response Builder
    public static AuthResponseDTO success(String token, String role,
                                          Long userId, String name, String email) {
        return AuthResponseDTO.builder()
                .token(token)
                .tokenType("Bearer")
                .role(role)
                .userId(userId)
                .name(name)
                .email(email)
                .success(true)
                .message("Login successful")
                .build();
    }

    // Failure Response Builder
    public static AuthResponseDTO failure(String message) {
        return AuthResponseDTO.builder()
                .success(false)
                .message(message)
                .build();
    }

    // Admin Login Request
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AdminLoginRequest {
        private String username;
        private String password;
    }

    // OTP Request
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class OtpRequest {
        private String mobile;
        private String otp;
    }

    // API Error Response
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class ApiResponse {
        private boolean success;
        private String message;
        private Object data;

        public static ApiResponse success(String message, Object data) {
            return ApiResponse.builder()
                    .success(true)
                    .message(message)
                    .data(data)
                    .build();
        }

        public static ApiResponse error(String message) {
            return ApiResponse.builder()
                    .success(false)
                    .message(message)
                    .build();
        }
    }
}
