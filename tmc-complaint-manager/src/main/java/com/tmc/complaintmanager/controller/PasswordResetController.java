package com.tmc.complaintmanager.controller;

import com.tmc.complaintmanager.service.PasswordResetService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * Password-reset endpoints.
 *
 * <pre>
 *   POST /api/auth/forgot-password   { email }
 *   POST /api/auth/reset-password    { token, newPassword }
 * </pre>
 *
 * Both endpoints always return 200 regardless of whether the email exists
 * (to prevent user enumeration).
 */
@RestController
@RequestMapping("/api/auth")
public class PasswordResetController {

    private final PasswordResetService resetService;

    public PasswordResetController(PasswordResetService resetService) {
        this.resetService = resetService;
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<MessageResponse> forgotPassword(
            @Valid @RequestBody ForgotPasswordRequest req,
            @RequestHeader(value = "X-Reset-Base-Url",
                           defaultValue = "http://localhost:5173/reset-password") String resetBaseUrl
    ) {
        resetService.requestReset(req.email(), resetBaseUrl);
        return ResponseEntity.ok(new MessageResponse(
                "If an account with that email exists, a reset link has been sent."));
    }

    @PostMapping("/reset-password")
    public ResponseEntity<MessageResponse> resetPassword(
            @Valid @RequestBody ResetPasswordRequest req
    ) {
        try {
            resetService.resetPassword(req.token(), req.newPassword());
            return ResponseEntity.ok(new MessageResponse("Password updated successfully. Please sign in."));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest()
                    .body(new MessageResponse(ex.getMessage()));
        }
    }

    // ── Request / response records ──────────────────────────────────────────

    public record ForgotPasswordRequest(
            @NotBlank @Email String email
    ) {}

    public record ResetPasswordRequest(
            @NotBlank @Size(min = 64, max = 64) String token,
            @NotBlank @Size(min = 10, max = 128) String newPassword
    ) {}

    public record MessageResponse(String message) {}
}
