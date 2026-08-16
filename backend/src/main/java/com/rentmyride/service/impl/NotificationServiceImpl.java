package com.rentmyride.service.impl;

import com.rentmyride.custom_exceptions.CustomerNotFoundException;
import com.rentmyride.dtos.NotificationDTO;
import com.rentmyride.entities.Customer;
import com.rentmyride.entities.Notification;
import com.rentmyride.repository.CustomerRepository;
import com.rentmyride.repository.NotificationRepository;
import com.rentmyride.service.NotificationService;
import com.rentmyride.security.SecurityUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;

import java.util.Base64;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class NotificationServiceImpl implements NotificationService {

    private final RestTemplate restTemplate;
    private final NotificationRepository notificationRepository;
    private final CustomerRepository customerRepository;
    private final com.rentmyride.repository.DriverRepository driverRepository;
    private final JavaMailSender mailSender;

    @Value("${notification.enabled:false}")
    private boolean enabled;

    @Value("${twilio.account-sid:}")
    private String accountSid;

    @Value("${twilio.auth-token:}")
    private String authToken;

    @Value("${spring.mail.username:}")
    private String mailUsername;

    @Value("${twilio.sms-from:}")
    private String smsFrom;

    @Value("${twilio.whatsapp-from:whatsapp:+14155238886}")
    private String whatsAppFrom;

    @Override
    @org.springframework.scheduling.annotation.Async("notificationExecutor")
    public void sendSms(String mobileNumber, String message) {
        send(toE164(mobileNumber), smsFrom, message);
    }

    @Override
    @org.springframework.scheduling.annotation.Async("notificationExecutor")
    public void sendWhatsApp(String mobileNumber, String message) {
        send("whatsapp:" + toE164(mobileNumber), whatsAppFrom, message);
    }

    @Override
    @org.springframework.scheduling.annotation.Async("notificationExecutor")
    public void sendBookingConfirmation(String customerName, String mobileNumber, Long reservationId,
                                         String carLabel, String pickupDate, double amount) {
        String message = String.format(
                "Hi %s! Your RentMyRide booking #RES-%d for %s on %s is CONFIRMED. Amount: Rs.%.0f. Thank you for choosing us!",
                customerName, reservationId, carLabel, pickupDate, amount);
        sendSms(mobileNumber, message);
        sendWhatsApp(mobileNumber, message);
    }

    @Override
    @org.springframework.scheduling.annotation.Async("notificationExecutor")
    public void sendEmail(String toEmail, String subject, String body) {
        if (toEmail == null || toEmail.isBlank()) return;
        if (mailUsername.isBlank() || mailUsername.equals("your-email@gmail.com")) {
            log.warn("[RMR] Email not sent to {} — spring.mail.username/password in application.properties " +
                    "are still the placeholder values. Set a real Gmail address + App Password " +
                    "(https://myaccount.google.com/apppasswords) to enable email.", toEmail);
            return;
        }
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setTo(toEmail);
            message.setSubject(subject);
            message.setText(body);
            mailSender.send(message);
            log.info("[RMR] Email sent to {}: {}", toEmail, subject);
        } catch (Exception e) {
            // Never let an email failure break the calling flow (e.g. driver assignment)
            log.error("[RMR-ERROR] Failed to send email to {}: {}", toEmail, e.getMessage());
        }
    }

    // ── Internal ─────────────────────────────────────────
    private void send(String to, String from, String body) {
        boolean placeholderCreds = accountSid.isBlank() || authToken.isBlank()
                || accountSid.startsWith("YOUR_") || authToken.startsWith("YOUR_");
        if (!enabled) {
            log.warn("[RMR] SMS/WhatsApp not sent to {} — notification.enabled=false in " +
                    "application.properties. Set it to true (and configure real Twilio " +
                    "credentials below) to actually send messages.", to);
            return;
        }
        if (placeholderCreds) {
            log.warn("[RMR] SMS/WhatsApp not sent to {} — twilio.account-sid/auth-token in " +
                    "application.properties are still the placeholder values. Get real ones free " +
                    "at https://www.twilio.com/try-twilio (trial account works for testing).", to);
            return;
        }
        try {
            String url = "https://api.twilio.com/2010-04-01/Accounts/" + accountSid + "/Messages.json";

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);
            String credentials = Base64.getEncoder().encodeToString((accountSid + ":" + authToken).getBytes());
            headers.set("Authorization", "Basic " + credentials);

            MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
            form.add("To", to);
            form.add("From", from);
            form.add("Body", body);

            HttpEntity<MultiValueMap<String, String>> request = new HttpEntity<>(form, headers);
            restTemplate.postForEntity(url, request, String.class);
            log.info("[RMR] Notification sent to {}", to);
        } catch (Exception e) {
            // Never let a notification failure break the booking/payment flow
            log.error("[RMR-ERROR] Failed to send notification to {}: {}", to, e.getMessage());
        }
    }

    // Normalizes a 10-digit Indian mobile number to E.164 (+91XXXXXXXXXX). Leaves already-formatted numbers as-is.
    private String toE164(String mobileNumber) {
        if (mobileNumber == null) return "";
        String digits = mobileNumber.replaceAll("[^0-9]", "");
        if (digits.length() == 10) return "+91" + digits;
        if (mobileNumber.startsWith("+")) return mobileNumber;
        return "+" + digits;
    }

    // ── In-app notifications ────────────────────────────────
    @Override
    @Transactional
    public void notifyCustomer(Long customerId, String title, String message, Notification.Type type, Long relatedReservationId) {
        Customer customer = customerRepository.findById(customerId)
                .orElseThrow(() -> new CustomerNotFoundException(customerId));

        Notification notification = Notification.builder()
                .customer(customer).title(title).message(message).type(type)
                .relatedReservationId(relatedReservationId)
                .build();
        notificationRepository.save(notification);
    }

    @Override
    @Transactional(readOnly = true)
    public List<NotificationDTO> getNotificationsForCustomer(Long customerId) {
        assertOwnsCustomerData(customerId);
        return notificationRepository.findByCustomer_CustomerIdOrderByCreatedAtDesc(customerId)
                .stream().map(this::mapToDTO).collect(Collectors.toList());
    }

    // Same IDOR gap closed elsewhere in the app — a valid CUSTOMER-role JWT alone doesn't
    // prove the requested customerId is actually theirs.
    private void assertOwnsCustomerData(Long customerId) {
        if (SecurityUtils.isAdmin()) return;
        String email = SecurityUtils.currentEmail();
        if (email == null) return;

        customerRepository.findByEmail(email).ifPresent(me -> {
            if (!me.getCustomerId().equals(customerId)) {
                throw new com.rentmyride.custom_exceptions.UnauthorizedAccessException(
                        "You don't have access to this customer's notifications.");
            }
        });
    }

    @Override
    @Transactional(readOnly = true)
    public long getUnreadCount(Long customerId) {
        assertOwnsCustomerData(customerId);
        return notificationRepository.countByCustomer_CustomerIdAndReadFalse(customerId);
    }

    @Override
    @Transactional
    public void markAsRead(Long notificationId) {
        notificationRepository.findById(notificationId).ifPresent(n -> {
            n.setRead(true);
            notificationRepository.save(n);
        });
    }

    @Override
    @Transactional
    public void markAllAsRead(Long customerId) {
        assertOwnsCustomerData(customerId);
        List<Notification> unread = notificationRepository.findByCustomer_CustomerIdOrderByCreatedAtDesc(customerId)
                .stream().filter(n -> !n.isRead()).collect(Collectors.toList());
        unread.forEach(n -> n.setRead(true));
        notificationRepository.saveAll(unread);
    }

    // ── Driver in-app notifications ─────────────────────────
    @Override
    @Transactional
    public void notifyDriver(Long driverId, String title, String message, Notification.Type type, Long relatedReservationId) {
        com.rentmyride.entities.Driver driver = driverRepository.findById(driverId)
                .orElseThrow(() -> new com.rentmyride.custom_exceptions.DriverNotFoundException(driverId));

        Notification notification = Notification.builder()
                .driver(driver).title(title).message(message).type(type)
                .relatedReservationId(relatedReservationId)
                .build();
        notificationRepository.save(notification);
    }

    @Override
    @Transactional(readOnly = true)
    public List<NotificationDTO> getNotificationsForDriver(Long driverId) {
        return notificationRepository.findByDriver_DriverIdOrderByCreatedAtDesc(driverId)
                .stream().map(this::mapToDTO).collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public long getUnreadCountForDriver(Long driverId) {
        return notificationRepository.countByDriver_DriverIdAndReadFalse(driverId);
    }

    @Override
    @Transactional
    public void markAllAsReadForDriver(Long driverId) {
        List<Notification> unread = notificationRepository.findByDriver_DriverIdOrderByCreatedAtDesc(driverId)
                .stream().filter(n -> !n.isRead()).collect(Collectors.toList());
        unread.forEach(n -> n.setRead(true));
        notificationRepository.saveAll(unread);
    }

    private NotificationDTO mapToDTO(Notification n) {
        return NotificationDTO.builder()
                .notificationId(n.getNotificationId())
                .title(n.getTitle()).message(n.getMessage()).type(n.getType())
                .relatedReservationId(n.getRelatedReservationId())
                .read(n.isRead()).createdAt(n.getCreatedAt())
                .build();
    }
}
