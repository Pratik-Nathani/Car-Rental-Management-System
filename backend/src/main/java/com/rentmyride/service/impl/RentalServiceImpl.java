package com.rentmyride.service.impl;

import com.rentmyride.custom_exceptions.*;
import com.rentmyride.dtos.RentalDTO;
import com.rentmyride.entities.*;
import com.rentmyride.repository.*;
import com.rentmyride.service.CustomerService;
import com.rentmyride.service.RentalService;
import com.rentmyride.security.SecurityUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class RentalServiceImpl implements RentalService {

    private final RentalRepository rentalRepository;
    private final ReservationRepository reservationRepository;
    private final DriverRepository driverRepository;
    private final CarRepository carRepository;
    private final CustomerService customerService;
    private final com.rentmyride.repository.CustomerRepository customerRepository;

    // Pickup — the SAME form as before, except the reservation dropdown (built on the frontend)
    // is restricted to only the logged-in driver's own assigned reservations. We also validate
    // here that the reservation really was assigned to this driver, as a backend safety net.
    @Override
    @Transactional
    public RentalDTO initiateRental(RentalDTO.PickupRequest req) {
        Reservation reservation = reservationRepository.findById(req.getReservationId())
                .orElseThrow(() -> new ReservationNotFoundException(req.getReservationId()));

        Driver driver = req.getDriverId() != null
                ? driverRepository.findById(req.getDriverId()).orElseThrow(() -> new DriverNotFoundException(req.getDriverId()))
                : null;

        if (driver != null && (reservation.getAssignedDriver() == null
                || !reservation.getAssignedDriver().getDriverId().equals(driver.getDriverId()))) {
            throw new UnauthorizedAccessException("This booking is not assigned to you.");
        }

        // A driver can only start a pickup on the actual scheduled pickup date — not early.
        java.time.LocalDate today = java.time.LocalDate.now();
        if (reservation.getPickupDate().isAfter(today)) {
            throw new InvalidDateRangeException("This booking's pickup date is " + reservation.getPickupDate() +
                    ". You can only start the pickup on that date.");
        }

        // Start from the reservation's already-final price (local/outstation/promo/wallet all
        // accounted for at booking time) rather than recomputing a separate estimate here.
        double baseAmount = reservation.getEstimatedAmount();

        Rental rental = Rental.builder()
                .reservation(reservation).customer(reservation.getCustomer())
                .car(reservation.getCar()).driver(driver)
                .actualPickupDatetime(req.getActualPickupDatetime())
                .odometerAtPickup(req.getOdometerAtPickup())
                .baseAmount(baseAmount).totalAmount(baseAmount)
                .remarks(req.getRemarks())
                .build();
        reservation.setReservationStatus(Reservation.ReservationStatus.CONFIRMED);
        reservation.getCar().setAvailabilityStatus(Car.AvailabilityStatus.BOOKED);
        reservationRepository.save(reservation);
        carRepository.save(reservation.getCar());
        return mapToDTO(rentalRepository.save(rental));
    }

    // Return/Drop-off — the SAME "last km" form as before. Price is now recalculated here based
    // on the ACTUAL distance driven (not the pre-trip estimate):
    //   OUTSTATION: base fare = actual km × car's per-km rate (was previously frozen at the
    //               pre-trip estimated distance, which ignored real detours/extra driving).
    //   LOCAL:      flat per-day package covers up to 200 km total. Anything beyond that is
    //               charged in ₹1500 slabs per extra 100 km (or part thereof) — same for every car.
    // Any damage charge or discount entered here is added on top. The final total is synced back
    // onto the Reservation so the customer's "My Bookings" balance due reflects it immediately.
    private static final double LOCAL_FREE_KM_PER_DAY = 200.0;
    private static final double EXTRA_KM_RATE = 20.0; // ₹ per km driven beyond the free limit
    private static final double LATE_RETURN_RATE_PER_HOUR = 200.0; // ₹ per hour (or part-hour) returned late

    @Override
    @Transactional
    public RentalDTO completeRental(Long rentalId, RentalDTO.ReturnRequest req) {
        Rental rental = rentalRepository.findById(rentalId)
                .orElseThrow(() -> new RentalNotFoundException(rentalId));

        if (req.getOdometerAtReturn() == null) {
            throw new InvalidDateRangeException("Return odometer reading is required.");
        }
        double kmDriven = req.getOdometerAtReturn() - rental.getOdometerAtPickup();
        if (kmDriven < 0) {
            throw new InvalidDateRangeException("Return odometer reading can't be less than the pickup reading.");
        }

        Reservation reservation = rental.getReservation();
        Car car = rental.getCar();
        double damage = req.getDamageCharges() != null ? req.getDamageCharges() : 0.0;
        double discount = req.getDiscountAmount() != null ? req.getDiscountAmount() : 0.0;

        double baseAmount;
        double extraKmCharges = 0.0;

        if (reservation.getTripType() == Reservation.TripType.OUTSTATION) {
            // Re-price using the ACTUAL distance driven instead of the pre-trip estimate.
            double ratePerKm = (car.getRatePerKm() != null && car.getRatePerKm() > 0) ? car.getRatePerKm() : 0.0;
            if (ratePerKm > 0) {
                double billableKm = Math.max(kmDriven, 1.0);
                double actualBaseFare = Math.round(billableKm * ratePerKm * 100) / 100.0;
                double nightCharges = reservation.getNightCharges() != null ? reservation.getNightCharges() : 0.0;
                baseAmount = actualBaseFare + nightCharges;
            } else {
                baseAmount = rental.getBaseAmount(); // fallback if car has no per-km rate on file
            }
        } else {
            // LOCAL: keep the flat package amount already set at pickup, but add extra-km
            // charges if the customer drove more than the included allowance — 200 km
            // PER DAY booked, so a 2-day booking includes 400 free km, not a flat 200.
            baseAmount = rental.getBaseAmount();
            int days = (reservation.getTotalDays() != null && reservation.getTotalDays() > 0)
                    ? reservation.getTotalDays() : 1;
            double freeKmAllowance = LOCAL_FREE_KM_PER_DAY * days;
            if (kmDriven > freeKmAllowance) {
                double extraKm = kmDriven - freeKmAllowance;
                extraKmCharges = Math.round(extraKm * EXTRA_KM_RATE * 100) / 100.0;
            }
        }

        double total = Math.round((baseAmount + extraKmCharges + damage - discount) * 100) / 100.0;

        // Late-return charge: the customer is entitled to the car until the same time-of-day
        // as pickup, on the return date (a full 24h × totalDays booking window) — e.g. picked
        // up 10 AM on the 1st, due back by 10 AM on the return date, not just "sometime that day".
        double lateReturnCharges = 0.0;
        LocalDateTime actualReturn = req.getActualReturnDatetime() != null ? req.getActualReturnDatetime() : LocalDateTime.now();
        LocalDateTime scheduledReturn = LocalDateTime.of(reservation.getReturnDate(), reservation.getPickupTime());
        if (actualReturn.isAfter(scheduledReturn)) {
            long lateMinutes = Duration.between(scheduledReturn, actualReturn).toMinutes();
            long lateHours = (long) Math.ceil(lateMinutes / 60.0); // any part of an hour counts as a full hour
            lateReturnCharges = lateHours * LATE_RETURN_RATE_PER_HOUR;
        }

        total = Math.round((total + lateReturnCharges) * 100) / 100.0;

        rental.setActualReturnDatetime(req.getActualReturnDatetime());
        rental.setOdometerAtReturn(req.getOdometerAtReturn());
        rental.setTotalKmDriven(kmDriven);
        rental.setBaseAmount(baseAmount);
        rental.setExtraKmCharges(extraKmCharges);
        rental.setDamageCharges(damage);
        rental.setLateReturnCharges(lateReturnCharges);
        rental.setDiscountAmount(discount);
        rental.setTotalAmount(total);
        rental.setRentalStatus(Rental.RentalStatus.COMPLETED);
        rental.setRemarks(req.getRemarks());
        rental.getCar().setAvailabilityStatus(Car.AvailabilityStatus.AVAILABLE);
        rental.getReservation().setReservationStatus(Reservation.ReservationStatus.COMPLETED);
        // Sync the final total back onto the reservation so "My Bookings" balance due updates
        rental.getReservation().setEstimatedAmount(total);
        carRepository.save(rental.getCar());
        reservationRepository.save(rental.getReservation());
        customerService.adjustTrustScore(rental.getCustomer().getCustomerId(), 2); // completed rental boost
        return mapToDTO(rentalRepository.save(rental));
    }

    // Extend an ACTIVE rental to a later return date — the customer is still using the car.
    // Extending doesn't change the route/distance, so extra cost is just additional day(s)/night(s):
    // LOCAL trips: extra days × the car's own daily rate. OUTSTATION trips: extra nights × the car's night rate.
    @Override
    @Transactional
    public RentalDTO.ExtendResponse extendRental(Long rentalId, RentalDTO.ExtendRequest req) {
        Rental rental = rentalRepository.findById(rentalId)
                .orElseThrow(() -> new RentalNotFoundException(rentalId));

        if (rental.getRentalStatus() != Rental.RentalStatus.ACTIVE)
            throw new UnauthorizedAccessException("Only an active rental can be extended.");

        Reservation reservation = rental.getReservation();
        if (req.getNewReturnDate() == null)
            throw new InvalidDateRangeException("New return date is required.");
        if (!req.getNewReturnDate().isAfter(reservation.getReturnDate()))
            throw new InvalidDateRangeException("New return date must be after the current return date.");

        // Car must be free for the extra days (no other reservation starting before the new return date)
        List<Reservation> conflicts = reservationRepository.findConflictingReservations(
                rental.getCar().getCarId(), reservation.getReturnDate().plusDays(1), req.getNewReturnDate());
        conflicts.removeIf(c -> c.getReservationId().equals(reservation.getReservationId()));
        if (!conflicts.isEmpty())
            throw new CarNotAvailableException("Car is already booked starting " + conflicts.get(0).getPickupDate() + " — can't extend that far.");

        long extraDays = req.getNewReturnDate().toEpochDay() - reservation.getReturnDate().toEpochDay();
        double extraCharge;
        if (reservation.getTripType() == Reservation.TripType.LOCAL) {
            double dailyRate = (rental.getCar().getRentPerDay() != null && rental.getCar().getRentPerDay() > 0)
                    ? rental.getCar().getRentPerDay() : 0.0;
            extraCharge = extraDays * dailyRate;
        } else {
            double nightRate = (rental.getCar().getNightChargePerNight() == null || rental.getCar().getNightChargePerNight() < 300)
                    ? 300.0 : rental.getCar().getNightChargePerNight();
            extraCharge = extraDays * nightRate;
        }
        extraCharge = Math.round(extraCharge * 100) / 100.0;

        reservation.setReturnDate(req.getNewReturnDate());
        reservation.setTotalDays(reservation.getTotalDays() + (int) extraDays);
        reservation.setNights((reservation.getNights() == null ? 0 : reservation.getNights()) + (int) extraDays);
        reservation.setNightCharges((reservation.getNightCharges() == null ? 0 : reservation.getNightCharges())
                + (reservation.getTripType() == Reservation.TripType.OUTSTATION ? extraCharge : 0));
        reservation.setEstimatedAmount(reservation.getEstimatedAmount() + extraCharge);
        reservationRepository.save(reservation);

        rental.setBaseAmount(rental.getBaseAmount() + extraCharge);
        rental.setTotalAmount(rental.getTotalAmount() + extraCharge);
        Rental saved = rentalRepository.save(rental);

        return RentalDTO.ExtendResponse.builder()
                .rental(mapToDTO(saved))
                .extraCharge(extraCharge)
                .newReturnDate(req.getNewReturnDate())
                .message("Rental extended to " + req.getNewReturnDate() + ". Extra charge: ₹" + extraCharge + ".")
                .build();
    }

    @Override @Transactional(readOnly = true)
    public RentalDTO getRentalById(Long id) {
        Rental rental = rentalRepository.findById(id).orElseThrow(() -> new RentalNotFoundException(id));
        assertOwnsRental(rental);
        return mapToDTO(rental);
    }

    // Same IDOR gap closed elsewhere (Customer/Payment/Reservation/Driver) — a valid
    // CUSTOMER-role JWT doesn't by itself prove it's THIS customer's own rental.
    private void assertOwnsRental(Rental rental) {
        if (SecurityUtils.isAdmin()) return;
        String email = SecurityUtils.currentEmail();
        if (email == null) return;

        customerRepository.findByEmail(email).ifPresent(me -> {
            if (!rental.getCustomer().getCustomerId().equals(me.getCustomerId())) {
                throw new UnauthorizedAccessException("You don't have access to this rental.");
            }
        });
    }

    @Override @Transactional(readOnly = true)
    public List<RentalDTO> getAllRentals() {
        return rentalRepository.findAll().stream().map(this::mapToDTO).collect(Collectors.toList());
    }
    @Override @Transactional(readOnly = true)
    public List<RentalDTO> getRentalsByCustomer(Long id) {
        List<Rental> list = rentalRepository.findByCustomer_CustomerId(id);
        list.forEach(this::assertOwnsRental);
        return list.stream().map(this::mapToDTO).collect(Collectors.toList());
    }
    @Override @Transactional(readOnly = true)
    public List<RentalDTO> getRentalsByDriver(Long id) {
        return rentalRepository.findByDriver_DriverId(id).stream().map(this::mapToDTO).collect(Collectors.toList());
    }
    @Override @Transactional(readOnly = true)
    public List<RentalDTO> getRentalsByStatus(Rental.RentalStatus status) {
        return rentalRepository.findByRentalStatus(status).stream().map(this::mapToDTO).collect(Collectors.toList());
    }
    @Override @Transactional(readOnly = true)
    public List<RentalDTO> getActiveRentals() {
        return rentalRepository.findAllActiveRentals().stream().map(this::mapToDTO).collect(Collectors.toList());
    }
    @Override @Transactional(readOnly = true)
    public Double getTotalRevenue() { return rentalRepository.getTotalRevenue(); }
    @Override @Transactional(readOnly = true)
    public Double getMonthlyRevenue(int month, int year) { return rentalRepository.getMonthlyRevenue(month, year); }

    private RentalDTO mapToDTO(Rental r) {
        return RentalDTO.builder()
                .rentalId(r.getRentalId())
                .reservationId(r.getReservation().getReservationId())
                .customerId(r.getCustomer().getCustomerId())
                .customerName(r.getCustomer().getFirstName() + " " + r.getCustomer().getLastName())
                .customerMobile(r.getCustomer().getMobileNumber())
                .carId(r.getCar().getCarId()).carBrand(r.getCar().getBrand())
                .carModel(r.getCar().getModel()).carRegistrationNumber(r.getCar().getRegistrationNumber())
                .driverId(r.getDriver() != null ? r.getDriver().getDriverId() : null)
                .driverName(r.getDriver() != null
                        ? r.getDriver().getFirstName() + " " + r.getDriver().getLastName() : null)
                .pickupLocation(r.getReservation().getPickupLocation())
                .dropLocation(r.getReservation().getDropLocation())
                .tripType(r.getReservation().getTripType())
                .pickupTime(r.getReservation().getPickupTime())
                .actualPickupDatetime(r.getActualPickupDatetime())
                .actualReturnDatetime(r.getActualReturnDatetime())
                .odometerAtPickup(r.getOdometerAtPickup()).odometerAtReturn(r.getOdometerAtReturn())
                .totalKmDriven(r.getTotalKmDriven()).baseAmount(r.getBaseAmount())
                .extraKmCharges(r.getExtraKmCharges()).damageCharges(r.getDamageCharges())
                .lateReturnCharges(r.getLateReturnCharges()).discountAmount(r.getDiscountAmount())
                .totalAmount(r.getTotalAmount()).rentalStatus(r.getRentalStatus())
                .remarks(r.getRemarks()).createdAt(r.getCreatedAt())
                .build();
    }
}
