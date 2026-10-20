package com.tmc.complaintmanager.config;

import com.tmc.complaintmanager.entity.AppUser;
import com.tmc.complaintmanager.entity.UserRole;
import com.tmc.complaintmanager.security.PasswordPolicy;
import com.tmc.complaintmanager.repository.AppUserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;
import java.util.Locale;

@Configuration
public class AdminAccountInitializer {
    @Bean CommandLineRunner createConfiguredAdmin(AppUserRepository users, PasswordEncoder encoder,
            @Value("${app.admin.email:}") String email, @Value("${app.admin.password:}") String password) {
        return args -> {
            if (email.isBlank() || password.isBlank()) return;
            if (!PasswordPolicy.fitsBcrypt(password)) {
                throw new IllegalStateException("APP_ADMIN_PASSWORD must use 72 UTF-8 bytes or fewer");
            }
            if (users.existsByEmailIgnoreCase(email)) return;
            users.save(new AppUser("CivicConnect Administrator", email.trim().toLowerCase(Locale.ROOT), encoder.encode(password), UserRole.ADMIN));
        };
    }
}
