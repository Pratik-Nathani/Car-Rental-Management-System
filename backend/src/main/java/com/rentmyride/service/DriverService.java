package com.rentmyride.service;

import com.rentmyride.dtos.AuthResponseDTO;
import com.rentmyride.dtos.DriverDTO;
import com.rentmyride.entities.Driver;

import java.util.List;

public interface DriverService {
    DriverDTO addDriver(DriverDTO.RegisterRequest request); // admin only
    AuthResponseDTO loginDriver(DriverDTO.LoginRequest request);
    DriverDTO getDriverById(Long driverId);
    DriverDTO updateDriver(Long driverId, DriverDTO dto);
    void deleteDriver(Long driverId);
    List<DriverDTO> getAllDrivers();
    List<DriverDTO> getDriversByStatus(Driver.Status status);
    DriverDTO updateStatus(Long driverId, Driver.Status status);
}
