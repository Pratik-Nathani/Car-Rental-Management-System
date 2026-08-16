package com.rentmyride.repository;

import com.rentmyride.entities.Car;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface CarRepository extends JpaRepository<Car, Long> {

    // Find by registration number
    Optional<Car> findByRegistrationNumber(String registrationNumber);

    // Find all available cars
    List<Car> findByAvailabilityStatus(Car.AvailabilityStatus availabilityStatus);

    // Find by category
    List<Car> findByCarCategory(Car.CarCategory carCategory);

    // Find by fuel type
    List<Car> findByFuelType(Car.FuelType fuelType);

    // Find by brand
    List<Car> findByBrandIgnoreCase(String brand);

    // Find by seating capacity
    List<Car> findBySeatingCapacityGreaterThanEqual(Integer seatingCapacity);

    // Find by rent range
    List<Car> findByRentPerDayBetween(Double minRent, Double maxRent);

    // Find available cars by category
    List<Car> findByAvailabilityStatusAndCarCategory(
            Car.AvailabilityStatus status,
            Car.CarCategory category
    );

    // Find available cars within budget
    List<Car> findByAvailabilityStatusAndRentPerDayLessThanEqual(
            Car.AvailabilityStatus status,
            Double maxRent
    );

    // Search cars by brand or model (case insensitive)
    @Query("SELECT c FROM Car c WHERE " +
           "LOWER(c.brand) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
           "LOWER(c.model) LIKE LOWER(CONCAT('%', :keyword, '%'))")
    List<Car> searchByBrandOrModel(@Param("keyword") String keyword);

    // Find cars NOT booked between dates
    @Query("SELECT c FROM Car c WHERE c.carId NOT IN (" +
           "SELECT r.car.carId FROM Reservation r WHERE " +
           "r.reservationStatus NOT IN ('CANCELLED', 'REJECTED') AND " +
           "(:pickupDate <= r.returnDate AND :returnDate >= r.pickupDate))")
    List<Car> findAvailableCarsBetweenDates(
            @Param("pickupDate") LocalDate pickupDate,
            @Param("returnDate") LocalDate returnDate
    );

    // Count by availability status
    long countByAvailabilityStatus(Car.AvailabilityStatus status);

    // Check if registration number exists (excluding current car)
    boolean existsByRegistrationNumberAndCarIdNot(String registrationNumber, Long carId);
}
