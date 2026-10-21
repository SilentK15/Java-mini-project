package com.tmc.complaintmanager;

import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import org.springframework.core.io.Resource;
import org.springframework.core.io.support.PathMatchingResourcePatternResolver;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import static org.junit.jupiter.api.Assertions.*;

class FlywayMigrationValidationTests {

    private static final Pattern MIGRATION_PATTERN = Pattern.compile("^V(\\d+)__([a-zA-Z0-9_]+)\\.sql$");

    @Test
    void allFlywayMigrationsArePresentAndProperlyNumbered() throws IOException {
        PathMatchingResourcePatternResolver resolver = new PathMatchingResourcePatternResolver();
        Resource[] resources = resolver.getResources("classpath:db/migration/V*.sql");

        assertTrue(resources.length >= 13, "Expected at least 13 migration scripts (V2 to V14)");

        Set<Integer> versions = new TreeSet<>();
        for (Resource resource : resources) {
            String filename = resource.getFilename();
            assertNotNull(filename);
            Matcher matcher = MIGRATION_PATTERN.matcher(filename);
            assertTrue(matcher.matches(), "Migration file " + filename + " does not match V<N>__<description>.sql format");

            int version = Integer.parseInt(matcher.group(1));
            assertFalse(versions.contains(version), "Duplicate Flyway migration version detected: " + version);
            versions.add(version);

            // Assert file is not empty
            String content = new String(resource.getInputStream().readAllBytes(), StandardCharsets.UTF_8);
            assertFalse(content.trim().isEmpty(), "Migration file " + filename + " must not be empty");
        }

        // Verify versions V2 through V14 are contiguous
        for (int v = 2; v <= 14; v++) {
            assertTrue(versions.contains(v), "Missing expected Flyway migration version V" + v);
        }
    }

    @Test
    void flywayCanParseAllMigrationsWithoutErrors() {
        assertDoesNotThrow(() -> {
            Flyway flyway = Flyway.configure()
                    .dataSource("jdbc:h2:mem:flyway-validation;MODE=MySQL;DB_CLOSE_DELAY=-1", "sa", "")
                    .locations("classpath:db/migration")
                    .baselineOnMigrate(true)
                    .load();

            // Validate that Flyway can successfully discover and resolve all migrations
            var info = flyway.info();
            assertNotNull(info);
            assertTrue(info.all().length >= 13);
        });
    }
}
