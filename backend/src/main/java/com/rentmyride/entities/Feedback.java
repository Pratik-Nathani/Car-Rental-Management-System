package com.rentmyride.entities;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "feedback")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Feedback {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "feedback_id")
    private Long feedbackId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "rental_id", nullable = false)
    private Rental rental;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "customer_id", nullable = false)
    private Customer customer;

    @Column(name = "car_condition", nullable = false)
    private Integer carCondition;

    @Column(name = "staff_behavior", nullable = false)
    private Integer staffBehavior;

    @Column(name = "value_for_money", nullable = false)
    private Integer valueForMoney;

    @Column(name = "booking_process", nullable = false)
    private Integer bookingProcess;

    @Column(name = "overall_service", nullable = false)
    private Integer overallService;

    @Column(name = "comments", length = 1000)
    private String comments;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    public void prePersist() {
        this.createdAt = LocalDateTime.now();
    }
}
