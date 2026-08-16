package com.rentmyride.service.impl;

import com.rentmyride.custom_exceptions.PaymentFailedException;
import com.rentmyride.custom_exceptions.PaymentNotFoundException;
import com.rentmyride.custom_exceptions.RentalNotFoundException;
import com.rentmyride.custom_exceptions.ReservationNotFoundException;
import com.rentmyride.custom_exceptions.UnauthorizedAccessException;
import com.rentmyride.security.SecurityUtils;
import com.rentmyride.dtos.PaymentDTO;
import com.rentmyride.dtos.ReservationDTO;
import com.rentmyride.entities.Car;
import com.rentmyride.entities.Payment;
import com.rentmyride.entities.Rental;
import com.rentmyride.entities.Reservation;
import com.rentmyride.repository.PaymentRepository;
import com.rentmyride.repository.RentalRepository;
import com.rentmyride.repository.ReservationRepository;
import com.rentmyride.service.PaymentService;
import com.rentmyride.service.ReservationService;
import com.rentmyride.util.RazorpaySignatureUtil;
import com.razorpay.Order;
import com.razorpay.RazorpayClient;
import com.razorpay.RazorpayException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.PDFont;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;
import org.json.JSONObject;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayOutputStream;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class PaymentServiceImpl implements PaymentService {

    private final PaymentRepository paymentRepository;
    private final RentalRepository rentalRepository;
    private final ReservationRepository reservationRepository;
    private final ReservationService reservationService;
    private final com.rentmyride.repository.CustomerRepository customerRepository;
    private final RazorpayClient razorpayClient;

    @Value("${razorpay.key.id}")
    private String razorpayKeyId;

    @Value("${razorpay.key.secret}")
    private String razorpayKeySecret;

    @Override
    @Transactional
    public PaymentDTO.RazorpayOrderResponse createRazorpayOrder(PaymentDTO.InitiateRequest req) {
        Rental rental = rentalRepository.findById(req.getRentalId())
                .orElseThrow(() -> new RentalNotFoundException(req.getRentalId()));

        if (rental.getTotalAmount() == null)
            throw new PaymentFailedException("This rental doesn't have a final amount set yet — nothing to pay.");

        double baseAmount = rental.getTotalAmount();
        double gstAmount  = (baseAmount * 18) / 100;
        double totalAmount = baseAmount + gstAmount;

        try {
            JSONObject orderRequest = new JSONObject();
            orderRequest.put("amount", (int)(totalAmount * 100)); // paise
            orderRequest.put("currency", "INR");
            orderRequest.put("receipt", "RMR-" + rental.getRentalId());

            Order order = razorpayClient.orders.create(orderRequest);

            // Save pending payment
            Payment payment = Payment.builder()
                    .rental(rental)
                    .customer(rental.getCustomer())
                    .razorpayOrderId(order.get("id"))
                    .baseAmount(baseAmount)
                    .paymentMethod(req.getPaymentMethod())
                    .build();
            paymentRepository.save(payment);

            return PaymentDTO.RazorpayOrderResponse.builder()
                    .orderId(order.get("id"))
                    .amount(totalAmount)
                    .currency("INR")
                    .keyId(razorpayKeyId)
                    .customerName(rental.getCustomer().getFirstName() + " " + rental.getCustomer().getLastName())
                    .customerEmail(rental.getCustomer().getEmail())
                    .customerContact(rental.getCustomer().getMobileNumber())
                    .build();

        } catch (RazorpayException e) {
            log.error("[RMR] Razorpay order creation failed: {}", e.getMessage());
            throw new PaymentFailedException("Could not create Razorpay order: " + e.getMessage());
        }
    }

    @Override
    @Transactional
    public PaymentDTO verifyAndSavePayment(PaymentDTO.VerifyRequest req) {
        boolean valid = RazorpaySignatureUtil.verify(req.getRazorpayOrderId(), req.getRazorpayPaymentId(),
                req.getRazorpaySignature(), razorpayKeySecret);
        if (!valid)
            throw new PaymentFailedException("Payment signature verification failed.");

        Payment payment = paymentRepository.findByRazorpayOrderId(req.getRazorpayOrderId())
                .orElseThrow(() -> new PaymentNotFoundException("Payment not found for order: " + req.getRazorpayOrderId()));
        payment.setRazorpayPaymentId(req.getRazorpayPaymentId());
        payment.setRazorpaySignature(req.getRazorpaySignature());
        payment.setPaymentStatus(Payment.PaymentStatus.SUCCESS);
        payment.setPaymentDatetime(LocalDateTime.now());
        return mapToDTO(paymentRepository.save(payment));
    }

    // ── Booking-confirmation payment (full or ₹1000+ deposit) via Razorpay, scoped to a Reservation ──
    @Override
    @Transactional(readOnly = true)
    public PaymentDTO.RazorpayOrderResponse createReservationOrder(PaymentDTO.ReservationOrderRequest req) {
        Reservation reservation = reservationRepository.findById(req.getReservationId())
                .orElseThrow(() -> new ReservationNotFoundException(req.getReservationId()));

        double remaining = reservation.getEstimatedAmount() - reservation.getAmountPaid();
        if (remaining <= 0)
            throw new PaymentFailedException("This reservation is already fully paid.");

        double amount;
        if (req.getPaymentType() == Reservation.PaymentType.FULL) {
            amount = remaining;
        } else {
            amount = req.getAmount() == null ? 0 : req.getAmount();
            if (amount < 1000)
                throw new PaymentFailedException("Minimum deposit to confirm a booking is ₹1000.");
            if (amount > remaining) amount = remaining;
        }

        try {
            JSONObject orderRequest = new JSONObject();
            orderRequest.put("amount", (int) Math.round(amount * 100)); // paise
            orderRequest.put("currency", "INR");
            orderRequest.put("receipt", "RES-" + reservation.getReservationId());

            Order order = razorpayClient.orders.create(orderRequest);

            return PaymentDTO.RazorpayOrderResponse.builder()
                    .orderId(order.get("id"))
                    .amount(amount)
                    .currency("INR")
                    .keyId(razorpayKeyId)
                    .customerName(reservation.getCustomer().getFirstName() + " " + reservation.getCustomer().getLastName())
                    .customerEmail(reservation.getCustomer().getEmail())
                    .customerContact(reservation.getCustomer().getMobileNumber())
                    .build();
        } catch (RazorpayException e) {
            log.error("[RMR] Razorpay order creation failed for reservation {}: {}", req.getReservationId(), e.getMessage());
            throw new PaymentFailedException("Could not create Razorpay order: " + e.getMessage());
        }
    }

    @Override
    @Transactional
    public ReservationDTO verifyReservationPayment(PaymentDTO.ReservationVerifyRequest req) {
        boolean valid = RazorpaySignatureUtil.verify(req.getRazorpayOrderId(), req.getRazorpayPaymentId(),
                req.getRazorpaySignature(), razorpayKeySecret);
        if (!valid)
            throw new PaymentFailedException("Payment signature verification failed.");

        ReservationDTO.PayRequest payRequest = new ReservationDTO.PayRequest(
                req.getPaymentType(), req.getAmount(), "RAZORPAY");
        return reservationService.payForReservation(req.getReservationId(), payRequest);
    }

    @Override @Transactional(readOnly = true)
    public PaymentDTO getPaymentById(Long id) {
        Payment payment = paymentRepository.findById(id).orElseThrow(() -> new PaymentNotFoundException(id));
        assertOwnsPayment(payment);
        return mapToDTO(payment);
    }
    @Override @Transactional(readOnly = true)
    public PaymentDTO getPaymentByRentalId(Long rentalId) {
        Payment payment = paymentRepository.findByRental_RentalId(rentalId)
                .orElseThrow(() -> new PaymentNotFoundException("No payment for rental: " + rentalId));
        assertOwnsPayment(payment);
        return mapToDTO(payment);
    }
    @Override @Transactional(readOnly = true)
    public List<PaymentDTO> getPaymentsByReservationId(Long reservationId) {
        List<Payment> payments = paymentRepository.findByReservation_ReservationIdOrderByPaymentDatetimeDesc(reservationId);
        payments.forEach(this::assertOwnsPayment);
        return payments.stream().map(this::mapToDTO).collect(Collectors.toList());
    }
    @Override @Transactional(readOnly = true)
    public List<PaymentDTO> getAllPayments() {
        return paymentRepository.findAll().stream().map(this::mapToDTO).collect(Collectors.toList());
    }
    @Override @Transactional(readOnly = true)
    public List<PaymentDTO> getPaymentsByCustomer(Long customerId) {
        List<Payment> payments = paymentRepository.findByCustomer_CustomerId(customerId);
        payments.forEach(this::assertOwnsPayment);
        return payments.stream().map(this::mapToDTO).collect(Collectors.toList());
    }
    @Override @Transactional(readOnly = true)
    public List<PaymentDTO> getPaymentsByStatus(Payment.PaymentStatus status) {
        return paymentRepository.findByPaymentStatus(status).stream().map(this::mapToDTO).collect(Collectors.toList());
    }
    @Override @Transactional(readOnly = true)
    public Double getTotalCollected() { return paymentRepository.getTotalCollected(); }
    @Override @Transactional(readOnly = true)
    public Double getMonthlyCollection(int month, int year) { return paymentRepository.getMonthlyCollection(month, year); }

    // ── Payment receipt PDF ──────────────────────────────────
    // Built straight from the Payment's own stored GST breakdown plus whatever booking it's
    // tied to (Reservation directly, or via a Rental for an old-style final-settlement payment).
    // No separate invoice record is generated or stored — this is rendered fresh on every download.
    @Override
    @Transactional(readOnly = true)
    public byte[] generateReceiptPdf(Long paymentId) {
        Payment p = paymentRepository.findById(paymentId)
                .orElseThrow(() -> new PaymentNotFoundException(paymentId));
        assertOwnsPayment(p);

        // Resolve the booking this payment belongs to, however it's linked
        Reservation reservation = p.getReservation() != null ? p.getReservation()
                : (p.getRental() != null ? p.getRental().getReservation() : null);
        com.rentmyride.entities.Car car = reservation != null ? reservation.getCar()
                : (p.getRental() != null ? p.getRental().getCar() : null);

        try (PDDocument doc = new PDDocument()) {
            PDPage page = new PDPage(PDRectangle.A4);
            doc.addPage(page);
            PDFont bold = new PDType1Font(Standard14Fonts.FontName.HELVETICA_BOLD);
            PDFont regular = new PDType1Font(Standard14Fonts.FontName.HELVETICA);

            try (PDPageContentStream cs = new PDPageContentStream(doc, page)) {
                float margin = 50;
                float y = page.getMediaBox().getHeight() - 60;
                float lineHeight = 20;

                y = writeLine(cs, bold, 20, margin, y, "RentMyRide");
                y = writeLine(cs, regular, 10, margin, y, "Payment Receipt");
                y -= 10;

                String receiptNo = "RCPT-" + String.format("%06d", paymentId);
                String paidOn = p.getPaymentDatetime() != null
                        ? p.getPaymentDatetime().format(DateTimeFormatter.ofPattern("dd MMM yyyy, hh:mm a"))
                        : "—";
                y = writeLine(cs, regular, 11, margin, y, "Receipt No: " + receiptNo);
                y = writeLine(cs, regular, 11, margin, y, "Paid On: " + paidOn);
                y = writeLine(cs, regular, 11, margin, y, "Status: " + p.getPaymentStatus());
                y -= lineHeight;

                y = writeLine(cs, bold, 13, margin, y, "Customer");
                y = writeLine(cs, regular, 11, margin, y,
                        p.getCustomer().getFirstName() + " " + p.getCustomer().getLastName());
                y = writeLine(cs, regular, 11, margin, y, p.getCustomer().getMobileNumber());
                y = writeLine(cs, regular, 11, margin, y, p.getCustomer().getEmail());
                y -= lineHeight;

                if (car != null) {
                    y = writeLine(cs, bold, 13, margin, y, "Trip Details");
                    y = writeLine(cs, regular, 11, margin, y,
                            "Car: " + car.getBrand() + " " + car.getModel() + " (" + car.getRegistrationNumber() + ")");
                    if (reservation != null) {
                        y = writeLine(cs, regular, 11, margin, y,
                                "Pickup: " + reservation.getPickupDate() + " at " + reservation.getPickupTime()
                                        + " — " + reservation.getPickupLocation());
                        y = writeLine(cs, regular, 11, margin, y,
                                "Return: " + reservation.getReturnDate() + " — " + reservation.getDropLocation());
                        y = writeLine(cs, regular, 11, margin, y, "Trip Type: " + reservation.getTripType());
                    }
                    y -= lineHeight;
                }

                y = writeLine(cs, bold, 13, margin, y, "Amount");
                y = writeLine(cs, regular, 11, margin, y, String.format("Base Amount: Rs. %.2f", p.getBaseAmount()));
                y = writeLine(cs, regular, 11, margin, y,
                        String.format("GST (%.0f%%): Rs. %.2f", p.getGstPercentage(), p.getGstAmount()));
                y = writeLine(cs, bold, 12, margin, y, String.format("Total Paid: Rs. %.2f", p.getTotalAmount()));
                y = writeLine(cs, regular, 11, margin, y, "Payment Method: " + p.getPaymentMethod());
                y -= lineHeight;

                writeLine(cs, regular, 10, margin, y, "Thank you for choosing RentMyRide!");
            }

            ByteArrayOutputStream out = new ByteArrayOutputStream();
            doc.save(out);
            return out.toByteArray();
        } catch (java.io.IOException e) {
            throw new RuntimeException("Failed to generate receipt PDF: " + e.getMessage(), e);
        }
    }

    @Override
    @Transactional(readOnly = true)
    public byte[] generateConsolidatedReceiptForReservation(Long reservationId) {
        Reservation reservation = reservationRepository.findById(reservationId)
                .orElseThrow(() -> new ReservationNotFoundException(reservationId));

        List<Payment> bookingPayments = paymentRepository
                .findByReservation_ReservationIdOrderByPaymentDatetimeDesc(reservationId);
        Payment settlementPayment = rentalRepository.findByReservation_ReservationId(reservationId)
                .map(Rental::getPayment).orElse(null);

        if (bookingPayments.isEmpty() && settlementPayment == null)
            throw new PaymentNotFoundException("No payments found for this booking yet.");

        // Ownership check against whichever payment we have
        Payment anyPayment = !bookingPayments.isEmpty() ? bookingPayments.get(0) : settlementPayment;
        assertOwnsPayment(anyPayment);

        Car car = reservation.getCar();
        double grandTotal = bookingPayments.stream().mapToDouble(Payment::getTotalAmount).sum()
                + (settlementPayment != null ? settlementPayment.getTotalAmount() : 0.0);

        try (PDDocument doc = new PDDocument()) {
            PDPage page = new PDPage(PDRectangle.A4);
            doc.addPage(page);
            PDFont bold = new PDType1Font(Standard14Fonts.FontName.HELVETICA_BOLD);
            PDFont regular = new PDType1Font(Standard14Fonts.FontName.HELVETICA);

            try (PDPageContentStream cs = new PDPageContentStream(doc, page)) {
                float margin = 50;
                float y = page.getMediaBox().getHeight() - 60;

                y = writeLine(cs, bold, 20, margin, y, "RentMyRide");
                y = writeLine(cs, regular, 10, margin, y, "Consolidated Bill — Booking #RES-" + reservationId);
                y -= 10;

                y = writeLine(cs, bold, 13, margin, y, "Customer");
                y = writeLine(cs, regular, 11, margin, y,
                        reservation.getCustomer().getFirstName() + " " + reservation.getCustomer().getLastName());
                y = writeLine(cs, regular, 11, margin, y, reservation.getCustomer().getMobileNumber());
                y -= 15;

                if (car != null) {
                    y = writeLine(cs, bold, 13, margin, y, "Trip Details");
                    y = writeLine(cs, regular, 11, margin, y,
                            "Car: " + car.getBrand() + " " + car.getModel() + " (" + car.getRegistrationNumber() + ")");
                    y = writeLine(cs, regular, 11, margin, y,
                            "Pickup: " + reservation.getPickupDate() + " — Return: " + reservation.getReturnDate());
                    y -= 15;
                }

                y = writeLine(cs, bold, 13, margin, y, "Payments");
                for (Payment bp : bookingPayments) {
                    String when = bp.getPaymentDatetime() != null
                            ? bp.getPaymentDatetime().format(DateTimeFormatter.ofPattern("dd MMM yyyy")) : "—";
                    y = writeLine(cs, regular, 11, margin, y,
                            String.format("Booking Payment (%s) — %s — Rs. %.2f",
                                    bp.getPaymentMethod(), when, bp.getTotalAmount()));
                }
                if (settlementPayment != null) {
                    String when = settlementPayment.getPaymentDatetime() != null
                            ? settlementPayment.getPaymentDatetime().format(DateTimeFormatter.ofPattern("dd MMM yyyy")) : "—";
                    y = writeLine(cs, regular, 11, margin, y,
                            String.format("Final Settlement (extra km / damage / late fee) — %s — Rs. %.2f",
                                    when, settlementPayment.getTotalAmount()));
                }
                y -= 10;
                y = writeLine(cs, bold, 14, margin, y, String.format("Grand Total: Rs. %.2f", grandTotal));
                y -= 20;

                writeLine(cs, regular, 10, margin, y, "Thank you for choosing RentMyRide!");
            }

            ByteArrayOutputStream out = new ByteArrayOutputStream();
            doc.save(out);
            return out.toByteArray();
        } catch (java.io.IOException e) {
            throw new RuntimeException("Failed to generate consolidated receipt: " + e.getMessage(), e);
        }
    }

    private float writeLine(PDPageContentStream cs, PDFont font, float size, float x, float y, String text)
            throws java.io.IOException {
        cs.beginText();
        cs.setFont(font, size);
        cs.newLineAtOffset(x, y);
        cs.showText(text == null ? "" : text);
        cs.endText();
        return y - (size + 8);
    }

    // ── Ownership check ──────────────────────────────────────
    // A valid JWT only proves "this is some logged-in customer" — role-based @PreAuthorize
    // checks on the controller don't stop customer A from requesting customer B's payment
    // just by changing the ID in the URL. This closes that gap: for a CUSTOMER-role token,
    // the payment's own customer must match who's actually logged in. Admins bypass this.
    private void assertOwnsPayment(Payment payment) {
        if (SecurityUtils.isAdmin()) return;
        String email = SecurityUtils.currentEmail();
        if (email == null) return;

        customerRepository.findByEmail(email).ifPresent(me -> {
            if (!payment.getCustomer().getCustomerId().equals(me.getCustomerId())) {
                throw new UnauthorizedAccessException("You don't have access to this payment.");
            }
        });
    }

    private PaymentDTO mapToDTO(Payment p) {
        Reservation reservation = p.getReservation() != null ? p.getReservation()
                : (p.getRental() != null ? p.getRental().getReservation() : null);
        com.rentmyride.entities.Car car = reservation != null ? reservation.getCar()
                : (p.getRental() != null ? p.getRental().getCar() : null);

        return PaymentDTO.builder()
                .paymentId(p.getPaymentId())
                .rentalId(p.getRental() != null ? p.getRental().getRentalId() : null)
                .reservationId(p.getReservation() != null ? p.getReservation().getReservationId() : null)
                .customerId(p.getCustomer().getCustomerId())
                .customerName(p.getCustomer().getFirstName() + " " + p.getCustomer().getLastName())
                .customerEmail(p.getCustomer().getEmail())
                .customerMobile(p.getCustomer().getMobileNumber())
                .carBrand(car != null ? car.getBrand() : null)
                .carModel(car != null ? car.getModel() : null)
                .carRegistrationNumber(car != null ? car.getRegistrationNumber() : null)
                .pickupDate(reservation != null ? reservation.getPickupDate() : null)
                .returnDate(reservation != null ? reservation.getReturnDate() : null)
                .pickupLocation(reservation != null ? reservation.getPickupLocation() : null)
                .dropLocation(reservation != null ? reservation.getDropLocation() : null)
                .razorpayOrderId(p.getRazorpayOrderId())
                .razorpayPaymentId(p.getRazorpayPaymentId())
                .baseAmount(p.getBaseAmount()).gstPercentage(p.getGstPercentage())
                .gstAmount(p.getGstAmount()).totalAmount(p.getTotalAmount())
                .paymentMethod(p.getPaymentMethod()).paymentStatus(p.getPaymentStatus())
                .paymentDatetime(p.getPaymentDatetime())
                .build();
    }
}
