package com.tmc.complaintmanager;

import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.util.Properties;

import static org.junit.jupiter.api.Assertions.assertEquals;

class DatabaseConfigurationTests {
    @Test
    void configRequiresDatabaseCredentialsAndKeepsNotificationsDisabledByDefault() throws IOException {
        Properties properties = new Properties();
        try (var source = getClass().getClassLoader().getResourceAsStream("application.properties")) {
            if (source == null) throw new IOException("application.properties is missing");
            properties.load(source);
        }

        assertEquals("${DB_USERNAME}", properties.getProperty("spring.datasource.username"));
        assertEquals("${DB_PASSWORD}", properties.getProperty("spring.datasource.password"));
        assertEquals("${NOTIFICATIONS_ENABLED:false}", properties.getProperty("app.notifications.enabled"));
    }
}
