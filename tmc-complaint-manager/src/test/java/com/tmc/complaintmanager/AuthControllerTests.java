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
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.context.SecurityContextRepository;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import java.util.Locale;

class AuthControllerTests {
    @AfterEach
    void clearSecurityContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void updatesOnlyTheAuthenticatedUsersDisplayNameAndRefreshesSessionPrincipal() {
        AppUserRepository users = mock(AppUserRepository.class);
        SecurityContextRepository contexts = mock(SecurityContextRepository.class);
        AppUser user = new AppUser("Original Name", "citizen@example.test", "encoded-password", UserRole.CITIZEN);
        when(users.save(any(AppUser.class))).thenAnswer(invocation -> invocation.getArgument(0));
        AuthController controller = new AuthController(users, mock(PasswordEncoder.class),
                mock(AuthenticationManager.class), contexts);

        AuthController.AuthResponse response = controller.updateProfile(
                new AuthController.ProfileRequest("  Updated Name  "), user,
                mock(HttpServletRequest.class), mock(HttpServletResponse.class));

        assertEquals("Updated Name", response.name());
        assertEquals("citizen@example.test", response.email());
        assertEquals(UserRole.CITIZEN, response.role());
        assertEquals(user, SecurityContextHolder.getContext().getAuthentication().getPrincipal());
        verify(users).save(user);
        verify(contexts).saveContext(any(), any(), any());
    }

    @Test
    void registrationEmailNormalizationDoesNotDependOnTheDefaultLocale() {
        Locale originalLocale = Locale.getDefault();
        try {
            Locale.setDefault(Locale.forLanguageTag("tr-TR"));
            AppUserRepository users = mock(AppUserRepository.class);
            PasswordEncoder encoder = mock(PasswordEncoder.class);
            AuthenticationManager authenticationManager = mock(AuthenticationManager.class);
            SecurityContextRepository contexts = mock(SecurityContextRepository.class);
            AppUser citizen = new AppUser("Citizen", "info@example.test", "encoded", UserRole.CITIZEN);
            when(users.existsByEmailIgnoreCase("info@example.test")).thenReturn(false);
            when(users.save(any(AppUser.class))).thenAnswer(invocation -> invocation.getArgument(0));
            when(encoder.encode("LongPassword123")).thenReturn("encoded");
            Authentication authentication = mock(Authentication.class);
            when(authentication.getPrincipal()).thenReturn(citizen);
            when(authenticationManager.authenticate(any())).thenReturn(authentication);

            AuthController controller = new AuthController(users, encoder, authenticationManager, contexts);
            AuthController.AuthResponse response = controller.register(
                    new AuthController.RegisterRequest("Citizen", "INFO@example.test", "LongPassword123"),
                    mock(HttpServletRequest.class), mock(HttpServletResponse.class));

            assertEquals("info@example.test", response.email());
            verify(users).existsByEmailIgnoreCase("info@example.test");
        } finally {
            Locale.setDefault(originalLocale);
        }
    }

    @Test
    void registrationRejectsPasswordsOverTheBcryptUtf8ByteLimitBeforeDatabaseAccess() {
        AppUserRepository users = mock(AppUserRepository.class);
        PasswordEncoder encoder = mock(PasswordEncoder.class);
        AuthController controller = new AuthController(users, encoder, mock(AuthenticationManager.class),
                mock(SecurityContextRepository.class));

        var exception = assertThrows(org.springframework.web.server.ResponseStatusException.class,
                () -> controller.register(new AuthController.RegisterRequest(
                        "Citizen", "citizen@example.test", "é".repeat(37)),
                        mock(HttpServletRequest.class), mock(HttpServletResponse.class)));

        assertEquals(400, exception.getStatusCode().value());
        verifyNoInteractions(users, encoder);
    }

    @Test
    void concurrentDuplicateRegistrationReturnsConflictInsteadOfServerError() {
        AppUserRepository users = mock(AppUserRepository.class);
        AuthenticationManager authenticationManager = mock(AuthenticationManager.class);
        when(users.existsByEmailIgnoreCase("citizen@example.test")).thenReturn(false, true);
        when(users.save(any(AppUser.class))).thenThrow(new org.springframework.dao.DataIntegrityViolationException("duplicate"));
        AuthController controller = new AuthController(users, mock(PasswordEncoder.class), authenticationManager,
                mock(SecurityContextRepository.class));

        var exception = assertThrows(org.springframework.web.server.ResponseStatusException.class,
                () -> controller.register(new AuthController.RegisterRequest(
                        "Citizen", "citizen@example.test", "LongPassword123"),
                        mock(HttpServletRequest.class), mock(HttpServletResponse.class)));

        assertEquals(409, exception.getStatusCode().value());
        verifyNoInteractions(authenticationManager);
    }
}
