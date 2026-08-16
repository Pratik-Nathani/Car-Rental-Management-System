package com.rentmyride.exception_handler;

import com.rentmyride.custom_exceptions.*;
import com.rentmyride.dtos.AuthResponseDTO;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestControllerAdvice
@Slf4j
public class GlobalExceptionHandler {

    // ── 404 Not Found Exceptions ──────────────────────────────

    @ExceptionHandler(CarNotFoundException.class)
    public ResponseEntity<AuthResponseDTO.ApiResponse> handleCarNotFound(CarNotFoundException ex) {
        log.error("[RMR-ERROR] CarNotFoundException: {}", ex.getMessage());
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(AuthResponseDTO.ApiResponse.error(ex.getMessage()));
    }

    @ExceptionHandler(CustomerNotFoundException.class)
    public ResponseEntity<AuthResponseDTO.ApiResponse> handleCustomerNotFound(CustomerNotFoundException ex) {
        log.error("[RMR-ERROR] CustomerNotFoundException: {}", ex.getMessage());
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(AuthResponseDTO.ApiResponse.error(ex.getMessage()));
    }

    @ExceptionHandler(DriverNotFoundException.class)
    public ResponseEntity<AuthResponseDTO.ApiResponse> handleDriverNotFound(DriverNotFoundException ex) {
        log.error("[RMR-ERROR] DriverNotFoundException: {}", ex.getMessage());
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(AuthResponseDTO.ApiResponse.error(ex.getMessage()));
    }

    @ExceptionHandler(ReservationNotFoundException.class)
    public ResponseEntity<AuthResponseDTO.ApiResponse> handleReservationNotFound(ReservationNotFoundException ex) {
        log.error("[RMR-ERROR] ReservationNotFoundException: {}", ex.getMessage());
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(AuthResponseDTO.ApiResponse.error(ex.getMessage()));
    }

    @ExceptionHandler(RentalNotFoundException.class)
    public ResponseEntity<AuthResponseDTO.ApiResponse> handleRentalNotFound(RentalNotFoundException ex) {
        log.error("[RMR-ERROR] RentalNotFoundException: {}", ex.getMessage());
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(AuthResponseDTO.ApiResponse.error(ex.getMessage()));
    }

    @ExceptionHandler(PaymentNotFoundException.class)
    public ResponseEntity<AuthResponseDTO.ApiResponse> handlePaymentNotFound(PaymentNotFoundException ex) {
        log.error("[RMR-ERROR] PaymentNotFoundException: {}", ex.getMessage());
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(AuthResponseDTO.ApiResponse.error(ex.getMessage()));
    }

    @ExceptionHandler(AdminNotFoundException.class)
    public ResponseEntity<AuthResponseDTO.ApiResponse> handleAdminNotFound(AdminNotFoundException ex) {
        log.error("[RMR-ERROR] AdminNotFoundException: {}", ex.getMessage());
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(AuthResponseDTO.ApiResponse.error(ex.getMessage()));
    }

    // ── 400 Bad Request Exceptions ────────────────────────────

    @ExceptionHandler(CarNotAvailableException.class)
    public ResponseEntity<AuthResponseDTO.ApiResponse> handleCarNotAvailable(CarNotAvailableException ex) {
        log.error("[RMR-ERROR] CarNotAvailableException: {}", ex.getMessage());
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(AuthResponseDTO.ApiResponse.error(ex.getMessage()));
    }

    @ExceptionHandler(DriverNotAvailableException.class)
    public ResponseEntity<AuthResponseDTO.ApiResponse> handleDriverNotAvailable(DriverNotAvailableException ex) {
        log.error("[RMR-ERROR] DriverNotAvailableException: {}", ex.getMessage());
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(AuthResponseDTO.ApiResponse.error(ex.getMessage()));
    }

