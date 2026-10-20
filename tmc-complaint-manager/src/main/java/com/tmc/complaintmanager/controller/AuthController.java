package com.tmc.complaintmanager.controller;

import com.tmc.complaintmanager.entity.AppUser;
import com.tmc.complaintmanager.entity.UserRole;
import com.tmc.complaintmanager.entity.Department;
import com.tmc.complaintmanager.repository.AppUserRepository;
import com.tmc.complaintmanager.security.PasswordPolicy;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.http.HttpStatus;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.Locale;
import java.util.Optional;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
    private static final int MAX_FAILED_ATTEMPTS = 5;
    private static final int LOCKOUT_MINUTES = 15;

    private final AppUserRepository users;
    private final PasswordEncoder encoder;
    private final AuthenticationManager authenticationManager;
    private final SecurityContextRepository contextRepository;

    public AuthController(AppUserRepository users, PasswordEncoder encoder, AuthenticationManager authenticationManager,
                          SecurityContextRepository contextRepository) {
        this.users = users; this.encoder = encoder; this.authenticationManager = authenticationManager;
        this.contextRepository = contextRepository;
    }
    @GetMapping("/csrf") public Map<String, String> csrf(CsrfToken token) { return Map.of("token", token.getToken()); }
    @PostMapping("/register") @ResponseStatus(HttpStatus.CREATED)
    public AuthResponse register(@Valid @RequestBody RegisterRequest body, HttpServletRequest request, HttpServletResponse response) {
        PasswordPolicy.validate(body.password());
        String email = body.email().trim().toLowerCase(Locale.ROOT);
        if (users.existsByEmailIgnoreCase(email)) throw new ResponseStatusException(HttpStatus.CONFLICT, "An account with this email already exists");
        AppUser user;
        try {
            user = users.save(new AppUser(body.name().trim(), email, encoder.encode(body.password()), UserRole.CITIZEN));
        } catch (DataIntegrityViolationException exception) {
            if (users.existsByEmailIgnoreCase(email)) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "An account with this email already exists");
            }
            throw exception;
        }
        return authenticate(user.getEmail(), body.password(), request, response);
    }
    @PostMapping("/login")
    public AuthResponse login(@Valid @RequestBody LoginRequest body, HttpServletRequest request, HttpServletResponse response) {
        return authenticate(body.email().trim().toLowerCase(Locale.ROOT), body.password(), request, response);
    }
    @GetMapping("/me") public AuthResponse me(@AuthenticationPrincipal AppUser user) { return view(user); }
    @PutMapping("/profile")
    public AuthResponse updateProfile(@Valid @RequestBody ProfileRequest body,
                                      @AuthenticationPrincipal AppUser user,
                                      HttpServletRequest request, HttpServletResponse response) {
        user.setName(body.name().trim());
        AppUser saved = users.save(user);
        SecurityContext context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(new UsernamePasswordAuthenticationToken(saved, null, saved.getAuthorities()));
        SecurityContextHolder.setContext(context);
        contextRepository.saveContext(context, request, response);
        return view(saved);
    }
    @PostMapping("/logout") @ResponseStatus(HttpStatus.NO_CONTENT)
    public void logout(HttpServletRequest request) {
        SecurityContextHolder.clearContext();
        HttpSession session = request.getSession(false);
        if (session != null) session.invalidate();
    }
    private AuthResponse authenticate(String email, String password, HttpServletRequest request, HttpServletResponse response) {
        Optional<AppUser> userOpt = users.findByEmailIgnoreCase(email);
        if (userOpt.isPresent()) {
            AppUser existing = userOpt.get();
            if (existing.getLockedUntil() != null) {
                if (existing.getLockedUntil().isAfter(LocalDateTime.now())) {
                    throw new ResponseStatusException(HttpStatus.LOCKED, "Account is temporarily locked. Please try again later.");
                } else {
                    existing.setLockedUntil(null);
                    existing.setFailedAttempts(0);
                    users.save(existing);
                }
            }
        }

        try {
            Authentication authentication = authenticationManager.authenticate(new UsernamePasswordAuthenticationToken(email, password));
            if (userOpt.isPresent()) {
                AppUser existing = userOpt.get();
                if (existing.getFailedAttempts() > 0 || existing.getLockedUntil() != null) {
                    existing.setFailedAttempts(0);
                    existing.setLockedUntil(null);
                    users.save(existing);
                }
            }
            request.getSession(true);
            request.changeSessionId();
            SecurityContext context = SecurityContextHolder.createEmptyContext();
            context.setAuthentication(authentication);
            SecurityContextHolder.setContext(context);
            contextRepository.saveContext(context, request, response);
            return view((AppUser) authentication.getPrincipal());
        } catch (AuthenticationException exception) {
            if (userOpt.isPresent()) {
                AppUser existing = userOpt.get();
                int attempts = existing.getFailedAttempts() + 1;
                existing.setFailedAttempts(attempts);
                if (attempts >= MAX_FAILED_ATTEMPTS) {
                    existing.setLockedUntil(LocalDateTime.now().plusMinutes(LOCKOUT_MINUTES));
                }
                users.save(existing);
            }
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Email or password is incorrect");
        }
    }
    private AuthResponse view(AppUser user) { return new AuthResponse(user.getId(), user.getName(), user.getEmail(), user.getRole(), user.getDepartment()); }
    public record RegisterRequest(@NotBlank @Size(max = 100) String name,
                                  @NotBlank @Email @Size(max = 190) String email,
                                  @NotBlank @Size(min = 10, max = 72) String password) {}
    public record LoginRequest(@NotBlank @Email String email, @NotBlank String password) {}
    public record ProfileRequest(@NotBlank @Size(max = 100) String name) {}
    public record AuthResponse(Long id, String name, String email, UserRole role, Department department) {}
}
