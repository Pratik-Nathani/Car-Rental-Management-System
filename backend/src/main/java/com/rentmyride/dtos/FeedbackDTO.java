package com.rentmyride.dtos;

import lombok.*;

import java.time.LocalDateTime;

public class FeedbackDTO {

    // Customer submits this after a completed rental
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SubmitRequest {
        private Long rentalId;
        private Integer carCondition;
        private Integer staffBehavior;
        private Integer valueForMoney;
        private Integer bookingProcess;
        private Integer overallService;
        private String comments;
    }

    // Returned to admin (list view) and to the customer (confirmation)
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class Response {
        private Long feedbackId;
        private Long rentalId;
        private Long customerId;
        private String customerName;
        private String carLabel; // e.g. "Maruti Swift"
        private Integer carCondition;
        private Integer staffBehavior;
        private Integer valueForMoney;
        private Integer bookingProcess;
        private Integer overallService;
        private Double averageRating;
        private String comments;
        private LocalDateTime createdAt;
    }

    // Shown to customers browsing/viewing a car — aggregate rating, not tied to any one review
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class CarRatingSummary {
        private Long carId;
        private Double averageRating;
        private Long totalReviews;
    }
}