    @ExceptionHandler(InvalidDateRangeException.class)
    public ResponseEntity<AuthResponseDTO.ApiResponse> handleInvalidDateRange(InvalidDateRangeException ex) {
        log.error("[RMR-ERROR] InvalidDateRangeException: {}", ex.getMessage());
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(AuthResponseDTO.ApiResponse.error(ex.getMessage()));
    }

    @ExceptionHandler(InvalidOtpException.class)
    public ResponseEntity<AuthResponseDTO.ApiResponse> handleInvalidOtp(InvalidOtpException ex) {
        log.error("[RMR-ERROR] InvalidOtpException: {}", ex.getMessage());
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(AuthResponseDTO.ApiResponse.error(ex.getMessage()));
    }

    @ExceptionHandler(PaymentFailedException.class)
    public ResponseEntity<AuthResponseDTO.ApiResponse> handlePaymentFailed(PaymentFailedException ex) {
        log.error("[RMR-ERROR] PaymentFailedException: {}", ex.getMessage());
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(AuthResponseDTO.ApiResponse.error(ex.getMessage()));
    }

    @ExceptionHandler(InvalidCredentialsException.class)
    public ResponseEntity<AuthResponseDTO.ApiResponse> handleInvalidCredentials(InvalidCredentialsException ex) {
        log.error("[RMR-ERROR] InvalidCredentialsException: {}", ex.getMessage());
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(AuthResponseDTO.ApiResponse.error(ex.getMessage()));
    }

    // ── 409 Conflict Exceptions ───────────────────────────────

    @ExceptionHandler(CustomerAlreadyExistsException.class)
    public ResponseEntity<AuthResponseDTO.ApiResponse> handleCustomerExists(CustomerAlreadyExistsException ex) {
        log.error("[RMR-ERROR] CustomerAlreadyExistsException: {}", ex.getMessage());
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(AuthResponseDTO.ApiResponse.error(ex.getMessage()));
    }

    @ExceptionHandler(DuplicateRegistrationException.class)
    public ResponseEntity<AuthResponseDTO.ApiResponse> handleDuplicate(DuplicateRegistrationException ex) {
        log.error("[RMR-ERROR] DuplicateRegistrationException: {}", ex.getMessage());
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(AuthResponseDTO.ApiResponse.error(ex.getMessage()));
    }

    // ── 403 Forbidden ─────────────────────────────────────────

    @ExceptionHandler(UnauthorizedAccessException.class)
    public ResponseEntity<AuthResponseDTO.ApiResponse> handleUnauthorized(UnauthorizedAccessException ex) {
        log.error("[RMR-ERROR] UnauthorizedAccessException: {}", ex.getMessage());
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(AuthResponseDTO.ApiResponse.error(ex.getMessage()));
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<AuthResponseDTO.ApiResponse> handleAccessDenied(AccessDeniedException ex) {
        log.error("[RMR-ERROR] AccessDeniedException: {}", ex.getMessage());
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(AuthResponseDTO.ApiResponse.error("Access denied. You don't have permission."));
    }

    // ── 422 Validation Errors ─────────────────────────────────

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, String>> handleValidationErrors(MethodArgumentNotValidException ex) {
        Map<String, String> errors = new HashMap<>();
        ex.getBindingResult().getAllErrors().forEach(error -> {
            String field = ((FieldError) error).getField();
            String message = error.getDefaultMessage();
            errors.put(field, message);
        });
        log.error("[RMR-ERROR] Validation failed: {}", errors);
        return ResponseEntity.status(HttpStatus.UNPROCESSABLE_ENTITY).body(errors);
    }

    // ── 500 Internal Server Error ─────────────────────────────

    @ExceptionHandler(Exception.class)
    public ResponseEntity<AuthResponseDTO.ApiResponse> handleGeneral(Exception ex) {
        log.error("[RMR-ERROR] Unhandled Exception: {}", ex.getMessage(), ex);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(AuthResponseDTO.ApiResponse.error("Something went wrong. Please contact support."));
    }
}
