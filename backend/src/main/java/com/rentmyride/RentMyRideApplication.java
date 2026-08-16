package com.rentmyride;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.EnableAspectJAutoProxy;
import org.springframework.scheduling.annotation.EnableAsync;

@SpringBootApplication
@EnableAspectJAutoProxy
@EnableAsync
public class RentMyRideApplication {

    public static void main(String[] args) {
        SpringApplication.run(RentMyRideApplication.class, args);
        System.out.println("==============================================");
        System.out.println("  🚗  RentMyRide Backend Started!     ");
        System.out.println("  📍  API   : http://localhost:8080/api       ");
        System.out.println("  📄  Swagger: http://localhost:8080/swagger-ui.html");
        System.out.println("==============================================");
    }
}
