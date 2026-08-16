package com.rentmyride.dtos;

import com.rentmyride.entities.Car;
import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CarDTO {

    private Long carId;
    private String brand;
    private String model;
    private Integer year;
    private String registrationNumber;
    private String color;
    private Car.FuelType fuelType;
    private Car.TransmissionType transmissionType;
    private Car.CarCategory carCategory;
    private Integer seatingCapacity;
    private Double rentPerDay;
    private Double ratePerKm;
    private Double nightChargePerNight;
    private Double mileageKmpl;
    private Car.AvailabilityStatus availabilityStatus;
    private String imageUrl;
    private String description;
}
