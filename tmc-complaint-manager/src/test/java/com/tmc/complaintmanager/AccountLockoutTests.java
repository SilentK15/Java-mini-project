package com.tmc.complaintmanager;

import com.tmc.complaintmanager.controller.AuthController;
import com.tmc.complaintmanager.entity.AppUser;
import com.tmc.complaintmanager.entity.UserRole;
import com.tmc.complaintmanager.repository.AppUserRepository;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class AccountLockoutTests {

    @AfterEach
    void clearSecurity() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void locksAccountFor15MinutesAfter5FailedLoginsAndReturns423OnNextAttempt() {
        AppUserRepository users = mock(AppUserRepository.class);
        AuthenticationManager authManager = mock(AuthenticationManager.class);
        PasswordEncoder encoder = mock(PasswordEncoder.class);
        SecurityContextRepository contexts = mock(SecurityContextRepository.class);

        AppUser user = new AppUser("Citizen User", "target@example.test", "hash", UserRole.CITIZEN);
        when(users.findByEmailIgnoreCase("target@example.test")).thenReturn(Optional.of(user));
        when(users.save(any(AppUser.class))).thenAnswer(inv -> inv.getArgument(0));
        when(authManager.authenticate(any())).thenThrow(new BadCredentialsException("Bad credentials"));

        AuthController controller = new AuthController(users, encoder, authManager, contexts);
        HttpServletRequest request = mock(HttpServletRequest.class);
        HttpServletResponse response = mock(HttpServletResponse.class);

        // Attempts 1 to 5: all return 401 with generic "Email or password is incorrect"
        for (int i = 1; i <= 5; i++) {
            ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                    () -> controller.login(new AuthController.LoginRequest("target@example.test", "WrongPassword123"), request, response));
            assertEquals(401, ex.getStatusCode().value());
            assertEquals("Email or password is incorrect", ex.getReason());
            assertEquals(i, user.getFailedAttempts());
        }

        // On attempt 5, account is locked for 15 minutes
        assertNotNull(user.getLockedUntil());
        assertTrue(user.getLockedUntil().isAfter(LocalDateTime.now().plusMinutes(14)));

        // Attempt 6: Locked account returns 423 Locked with generic message
        ResponseStatusException lockedEx = assertThrows(ResponseStatusException.class,
                () -> controller.login(new AuthController.LoginRequest("target@example.test", "AnyPassword123"), request, response));
        assertEquals(423, lockedEx.getStatusCode().value());
        assertTrue(lockedEx.getReason().contains("locked"));

        // Non-existent user also returns 401 without leaking existence
        when(users.findByEmailIgnoreCase("nonexistent@example.test")).thenReturn(Optional.empty());
        ResponseStatusException nonexistentEx = assertThrows(ResponseStatusException.class,
                () -> controller.login(new AuthController.LoginRequest("nonexistent@example.test", "AnyPassword123"), request, response));
        assertEquals(401, nonexistentEx.getStatusCode().value());
        assertEquals("Email or password is incorrect", nonexistentEx.getReason());
    }

    @Test
    void resetsFailedAttemptsCounterOnSuccessfulLogin() {
        AppUserRepository users = mock(AppUserRepository.class);
        AuthenticationManager authManager = mock(AuthenticationManager.class);
        PasswordEncoder encoder = mock(PasswordEncoder.class);
        SecurityContextRepository contexts = mock(SecurityContextRepository.class);

        AppUser user = new AppUser("Citizen User", "target@example.test", "hash", UserRole.CITIZEN);
        user.setFailedAttempts(3);
        when(users.findByEmailIgnoreCase("target@example.test")).thenReturn(Optional.of(user));
        when(users.save(any(AppUser.class))).thenAnswer(inv -> inv.getArgument(0));

        Authentication successfulAuth = mock(Authentication.class);
        when(successfulAuth.getPrincipal()).thenReturn(user);
        when(authManager.authenticate(any())).thenReturn(successfulAuth);

        AuthController controller = new AuthController(users, encoder, authManager, contexts);
        HttpServletRequest request = mock(HttpServletRequest.class);
        HttpServletResponse response = mock(HttpServletResponse.class);

        AuthController.AuthResponse authResponse = controller.login(
                new AuthController.LoginRequest("target@example.test", "CorrectPassword123!"), request, response);

        assertNotNull(authResponse);
        assertEquals(0, user.getFailedAttempts());
        assertNull(user.getLockedUntil());
    }

    @Test
    void allowsLoginWhenLockHasExpired() {
        AppUserRepository users = mock(AppUserRepository.class);
        AuthenticationManager authManager = mock(AuthenticationManager.class);
        PasswordEncoder encoder = mock(PasswordEncoder.class);
        SecurityContextRepository contexts = mock(SecurityContextRepository.class);

        AppUser user = new AppUser("Citizen User", "target@example.test", "hash", UserRole.CITIZEN);
        user.setFailedAttempts(5);
        user.setLockedUntil(LocalDateTime.now().minusMinutes(1)); // Lock expired 1 minute ago
        when(users.findByEmailIgnoreCase("target@example.test")).thenReturn(Optional.of(user));
        when(users.save(any(AppUser.class))).thenAnswer(inv -> inv.getArgument(0));

        Authentication successfulAuth = mock(Authentication.class);
        when(successfulAuth.getPrincipal()).thenReturn(user);
        when(authManager.authenticate(any())).thenReturn(successfulAuth);

        AuthController controller = new AuthController(users, encoder, authManager, contexts);
        HttpServletRequest request = mock(HttpServletRequest.class);
        HttpServletResponse response = mock(HttpServletResponse.class);

        AuthController.AuthResponse authResponse = controller.login(
                new AuthController.LoginRequest("target@example.test", "CorrectPassword123!"), request, response);

        assertNotNull(authResponse);
        assertEquals(0, user.getFailedAttempts());
        assertNull(user.getLockedUntil());
    }
}
