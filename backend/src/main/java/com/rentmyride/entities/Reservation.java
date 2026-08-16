package com.rentmyride.entities;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

@Entity
@Table(name = "reservation")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Reservation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "reservation_id")
    private Long reservationId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "customer_id", nullable = false)
    private Customer customer;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "car_id", nullable = false)
    private Car car;

    // Set by admin — the driver responsible for this booking's pickup/drop
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "driver_id")
    private Driver assignedDriver;

    @Column(name = "pickup_date", nullable = false)
    private LocalDate pickupDate;

    // Used (with pickupDate) to enforce the 12-hour free-cancellation window
    @Column(name = "pickup_time", nullable = false)
    private LocalTime pickupTime;

    @Column(name = "return_date", nullable = false)
    private LocalDate returnDate;

    @Column(name = "total_days", nullable = false)
    private Integer totalDays;

    // LOCAL = customer stays within their home city/district (flat package rate)
    // OUTSTATION = travelling to another district (round-trip distance + night charges)
    @Enumerated(EnumType.STRING)
    @Column(name = "trip_type", nullable = false)
    private TripType tripType;

    @Column(name = "pickup_location", nullable = false, length = 200)
    private String pickupLocation;

    @Column(name = "drop_location", nullable = false, length = 200)
    private String dropLocation;

    // Optional extra stops between pickup and drop, stored as a comma-separated list of location names
    @Column(name = "via_locations", length = 500)
    private String viaLocations;

    // Round-trip road distance (pickup → via stops → drop → back to pickup) — OUTSTATION only
    @Column(name = "distance_km")
    private Double distanceKm;

    // Number of nights the car stays out — 0 if same-day return
    @Column(name = "nights")
    private Integer nights;

    @Column(name = "base_fare")
    private Double baseFare;

    @Column(name = "night_charges")
    private Double nightCharges;

    @Column(name = "estimated_amount", nullable = false)
    private Double estimatedAmount;

    @Column(name = "promo_code", length = 30)
    private String promoCode;

    @Column(name = "discount_amount")
    private Double discountAmount;

    @Column(name = "wallet_credits_used")
    private Double walletCreditsUsed;

    @Enumerated(EnumType.STRING)
    @Column(name = "reservation_status", nullable = false)
    private ReservationStatus reservationStatus;

    // ── Booking-time payment (full payment OR minimum ₹1000 deposit) ──
    @Enumerated(EnumType.STRING)
    @Column(name = "payment_status", nullable = false)
    private BookingPaymentStatus paymentStatus;

    @Enumerated(EnumType.STRING)
    @Column(name = "payment_type")
    private PaymentType paymentType; // FULL or DEPOSIT — set once the customer pays

    @Column(name = "amount_paid", nullable = false)
    private Double amountPaid;

    // ── Cancellation ──
    @Column(name = "cancellation_fee")
    private Double cancellationFee;

    @Column(name = "refund_amount")
    private Double refundAmount;

    @Column(name = "cancelled_at")
    private LocalDateTime cancelledAt;

    @Column(name = "special_requests", length = 500)
    private String specialRequests;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    public void prePersist() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
        this.reservationStatus = ReservationStatus.PENDING;
        this.paymentStatus = BookingPaymentStatus.UNPAID;
        this.amountPaid = 0.0;
        this.totalDays = (int) (returnDate.toEpochDay() - pickupDate.toEpochDay());
        // estimatedAmount/baseFare/nightCharges/distanceKm/nights are calculated by the
        // service layer and set on the builder before save, so they are NOT overwritten here.
    }

    @PreUpdate
    public void preUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

    // Relationship to Rental
    @OneToOne(mappedBy = "reservation", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private Rental rental;

    // Enums
    public enum ReservationStatus {
        PENDING, CONFIRMED, CANCELLED, COMPLETED, REJECTED
    }

    public enum TripType {
        LOCAL, OUTSTATION
    }

    public enum BookingPaymentStatus {
        UNPAID, DEPOSIT_PAID, FULLY_PAID, REFUNDED, PARTIALLY_REFUNDED
    }

    public enum PaymentType {
        FULL, DEPOSIT
    }
}
