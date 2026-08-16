package com.rentmyride.dtos;

import com.rentmyride.entities.Rental;
import lombok.*;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RentalDTO {

    private Long rentalId;
    private Long reservationId;
    private Long customerId;
    private String customerName;
    private String customerMobile;
    private Long carId;
    private String carBrand;
    private String carModel;
    private String carRegistrationNumber;
    private Long driverId;
    private String driverName;
    private String pickupLocation;
    private String dropLocation;
    private com.rentmyride.entities.Reservation.TripType tripType;
    private java.time.LocalTime pickupTime;
    private LocalDateTime actualPickupDatetime;
    private LocalDateTime actualReturnDatetime;
    private Double odometerAtPickup;
    private Double odometerAtReturn;
    private Double totalKmDriven;
    private Double baseAmount;
    private Double extraKmCharges;
    private Double damageCharges;
    private Double lateReturnCharges;
    private Double discountAmount;
    private Double totalAmount;
    private Rental.RentalStatus rentalStatus;
    private String remarks;
    private LocalDateTime createdAt;

    // Pickup Request
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class PickupRequest {
        private Long reservationId;
        private Long driverId;
        private Double odometerAtPickup;
        private LocalDateTime actualPickupDatetime;
        private String remarks;
    }

    // Return Request
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class ReturnRequest {
        private Double odometerAtReturn;
        private LocalDateTime actualReturnDatetime;
        private Double damageCharges;
        private Double discountAmount;
        private String remarks;
    }

    // Extend an ACTIVE rental to a later return date
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ExtendRequest {
        private java.time.LocalDate newReturnDate;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class ExtendResponse {
        private RentalDTO rental;
        private Double extraCharge;
        private java.time.LocalDate newReturnDate;
        private String message;
    }
}
