package com.rentmyride.controller;

import com.rentmyride.dtos.AuthResponseDTO;
import com.rentmyride.dtos.DriverDTO;
import com.rentmyride.entities.Driver;
import com.rentmyride.service.DriverService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/drivers")
@RequiredArgsConstructor
public class DriverController {

    private final DriverService driverService;

    @PostMapping("/login")
    public ResponseEntity<AuthResponseDTO> login(@RequestBody DriverDTO.LoginRequest request) {
        return ResponseEntity.ok(driverService.loginDriver(request));
    }

    // Admin creates driver accounts
    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<AuthResponseDTO.ApiResponse> addDriver(@RequestBody DriverDTO.RegisterRequest request) {
        return ResponseEntity.ok(AuthResponseDTO.ApiResponse.success("Driver added.", driverService.addDriver(request)));
    }

    @GetMapping("/{driverId}")
    @PreAuthorize("hasAnyRole('ADMIN','DRIVER')")
    public ResponseEntity<AuthResponseDTO.ApiResponse> getById(@PathVariable Long driverId) {
        return ResponseEntity.ok(AuthResponseDTO.ApiResponse.success("Driver fetched.", driverService.getDriverById(driverId)));
    }

    @PutMapping("/{driverId}")
    @PreAuthorize("hasAnyRole('ADMIN','DRIVER')")
    public ResponseEntity<AuthResponseDTO.ApiResponse> update(@PathVariable Long driverId, @RequestBody DriverDTO dto) {
        return ResponseEntity.ok(AuthResponseDTO.ApiResponse.success("Driver updated.", driverService.updateDriver(driverId, dto)));
    }

    @DeleteMapping("/{driverId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<AuthResponseDTO.ApiResponse> delete(@PathVariable Long driverId) {
        driverService.deleteDriver(driverId);
        return ResponseEntity.ok(AuthResponseDTO.ApiResponse.success("Driver deactivated.", null));
    }

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<AuthResponseDTO.ApiResponse> getAll() {
        return ResponseEntity.ok(AuthResponseDTO.ApiResponse.success("All drivers.", driverService.getAllDrivers()));
    }

    @GetMapping("/status/{status}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<AuthResponseDTO.ApiResponse> getByStatus(@PathVariable Driver.Status status) {
        return ResponseEntity.ok(AuthResponseDTO.ApiResponse.success("Drivers by status.", driverService.getDriversByStatus(status)));
    }

    @PatchMapping("/{driverId}/status")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<AuthResponseDTO.ApiResponse> updateStatus(@PathVariable Long driverId, @RequestParam Driver.Status status) {
        return ResponseEntity.ok(AuthResponseDTO.ApiResponse.success("Status updated.", driverService.updateStatus(driverId, status)));
    }
}
