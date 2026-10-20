package com.tmc.complaintmanager.config;

import com.tmc.complaintmanager.entity.AppUser;
import com.tmc.complaintmanager.entity.Department;
import com.tmc.complaintmanager.entity.UserRole;
import com.tmc.complaintmanager.repository.AppUserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class StaffAccountInitializerTests {
    @Test
    void blankOptionalSettingsDoNotCreateAnAccount() throws Exception {
        AppUserRepository users = mock(AppUserRepository.class);
        PasswordEncoder encoder = mock(PasswordEncoder.class);
        CommandLineRunner initializer = new StaffAccountInitializer().createConfiguredStaff(
                users, encoder, "CivicConnect Staff", "", "", "");

        initializer.run();

        verifyNoInteractions(users, encoder);
    }

    @Test
    void createsConfiguredStaffWithHashedPasswordAndDepartment() throws Exception {
        AppUserRepository users = mock(AppUserRepository.class);
        PasswordEncoder encoder = mock(PasswordEncoder.class);
        when(users.existsByEmailIgnoreCase("officer@example.test")).thenReturn(false);
        when(encoder.encode("LongPassword123")).thenReturn("hashed-password");
        when(users.save(any(AppUser.class))).thenAnswer(invocation -> invocation.getArgument(0));
        CommandLineRunner initializer = new StaffAccountInitializer().createConfiguredStaff(
                users, encoder, " Roads Officer ", "OFFICER@EXAMPLE.TEST", "LongPassword123", "public_works");

        initializer.run();

        verify(users).save(argThat(user -> user.getName().equals("Roads Officer")
                && user.getEmail().equals("officer@example.test")
                && user.getPassword().equals("hashed-password")
                && user.getRole() == UserRole.STAFF
                && user.getDepartment() == Department.PUBLIC_WORKS));
    }

    @Test
    void doesNotOverwriteAnExistingAccount() throws Exception {
        AppUserRepository users = mock(AppUserRepository.class);
        PasswordEncoder encoder = mock(PasswordEncoder.class);
        when(users.existsByEmailIgnoreCase("officer@example.test")).thenReturn(true);
        CommandLineRunner initializer = new StaffAccountInitializer().createConfiguredStaff(
                users, encoder, "Roads Officer", "officer@example.test", "LongPassword123", "PUBLIC_WORKS");

        initializer.run();

        verify(users, never()).save(any());
        verifyNoInteractions(encoder);
    }

    @Test
    void rejectsBootstrapPasswordsOverTheBcryptUtf8ByteLimit() {
        AppUserRepository users = mock(AppUserRepository.class);
        PasswordEncoder encoder = mock(PasswordEncoder.class);
        CommandLineRunner initializer = new StaffAccountInitializer().createConfiguredStaff(
                users, encoder, "Roads Officer", "officer@example.test", "é".repeat(37), "PUBLIC_WORKS");

        IllegalStateException exception = assertThrows(IllegalStateException.class, () -> initializer.run());

        assertTrue(exception.getMessage().contains("72 UTF-8 bytes"));
        verifyNoInteractions(users, encoder);
    }
}
