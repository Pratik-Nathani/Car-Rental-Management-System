package com.rentmyride.dtos;

import com.rentmyride.entities.PromoCode;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PromoCodeDTO {
    private Long promoId;
    private String code;
    private String description;
    private PromoCode.DiscountType discountType;
    private Double discountValue;
    private Double maxDiscountAmount;
    private Double minBookingAmount;
    private LocalDate validFrom;
    private LocalDate validUntil;
    private Integer usageLimit;
    private Integer usedCount;
    private boolean active;
    private LocalDateTime createdAt;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ValidateRequest {
        private String code;
        private Double bookingAmount;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class ValidateResponse {
        private boolean valid;
        private String message;
        private Double discountAmount;
        private Double finalAmount;
    }
}
