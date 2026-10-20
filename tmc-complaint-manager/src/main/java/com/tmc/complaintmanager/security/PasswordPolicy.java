package com.tmc.complaintmanager.security;

import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.nio.charset.StandardCharsets;
import java.util.Locale;
import java.util.Set;

public final class PasswordPolicy {
    private static final int BCRYPT_MAX_UTF8_BYTES = 72;
    private static final int MIN_LENGTH = 10;

    private static final Set<String> COMMON_PASSWORDS = Set.of(
            "password", "password123", "password1234", "1234567890", "123456789012",
            "qwertyuiop", "administrator", "admin12345", "welcome123", "letmein123",
            "iloveyou123", "changeme123", "civicconnect", "civicconnect123"
    );

    private PasswordPolicy() {}

    public static boolean fitsBcrypt(String password) {
        return password != null && password.getBytes(StandardCharsets.UTF_8).length <= BCRYPT_MAX_UTF8_BYTES;
    }

    public static boolean hasMinimumLength(String password) {
        return password != null && password.length() >= MIN_LENGTH;
    }

    public static boolean isCommon(String password) {
        if (password == null) return false;
        String normalized = password.trim().toLowerCase(Locale.ROOT);
        return COMMON_PASSWORDS.contains(normalized);
    }

    public static boolean isValid(String password) {
        return hasMinimumLength(password) && fitsBcrypt(password) && !isCommon(password);
    }

    public static void validate(String password) {
        if (password == null || password.length() < MIN_LENGTH) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Password must be at least 10 characters long");
        }
        if (!fitsBcrypt(password)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Password must use 72 UTF-8 bytes or fewer");
        }
        if (isCommon(password)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Password is too common and easily guessed");
        }
    }
}
