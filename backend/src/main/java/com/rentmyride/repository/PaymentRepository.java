package com.rentmyride.repository;

import com.rentmyride.entities.Payment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PaymentRepository extends JpaRepository<Payment, Long> {

    Optional<Payment> findByRazorpayOrderId(String razorpayOrderId);
    Optional<Payment> findByRazorpayPaymentId(String razorpayPaymentId);
    Optional<Payment> findByRental_RentalId(Long rentalId);
    List<Payment> findByReservation_ReservationIdOrderByPaymentDatetimeDesc(Long reservationId);
    List<Payment> findByCustomer_CustomerId(Long customerId);
    List<Payment> findByPaymentStatus(Payment.PaymentStatus status);
    List<Payment> findByPaymentMethod(Payment.PaymentMethod method);

    @Query("SELECT SUM(p.totalAmount) FROM Payment p WHERE p.paymentStatus = 'SUCCESS'")
    Double getTotalCollected();

    @Query("SELECT SUM(p.totalAmount) FROM Payment p WHERE p.paymentStatus = 'SUCCESS' " +
           "AND MONTH(p.paymentDatetime) = :month AND YEAR(p.paymentDatetime) = :year")
    Double getMonthlyCollection(@Param("month") int month, @Param("year") int year);

    long countByPaymentStatus(Payment.PaymentStatus status);

    @Query("SELECT p FROM Payment p ORDER BY p.createdAt DESC")
    List<Payment> findRecentPayments(org.springframework.data.domain.Pageable pageable);
}
