package com.rentmyride.repository;

import com.rentmyride.entities.Feedback;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface FeedbackRepository extends JpaRepository<Feedback, Long> {
    List<Feedback> findAllByOrderByCreatedAtDesc();
    List<Feedback> findByCustomer_CustomerIdOrderByCreatedAtDesc(Long customerId);
    Optional<Feedback> findByRental_RentalId(Long rentalId);
    boolean existsByRental_RentalId(Long rentalId);

    List<Feedback> findByRental_Car_CarIdOrderByCreatedAtDesc(Long carId);

    // Average of the 5 rating categories + review count, grouped by car — used to show
    // star ratings to customers browsing cars.
    @Query("SELECT f.rental.car.carId, " +
           "AVG((f.carCondition + f.staffBehavior + f.valueForMoney + f.bookingProcess + f.overallService) / 5.0), " +
           "COUNT(f) " +
           "FROM Feedback f GROUP BY f.rental.car.carId")
    List<Object[]> findRatingSummaryPerCar();
}
