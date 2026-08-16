package com.rentmyride.service.impl;

import com.rentmyride.custom_exceptions.InvalidOtpException;
import com.rentmyride.entities.OtpVerification;
import com.rentmyride.repository.OtpVerificationRepository;
import com.rentmyride.service.NotificationService;
import com.rentmyride.service.OtpService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
@Slf4j
public class OtpServiceImpl implements OtpService {

    private final OtpVerificationRepository otpRepository;
    private final JavaMailSender mailSender;
    private final NotificationService notificationService;

    @Value("${otp.expiry-minutes:5}")
    private int expiryMinutes;

    @Value("${otp.length:6}")
    private int otpLength;

    @Value("${spring.mail.username:}")
    private String mailUsername;

    @Value("${otp.max-attempts:5}")
    private int maxAttempts;

    private final SecureRandom random = new SecureRandom();

    @Override
    @Transactional
    public void generateAndSendOtp(String identifier, OtpVerification.OtpPurpose purpose) {
        String code = generateNumericCode(otpLength);

        OtpVerification otpVerification = OtpVerification.builder()
                .identifier(identifier)
                .otpCode(code)
                .purpose(purpose)
                .expiryTime(LocalDateTime.now().plusMinutes(expiryMinutes))
                .build();

        otpRepository.save(otpVerification);

        // The customer can log in with either their email or mobile number (see
        // findByEmailOrMobile) — whichever they typed IS the identifier here, so send
        // the OTP to that same channel instead of always emailing it.
        if (identifier.contains("@")) {
            sendOtpEmail(identifier, code, purpose);
        } else {
            notificationService.sendSms(identifier, "Your RentMyRide verification code is " + code +
                    ". It expires in " + expiryMinutes + " minutes.");
        }
    }

    @Override
    @Transactional
    public void verifyOtp(String identifier, String otp, OtpVerification.OtpPurpose purpose) {
        OtpVerification record = otpRepository
                .findTopByIdentifierAndPurposeOrderByCreatedAtDesc(identifier, purpose)
                .orElseThrow(() -> new InvalidOtpException("No OTP was requested for this account."));

        if (record.isVerified()) {
            throw new InvalidOtpException("This OTP has already been used. Please request a new one.");
        }

        if (record.getExpiryTime().isBefore(LocalDateTime.now())) {
            throw new InvalidOtpException("OTP has expired. Please request a new one.");
        }

        if (record.getAttempts() >= maxAttempts) {
            throw new InvalidOtpException("Too many incorrect attempts. Please request a new OTP.");
        }

        if (!record.getOtpCode().equals(otp)) {
            record.setAttempts(record.getAttempts() + 1);
            otpRepository.save(record);
            throw new InvalidOtpException("Invalid OTP. Please try again.");
        }

        record.setVerified(true);
        otpRepository.save(record);
    }

    @Override
    @Transactional(readOnly = true)
    public boolean isRecentlyVerified(String identifier, OtpVerification.OtpPurpose purpose) {
        return otpRepository.findTopByIdentifierAndPurposeOrderByCreatedAtDesc(identifier, purpose)
                .map(record -> record.isVerified() && record.getExpiryTime().isAfter(LocalDateTime.now().minusMinutes(expiryMinutes)))
                .orElse(false);
    }

    private String generateNumericCode(int length) {
        StringBuilder sb = new StringBuilder(length);
        for (int i = 0; i < length; i++) {
            sb.append(random.nextInt(10));
        }
        return sb.toString();
    }

    private void sendOtpEmail(String toEmail, String code, OtpVerification.OtpPurpose purpose) {
        if (mailUsername.isBlank() || mailUsername.equals("your-email@gmail.com")) {
            log.warn("[RMR] OTP email not sent to {} — spring.mail.username/password in " +
                    "application.properties are still the placeholder values. Set a real Gmail " +
                    "address + App Password (https://myaccount.google.com/apppasswords).", toEmail);
            throw new InvalidOtpException(
                    "Email isn't configured on the server yet (spring.mail.username/password are placeholders " +
                    "in application.properties) — OTP could not be sent.");
        }
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setTo(toEmail);
            message.setSubject(purpose == OtpVerification.OtpPurpose.LOGIN
                    ? "RentMyRide — Your Login OTP"
                    : "RentMyRide — Password Reset OTP");
            message.setText(
                    "Your OTP code is: " + code + "\n\n" +
                    "This code will expire in " + expiryMinutes + " minutes.\n" +
                    "If you did not request this, please ignore this email."
            );
            mailSender.send(message);
        } catch (Exception e) {
            // Don't leak SMTP errors to the client, but do log them for debugging.
            log.error("[RMR-ERROR] Failed to send OTP email to {}: {}", toEmail, e.getMessage());
            throw new InvalidOtpException("Failed to send OTP email. Please try again later.");
        }
    }
}
