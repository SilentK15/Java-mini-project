package com.tmc.complaintmanager.security;

import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;

import static org.junit.jupiter.api.Assertions.*;

class PasswordPolicyTests {

    @Test
    void acceptsPasswordsAtTheBcryptUtf8ByteLimit() {
        assertTrue(PasswordPolicy.fitsBcrypt("a".repeat(72)));
        assertTrue(PasswordPolicy.fitsBcrypt("é".repeat(36)));
    }

    @Test
    void rejectsPasswordsOverTheBcryptUtf8ByteLimit() {
        assertFalse(PasswordPolicy.fitsBcrypt("a".repeat(73)));
        assertFalse(PasswordPolicy.fitsBcrypt("é".repeat(37)));
    }

    @Test
    void requiresMinimum10Characters() {
        assertFalse(PasswordPolicy.hasMinimumLength("Short123!"));
        assertTrue(PasswordPolicy.hasMinimumLength("LongEnough12!"));

        ResponseStatusException exception = assertThrows(ResponseStatusException.class,
                () -> PasswordPolicy.validate("Short123!"));
        assertEquals(400, exception.getStatusCode().value());
        assertTrue(exception.getReason().contains("10 characters"));
    }

    @Test
    void rejectsCommonlyGuessedPasswords() {
        assertTrue(PasswordPolicy.isCommon("password123"));
        assertTrue(PasswordPolicy.isCommon("Qwertyuiop"));
        assertTrue(PasswordPolicy.isCommon("Admin12345"));
        assertTrue(PasswordPolicy.isCommon("civicconnect123"));
        assertFalse(PasswordPolicy.isCommon("UniqueThaneSecure#2026"));

        ResponseStatusException exception = assertThrows(ResponseStatusException.class,
                () -> PasswordPolicy.validate("password123"));
        assertEquals(400, exception.getStatusCode().value());
        assertTrue(exception.getReason().contains("common"));
    }

    @Test
    void validatesValidStrongPasswordSuccessfully() {
        assertTrue(PasswordPolicy.isValid("StrongMunicipalPass#2026"));
        assertDoesNotThrow(() -> PasswordPolicy.validate("StrongMunicipalPass#2026"));
    }
}
