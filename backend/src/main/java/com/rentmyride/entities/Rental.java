package com.rentmyride.entities;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "rental")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Rental {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "rental_id")
    private Long rentalId;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reservation_id", nullable = false)
    private Reservation reservation;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "customer_id", nullable = false)
    private Customer customer;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "car_id", nullable = false)
    private Car car;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "driver_id")
    private Driver driver;

    @Column(name = "actual_pickup_datetime")
    private LocalDateTime actualPickupDatetime;

    @Column(name = "actual_return_datetime")
    private LocalDateTime actualReturnDatetime;

    @Column(name = "odometer_at_pickup")
    private Double odometerAtPickup;

    @Column(name = "odometer_at_return")
    private Double odometerAtReturn;

    @Column(name = "total_km_driven")
    private Double totalKmDriven;

    @Column(name = "base_amount", nullable = false)
    private Double baseAmount;

    @Column(name = "extra_km_charges")
    private Double extraKmCharges;

    @Column(name = "damage_charges")
    private Double damageCharges;

    @Column(name = "late_return_charges")
    private Double lateReturnCharges;

    @Column(name = "discount_amount")
    private Double discountAmount;

    @Column(name = "total_amount", nullable = false)
    private Double totalAmount;

    @Enumerated(EnumType.STRING)
    @Column(name = "rental_status", nullable = false)
    private RentalStatus rentalStatus;

    @Column(name = "remarks", length = 500)
    private String remarks;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    public void prePersist() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
        this.rentalStatus = RentalStatus.ACTIVE;
        this.extraKmCharges = 0.0;
        this.damageCharges = 0.0;
        this.lateReturnCharges = 0.0;
        this.discountAmount = 0.0;
    }

    @PreUpdate
    public void preUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

    // Relationship to Payment
    @OneToOne(mappedBy = "rental", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private Payment payment;

    // Enum
    public enum RentalStatus {
        ACTIVE, COMPLETED, CANCELLED, OVERDUE
    }
}
