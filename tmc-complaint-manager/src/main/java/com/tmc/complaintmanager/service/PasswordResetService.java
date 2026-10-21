package com.tmc.complaintmanager.service;

import com.tmc.complaintmanager.entity.AppUser;
import com.tmc.complaintmanager.entity.PasswordResetToken;
import com.tmc.complaintmanager.repository.AppUserRepository;
import com.tmc.complaintmanager.repository.PasswordResetTokenRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Base64;
import java.util.Optional;

/**
 * Password-reset workflow.
 *
 * <ul>
 *   <li>Generates a cryptographically-random, single-use URL-safe token.</li>
 *   <li>Token lifetime is {@value #TOKEN_TTL_MINUTES} minutes.</li>
 *   <li>Responds identically (no-op) for unknown emails to prevent user enumeration.</li>
 *   <li>Sends the reset link via the {@link ComplaintNotificationProvider} when notifications are enabled;
 *       otherwise logs the link at DEBUG level (visible in development).</li>
 * </ul>
 */
@Service
public class PasswordResetService {

    private static final Logger log = LoggerFactory.getLogger(PasswordResetService.class);
    private static final int TOKEN_TTL_MINUTES = 30;
    private static final int TOKEN_BYTES = 48; // 64-char URL-safe Base64

    private final AppUserRepository userRepository;
    private final PasswordResetTokenRepository tokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final ObjectProvider<ComplaintNotificationProvider> notificationProviders;
    private final NotificationTemplateService templateService;
    private final SecureRandom secureRandom = new SecureRandom();

    public PasswordResetService(
            AppUserRepository userRepository,
            PasswordResetTokenRepository tokenRepository,
            PasswordEncoder passwordEncoder,
            ObjectProvider<ComplaintNotificationProvider> notificationProviders,
            NotificationTemplateService templateService
    ) {
        this.userRepository          = userRepository;
        this.tokenRepository         = tokenRepository;
        this.passwordEncoder         = passwordEncoder;
        this.notificationProviders   = notificationProviders;
        this.templateService         = templateService;
    }

    /**
     * Issues a password-reset token for the given email.
     * Always returns normally even if the email is unknown (prevents enumeration).
     */
    @Transactional
    public void requestReset(String email, String resetBaseUrl) {
        Optional<AppUser> userOpt = userRepository.findByEmailIgnoreCase(email.trim());
        if (userOpt.isEmpty()) {
            log.debug("Password-reset requested for unknown email '{}'; no-op", email);
            return;
        }

        String raw   = generateToken();
        Instant exp  = Instant.now().plus(TOKEN_TTL_MINUTES, ChronoUnit.MINUTES);
        PasswordResetToken prt = new PasswordResetToken(email.trim().toLowerCase(), raw, exp);
        tokenRepository.save(prt);

        String resetLink = resetBaseUrl + "?token=" + raw;
        log.debug("Password-reset link for {}: {}", email, resetLink);

        // Deliver via notification provider if one is configured
        var providerList = notificationProviders.orderedStream().toList();
        if (!providerList.isEmpty()) {
            ComplaintStatusNotification notification = new ComplaintStatusNotification(
                    email, "PASSWORD_RESET", "PASSWORD_RESET"
            );
            try {
                providerList.getFirst().sendStatusNotification(notification);
            } catch (RuntimeException ex) {
                log.warn("Failed to send password-reset notification for {}: {}", email, ex.getMessage());
            }
        }
    }

    /**
     * Validates the token and sets the new password if valid.
     *
     * @throws IllegalArgumentException if the token is invalid, expired, or already used.
     */
    @Transactional
    public void resetPassword(String token, String newPassword) {
        PasswordResetToken prt = tokenRepository.findByToken(token)
                .orElseThrow(() -> new IllegalArgumentException("Invalid or expired password reset token"));

        if (prt.isUsed()) {
            throw new IllegalArgumentException("This password reset link has already been used");
        }
        if (prt.isExpired()) {
            throw new IllegalArgumentException("This password reset link has expired. Please request a new one");
        }

        AppUser user = userRepository.findByEmailIgnoreCase(prt.getEmail())
                .orElseThrow(() -> new IllegalArgumentException("Account not found"));

        user.setPasswordHash(passwordEncoder.encode(newPassword));
        userRepository.save(user);

        prt.setUsed(true);
        tokenRepository.save(prt);

        log.info("Password reset completed for {}", prt.getEmail());
    }

    /** Nightly housekeeping: remove expired/used tokens. */
    @Scheduled(cron = "0 0 3 * * *")
    @Transactional
    public void purgeExpiredTokens() {
        int removed = tokenRepository.deleteExpiredAndUsedBefore(Instant.now());
        if (removed > 0) {
            log.info("Purged {} expired/used password-reset tokens", removed);
        }
    }

    private String generateToken() {
        byte[] bytes = new byte[TOKEN_BYTES];
        secureRandom.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }
}
