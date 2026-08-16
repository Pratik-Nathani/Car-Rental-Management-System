package com.rentmyride.dtos;

import com.rentmyride.entities.Reservation;
import lombok.*;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ReservationDTO {

    private Long reservationId;
    private Long customerId;
    private String customerName;
    private String customerMobile;
    private Long carId;
    private String carBrand;
    private String carModel;
    private String carRegistrationNumber;
    private Long assignedDriverId;
    private String assignedDriverName;
    private String assignedDriverMobile;
    private LocalDate pickupDate;
    private LocalTime pickupTime;
    private LocalDate returnDate;
    private Integer totalDays;
    private Reservation.TripType tripType;
    private String pickupLocation;
    private String dropLocation;
    private String viaLocations;
    private Double distanceKm;
    private Integer nights;
    private Double baseFare;
    private Double nightCharges;
    private String promoCode;
    private Double discountAmount;
    private Double walletCreditsUsed;
    private Double estimatedAmount;
    private Reservation.ReservationStatus reservationStatus;
    private Reservation.BookingPaymentStatus paymentStatus;
    private Reservation.PaymentType paymentType;
    private Double amountPaid;
    private Double balanceDue;
    private Double cancellationFee;
    private Double refundAmount;
    private String specialRequests;
    private LocalDateTime createdAt;

    // Create Request
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class CreateRequest {
        private Long carId;
        private LocalDate pickupDate;
        private LocalTime pickupTime;
        private LocalDate returnDate;
        private Reservation.TripType tripType;
        private String pickupLocation;
        private String dropLocation;
        private List<String> viaLocations; // optional extra stops, in order
        private String promoCode; // optional
        private boolean useWalletCredits; // apply referral wallet balance toward this booking
        private String specialRequests;
    }

    // Live price preview before actually creating the reservation
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class EstimateRequest {
        private Long carId;
        private LocalDate pickupDate;
        private LocalDate returnDate;
        private Reservation.TripType tripType;
        private String pickupLocation;
        private String dropLocation;
        private List<String> viaLocations;
        private String promoCode;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class EstimateResponse {
        private Reservation.TripType tripType;
        private Double distanceKm;     // round-trip distance, OUTSTATION only
        private Integer totalDays;
        private Integer nights;
        private Double ratePerKm;
        private Double baseFare;
        private Double nightCharges;
        private Double estimatedAmount;
        private String promoCode;
        private Double discountAmount;
        private Double finalAmount;
        private String pricingMethod; // "OUTSTATION_DISTANCE", "LOCAL_PACKAGE", or "PER_DAY" (fallback)
    }

    // Status Update Request
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class StatusUpdateRequest {
        private Reservation.ReservationStatus reservationStatus;
        private String remarks;
    }

    // ── Booking payment (pay in full, or a minimum ₹1000 deposit to confirm) ──
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PayRequest {
        private Reservation.PaymentType paymentType; // FULL or DEPOSIT
        private Double amount;                       // required when paymentType = DEPOSIT
        private String paymentMethod;                // UPI / CARD / NET_BANKING / etc (display only)
    }

    // ── Reschedule an existing booking to new dates ──
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RescheduleRequest {
        private LocalDate newPickupDate;
        private LocalTime newPickupTime;
        private LocalDate newReturnDate;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class RescheduleResponse {
        private ReservationDTO reservation;
        private boolean freeReschedule; // true if 12+ hours before the ORIGINAL pickup
        private Double rescheduleFee;
        private String message;
    }

    // ── Cancellation result (shows the fee/refund applied) ──
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class CancelResponse {
        private Long reservationId;
        private boolean freeCancellation; // true if cancelled 12+ hours before pickup
        private Double cancellationFee;
        private Double refundAmount;
        private String message;
    }

    // Shown on the car detail page so customers can check availability before booking
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class BookedRange {
        private LocalDate pickupDate;
        private LocalDate returnDate;
        private Reservation.ReservationStatus status;
    }

    // Admin assigns a driver to a booking — triggers customer notification + email
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AssignDriverRequest {
        private Long driverId;
    }
}
