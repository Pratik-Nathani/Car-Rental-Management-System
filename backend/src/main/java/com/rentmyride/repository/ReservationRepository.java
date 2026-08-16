package com.rentmyride.repository;

import com.rentmyride.entities.Reservation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface ReservationRepository extends JpaRepository<Reservation, Long> {

    List<Reservation> findByCustomer_CustomerId(Long customerId);
    List<Reservation> findByCar_CarId(Long carId);
    @Query("SELECT r FROM Reservation r WHERE r.car.carId = :carId AND r.reservationStatus NOT IN ('CANCELLED','REJECTED','COMPLETED')")
    List<Reservation> findActiveByCarId(@Param("carId") Long carId);
    List<Reservation> findByReservationStatus(Reservation.ReservationStatus status);
    List<Reservation> findByCustomer_CustomerIdAndReservationStatus(Long customerId, Reservation.ReservationStatus status);

    // Reservations assigned to a driver that haven't been picked up yet (no Rental exists) —
    // used to populate the driver's own pickup-form dropdown.
    @Query("SELECT r FROM Reservation r WHERE r.assignedDriver.driverId = :driverId " +
           "AND r.reservationStatus = 'CONFIRMED' AND r.rental IS NULL")
    List<Reservation> findPendingPickupsForDriver(@Param("driverId") Long driverId);

    List<Reservation> findByAssignedDriver_DriverId(Long driverId);

    @Query("SELECT r FROM Reservation r WHERE r.pickupDate BETWEEN :start AND :end")
    List<Reservation> findByPickupDateBetween(@Param("start") LocalDate start, @Param("end") LocalDate end);

    // Only PENDING/CONFIRMED bookings actually occupy the car — a COMPLETED one is already
    // returned and shouldn't block new bookings just because its dates overlap.
    @Query("SELECT r FROM Reservation r WHERE r.car.carId = :carId AND r.reservationStatus NOT IN ('CANCELLED','REJECTED','COMPLETED') " +
           "AND (:pickup <= r.returnDate AND :returnD >= r.pickupDate)")
    List<Reservation> findConflictingReservations(@Param("carId") Long carId,
                                                   @Param("pickup") LocalDate pickup,
                                                   @Param("returnD") LocalDate returnD);

    // Used when assigning a driver — a driver can't be double-booked to two overlapping trips.
    // Only PENDING/CONFIRMED assignments count as real conflicts — a COMPLETED trip is over
    // and no longer occupies the driver, even if its dates happen to overlap the new booking.
    @Query("SELECT r FROM Reservation r WHERE r.assignedDriver.driverId = :driverId " +
           "AND r.reservationStatus NOT IN ('CANCELLED','REJECTED','COMPLETED') " +
           "AND (:pickup <= r.returnDate AND :returnD >= r.pickupDate)")
    List<Reservation> findConflictingReservationsForDriver(@Param("driverId") Long driverId,
                                                             @Param("pickup") LocalDate pickup,
                                                             @Param("returnD") LocalDate returnD);

    long countByReservationStatus(Reservation.ReservationStatus status);

    @Query("SELECT r FROM Reservation r ORDER BY r.createdAt DESC")
    List<Reservation> findRecentReservations(org.springframework.data.domain.Pageable pageable);
}
