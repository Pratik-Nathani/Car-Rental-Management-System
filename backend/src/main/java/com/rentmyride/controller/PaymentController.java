package com.rentmyride.controller;

import com.rentmyride.dtos.AuthResponseDTO;
import com.rentmyride.dtos.PaymentDTO;
import com.rentmyride.service.PaymentService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/payments")
@RequiredArgsConstructor
public class PaymentController {
    private final PaymentService paymentService;

    @PostMapping("/create-order")
    @PreAuthorize("hasAnyRole('ADMIN','CUSTOMER')")
    public ResponseEntity<AuthResponseDTO.ApiResponse> createOrder(@RequestBody PaymentDTO.InitiateRequest request) {
        return ResponseEntity.ok(AuthResponseDTO.ApiResponse.success("Order created.", paymentService.createRazorpayOrder(request)));
    }

    @PostMapping("/verify")
    @PreAuthorize("hasAnyRole('ADMIN','CUSTOMER')")
    public ResponseEntity<AuthResponseDTO.ApiResponse> verifyPayment(@RequestBody PaymentDTO.VerifyRequest request) {
        return ResponseEntity.ok(AuthResponseDTO.ApiResponse.success("Payment verified.", paymentService.verifyAndSavePayment(request)));
    }

    // ── Booking-confirmation payment (full or ₹1000+ deposit) via Razorpay ──
    @PostMapping("/reservation/create-order")
    @PreAuthorize("hasAnyRole('ADMIN','CUSTOMER')")
    public ResponseEntity<AuthResponseDTO.ApiResponse> createReservationOrder(@RequestBody PaymentDTO.ReservationOrderRequest request) {
        return ResponseEntity.ok(AuthResponseDTO.ApiResponse.success("Order created.",
                paymentService.createReservationOrder(request)));
    }

    @PostMapping("/reservation/verify")
    @PreAuthorize("hasAnyRole('ADMIN','CUSTOMER')")
    public ResponseEntity<AuthResponseDTO.ApiResponse> verifyReservationPayment(@RequestBody PaymentDTO.ReservationVerifyRequest request) {
        return ResponseEntity.ok(AuthResponseDTO.ApiResponse.success("Payment verified. Booking confirmed.",
                paymentService.verifyReservationPayment(request)));
    }

    @GetMapping("/{paymentId}")
    @PreAuthorize("hasAnyRole('ADMIN','CUSTOMER')")
    public ResponseEntity<AuthResponseDTO.ApiResponse> getById(@PathVariable Long paymentId) {
        return ResponseEntity.ok(AuthResponseDTO.ApiResponse.success("Payment fetched.", paymentService.getPaymentById(paymentId)));
    }

    @GetMapping("/rental/{rentalId}")
    @PreAuthorize("hasAnyRole('ADMIN','CUSTOMER','DRIVER')")
    public ResponseEntity<AuthResponseDTO.ApiResponse> getByRental(@PathVariable Long rentalId) {
        return ResponseEntity.ok(AuthResponseDTO.ApiResponse.success("Payment by rental.", paymentService.getPaymentByRentalId(rentalId)));
    }

    @GetMapping("/reservation/{reservationId}")
    @PreAuthorize("hasAnyRole('ADMIN','CUSTOMER')")
    public ResponseEntity<AuthResponseDTO.ApiResponse> getByReservation(@PathVariable Long reservationId) {
        return ResponseEntity.ok(AuthResponseDTO.ApiResponse.success("Payments for reservation.", paymentService.getPaymentsByReservationId(reservationId)));
    }

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<AuthResponseDTO.ApiResponse> getAll() {
        return ResponseEntity.ok(AuthResponseDTO.ApiResponse.success("All payments.", paymentService.getAllPayments()));
    }

    @GetMapping("/customer/{customerId}")
    @PreAuthorize("hasAnyRole('ADMIN','CUSTOMER')")
    public ResponseEntity<AuthResponseDTO.ApiResponse> getByCustomer(@PathVariable Long customerId) {
        return ResponseEntity.ok(AuthResponseDTO.ApiResponse.success("Customer payments.", paymentService.getPaymentsByCustomer(customerId)));
    }

    // Customer-downloadable PDF receipt — generated on the fly from the Payment + its booking,
    // no separate invoice record involved.
    @GetMapping("/{paymentId}/receipt")
    @PreAuthorize("hasAnyRole('ADMIN','CUSTOMER')")
    public ResponseEntity<byte[]> downloadReceipt(@PathVariable Long paymentId) {
        byte[] pdf = paymentService.generateReceiptPdf(paymentId);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=receipt-" + paymentId + ".pdf")
                .contentType(MediaType.APPLICATION_PDF)
                .body(pdf);
    }

    // One combined bill for the whole booking (deposit/full + final settlement, if any),
    // instead of the customer having to piece together two separate receipts.
    @GetMapping("/reservation/{reservationId}/consolidated-receipt")
    @PreAuthorize("hasAnyRole('ADMIN','CUSTOMER')")
    public ResponseEntity<byte[]> downloadConsolidatedReceipt(@PathVariable Long reservationId) {
        byte[] pdf = paymentService.generateConsolidatedReceiptForReservation(reservationId);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=bill-RES-" + reservationId + ".pdf")
                .contentType(MediaType.APPLICATION_PDF)
                .body(pdf);
    }
}
