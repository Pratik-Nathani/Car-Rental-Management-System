package com.rentmyride.service.impl;

import com.rentmyride.custom_exceptions.*;
import com.rentmyride.dtos.PromoCodeDTO;
import com.rentmyride.dtos.ReservationDTO;
import com.rentmyride.entities.*;
import com.rentmyride.repository.*;
import com.rentmyride.service.CustomerService;
import com.rentmyride.service.NotificationService;
import com.rentmyride.service.PromoCodeService;
import com.rentmyride.service.ReservationService;
import com.rentmyride.util.BiharLocations;
import com.rentmyride.util.DistanceUtil;
import com.rentmyride.security.SecurityUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class ReservationServiceImpl implements ReservationService {

    private final ReservationRepository reservationRepository;
    private final CarRepository carRepository;
    private final CustomerRepository customerRepository;
    private final NotificationService notificationService;
    private final CustomerService customerService;
    private final PromoCodeService promoCodeService;
    private final com.rentmyride.repository.DriverRepository driverRepository;
    private final PaymentRepository paymentRepository;

    // ── Business rules (see class-level notes) ──
    private static final double LOCAL_PACKAGE_RATE_PER_DAY = 2600.0; // flat rate for in-city (LOCAL) use
    private static final double MIN_NIGHT_CHARGE = 300.0;             // per night, outstation trips only
    private static final double MIN_DEPOSIT_AMOUNT = 1000.0;          // minimum to confirm a booking
    private static final double CANCELLATION_FEE = 500.0;             // flat fee if cancelled late
    private static final double RESCHEDULE_FEE = 300.0;                // flat fee if rescheduled within the free window
    private static final int FREE_CANCELLATION_WINDOW_HOURS = 12;

    @Override
    @Transactional
    public ReservationDTO createReservation(Long customerId, ReservationDTO.CreateRequest req) {
        if (req.getReturnDate().isBefore(req.getPickupDate()))
            throw new InvalidDateRangeException();

        Customer customer = customerRepository.findById(customerId)
                .orElseThrow(() -> new CustomerNotFoundException(customerId));
        assertOwnsReservation(Reservation.builder().customer(customer).build());
        Car car = carRepository.findById(req.getCarId())
                .orElseThrow(() -> new CarNotFoundException(req.getCarId()));
        if (car.getAvailabilityStatus() != Car.AvailabilityStatus.AVAILABLE)
            throw new CarNotAvailableException(req.getCarId());

        List<Reservation> conflicts = reservationRepository.findConflictingReservations(
                req.getCarId(), req.getPickupDate(), req.getReturnDate());
        if (!conflicts.isEmpty())
            throw new CarNotAvailableException("Car already reserved for selected dates.");

        int totalDays = (int) (req.getReturnDate().toEpochDay() - req.getPickupDate().toEpochDay());
        Reservation.TripType tripType = req.getTripType() == null ? Reservation.TripType.LOCAL : req.getTripType();
        PriceCalculation price = calculatePrice(car, tripType, req.getPickupLocation(), req.getDropLocation(),
                req.getViaLocations(), totalDays);

        double discount = 0.0;
        String appliedPromoCode = null;
        if (req.getPromoCode() != null && !req.getPromoCode().isBlank()) {
            discount = promoCodeService.applyAndConsume(req.getPromoCode(), price.estimatedAmount);
            if (discount > 0) appliedPromoCode = req.getPromoCode().trim().toUpperCase();
        }
        double finalAmount = Math.max(0, price.estimatedAmount - discount);

        double walletUsed = 0.0;
        if (req.isUseWalletCredits() && finalAmount > 0) {
            walletUsed = customerService.deductWalletBalance(customerId, finalAmount);
            finalAmount = Math.max(0, finalAmount - walletUsed);
        }

        Reservation reservation = Reservation.builder()
                .customer(customer).car(car)
                .pickupDate(req.getPickupDate())
                .pickupTime(req.getPickupTime() != null ? req.getPickupTime() : java.time.LocalTime.of(9, 0))
                .returnDate(req.getReturnDate())
                .tripType(tripType)
                .pickupLocation(req.getPickupLocation()).dropLocation(req.getDropLocation())
                .viaLocations(req.getViaLocations() == null ? null : String.join(", ", req.getViaLocations()))
                .distanceKm(price.distanceKm)
                .nights(price.nights)
                .baseFare(price.baseFare)
                .nightCharges(price.nightCharges)
                .promoCode(appliedPromoCode)
                .discountAmount(discount)
                .walletCreditsUsed(walletUsed)
                .estimatedAmount(finalAmount)
                .specialRequests(req.getSpecialRequests())
                .build();
        return mapToDTO(reservationRepository.save(reservation));
    }

    @Override
    @Transactional(readOnly = true)
    public ReservationDTO.EstimateResponse estimatePrice(ReservationDTO.EstimateRequest req) {
        Car car = carRepository.findById(req.getCarId())
                .orElseThrow(() -> new CarNotFoundException(req.getCarId()));

        int totalDays = 0;
        if (req.getPickupDate() != null && req.getReturnDate() != null
                && req.getReturnDate().isAfter(req.getPickupDate())) {
            totalDays = (int) (req.getReturnDate().toEpochDay() - req.getPickupDate().toEpochDay());
        }

        Reservation.TripType tripType = req.getTripType() == null ? Reservation.TripType.LOCAL : req.getTripType();
        PriceCalculation price = calculatePrice(car, tripType, req.getPickupLocation(), req.getDropLocation(),
                req.getViaLocations(), totalDays);

        PromoCodeDTO.ValidateResponse promoPreview = null;
        if (req.getPromoCode() != null && !req.getPromoCode().isBlank()) {
            promoPreview = promoCodeService.validate(req.getPromoCode(), price.estimatedAmount);
        }

        return ReservationDTO.EstimateResponse.builder()
                .tripType(tripType)
                .distanceKm(price.distanceKm)
                .totalDays(totalDays)
                .nights(price.nights)
                .ratePerKm(car.getRatePerKm())
                .baseFare(price.baseFare)
                .nightCharges(price.nightCharges)
                .estimatedAmount(price.estimatedAmount)
                .promoCode(promoPreview != null && promoPreview.isValid() ? req.getPromoCode().trim().toUpperCase() : null)
                .discountAmount(promoPreview != null && promoPreview.isValid() ? promoPreview.getDiscountAmount() : 0.0)
                .finalAmount(promoPreview != null && promoPreview.isValid() ? promoPreview.getFinalAmount() : price.estimatedAmount)
                .pricingMethod(price.pricingMethod)
                .build();
    }

    // ── Booking payment: full payment, or a minimum ₹1000 deposit to confirm ──
    @Override
    @Transactional
    public ReservationDTO payForReservation(Long reservationId, ReservationDTO.PayRequest req) {
        Reservation r = reservationRepository.findById(reservationId)
                .orElseThrow(() -> new ReservationNotFoundException(reservationId));
        assertOwnsReservation(r);

        if (r.getReservationStatus() == Reservation.ReservationStatus.CANCELLED)
            throw new PaymentFailedException("This reservation has been cancelled.");

        double remaining = r.getEstimatedAmount() - r.getAmountPaid();
        if (remaining <= 0)
            throw new PaymentFailedException("This reservation is already fully paid.");

        if (req.getPaymentType() == null)
            throw new PaymentFailedException("Payment type (FULL or DEPOSIT) is required.");

        double amount;
        if (req.getPaymentType() == Reservation.PaymentType.FULL) {
            amount = remaining; // pay whatever is left in full
        } else {
            amount = req.getAmount() == null ? 0 : req.getAmount();
            if (amount < MIN_DEPOSIT_AMOUNT)
                throw new PaymentFailedException("Minimum deposit to confirm a booking is ₹" + (int) MIN_DEPOSIT_AMOUNT + ".");
            if (amount > remaining) amount = remaining; // don't overpay
        }

        r.setAmountPaid(r.getAmountPaid() + amount);
        r.setPaymentType(req.getPaymentType());
        r.setPaymentStatus(r.getAmountPaid() >= r.getEstimatedAmount()
                ? Reservation.BookingPaymentStatus.FULLY_PAID
                : Reservation.BookingPaymentStatus.DEPOSIT_PAID);

        // Any qualifying payment (full, or a deposit of at least ₹1000) confirms the booking
        if (r.getReservationStatus() == Reservation.ReservationStatus.PENDING) {
            r.setReservationStatus(Reservation.ReservationStatus.CONFIRMED);
            notifyBookingConfirmed(r);
        }

        ReservationDTO dto = mapToDTO(reservationRepository.save(r));

        // Log this transaction so it shows up in the admin's payment history and revenue chart.
        // "amount" here is what the customer was actually charged (GST-inclusive), so we back out
        // the base amount and let Payment's own GST calculation reconstruct the split.
        Payment.PaymentMethod method;
        try {
            method = Payment.PaymentMethod.valueOf(
                    req.getPaymentMethod() == null ? "UPI" : req.getPaymentMethod().toUpperCase());
        } catch (IllegalArgumentException e) {
            method = Payment.PaymentMethod.UPI; // e.g. "RAZORPAY" isn't a method itself, default to UPI
        }
        Payment payment = Payment.builder()
                .reservation(r)
                .customer(r.getCustomer())
                .baseAmount(Math.round((amount / 1.18) * 100) / 100.0)
                .paymentMethod(method)
                .paymentStatus(Payment.PaymentStatus.SUCCESS)
                .paymentDatetime(LocalDateTime.now())
                .build();
        paymentRepository.save(payment);

        return dto;
    }

    // ── Reschedule: free up to 12 hours before the ORIGINAL pickup, otherwise a ₹300 fee applies ──
    @Override
    @Transactional
    public ReservationDTO.RescheduleResponse rescheduleReservation(Long id, ReservationDTO.RescheduleRequest req) {
        Reservation r = reservationRepository.findById(id).orElseThrow(() -> new ReservationNotFoundException(id));
        assertOwnsReservation(r);

        if (r.getReservationStatus() == Reservation.ReservationStatus.CANCELLED)
            throw new UnauthorizedAccessException("A cancelled booking cannot be rescheduled.");
        if (r.getReservationStatus() == Reservation.ReservationStatus.COMPLETED)
            throw new UnauthorizedAccessException("A completed rental cannot be rescheduled.");
        if (req.getNewReturnDate().isBefore(req.getNewPickupDate()))
            throw new InvalidDateRangeException();

        // Car must be free for the new dates (ignoring this reservation's own current slot)
        List<Reservation> conflicts = reservationRepository.findConflictingReservations(
                r.getCar().getCarId(), req.getNewPickupDate(), req.getNewReturnDate());
        conflicts.removeIf(c -> c.getReservationId().equals(id));
        if (!conflicts.isEmpty())
            throw new CarNotAvailableException("Car is already booked for the new dates.");

        LocalDateTime originalPickupDateTime = LocalDateTime.of(r.getPickupDate(), r.getPickupTime());
        long hoursUntilOriginalPickup = Duration.between(LocalDateTime.now(), originalPickupDateTime).toHours();
        boolean freeReschedule = hoursUntilOriginalPickup >= FREE_CANCELLATION_WINDOW_HOURS;
        double fee = freeReschedule ? 0.0 : RESCHEDULE_FEE;

        int newTotalDays = (int) (req.getNewReturnDate().toEpochDay() - req.getNewPickupDate().toEpochDay());
        PriceCalculation price = calculatePrice(r.getCar(), r.getTripType(), r.getPickupLocation(), r.getDropLocation(),
                r.getViaLocations() == null ? null : List.of(r.getViaLocations().split(",\\s*")), newTotalDays);

        double existingDiscount = r.getDiscountAmount() == null ? 0.0 : r.getDiscountAmount();
        double newAmount = Math.max(0, price.estimatedAmount - existingDiscount) + fee;

        r.setPickupDate(req.getNewPickupDate());
        r.setPickupTime(req.getNewPickupTime() != null ? req.getNewPickupTime() : r.getPickupTime());
        r.setReturnDate(req.getNewReturnDate());
        r.setTotalDays(newTotalDays);
        r.setDistanceKm(price.distanceKm);
        r.setNights(price.nights);
        r.setBaseFare(price.baseFare);
        r.setNightCharges(price.nightCharges);
        r.setEstimatedAmount(newAmount);
        Reservation saved = reservationRepository.save(r);

        notificationService.notifyCustomer(r.getCustomer().getCustomerId(), "Booking Rescheduled",
                "Your booking (RES-" + id + ") was moved to " + req.getNewPickupDate() + "." +
                        (fee > 0 ? " A ₹" + fee + " reschedule fee was added." : ""),
                Notification.Type.GENERAL, id);

        return ReservationDTO.RescheduleResponse.builder()
                .reservation(mapToDTO(saved))
                .freeReschedule(freeReschedule)
                .rescheduleFee(fee)
                .message(freeReschedule
                        ? "Rescheduled free of charge."
                        : "Rescheduled with a ₹" + fee + " fee (within 12 hours of original pickup).")
                .build();
    }
    @Override
    @Transactional
    public ReservationDTO.CancelResponse cancelReservation(Long id) {
        Reservation r = reservationRepository.findById(id).orElseThrow(() -> new ReservationNotFoundException(id));
        assertOwnsReservation(r);

        if (r.getReservationStatus() == Reservation.ReservationStatus.CANCELLED)
            throw new UnauthorizedAccessException("This reservation is already cancelled.");
        if (r.getReservationStatus() == Reservation.ReservationStatus.COMPLETED)
            throw new UnauthorizedAccessException("A completed rental cannot be cancelled.");

        LocalDateTime pickupDateTime = LocalDateTime.of(r.getPickupDate(), r.getPickupTime());
        long hoursUntilPickup = Duration.between(LocalDateTime.now(), pickupDateTime).toHours();
        boolean freeCancellation = hoursUntilPickup >= FREE_CANCELLATION_WINDOW_HOURS;

        double fee = freeCancellation ? 0.0 : Math.min(CANCELLATION_FEE, r.getAmountPaid());
        double refund = Math.max(0.0, r.getAmountPaid() - fee);

        // Any cancellation costs a little trust (plans falling through is still unreliability),
        // but a late one (within the free-cancellation window) costs a lot more.
        customerService.adjustTrustScore(r.getCustomer().getCustomerId(), freeCancellation ? -3 : -10);

        r.setReservationStatus(Reservation.ReservationStatus.CANCELLED);
        r.setCancellationFee(fee);
        r.setRefundAmount(refund);
        r.setCancelledAt(LocalDateTime.now());
        r.setPaymentStatus(refund > 0 && refund < r.getAmountPaid()
                ? Reservation.BookingPaymentStatus.PARTIALLY_REFUNDED
                : Reservation.BookingPaymentStatus.REFUNDED);
        reservationRepository.save(r);

        String cancelMessage = freeCancellation
                ? "Your booking (RES-" + id + ") was cancelled free of charge. Refund: ₹" + refund + "."
                : "Your booking (RES-" + id + ") was cancelled within 12 hours of pickup. Fee: ₹" + fee + ", Refund: ₹" + refund + ".";
        notificationService.notifyCustomer(r.getCustomer().getCustomerId(), "Booking Cancelled",
                cancelMessage, Notification.Type.CANCELLATION, id);

        return ReservationDTO.CancelResponse.builder()
                .reservationId(id)
                .freeCancellation(freeCancellation)
                .cancellationFee(fee)
                .refundAmount(refund)
                .message(freeCancellation
                        ? "Cancelled free of charge — full refund of ₹" + refund + " will be processed."
                        : "Cancelled within 12 hours of pickup — ₹" + fee + " cancellation fee deducted. Refund: ₹" + refund + ".")
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public ReservationDTO getReservationById(Long id) {
        Reservation r = reservationRepository.findById(id)
                .orElseThrow(() -> new ReservationNotFoundException(id));
        assertOwnsReservation(r);
        return mapToDTO(r);
    }

    // A valid JWT only proves "this is some logged-in customer" — the role check on the
    // controller doesn't stop customer A from reading, paying for, rescheduling, or even
    // CANCELLING customer B's booking just by changing the ID in the URL. This closes that
    // gap for CUSTOMER-role tokens. ADMIN and DRIVER tokens bypass it (a driver legitimately
    // needs to see the trips assigned to them).
    private void assertOwnsReservation(Reservation r) {
        if (SecurityUtils.isAdmin()) return;
        String email = SecurityUtils.currentEmail();
        if (email == null) return;

        customerRepository.findByEmail(email).ifPresent(me -> {
            if (!r.getCustomer().getCustomerId().equals(me.getCustomerId())) {
                throw new com.rentmyride.custom_exceptions.UnauthorizedAccessException(
                        "You don't have access to this booking.");
            }
        });
    }

    @Override @Transactional(readOnly = true)
    public List<ReservationDTO> getAllReservations() {
        return reservationRepository.findAll().stream().map(this::mapToDTO).collect(Collectors.toList());
    }
    @Override @Transactional(readOnly = true)
    public List<ReservationDTO> getReservationsByCustomer(Long customerId) {
        List<Reservation> list = reservationRepository.findByCustomer_CustomerId(customerId);
        list.forEach(this::assertOwnsReservation);
        return list.stream().map(this::mapToDTO).collect(Collectors.toList());
    }
    @Override @Transactional(readOnly = true)
    public List<ReservationDTO> getReservationsByStatus(Reservation.ReservationStatus status) {
        return reservationRepository.findByReservationStatus(status).stream().map(this::mapToDTO).collect(Collectors.toList());
    }
    @Override @Transactional
    public ReservationDTO updateReservationStatus(Long id, ReservationDTO.StatusUpdateRequest req) {
        Reservation r = reservationRepository.findById(id).orElseThrow(() -> new ReservationNotFoundException(id));
        boolean newlyConfirmed = req.getReservationStatus() == Reservation.ReservationStatus.CONFIRMED
                && r.getReservationStatus() != Reservation.ReservationStatus.CONFIRMED;

        // Same late-cancellation trust penalty as the customer's own /cancel endpoint —
        // an admin cancelling on the customer's behalf shouldn't skip this check.
        boolean newlyCancelled = req.getReservationStatus() == Reservation.ReservationStatus.CANCELLED
                && r.getReservationStatus() != Reservation.ReservationStatus.CANCELLED;
        if (newlyCancelled) {
            LocalDateTime pickupDateTime = LocalDateTime.of(r.getPickupDate(), r.getPickupTime());
            long hoursUntilPickup = Duration.between(LocalDateTime.now(), pickupDateTime).toHours();
            boolean lateCancellation = hoursUntilPickup < FREE_CANCELLATION_WINDOW_HOURS;
            customerService.adjustTrustScore(r.getCustomer().getCustomerId(), lateCancellation ? -10 : -3);
        }

        r.setReservationStatus(req.getReservationStatus());
        Reservation saved = reservationRepository.save(r);
        if (newlyConfirmed) notifyBookingConfirmed(saved);
        return mapToDTO(saved);
    }
    @Override
    @Transactional(readOnly = true)
    public long countByStatus(Reservation.ReservationStatus status) {
        return reservationRepository.countByReservationStatus(status);
    }

    // Public availability check — shown on the car detail page before the customer books
    @Override
    @Transactional(readOnly = true)
    public List<ReservationDTO.BookedRange> getBookedDateRanges(Long carId) {
        return reservationRepository.findActiveByCarId(carId).stream()
                .map(r -> new ReservationDTO.BookedRange(r.getPickupDate(), r.getReturnDate(), r.getReservationStatus()))
                .collect(Collectors.toList());
    }

    // Admin assigns a driver — notify + email the customer AND the driver with trip details.
    // NOTE: this fires only here (on explicit assignment), never automatically at booking time.
    @Override
    @Transactional
    public ReservationDTO assignDriver(Long reservationId, Long driverId) {
        Reservation r = reservationRepository.findById(reservationId)
                .orElseThrow(() -> new ReservationNotFoundException(reservationId));
        com.rentmyride.entities.Driver driver = driverRepository.findById(driverId)
                .orElseThrow(() -> new com.rentmyride.custom_exceptions.DriverNotFoundException(driverId));

        // Prevent double-booking: this driver can't already be assigned to another trip
        // whose dates overlap this reservation's pickup–return window.
        List<Reservation> driverConflicts = reservationRepository.findConflictingReservationsForDriver(
                driverId, r.getPickupDate(), r.getReturnDate());
        driverConflicts.removeIf(c -> c.getReservationId().equals(reservationId));
        if (!driverConflicts.isEmpty()) {
            Reservation clash = driverConflicts.get(0);
            throw new com.rentmyride.custom_exceptions.DriverNotAvailableException(
                    driver.getFirstName() + " " + driver.getLastName() +
                            " is already assigned to booking #RES-" + clash.getReservationId() +
                            " (" + clash.getPickupDate() + " to " + clash.getReturnDate() + "). Choose another driver.");
        }

        r.setAssignedDriver(driver);
        Reservation saved = reservationRepository.save(r);

        String carLabel = r.getCar().getBrand() + " " + r.getCar().getModel();
        String driverName = driver.getFirstName() + " " + driver.getLastName();

        // The driver is already assigned and saved above — that's the actual business action
        // and it must not be undone by a notification problem. SMS/WhatsApp/email can't be
        // un-sent once they go out, so if any one of these fails partway through, letting the
        // exception bubble up would roll back a driver assignment the admin (and the driver,
        // if their SMS already arrived) would otherwise believe had succeeded. So every
        // notification here is best-effort: failures are logged, never thrown.
        try {
            notificationService.notifyCustomer(
                    r.getCustomer().getCustomerId(),
                    "Driver Assigned 🚗",
                    "Your driver for booking #RES-" + reservationId + " is " + driverName +
                            " (" + driver.getMobileNumber() + "), driving " + carLabel +
                            " (" + r.getCar().getRegistrationNumber() + ").",
                    Notification.Type.DRIVER_ASSIGNED, reservationId
            );

            notificationService.sendEmail(
                    r.getCustomer().getEmail(),
                    "Your RentMyRide Driver Has Been Assigned — Booking #RES-" + reservationId,
                    "Hi " + r.getCustomer().getFirstName() + ",\n\n" +
                            "A driver has been assigned to your upcoming booking:\n\n" +
                            "Driver: " + driverName + "\n" +
                            "Driver Contact: " + driver.getMobileNumber() + "\n" +
                            "Car: " + carLabel + " (" + r.getCar().getRegistrationNumber() + ")\n" +
                            "Pickup: " + r.getPickupDate() + " at " + r.getPickupTime() + "\n" +
                            "Pickup Location: " + r.getPickupLocation() + "\n\n" +
                            "Thank you for choosing RentMyRide!"
            );

            // ── Notify the driver too — SMS + WhatsApp + email with the trip they need to run ──
            String driverMsg = "New trip assigned! Booking #RES-" + reservationId + " — pick up "
                    + r.getCustomer().getFirstName() + " " + r.getCustomer().getLastName()
                    + " on " + r.getPickupDate() + " at " + r.getPickupTime()
                    + " from " + r.getPickupLocation() + ", drop at " + r.getDropLocation()
                    + ". Car: " + carLabel + " (" + r.getCar().getRegistrationNumber() + ").";
            notificationService.sendSms(driver.getMobileNumber(), driverMsg);
            notificationService.sendWhatsApp(driver.getMobileNumber(), driverMsg);
            notificationService.notifyDriver(
                    driver.getDriverId(),
                    "New Trip Assigned 🚕",
                    driverMsg,
                    Notification.Type.TRIP_ASSIGNED, reservationId
            );
            notificationService.sendEmail(
                    driver.getEmail(),
                    "New Trip Assigned — Booking #RES-" + reservationId,
                    "Hi " + driver.getFirstName() + ",\n\n" +
                            "You've been assigned a new pickup:\n\n" +
                            "Customer: " + r.getCustomer().getFirstName() + " " + r.getCustomer().getLastName() +
                            " (" + r.getCustomer().getMobileNumber() + ")\n" +
                            "Car: " + carLabel + " (" + r.getCar().getRegistrationNumber() + ")\n" +
                            "Pickup Date: " + r.getPickupDate() + " at " + r.getPickupTime() + "\n" +
                            "Pickup Location: " + r.getPickupLocation() + "\n" +
                            "Drop Location: " + r.getDropLocation() + "\n\n" +
                            "Please check your driver dashboard for full trip details."
            );
        } catch (Exception notifyError) {
            log.warn("[RMR] Driver was assigned to reservation #{} but a notification failed: {}",
                    reservationId, notifyError.getMessage());
        }

        return mapToDTO(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public List<ReservationDTO> getPendingPickupsForDriver(Long driverId) {
        if (!SecurityUtils.isAdmin() && SecurityUtils.currentEmail() != null) {
            driverRepository.findByEmail(SecurityUtils.currentEmail()).ifPresent(me -> {
                if (!me.getDriverId().equals(driverId)) {
                    throw new UnauthorizedAccessException("You don't have access to this driver's pickups.");
                }
            });
        }
        return reservationRepository.findPendingPickupsForDriver(driverId).stream()
                .map(this::mapToDTO).collect(Collectors.toList());
    }

    // ── Pricing ──────────────────────────────────────────────
    // LOCAL: car's own per-day rate (set by admin per car) — customer stays within their home city/district.
    // OUTSTATION: round-trip road distance (pickup → via stops → drop → back to pickup) × car's
    //             per-km rate, plus a per-night charge (min ₹300/night) for multi-day trips.
    //             Same-day return = no night charge at all.
    private PriceCalculation calculatePrice(Car car, Reservation.TripType tripType, String pickupLocation,
            String dropLocation, List<String> viaLocations, int totalDays) {

        int nights = Math.max(totalDays, 0); // 0 nights if same-day return

        if (tripType == Reservation.TripType.LOCAL) {
            double days = Math.max(totalDays, 1); // at least a 1-day package
            double ratePerDay = (car.getRentPerDay() != null && car.getRentPerDay() > 0)
                    ? car.getRentPerDay() : LOCAL_PACKAGE_RATE_PER_DAY;
            double amount = days * ratePerDay;
            return new PriceCalculation(null, 0, amount, 0.0, amount, "LOCAL_PACKAGE");
        }

        // OUTSTATION
        BiharLocations.Location pickup = BiharLocations.findByName(pickupLocation);
        BiharLocations.Location drop = BiharLocations.findByName(dropLocation);

        if (pickup != null && drop != null && car.getRatePerKm() != null && car.getRatePerKm() > 0) {
            List<BiharLocations.Location> stops = new ArrayList<>();
            stops.add(pickup);
            if (viaLocations != null) {
                for (String v : viaLocations) {
                    BiharLocations.Location loc = BiharLocations.findByName(v);
                    if (loc != null) stops.add(loc);
                }
            }
            stops.add(drop);

            double roundTripKm = DistanceUtil.calculateRouteDistanceKm(stops, true);
            double billableKm = Math.max(roundTripKm, 1.0);
            double baseFare = Math.round(billableKm * car.getRatePerKm() * 100) / 100.0;

            double nightRate = (car.getNightChargePerNight() == null || car.getNightChargePerNight() < MIN_NIGHT_CHARGE)
                    ? MIN_NIGHT_CHARGE : car.getNightChargePerNight();
            double nightCharges = nights * nightRate;

            double total = Math.round((baseFare + nightCharges) * 100) / 100.0;
            return new PriceCalculation(roundTripKm, nights, baseFare, nightCharges, total, "OUTSTATION_DISTANCE");
        }

        // Fallback: classic per-day pricing (unrecognized location, or car has no per-km rate set)
        double amount = Math.max(totalDays, 1) * car.getRentPerDay();
        return new PriceCalculation(null, nights, amount, 0.0, amount, "PER_DAY");
    }

    private record PriceCalculation(Double distanceKm, Integer nights, Double baseFare,
                                     Double nightCharges, Double estimatedAmount, String pricingMethod) {}

    // Sends an SMS + WhatsApp confirmation, and an in-app notification
    private void notifyBookingConfirmed(Reservation r) {
        String carLabel = r.getCar().getBrand() + " " + r.getCar().getModel();
        notificationService.sendBookingConfirmation(
                r.getCustomer().getFirstName(),
                r.getCustomer().getMobileNumber(),
                r.getReservationId(),
                carLabel,
                r.getPickupDate().toString(),
                r.getEstimatedAmount()
        );
        notificationService.notifyCustomer(
                r.getCustomer().getCustomerId(),
                "Booking Confirmed 🎉",
                "Your booking for " + carLabel + " on " + r.getPickupDate() + " is confirmed. Amount: ₹" + r.getEstimatedAmount(),
                Notification.Type.BOOKING_CONFIRMED,
                r.getReservationId()
        );
    }

    private ReservationDTO mapToDTO(Reservation r) {
        return ReservationDTO.builder()
                .reservationId(r.getReservationId())
                .customerId(r.getCustomer().getCustomerId())
                .customerName(r.getCustomer().getFirstName() + " " + r.getCustomer().getLastName())
                .customerMobile(r.getCustomer().getMobileNumber())
                .carId(r.getCar().getCarId())
                .carBrand(r.getCar().getBrand()).carModel(r.getCar().getModel())
                .carRegistrationNumber(r.getCar().getRegistrationNumber())
                .assignedDriverId(r.getAssignedDriver() != null ? r.getAssignedDriver().getDriverId() : null)
                .assignedDriverName(r.getAssignedDriver() != null
                        ? r.getAssignedDriver().getFirstName() + " " + r.getAssignedDriver().getLastName() : null)
                .assignedDriverMobile(r.getAssignedDriver() != null ? r.getAssignedDriver().getMobileNumber() : null)
                .pickupDate(r.getPickupDate()).pickupTime(r.getPickupTime()).returnDate(r.getReturnDate())
                .totalDays(r.getTotalDays()).tripType(r.getTripType())
                .pickupLocation(r.getPickupLocation()).dropLocation(r.getDropLocation())
                .viaLocations(r.getViaLocations())
                .distanceKm(r.getDistanceKm()).nights(r.getNights())
                .baseFare(r.getBaseFare()).nightCharges(r.getNightCharges())
                .promoCode(r.getPromoCode()).discountAmount(r.getDiscountAmount())
                .walletCreditsUsed(r.getWalletCreditsUsed())
                .estimatedAmount(r.getEstimatedAmount())
                .reservationStatus(r.getReservationStatus())
                .paymentStatus(r.getPaymentStatus()).paymentType(r.getPaymentType())
                .amountPaid(r.getAmountPaid())
                .balanceDue(Math.max(0.0, r.getEstimatedAmount() - r.getAmountPaid()))
                .cancellationFee(r.getCancellationFee()).refundAmount(r.getRefundAmount())
                .specialRequests(r.getSpecialRequests()).createdAt(r.getCreatedAt())
                .build();
    }
}
