package com.tmc.complaintmanager;

import com.tmc.complaintmanager.controller.AdminComplaintExportController;
import com.tmc.complaintmanager.entity.AppUser;
import com.tmc.complaintmanager.entity.Complaint;
import com.tmc.complaintmanager.entity.Department;
import com.tmc.complaintmanager.entity.UserRole;
import com.tmc.complaintmanager.repository.AdminAuditLogRepository;
import com.tmc.complaintmanager.service.ComplaintService;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.PageImpl;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.servlet.mvc.method.annotation.StreamingResponseBody;

import java.io.ByteArrayOutputStream;
import java.time.LocalDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class AdminComplaintExportControllerTests {
    @Test
    void rejectsOversizedExportSearchBeforeLoggingOrQuerying() {
        ComplaintService complaints = mock(ComplaintService.class);
        AdminAuditLogRepository auditLogs = mock(AdminAuditLogRepository.class);
        AppUser admin = new AppUser("Admin", "admin@example.test", "hash", UserRole.ADMIN);

        ResponseStatusException exception = assertThrows(ResponseStatusException.class,
                () -> new AdminComplaintExportController(complaints, auditLogs).export(admin,
                        "x".repeat(151), null, null, null, "NEWEST"));

        assertEquals(400, exception.getStatusCode().value());
        verifyNoInteractions(complaints, auditLogs);
    }

    @Test
    void streamsFilteredRowsAndEscapesSpreadsheetFormulas() throws Exception {
        ComplaintService complaints = mock(ComplaintService.class);
        AdminAuditLogRepository auditLogs = mock(AdminAuditLogRepository.class);
        Complaint complaint = new Complaint();
        complaint.setComplaintNumber("TMC-123");
        complaint.setTitle("=HYPERLINK(\"https://example.test\")");
        complaint.setDescription("Road repair requested");
        complaint.setCategory("ROAD");
        complaint.setLocation("Ghodbunder Road");
        complaint.setPriority("HIGH");
        complaint.setStatus("SUBMITTED");
        complaint.setDepartment(Department.PUBLIC_WORKS);
        complaint.setLatitude(19.2);
        complaint.setLongitude(72.9);
        complaint.setCreatedAt(LocalDateTime.of(2026, 10, 9, 10, 30));
        when(complaints.search(any(), eq(0), eq(200), eq("pothole"), eq("SUBMITTED"), eq("ROAD"), eq("HIGH"), eq("TITLE")))
                .thenReturn(new PageImpl<>(List.of(complaint)));
        AppUser admin = new AppUser("Admin", "admin@example.test", "hash", UserRole.ADMIN);

        var response = new AdminComplaintExportController(complaints, auditLogs).export(admin,
                "pothole", "SUBMITTED", "ROAD", "HIGH", "TITLE");
        ByteArrayOutputStream output = new ByteArrayOutputStream();
        ((StreamingResponseBody) response.getBody()).writeTo(output);
        String csv = output.toString(java.nio.charset.StandardCharsets.UTF_8);

        assertEquals(200, response.getStatusCode().value());
        assertEquals("no-store", response.getHeaders().getCacheControl());
        assertTrue(csv.startsWith("\uFEFF\"Reference\""));
        assertTrue(csv.contains("\"'=HYPERLINK("));
        assertTrue(csv.contains("\"PUBLIC_WORKS\""));
        assertFalse(csv.contains("admin@example.test"));
        assertEquals("hasRole('ADMIN')", AdminComplaintExportController.class.getAnnotation(PreAuthorize.class).value());
        verify(complaints).search(admin, 0, 200, "pothole", "SUBMITTED", "ROAD", "HIGH", "TITLE");
        verify(auditLogs).save(argThat(log -> log.getAction().equals("COMPLAINTS_EXPORTED")
                && log.getActorEmail().equals("admin@example.test")));
    }

}
