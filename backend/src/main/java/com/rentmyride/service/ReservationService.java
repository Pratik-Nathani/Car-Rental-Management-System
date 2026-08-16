package com.rentmyride.service;

import com.rentmyride.dtos.ReservationDTO;
import com.rentmyride.entities.Reservation;
import java.util.List;

public interface ReservationService {
    ReservationDTO createReservation(Long customerId, ReservationDTO.CreateRequest request);
    ReservationDTO.EstimateResponse estimatePrice(ReservationDTO.EstimateRequest request);
    ReservationDTO payForReservation(Long reservationId, ReservationDTO.PayRequest request);
    ReservationDTO.RescheduleResponse rescheduleReservation(Long reservationId, ReservationDTO.RescheduleRequest request);
    ReservationDTO getReservationById(Long reservationId);
    List<ReservationDTO> getAllReservations();
    List<ReservationDTO> getReservationsByCustomer(Long customerId);
    List<ReservationDTO> getReservationsByStatus(Reservation.ReservationStatus status);
    ReservationDTO updateReservationStatus(Long reservationId, ReservationDTO.StatusUpdateRequest request);
    ReservationDTO.CancelResponse cancelReservation(Long reservationId);
    long countByStatus(Reservation.ReservationStatus status);
    List<ReservationDTO.BookedRange> getBookedDateRanges(Long carId);

    // Admin assigns a driver — notifies + emails the customer with driver & car details
    ReservationDTO assignDriver(Long reservationId, Long driverId);

    // Driver's own pickup-form dropdown — only their assigned, not-yet-picked-up reservations
    List<ReservationDTO> getPendingPickupsForDriver(Long driverId);
}
