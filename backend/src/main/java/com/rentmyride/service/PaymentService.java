package com.rentmyride.service;

import com.rentmyride.dtos.PaymentDTO;
import com.rentmyride.entities.Payment;
import java.util.List;

public interface PaymentService {
    PaymentDTO.RazorpayOrderResponse createRazorpayOrder(PaymentDTO.InitiateRequest request);
    PaymentDTO verifyAndSavePayment(PaymentDTO.VerifyRequest request);

    // Booking-confirmation payment (full or ₹1000+ deposit) — scoped to a Reservation, not a Rental
    PaymentDTO.RazorpayOrderResponse createReservationOrder(PaymentDTO.ReservationOrderRequest request);
    com.rentmyride.dtos.ReservationDTO verifyReservationPayment(PaymentDTO.ReservationVerifyRequest request);
    PaymentDTO getPaymentById(Long paymentId);
    PaymentDTO getPaymentByRentalId(Long rentalId);
    List<PaymentDTO> getPaymentsByReservationId(Long reservationId);
    List<PaymentDTO> getAllPayments();
    List<PaymentDTO> getPaymentsByCustomer(Long customerId);
    List<PaymentDTO> getPaymentsByStatus(Payment.PaymentStatus status);
    Double getTotalCollected();
    Double getMonthlyCollection(int month, int year);

    // Generates a downloadable PDF receipt for a payment — pulls straight from the
    // Payment's own GST breakdown plus its linked Reservation/Rental, no separate invoice record.
    byte[] generateReceiptPdf(Long paymentId);

    // One combined bill for an entire booking — the booking-stage payment (deposit/full)
    // AND the final settlement payment (extra km/damage charges), if both exist, shown as
    // line items with a grand total, instead of two separate receipts.
    byte[] generateConsolidatedReceiptForReservation(Long reservationId);
}
