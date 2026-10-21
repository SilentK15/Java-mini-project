package com.tmc.complaintmanager;

import com.tmc.complaintmanager.controller.PasswordResetController;
import com.tmc.complaintmanager.entity.AppUser;
import com.tmc.complaintmanager.entity.PasswordResetToken;
import com.tmc.complaintmanager.entity.UserRole;
import com.tmc.complaintmanager.repository.AppUserRepository;
import com.tmc.complaintmanager.repository.PasswordResetTokenRepository;
import com.tmc.complaintmanager.service.ComplaintNotificationProvider;
import com.tmc.complaintmanager.service.NotificationTemplateService;
import com.tmc.complaintmanager.service.PasswordResetService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Optional;
import java.util.stream.Stream;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

class PasswordResetTests {

    private AppUserRepository userRepository;
    private PasswordResetTokenRepository tokenRepository;
    private PasswordEncoder passwordEncoder;
    private ObjectProvider<ComplaintNotificationProvider> notificationProviders;
    private NotificationTemplateService templateService;
    private PasswordResetService resetService;

    @BeforeEach
    @SuppressWarnings("unchecked")
    void setUp() {
        userRepository = mock(AppUserRepository.class);
        tokenRepository = mock(PasswordResetTokenRepository.class);
        passwordEncoder = mock(PasswordEncoder.class);
        notificationProviders = mock(ObjectProvider.class);
        templateService = mock(NotificationTemplateService.class);

        when(notificationProviders.orderedStream()).thenReturn(Stream.empty());

        resetService = new PasswordResetService(
                userRepository,
                tokenRepository,
                passwordEncoder,
                notificationProviders,
                templateService
        );
    }

    @Test
    void requestResetWithUnknownEmailIsNoOp() {
        when(userRepository.findByEmailIgnoreCase("unknown@example.com")).thenReturn(Optional.empty());

        assertDoesNotThrow(() -> resetService.requestReset("unknown@example.com", "http://localhost:5173/reset-password"));

        verify(tokenRepository, never()).save(any());
    }

    @Test
    void requestResetWithKnownEmailSavesTokenWithExpiration() {
        AppUser user = new AppUser("Test User", "citizen@example.com", "hash", UserRole.CITIZEN);
        when(userRepository.findByEmailIgnoreCase("citizen@example.com")).thenReturn(Optional.of(user));

        resetService.requestReset("  citizen@example.com  ", "http://localhost:5173/reset-password");

        ArgumentCaptor<PasswordResetToken> captor = ArgumentCaptor.forClass(PasswordResetToken.class);
        verify(tokenRepository).save(captor.capture());

        PasswordResetToken saved = captor.getValue();
        assertEquals("citizen@example.com", saved.getEmail());
        assertNotNull(saved.getToken());
        assertEquals(64, saved.getToken().length());
        assertFalse(saved.isUsed());
        assertFalse(saved.isExpired());
    }

    @Test
    void resetPasswordWithValidTokenUpdatesPasswordAndMarksTokenUsed() {
        String token = "valid-token-string-64-characters-long-1234567890123456789012345678";
        PasswordResetToken prt = new PasswordResetToken("citizen@example.com", token, Instant.now().plus(30, ChronoUnit.MINUTES));
        AppUser user = new AppUser("Test User", "citizen@example.com", "old-hash", UserRole.CITIZEN);

        when(tokenRepository.findByToken(token)).thenReturn(Optional.of(prt));
        when(userRepository.findByEmailIgnoreCase("citizen@example.com")).thenReturn(Optional.of(user));
        when(passwordEncoder.encode("NewSecurePassword123!")).thenReturn("new-encoded-hash");

        resetService.resetPassword(token, "NewSecurePassword123!");

        assertTrue(prt.isUsed());
        assertEquals("new-encoded-hash", user.getPasswordHash());
        verify(userRepository).save(user);
        verify(tokenRepository).save(prt);
    }

    @Test
    void resetPasswordWithAlreadyUsedTokenThrowsException() {
        String token = "used-token-string-64-characters-long-12345678901234567890123456789";
        PasswordResetToken prt = new PasswordResetToken("citizen@example.com", token, Instant.now().plus(30, ChronoUnit.MINUTES));
        prt.setUsed(true);

        when(tokenRepository.findByToken(token)).thenReturn(Optional.of(prt));

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> resetService.resetPassword(token, "NewPassword123!"));
        assertTrue(ex.getMessage().contains("already been used"));
    }

    @Test
    void resetPasswordWithExpiredTokenThrowsException() {
        String token = "expired-token-string-64-characters-long-12345678901234567890123456";
        PasswordResetToken prt = new PasswordResetToken("citizen@example.com", token, Instant.now().minus(5, ChronoUnit.MINUTES));

        when(tokenRepository.findByToken(token)).thenReturn(Optional.of(prt));

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> resetService.resetPassword(token, "NewPassword123!"));
        assertTrue(ex.getMessage().contains("expired"));
    }

    @Test
    void resetPasswordWithNonexistentTokenThrowsException() {
        when(tokenRepository.findByToken("non-existent-token")).thenReturn(Optional.empty());

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> resetService.resetPassword("non-existent-token", "NewPassword123!"));
        assertTrue(ex.getMessage().contains("Invalid or expired"));
    }

    @Test
    void purgeExpiredTokensDelegatesToRepository() {
        when(tokenRepository.deleteExpiredAndUsedBefore(any(Instant.class))).thenReturn(3);

        resetService.purgeExpiredTokens();

        verify(tokenRepository).deleteExpiredAndUsedBefore(any(Instant.class));
    }

    @Test
    void controllerForgotPasswordReturnsOk() {
        PasswordResetController controller = new PasswordResetController(resetService);
        ResponseEntity<PasswordResetController.MessageResponse> res = controller.forgotPassword(
                new PasswordResetController.ForgotPasswordRequest("test@example.com"),
                "http://localhost:5173/reset-password"
        );

        assertEquals(HttpStatus.OK, res.getStatusCode());
        assertNotNull(res.getBody());
        assertTrue(res.getBody().message().contains("If an account with that email exists"));
    }

    @Test
    void controllerResetPasswordReturnsBadRequestWhenServiceThrows() {
        PasswordResetService mockService = mock(PasswordResetService.class);
        doThrow(new IllegalArgumentException("Token expired")).when(mockService).resetPassword(anyString(), anyString());

        PasswordResetController controller = new PasswordResetController(mockService);
        String token64 = "a".repeat(64);
        ResponseEntity<PasswordResetController.MessageResponse> res = controller.resetPassword(
                new PasswordResetController.ResetPasswordRequest(token64, "NewValidPass123!")
        );

        assertEquals(HttpStatus.BAD_REQUEST, res.getStatusCode());
        assertEquals("Token expired", res.getBody().message());
    }
}
