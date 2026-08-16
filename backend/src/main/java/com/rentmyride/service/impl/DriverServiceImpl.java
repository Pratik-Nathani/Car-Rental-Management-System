package com.rentmyride.service.impl;

import com.rentmyride.custom_exceptions.DriverNotFoundException;
import com.rentmyride.custom_exceptions.DuplicateRegistrationException;
import com.rentmyride.dtos.AuthResponseDTO;
import com.rentmyride.dtos.DriverDTO;
import com.rentmyride.entities.Driver;
import com.rentmyride.repository.DriverRepository;
import com.rentmyride.security.JwtUtil;
import com.rentmyride.service.DriverService;
import com.rentmyride.security.SecurityUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class DriverServiceImpl implements DriverService {

    private final DriverRepository driverRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;

    @Override
    @Transactional
    public DriverDTO addDriver(DriverDTO.RegisterRequest req) {
        if (driverRepository.existsByEmail(req.getEmail()))
            throw new DuplicateRegistrationException("Email already in use: " + req.getEmail());
        if (driverRepository.existsByMobileNumber(req.getMobileNumber()))
            throw new DuplicateRegistrationException("Mobile number already in use.");

        Driver driver = Driver.builder()
                .firstName(req.getFirstName()).lastName(req.getLastName())
                .email(req.getEmail())
                .password(passwordEncoder.encode(req.getPassword()))
                .mobileNumber(req.getMobileNumber())
                .licenseNumber(req.getLicenseNumber())
                .status(Driver.Status.ACTIVE)
                .build();
        return mapToDTO(driverRepository.save(driver));
    }

    @Override
    @Transactional(readOnly = true)
    public AuthResponseDTO loginDriver(DriverDTO.LoginRequest req) {
        Driver driver = driverRepository.findByEmail(req.getEmail())
                .orElseThrow(() -> new DriverNotFoundException("No driver account with email: " + req.getEmail()));
        if (!passwordEncoder.matches(req.getPassword(), driver.getPassword()))
            return AuthResponseDTO.failure("Invalid password.");
        if (driver.getStatus() != Driver.Status.ACTIVE)
            return AuthResponseDTO.failure("Account inactive. Contact admin.");

        String token = jwtUtil.generateToken(driver.getEmail(), "DRIVER", driver.getDriverId());
        return AuthResponseDTO.success(token, "DRIVER", driver.getDriverId(),
                driver.getFirstName() + " " + driver.getLastName(), driver.getEmail());
    }

    @Override
    @Transactional(readOnly = true)
    public DriverDTO getDriverById(Long id) {
        Driver d = driverRepository.findById(id).orElseThrow(() -> new DriverNotFoundException(id));
        assertIsSelfOrAdmin(id);
        return mapToDTO(d);
    }

    // Same IDOR gap as CustomerService/PaymentService/ReservationService — a valid DRIVER-role
    // JWT doesn't by itself prove it's THIS driver's own record being requested.
    private void assertIsSelfOrAdmin(Long requestedDriverId) {
        if (SecurityUtils.isAdmin()) return;
        String email = SecurityUtils.currentEmail();
        if (email == null) return;

        driverRepository.findByEmail(email).ifPresent(me -> {
            if (!me.getDriverId().equals(requestedDriverId)) {
                throw new com.rentmyride.custom_exceptions.UnauthorizedAccessException(
                        "You don't have access to this driver's data.");
            }
        });
    }

    @Override
    @Transactional
    public DriverDTO updateDriver(Long id, DriverDTO dto) {
        Driver d = driverRepository.findById(id).orElseThrow(() -> new DriverNotFoundException(id));
        assertIsSelfOrAdmin(id);
        d.setFirstName(dto.getFirstName());
        d.setLastName(dto.getLastName());
        d.setMobileNumber(dto.getMobileNumber());
        d.setLicenseNumber(dto.getLicenseNumber());
        return mapToDTO(driverRepository.save(d));
    }

    @Override
    @Transactional
    public void deleteDriver(Long id) {
        Driver d = driverRepository.findById(id).orElseThrow(() -> new DriverNotFoundException(id));
        d.setStatus(Driver.Status.INACTIVE);
        driverRepository.save(d);
    }

    @Override
    @Transactional(readOnly = true)
    public List<DriverDTO> getAllDrivers() {
        return driverRepository.findAll().stream().map(this::mapToDTO).collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<DriverDTO> getDriversByStatus(Driver.Status status) {
        return driverRepository.findByStatus(status).stream().map(this::mapToDTO).collect(Collectors.toList());
    }

    @Override
    @Transactional
    public DriverDTO updateStatus(Long id, Driver.Status status) {
        Driver d = driverRepository.findById(id).orElseThrow(() -> new DriverNotFoundException(id));
        d.setStatus(status);
        return mapToDTO(driverRepository.save(d));
    }

    private DriverDTO mapToDTO(Driver d) {
        return DriverDTO.builder()
                .driverId(d.getDriverId())
                .firstName(d.getFirstName()).lastName(d.getLastName())
                .email(d.getEmail()).mobileNumber(d.getMobileNumber())
                .licenseNumber(d.getLicenseNumber())
                .status(d.getStatus()).dateOfJoining(d.getDateOfJoining())
                .createdAt(d.getCreatedAt())
                .build();
    }
}
