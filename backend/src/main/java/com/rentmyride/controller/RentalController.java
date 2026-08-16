package com.rentmyride.controller;

import com.rentmyride.dtos.AuthResponseDTO;
import com.rentmyride.dtos.RentalDTO;
import com.rentmyride.service.RentalService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/rentals")
@RequiredArgsConstructor
public class RentalController {
    private final RentalService rentalService;

    // Pickup — same form as before; the reservation dropdown is restricted (on the frontend,
    // backed by GET /api/reservations/driver/{driverId}/pending-pickups) to the driver's own jobs.
    @PostMapping("/pickup")
    @PreAuthorize("hasAnyRole('ADMIN','DRIVER')")
    public ResponseEntity<AuthResponseDTO.ApiResponse> initiateRental(@RequestBody RentalDTO.PickupRequest request) {
        return ResponseEntity.ok(AuthResponseDTO.ApiResponse.success("Rental started.", rentalService.initiateRental(request)));
    }

    // Return/Drop-off — same "last km" form as before
    @PatchMapping("/{rentalId}/return")
    @PreAuthorize("hasAnyRole('ADMIN','DRIVER')")
    public ResponseEntity<AuthResponseDTO.ApiResponse> completeRental(@PathVariable Long rentalId,
            @RequestBody RentalDTO.ReturnRequest request) {
        return ResponseEntity.ok(AuthResponseDTO.ApiResponse.success("Rental completed.", rentalService.completeRental(rentalId, request)));
    }

    // Customer-initiated: extend an active rental to a later return date
    @PatchMapping("/{rentalId}/extend")
    @PreAuthorize("hasAnyRole('ADMIN','CUSTOMER')")
    public ResponseEntity<AuthResponseDTO.ApiResponse> extendRental(@PathVariable Long rentalId,
            @RequestBody RentalDTO.ExtendRequest request) {
        RentalDTO.ExtendResponse result = rentalService.extendRental(rentalId, request);
        return ResponseEntity.ok(AuthResponseDTO.ApiResponse.success(result.getMessage(), result));
    }

    @GetMapping("/{rentalId}")
    @PreAuthorize("hasAnyRole('ADMIN','CUSTOMER','DRIVER')")
    public ResponseEntity<AuthResponseDTO.ApiResponse> getById(@PathVariable Long rentalId) {
        return ResponseEntity.ok(AuthResponseDTO.ApiResponse.success("Rental fetched.", rentalService.getRentalById(rentalId)));
    }

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<AuthResponseDTO.ApiResponse> getAll() {
        return ResponseEntity.ok(AuthResponseDTO.ApiResponse.success("All rentals.", rentalService.getAllRentals()));
    }

    @GetMapping("/active")
    @PreAuthorize("hasAnyRole('ADMIN','DRIVER')")
    public ResponseEntity<AuthResponseDTO.ApiResponse> getActive() {
        return ResponseEntity.ok(AuthResponseDTO.ApiResponse.success("Active rentals.", rentalService.getActiveRentals()));
    }

    @GetMapping("/customer/{customerId}")
    @PreAuthorize("hasAnyRole('ADMIN','CUSTOMER')")
    public ResponseEntity<AuthResponseDTO.ApiResponse> getByCustomer(@PathVariable Long customerId) {
        return ResponseEntity.ok(AuthResponseDTO.ApiResponse.success("Customer rentals.", rentalService.getRentalsByCustomer(customerId)));
    }

    @GetMapping("/driver/{driverId}")
    @PreAuthorize("hasAnyRole('ADMIN','DRIVER')")
    public ResponseEntity<AuthResponseDTO.ApiResponse> getByDriver(@PathVariable Long driverId) {
        return ResponseEntity.ok(AuthResponseDTO.ApiResponse.success("Driver rentals.", rentalService.getRentalsByDriver(driverId)));
    }

    @GetMapping("/revenue/total")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<AuthResponseDTO.ApiResponse> totalRevenue() {
        return ResponseEntity.ok(AuthResponseDTO.ApiResponse.success("Total revenue.", rentalService.getTotalRevenue()));
    }

    @GetMapping("/revenue/monthly")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<AuthResponseDTO.ApiResponse> monthlyRevenue(@RequestParam int month, @RequestParam int year) {
        return ResponseEntity.ok(AuthResponseDTO.ApiResponse.success("Monthly revenue.", rentalService.getMonthlyRevenue(month, year)));
    }
}
