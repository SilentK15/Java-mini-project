package com.tmc.complaintmanager.config;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;

import static org.junit.jupiter.api.Assertions.*;

class SecurityConfigTests {
    @Test
    void corsAllowsTheIdempotencyHeaderUsedByComplaintSubmission() {
        CorsConfigurationSource source = new SecurityConfig()
                .corsConfigurationSource("http://localhost:5173,http://localhost:3000");
        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/complaints");
        request.addHeader("Origin", "http://localhost:5173");

        CorsConfiguration configuration = source.getCorsConfiguration(request);

        assertNotNull(configuration);
        assertTrue(configuration.getAllowedHeaders().contains("Idempotency-Key"));
        assertTrue(configuration.getAllowedHeaders().contains("X-XSRF-TOKEN"));
        assertTrue(configuration.getAllowCredentials());
        assertTrue(configuration.getAllowedOrigins().contains("http://localhost:5173"));
    }
}
