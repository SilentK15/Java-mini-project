package com.tmc.complaintmanager.security;

import org.junit.jupiter.api.Test;

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
}
