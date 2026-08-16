package com.rentmyride.service.impl;

import com.rentmyride.custom_exceptions.CustomerAlreadyExistsException;
import com.rentmyride.custom_exceptions.CustomerNotFoundException;
import com.rentmyride.custom_exceptions.InvalidOtpException;
import com.rentmyride.custom_exceptions.UnauthorizedAccessException;
import com.rentmyride.security.SecurityUtils;
import com.rentmyride.dtos.AuthResponseDTO;
import com.rentmyride.dtos.CustomerDTO;
import com.rentmyride.entities.Customer;
import com.rentmyride.entities.OtpVerification;
import com.rentmyride.repository.CustomerRepository;
import com.rentmyride.security.JwtUtil;
import com.rentmyride.service.CustomerService;
import com.rentmyride.service.OtpService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class CustomerServiceImpl implements CustomerService {

    private final CustomerRepository customerRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final OtpService otpService;

    @Override
    @Transactional
    public CustomerDTO registerCustomer(CustomerDTO.RegisterRequest request) {
        if (customerRepository.existsByEmail(request.getEmail()))
            throw new CustomerAlreadyExistsException("Email already registered: " + request.getEmail());
        if (customerRepository.existsByMobileNumber(request.getMobileNumber()))
            throw new CustomerAlreadyExistsException("Mobile number already registered.");
        if (request.getAadharNumber() != null && customerRepository.existsByAadharNumber(request.getAadharNumber()))
            throw new CustomerAlreadyExistsException("Aadhar number already registered.");

        // Driving license is optional — treat blank as not provided so the unique constraint isn't tripped by "".
        String dlNumber = (request.getDrivingLicenseNumber() == null || request.getDrivingLicenseNumber().trim().isEmpty())
                ? null : request.getDrivingLicenseNumber().trim();

        // Every customer gets their own referral code to share with friends
        String myReferralCode = generateUniqueReferralCode(request.getFirstName());

        // If they signed up using a friend's code, validate it and queue up the signup bonus
        Customer referrer = null;
        String referredByCode = null;
        if (request.getReferredByCode() != null && !request.getReferredByCode().isBlank()) {
            referrer = customerRepository.findByReferralCode(request.getReferredByCode().trim().toUpperCase()).orElse(null);
            if (referrer != null) referredByCode = referrer.getReferralCode();
        }

        Customer customer = Customer.builder()
                .firstName(request.getFirstName())
                .lastName(request.getLastName())
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .mobileNumber(request.getMobileNumber())
                .alternateMobile(request.getAlternateMobile())
                .dateOfBirth(request.getDateOfBirth())
                .gender(request.getGender() != null && !request.getGender().isBlank()
                        ? Customer.Gender.valueOf(request.getGender().toUpperCase()) : null)
                .address(request.getAddress())
                .city(request.getCity())
                .state(request.getState())
                .pincode(request.getPincode())
                .drivingLicenseNumber(dlNumber)
                .drivingLicenseExpiry(request.getDrivingLicenseExpiry())
                .aadharNumber(request.getAadharNumber())
                .drivingLicenseImageUrl(request.getDrivingLicenseImageUrl())
                .aadharImageUrl(request.getAadharImageUrl())
                .referralCode(myReferralCode)
                .referredByCode(referredByCode)
                .walletBalance(referredByCode != null ? REFERRAL_BONUS : 0.0) // signup bonus for using a code
                .build();

        Customer saved = customerRepository.save(customer);

        if (referrer != null) {
            referrer.setWalletBalance((referrer.getWalletBalance() == null ? 0.0 : referrer.getWalletBalance()) + REFERRAL_BONUS);
            customerRepository.save(referrer);
        }

        return mapToDTO(saved);
    }

    private static final double REFERRAL_BONUS = 200.0; // ₹200 credited to both referrer and new customer

    private String generateUniqueReferralCode(String firstName) {
        String base = (firstName == null || firstName.isBlank() ? "RIDE" : firstName.trim().toUpperCase())
                .replaceAll("[^A-Z]", "");
        if (base.length() > 6) base = base.substring(0, 6);
        String code;
        do {
            code = base + (100 + new java.util.Random().nextInt(900)); // e.g. RAHUL482
        } while (customerRepository.existsByReferralCode(code));
        return code;
    }

    @Override
    @Transactional(readOnly = true)
    public AuthResponseDTO loginCustomer(CustomerDTO.LoginRequest request) {
        Customer customer = customerRepository.findByEmailOrMobile(request.getUsername())
                .orElseThrow(() -> new CustomerNotFoundException("No account found with: " + request.getUsername()));

        if (!passwordEncoder.matches(request.getPassword(), customer.getPassword()))
            return AuthResponseDTO.failure("Invalid password.");

        if (customer.getAccountStatus() == Customer.AccountStatus.BLOCKED)
            return AuthResponseDTO.failure("Your account has been blocked. Contact support.");

        String token = jwtUtil.generateToken(customer.getEmail(), "CUSTOMER", customer.getCustomerId());
        return AuthResponseDTO.success(token, "CUSTOMER", customer.getCustomerId(),
                customer.getFirstName() + " " + customer.getLastName(), customer.getEmail());
    }

    @Override
    @Transactional(readOnly = true)
    public CustomerDTO getCustomerById(Long customerId) {
        Customer customer = customerRepository.findById(customerId)
                .orElseThrow(() -> new CustomerNotFoundException(customerId));
        assertIsSelfOrAdmin(customerId);
        return mapToDTO(customer);
    }

    // A valid JWT only proves "this is some logged-in customer" — the role check on the
    // controller doesn't stop customer A from reading or editing customer B's profile just
    // by changing the ID in the URL. This closes that gap for CUSTOMER-role tokens; ADMIN
    // tokens bypass it.
    private void assertIsSelfOrAdmin(Long requestedCustomerId) {
        if (SecurityUtils.isAdmin()) return;
        String email = SecurityUtils.currentEmail();
        if (email == null) return;

        customerRepository.findByEmail(email).ifPresent(me -> {
            if (!me.getCustomerId().equals(requestedCustomerId)) {
                throw new UnauthorizedAccessException("You don't have access to this customer's data.");
            }
        });
    }

    @Override
    @Transactional
    public CustomerDTO updateCustomer(Long customerId, CustomerDTO dto) {
        Customer customer = customerRepository.findById(customerId)
                .orElseThrow(() -> new CustomerNotFoundException(customerId));
        assertIsSelfOrAdmin(customerId);
        customer.setFirstName(dto.getFirstName());
        customer.setLastName(dto.getLastName());
        customer.setMobileNumber(dto.getMobileNumber());
        customer.setAlternateMobile(dto.getAlternateMobile());
        customer.setDateOfBirth(dto.getDateOfBirth());
        customer.setGender(dto.getGender());
        customer.setAddress(dto.getAddress());
        customer.setCity(dto.getCity());
        customer.setState(dto.getState());
        customer.setPincode(dto.getPincode());
        customer.setProfileImageUrl(dto.getProfileImageUrl());
        if (dto.getDrivingLicenseImageUrl() != null) customer.setDrivingLicenseImageUrl(dto.getDrivingLicenseImageUrl());
        if (dto.getAadharImageUrl() != null) customer.setAadharImageUrl(dto.getAadharImageUrl());
        return mapToDTO(customerRepository.save(customer));
    }

    @Override
    @Transactional
    public void deleteCustomer(Long customerId) {
        Customer customer = customerRepository.findById(customerId)
                .orElseThrow(() -> new CustomerNotFoundException(customerId));
        customer.setAccountStatus(Customer.AccountStatus.INACTIVE);
        customerRepository.save(customer);
    }

    @Override
    @Transactional(readOnly = true)
    public List<CustomerDTO> getAllCustomers() {
        return customerRepository.findAll().stream().map(this::mapToDTO).collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<CustomerDTO> searchCustomers(String keyword) {
        return customerRepository.searchCustomers(keyword).stream().map(this::mapToDTO).collect(Collectors.toList());
    }

    @Override
    @Transactional
    public CustomerDTO updateAccountStatus(Long customerId, Customer.AccountStatus status) {
        Customer customer = customerRepository.findById(customerId)
                .orElseThrow(() -> new CustomerNotFoundException(customerId));
        customer.setAccountStatus(status);
        return mapToDTO(customerRepository.save(customer));
    }

    @Override
    @Transactional(readOnly = true)
    public CustomerDTO getCustomerProfile(String email) {
        return mapToDTO(customerRepository.findByEmail(email)
                .orElseThrow(() -> new CustomerNotFoundException("No customer found with email: " + email)));
    }

    @Override
    @Transactional(readOnly = true)
    public long getTotalCustomerCount() {
        return customerRepository.count();
    }

    @Override
    @Transactional
    public void adjustTrustScore(Long customerId, int delta) {
        customerRepository.findById(customerId).ifPresentOrElse(c -> {
            int before = c.getTrustScore() == null ? 0 : c.getTrustScore();
            int updated = Math.max(0, Math.min(100, before + delta));
            c.setTrustScore(updated);
            customerRepository.save(c);
            log.info("[RMR] Trust score for customer #{}: {} -> {} (delta {})", customerId, before, updated, delta);
        }, () -> log.warn("[RMR-ERROR] adjustTrustScore called for unknown customer #{}", customerId));
    }

    @Override
    @Transactional(readOnly = true)
    public CustomerDTO.ReferralInfo getReferralInfo(Long customerId) {
        Customer c = customerRepository.findById(customerId).orElseThrow(() -> new CustomerNotFoundException(customerId));
        assertIsSelfOrAdmin(customerId);
        long referredCount = c.getReferralCode() == null ? 0 : customerRepository.countByReferredByCode(c.getReferralCode());
        return CustomerDTO.ReferralInfo.builder()
                .referralCode(c.getReferralCode())
                .walletBalance(c.getWalletBalance() == null ? 0.0 : c.getWalletBalance())
                .referredCount(referredCount)
                .bonusPerReferral(REFERRAL_BONUS)
                .build();
    }

    @Override
    @Transactional
    public double deductWalletBalance(Long customerId, double amount) {
        Customer c = customerRepository.findById(customerId).orElse(null);
        if (c == null || c.getWalletBalance() == null || c.getWalletBalance() <= 0 || amount <= 0) return 0.0;
        double deducted = Math.min(c.getWalletBalance(), amount);
        c.setWalletBalance(Math.round((c.getWalletBalance() - deducted) * 100) / 100.0);
        customerRepository.save(c);
        return deducted;
    }

    // ── OTP Login ────────────────────────────────────────────
    @Override
    @Transactional
    public void sendLoginOtp(String identifier) {
        Customer customer = customerRepository.findByEmailOrMobile(identifier)
                .orElseThrow(() -> new CustomerNotFoundException("No account found with: " + identifier));

        if (customer.getAccountStatus() == Customer.AccountStatus.BLOCKED)
            throw new InvalidOtpException("Your account has been blocked. Contact support.");

        // Send to whichever identifier the customer typed in — if they typed their mobile
        // number, they get an SMS; if they typed their email, they get an email.
        otpService.generateAndSendOtp(identifier, OtpVerification.OtpPurpose.LOGIN);
    }

    @Override
    @Transactional
    public AuthResponseDTO verifyLoginOtp(String identifier, String otp) {
        Customer customer = customerRepository.findByEmailOrMobile(identifier)
                .orElseThrow(() -> new CustomerNotFoundException("No account found with: " + identifier));

        otpService.verifyOtp(identifier, otp, OtpVerification.OtpPurpose.LOGIN);

        String token = jwtUtil.generateToken(customer.getEmail(), "CUSTOMER", customer.getCustomerId());
        return AuthResponseDTO.success(token, "CUSTOMER", customer.getCustomerId(),
                customer.getFirstName() + " " + customer.getLastName(), customer.getEmail());
    }

    // ── Forgot Password (OTP based) ───────────────────────────
    @Override
    @Transactional
    public void sendForgotPasswordOtp(String identifier) {
        Customer customer = customerRepository.findByEmailOrMobile(identifier)
                .orElseThrow(() -> new CustomerNotFoundException("No account found with: " + identifier));

        otpService.generateAndSendOtp(customer.getEmail(), OtpVerification.OtpPurpose.FORGOT_PASSWORD);
    }

    @Override
    @Transactional
    public void verifyForgotPasswordOtp(String identifier, String otp) {
        Customer customer = customerRepository.findByEmailOrMobile(identifier)
                .orElseThrow(() -> new CustomerNotFoundException("No account found with: " + identifier));

        otpService.verifyOtp(customer.getEmail(), otp, OtpVerification.OtpPurpose.FORGOT_PASSWORD);
    }

    @Override
    @Transactional
    public void resetPassword(String identifier, String otp, String newPassword) {
        Customer customer = customerRepository.findByEmailOrMobile(identifier)
                .orElseThrow(() -> new CustomerNotFoundException("No account found with: " + identifier));

        // verifyForgotPasswordOtp() must have been called first and marked the OTP as verified.
        if (!otpService.isRecentlyVerified(customer.getEmail(), OtpVerification.OtpPurpose.FORGOT_PASSWORD)) {
            throw new InvalidOtpException("OTP not verified. Please verify the OTP before resetting your password.");
        }

        if (newPassword == null || newPassword.trim().length() < 6) {
            throw new InvalidOtpException("Password must be at least 6 characters long.");
        }

        customer.setPassword(passwordEncoder.encode(newPassword));
        customerRepository.save(customer);
    }

    // ── Mapper ───────────────────────────────────────────────
    private CustomerDTO mapToDTO(Customer c) {
        return CustomerDTO.builder()
                .customerId(c.getCustomerId())
                .firstName(c.getFirstName())
                .lastName(c.getLastName())
                .email(c.getEmail())
                .mobileNumber(c.getMobileNumber())
                .alternateMobile(c.getAlternateMobile())
                .dateOfBirth(c.getDateOfBirth())
                .gender(c.getGender())
                .address(c.getAddress())
                .city(c.getCity())
                .state(c.getState())
                .pincode(c.getPincode())
                .drivingLicenseNumber(c.getDrivingLicenseNumber())
                .drivingLicenseExpiry(c.getDrivingLicenseExpiry())
                .aadharNumber(c.getAadharNumber())
                .profileImageUrl(c.getProfileImageUrl())
                .drivingLicenseImageUrl(c.getDrivingLicenseImageUrl())
                .aadharImageUrl(c.getAadharImageUrl())
                .trustScore(c.getTrustScore())
                .referralCode(c.getReferralCode())
                .walletBalance(c.getWalletBalance())
                .accountStatus(c.getAccountStatus())
                .role(c.getRole())
                .build();
    }
}
