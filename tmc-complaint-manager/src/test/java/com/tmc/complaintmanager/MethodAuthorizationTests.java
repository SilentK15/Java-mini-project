package com.tmc.complaintmanager;

import com.tmc.complaintmanager.controller.AdminComplaintExportController;
import com.tmc.complaintmanager.controller.AdminAnalyticsController;
import com.tmc.complaintmanager.controller.ComplaintDuplicateController;
import com.tmc.complaintmanager.controller.ComplaintInternalNoteController;
import com.tmc.complaintmanager.repository.AdminAuditLogRepository;
import com.tmc.complaintmanager.repository.ComplaintInternalNoteRepository;
import com.tmc.complaintmanager.repository.ComplaintRepository;
import com.tmc.complaintmanager.service.ComplaintDuplicateDetectionService;
import com.tmc.complaintmanager.service.ComplaintService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.context.annotation.AnnotationConfigApplicationContext;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class MethodAuthorizationTests {
    @AfterEach
    void clearSecurityContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void springMethodSecurityDeniesStaffFromCitizenOnlyDuplicateEndpoint() {
        try (AnnotationConfigApplicationContext context = new AnnotationConfigApplicationContext(TestConfig.class)) {
            ComplaintDuplicateController controller = context.getBean(ComplaintDuplicateController.class);
            ComplaintDuplicateDetectionService service = context.getBean(ComplaintDuplicateDetectionService.class);
            var request = new ComplaintDuplicateController.DuplicateCheckRequest(
                    "Road damage", "A damaged road near the park", "ROAD", "Town Hall", null, null);
            authenticateAs("STAFF");

            assertThrows(AccessDeniedException.class, () -> controller.possibleDuplicates(request));
            verifyNoInteractions(service);
        }
    }

    @Test
    void springMethodSecurityAllowsCitizenDuplicateCheckButDeniesStaffAdminExport() {
        try (AnnotationConfigApplicationContext context = new AnnotationConfigApplicationContext(TestConfig.class)) {
            ComplaintDuplicateController duplicateController = context.getBean(ComplaintDuplicateController.class);
            ComplaintDuplicateDetectionService duplicateService = context.getBean(ComplaintDuplicateDetectionService.class);
            var request = new ComplaintDuplicateController.DuplicateCheckRequest(
                    "Road damage", "A damaged road near the park", "ROAD", "Town Hall", null, null);
            authenticateAs("CITIZEN");

            assertFalse(duplicateController.possibleDuplicates(request).possibleMatch());
            verify(duplicateService).findPossibleDuplicates(any());

            AdminComplaintExportController exportController = context.getBean(AdminComplaintExportController.class);
            AdminAuditLogRepository audits = context.getBean(AdminAuditLogRepository.class);
            authenticateAs("STAFF");
            assertThrows(AccessDeniedException.class,
                    () -> exportController.export(null, null, null, null, null, "NEWEST"));
            verifyNoInteractions(audits);
        }
    }

    @Test
    void springMethodSecurityDeniesCitizenFromStaffOnlyInternalNotes() {
        try (AnnotationConfigApplicationContext context = new AnnotationConfigApplicationContext(TestConfig.class)) {
            ComplaintInternalNoteController notesController = context.getBean(ComplaintInternalNoteController.class);
            ComplaintInternalNoteRepository notes = context.getBean(ComplaintInternalNoteRepository.class);
            ComplaintRepository complaints = context.getBean(ComplaintRepository.class);
            authenticateAs("CITIZEN");

            assertThrows(AccessDeniedException.class, () -> notesController.list(1L, null));
            verifyNoInteractions(notes, complaints);
        }
    }

    @Test
    void springMethodSecurityDeniesStaffFromAdminAnalytics() {
        try (AnnotationConfigApplicationContext context = new AnnotationConfigApplicationContext(TestConfig.class)) {
            AdminAnalyticsController analytics = context.getBean(AdminAnalyticsController.class);
            ComplaintRepository complaints = context.getBean(ComplaintRepository.class);
            authenticateAs("STAFF");

            assertThrows(AccessDeniedException.class, analytics::departments);
            verifyNoInteractions(complaints);
        }
    }

    private void authenticateAs(String role) {
        SecurityContextHolder.clearContext();
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(
                "test-user", null, List.of(new SimpleGrantedAuthority("ROLE_" + role))));
    }

    @Configuration(proxyBeanMethods = false)
    @EnableMethodSecurity
    static class TestConfig {
        @Bean ComplaintDuplicateDetectionService duplicateService() {
            return mock(ComplaintDuplicateDetectionService.class);
        }
        @Bean ComplaintDuplicateController duplicateController(ComplaintDuplicateDetectionService service) {
            return new ComplaintDuplicateController(service);
        }
        @Bean ComplaintService complaintService() { return mock(ComplaintService.class); }
        @Bean AdminAuditLogRepository auditLogs() { return mock(AdminAuditLogRepository.class); }
        @Bean ComplaintRepository complaints() { return mock(ComplaintRepository.class); }
        @Bean ComplaintInternalNoteRepository notes() { return mock(ComplaintInternalNoteRepository.class); }
        @Bean AdminComplaintExportController exportController(ComplaintService service, AdminAuditLogRepository audits) {
            return new AdminComplaintExportController(service, audits);
        }
        @Bean ComplaintInternalNoteController internalNoteController(ComplaintRepository complaints,
                ComplaintInternalNoteRepository notes) {
            return new ComplaintInternalNoteController(complaints, notes);
        }
        @Bean AdminAnalyticsController analyticsController(ComplaintRepository complaints) {
            return new AdminAnalyticsController(complaints);
        }
    }
}
