package com.rentmyride.dtos;

import com.rentmyride.entities.Payment;
import lombok.*;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PaymentDTO {

    private Long paymentId;
    private Long rentalId;
    private Long reservationId;
    private Long customerId;
    private String customerName;
    private String customerEmail;
    private String customerMobile;
    private String carBrand;
    private String carModel;
    private String carRegistrationNumber;
    private java.time.LocalDate pickupDate;
    private java.time.LocalDate returnDate;
    private String pickupLocation;
    private String dropLocation;
    private String razorpayOrderId;
    private String razorpayPaymentId;
    private String razorpaySignature;
    private Double baseAmount;
    private Double gstPercentage;
    private Double gstAmount;
    private Double totalAmount;
    private Payment.PaymentMethod paymentMethod;
    private Payment.PaymentStatus paymentStatus;
    private String transactionReference;
    private LocalDateTime paymentDatetime;
    private String failureReason;

    // Initiate Payment Request
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class InitiateRequest {
        private Long rentalId;
        private Payment.PaymentMethod paymentMethod;
    }

    // Razorpay Verify Request
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class VerifyRequest {
        private String razorpayOrderId;
        private String razorpayPaymentId;
        private String razorpaySignature;
    }

    // Razorpay Order Response
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class RazorpayOrderResponse {
        private String orderId;
        private Double amount;
        private String currency;
        private String keyId;
        private String customerName;
        private String customerEmail;
        private String customerContact;
    }

    // ── Reservation-based booking payment (full or deposit, paid via Razorpay) ──
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ReservationOrderRequest {
        private Long reservationId;
        private com.rentmyride.entities.Reservation.PaymentType paymentType; // FULL or DEPOSIT
        private Double amount; // required when paymentType = DEPOSIT
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ReservationVerifyRequest {
        private Long reservationId;
        private com.rentmyride.entities.Reservation.PaymentType paymentType;
        private Double amount;
        private String razorpayOrderId;
        private String razorpayPaymentId;
        private String razorpaySignature;
    }
}
