package com.rentmyride.controller;

import com.rentmyride.dtos.AuthResponseDTO;
import com.rentmyride.dtos.ReservationDTO;
import com.rentmyride.service.ReservationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/reservations")
@RequiredArgsConstructor
public class ReservationController {
    private final ReservationService reservationService;

    // Public — shown on the car detail page so customers can see availability before booking (no login required)
    @GetMapping("/car/{carId}/availability")
    public ResponseEntity<AuthResponseDTO.ApiResponse> getAvailability(@PathVariable Long carId) {
        return ResponseEntity.ok(AuthResponseDTO.ApiResponse.success("Booked date ranges.",
                reservationService.getBookedDateRanges(carId)));
    }

    // Admin assigns a driver to a booking — sends the customer a notification + email
    @PatchMapping("/{reservationId}/assign-driver")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<AuthResponseDTO.ApiResponse> assignDriver(@PathVariable Long reservationId,
            @RequestBody ReservationDTO.AssignDriverRequest request) {
        return ResponseEntity.ok(AuthResponseDTO.ApiResponse.success("Driver assigned.",
                reservationService.assignDriver(reservationId, request.getDriverId())));
    }

    // Driver's own pickup-form dropdown — only their assigned, not-yet-picked-up bookings
    @GetMapping("/driver/{driverId}/pending-pickups")
    @PreAuthorize("hasAnyRole('ADMIN','DRIVER')")
    public ResponseEntity<AuthResponseDTO.ApiResponse> getPendingPickups(@PathVariable Long driverId) {
        return ResponseEntity.ok(AuthResponseDTO.ApiResponse.success("Pending pickups.",
                reservationService.getPendingPickupsForDriver(driverId)));
    }

    @PostMapping("/customer/{customerId}")
    @PreAuthorize("hasAnyRole('ADMIN','CUSTOMER')")
    public ResponseEntity<AuthResponseDTO.ApiResponse> create(@PathVariable Long customerId,
            @RequestBody ReservationDTO.CreateRequest request) {
        return ResponseEntity.ok(AuthResponseDTO.ApiResponse.success("Reservation created.",
                reservationService.createReservation(customerId, request)));
    }

    // Live price preview (distance × car's per-km rate) shown as the customer picks locations,
    // before they actually confirm the booking.
    @PostMapping("/estimate")
    @PreAuthorize("hasAnyRole('ADMIN','CUSTOMER')")
    public ResponseEntity<AuthResponseDTO.ApiResponse> estimate(@RequestBody ReservationDTO.EstimateRequest request) {
        return ResponseEntity.ok(AuthResponseDTO.ApiResponse.success("Price estimated.",
                reservationService.estimatePrice(request)));
    }

    @GetMapping("/{reservationId}")
    @PreAuthorize("hasAnyRole('ADMIN','CUSTOMER','DRIVER')")
    public ResponseEntity<AuthResponseDTO.ApiResponse> getById(@PathVariable Long reservationId) {
        return ResponseEntity.ok(AuthResponseDTO.ApiResponse.success("Reservation fetched.",
                reservationService.getReservationById(reservationId)));
    }

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<AuthResponseDTO.ApiResponse> getAll() {
        return ResponseEntity.ok(AuthResponseDTO.ApiResponse.success("All reservations.",
                reservationService.getAllReservations()));
    }

    @GetMapping("/customer/{customerId}")
    @PreAuthorize("hasAnyRole('ADMIN','CUSTOMER')")
    public ResponseEntity<AuthResponseDTO.ApiResponse> getByCustomer(@PathVariable Long customerId) {
        return ResponseEntity.ok(AuthResponseDTO.ApiResponse.success("Customer reservations.",
                reservationService.getReservationsByCustomer(customerId)));
    }

    @PatchMapping("/{reservationId}/status")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<AuthResponseDTO.ApiResponse> updateStatus(@PathVariable Long reservationId,
            @RequestBody ReservationDTO.StatusUpdateRequest request) {
        return ResponseEntity.ok(AuthResponseDTO.ApiResponse.success("Status updated.",
                reservationService.updateReservationStatus(reservationId, request)));
    }

    // Customer pays in full, or a minimum ₹1000 deposit, to confirm a PENDING booking
    @PostMapping("/{reservationId}/pay")
    @PreAuthorize("hasAnyRole('ADMIN','CUSTOMER')")
    public ResponseEntity<AuthResponseDTO.ApiResponse> pay(@PathVariable Long reservationId,
            @RequestBody ReservationDTO.PayRequest request) {
        return ResponseEntity.ok(AuthResponseDTO.ApiResponse.success("Payment recorded.",
                reservationService.payForReservation(reservationId, request)));
    }

    // Reschedule an existing booking to new dates — free 12+ hours before original pickup, ₹300 fee otherwise
    @PatchMapping("/{reservationId}/reschedule")
    @PreAuthorize("hasAnyRole('ADMIN','CUSTOMER')")
    public ResponseEntity<AuthResponseDTO.ApiResponse> reschedule(@PathVariable Long reservationId,
            @RequestBody ReservationDTO.RescheduleRequest request) {
        ReservationDTO.RescheduleResponse result = reservationService.rescheduleReservation(reservationId, request);
        return ResponseEntity.ok(AuthResponseDTO.ApiResponse.success(result.getMessage(), result));
    }

    // Free cancellation up to 12 hours before pickup; after that a ₹500 fee is deducted from the refund
    @PatchMapping("/{reservationId}/cancel")
    @PreAuthorize("hasAnyRole('ADMIN','CUSTOMER')")
    public ResponseEntity<AuthResponseDTO.ApiResponse> cancel(@PathVariable Long reservationId) {
        ReservationDTO.CancelResponse result = reservationService.cancelReservation(reservationId);
        return ResponseEntity.ok(AuthResponseDTO.ApiResponse.success(result.getMessage(), result));
    }
}
