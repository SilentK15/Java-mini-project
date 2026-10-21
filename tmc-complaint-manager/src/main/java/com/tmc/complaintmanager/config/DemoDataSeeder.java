package com.tmc.complaintmanager.config;

import com.tmc.complaintmanager.entity.AppUser;
import com.tmc.complaintmanager.entity.Complaint;
import com.tmc.complaintmanager.entity.Department;
import com.tmc.complaintmanager.entity.UserRole;
import com.tmc.complaintmanager.repository.AppUserRepository;
import com.tmc.complaintmanager.repository.ComplaintRepository;
import com.tmc.complaintmanager.service.ComplaintNumberGenerator;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Demo data seeder — active ONLY under the {@code demo} Spring profile.
 *
 * <p>Creates demo citizen/staff accounts and a small set of sample complaints
 * to allow quick exploration of the CivicConnect UI without a live database.
 * All accounts use the password {@code DemoCivic2026!}.
 *
 * <p>Run the application with {@code --spring.profiles.active=demo} or set
 * the environment variable {@code SPRING_PROFILES_ACTIVE=demo} to activate.
 */
@Configuration
@Profile("demo")
public class DemoDataSeeder {

    private static final Logger log = LoggerFactory.getLogger(DemoDataSeeder.class);
    private static final String DEMO_PASSWORD = "DemoCivic2026!"; // Meets policy: 14 chars, mixed case, digit, symbol

    @Bean
    CommandLineRunner seedDemoData(
            AppUserRepository users,
            ComplaintRepository complaints,
            ComplaintNumberGenerator numberGenerator,
            PasswordEncoder encoder
    ) {
        return args -> {
            if (complaints.count() > 0) {
                log.info("[DEMO] Demo data already present — skipping seeder");
                return;
            }

            log.info("[DEMO] Seeding demo accounts and complaints …");
            String hash = encoder.encode(DEMO_PASSWORD);

            // ── Demo citizens ────────────────────────────────────────────────────
            AppUser citizen1 = ensureUser(users, "Priya Sharma",  "citizen1@demo.tmc",  hash, UserRole.CITIZEN, null);
            AppUser citizen2 = ensureUser(users, "Rahul Mehta",   "citizen2@demo.tmc",  hash, UserRole.CITIZEN, null);

            // ── Demo staff ───────────────────────────────────────────────────────
            ensureUser(users, "Inspector Patil", "staff1@demo.tmc",  hash, UserRole.STAFF,   Department.PUBLIC_WORKS);
            ensureUser(users,              "Officer Desai",          "staff2@demo.tmc",  hash, UserRole.STAFF,   Department.SOLID_WASTE);
            ensureUser(users,              "Demo Admin",             "admin@demo.tmc",   hash, UserRole.ADMIN,   null);

            // ── Demo complaints ──────────────────────────────────────────────────
            LocalDateTime now = LocalDateTime.now();

            seedComplaint(complaints, numberGenerator,
                    citizen1.getEmail(), "Pothole on Ghodbunder Road",
                    "Large pothole near Hiranandani junction causing traffic and accidents.",
                    "ROAD", "Ghodbunder Road, Thane West", "HIGH",
                    "SUBMITTED", Department.PUBLIC_WORKS,
                    19.2403, 72.9781, now.minusDays(3));

            seedComplaint(complaints, numberGenerator,
                    citizen1.getEmail(), "Overflowing garbage bin near Majiwada",
                    "The bin outside Majiwada bus stop has not been cleared for 5 days.",
                    "GARBAGE", "Majiwada, Thane", "MEDIUM",
                    "IN_PROGRESS", Department.SOLID_WASTE,
                    19.2093, 72.9781, now.minusDays(7));

            seedComplaint(complaints, numberGenerator,
                    citizen2.getEmail(), "Street light not working on LBS Marg",
                    "Three consecutive street lights near Kopri Bridge are non-functional since a week.",
                    "STREET_LIGHT", "LBS Marg, Thane East", "MEDIUM",
                    "ASSIGNED", Department.STREET_LIGHTING,
                    19.1946, 72.9757, now.minusDays(5));

            seedComplaint(complaints, numberGenerator,
                    citizen2.getEmail(), "Water pipeline leakage near Naupada",
                    "Underground water pipeline has been leaking for 3 days causing road damage.",
                    "WATER", "Naupada, Thane", "HIGH",
                    "RESOLVED", Department.WATER,
                    19.2018, 72.9706, now.minusDays(14));

            seedComplaint(complaints, numberGenerator,
                    citizen1.getEmail(), "Blocked storm drain on Station Road",
                    "Storm drain choked with debris near the railway station entrance.",
                    "DRAINAGE", "Station Road, Thane", "LOW",
                    "SUBMITTED", Department.SEWERAGE,
                    19.1972, 72.9668, now.minusDays(1));

            log.info("[DEMO] Demo seeding complete — login with any *@demo.tmc account, password: {}", DEMO_PASSWORD);
        };
    }

    private AppUser ensureUser(AppUserRepository repo, String name, String email,
                                String hash, UserRole role, Department dept) {
        return repo.findByEmailIgnoreCase(email).orElseGet(() -> {
            AppUser u = new AppUser(name, email, hash, role, dept);
            return repo.save(u);
        });
    }

    private void seedComplaint(
            ComplaintRepository repo,
            ComplaintNumberGenerator gen,
            String submittedBy,
            String title, String description,
            String category, String location, String priority,
            String status, Department department,
            double lat, double lng,
            LocalDateTime createdAt
    ) {
        String number = gen.nextComplaintNumber();
        Complaint c = Complaint.builder()
                .complaintNumber(number)
                .submittedBy(submittedBy)
                .title(title)
                .description(description)
                .category(category)
                .location(location)
                .priority(priority)
                .status(status)
                .department(department)
                .latitude(lat)
                .longitude(lng)
                .createdAt(createdAt)
                .statusChangedAt(createdAt)
                .build();
        repo.save(c);
        log.debug("[DEMO] Seeded complaint {} - {}", number, title);
    }
}
