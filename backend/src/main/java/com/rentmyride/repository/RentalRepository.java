package com.rentmyride.repository;

import com.rentmyride.entities.Rental;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface RentalRepository extends JpaRepository<Rental, Long> {

    List<Rental> findByCustomer_CustomerId(Long customerId);
    List<Rental> findByCar_CarId(Long carId);
    List<Rental> findByDriver_DriverId(Long driverId);
    List<Rental> findByRentalStatus(Rental.RentalStatus status);
    Optional<Rental> findByReservation_ReservationId(Long reservationId);

    List<Rental> findByCustomer_CustomerIdAndRentalStatus(Long customerId, Rental.RentalStatus status);

    @Query("SELECT r FROM Rental r WHERE r.rentalStatus = 'ACTIVE' ORDER BY r.createdAt DESC")
    List<Rental> findAllActiveRentals();

    @Query("SELECT SUM(r.totalAmount) FROM Rental r WHERE r.rentalStatus = 'COMPLETED'")
    Double getTotalRevenue();

    @Query("SELECT SUM(r.totalAmount) FROM Rental r WHERE r.rentalStatus = 'COMPLETED' " +
           "AND MONTH(r.actualReturnDatetime) = :month AND YEAR(r.actualReturnDatetime) = :year")
    Double getMonthlyRevenue(@Param("month") int month, @Param("year") int year);

    long countByRentalStatus(Rental.RentalStatus status);
}
