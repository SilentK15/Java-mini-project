package com.tmc.complaintmanager.config;

import com.tmc.complaintmanager.entity.AppUser;
import com.tmc.complaintmanager.entity.Department;
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
public class StaffAccountInitializer {
    @Bean
    CommandLineRunner createConfiguredStaff(AppUserRepository users, PasswordEncoder encoder,
            @Value("${app.staff.name:CivicConnect Staff}") String name,
            @Value("${app.staff.email:}") String email,
            @Value("${app.staff.password:}") String password,
            @Value("${app.staff.department:}") String department) {
        return args -> {
            if (email.isBlank() || password.isBlank() || department.isBlank()) return;
            if (!PasswordPolicy.fitsBcrypt(password)) {
                throw new IllegalStateException("APP_STAFF_PASSWORD must use 72 UTF-8 bytes or fewer");
            }
            if (users.existsByEmailIgnoreCase(email)) return;
            Department assignedDepartment;
            try {
                assignedDepartment = Department.valueOf(department.trim().toUpperCase(Locale.ROOT));
            } catch (IllegalArgumentException exception) {
                throw new IllegalStateException("APP_STAFF_DEPARTMENT must be one of: PUBLIC_WORKS, SOLID_WASTE, WATER, SEWERAGE, STREET_LIGHTING, OTHER");
            }
            users.save(new AppUser(name.trim(), email.trim().toLowerCase(Locale.ROOT), encoder.encode(password), UserRole.STAFF, assignedDepartment));
        };
    }
}
