package com.rentmyride.service;

import com.rentmyride.dtos.RentalDTO;
import com.rentmyride.entities.Rental;
import java.util.List;

public interface RentalService {
    RentalDTO initiateRental(RentalDTO.PickupRequest request);
    RentalDTO completeRental(Long rentalId, RentalDTO.ReturnRequest request);
    RentalDTO.ExtendResponse extendRental(Long rentalId, RentalDTO.ExtendRequest request);
    RentalDTO getRentalById(Long rentalId);
    List<RentalDTO> getAllRentals();
    List<RentalDTO> getRentalsByCustomer(Long customerId);
    List<RentalDTO> getRentalsByDriver(Long driverId);
    List<RentalDTO> getRentalsByStatus(Rental.RentalStatus status);
    List<RentalDTO> getActiveRentals();
    Double getTotalRevenue();
    Double getMonthlyRevenue(int month, int year);
}
