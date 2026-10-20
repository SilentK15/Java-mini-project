package com.tmc.complaintmanager;

import com.tmc.complaintmanager.controller.PublicComplaintController;
import com.tmc.complaintmanager.entity.Complaint;
import com.tmc.complaintmanager.entity.ComplaintStatusHistory;
import com.tmc.complaintmanager.entity.Department;
import com.tmc.complaintmanager.repository.ComplaintRepository;
import com.tmc.complaintmanager.repository.ComplaintStatusHistoryRepository;
import com.tmc.complaintmanager.service.ComplaintSlaService;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;

import java.lang.reflect.RecordComponent;
import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class PublicComplaintControllerTests {

    @Test
    void canTrackComplaintPubliclyWithoutLoginAndWithRedactedFields() {
        ComplaintRepository complaintRepo = mock(ComplaintRepository.class);
        ComplaintStatusHistoryRepository historyRepo = mock(ComplaintStatusHistoryRepository.class);
        ComplaintSlaService slaService = mock(ComplaintSlaService.class);

        Complaint complaint = new Complaint();
        complaint.setId(101L);
        complaint.setComplaintNumber("TMC-2026-000123");
        complaint.setTitle("Broken Water Pipe");
        complaint.setDescription("Water spilling across main road, contact citizen at 9876543210 or test@example.com");
        complaint.setCategory("WATER");
        complaint.setLocation("Flat 402, Building 7, Panchpakhadi, Thane West");
        complaint.setPriority("HIGH");
        complaint.setStatus("IN_PROGRESS");
        complaint.setDepartment(Department.WATER);
        complaint.setImageUrl("evidence-uuid.png");
        complaint.setResolutionImageUrl("resolution-uuid.png");
        complaint.setCitizenRating(5);
        complaint.setCitizenFeedback("Great job by municipal team!");
        complaint.setLatitude(19.1932);
        complaint.setLongitude(72.9647);
        complaint.setCreatedAt(LocalDateTime.now().minusHours(2));

        ComplaintStatusHistory step1 = new ComplaintStatusHistory(101L, null, "SUBMITTED", "Initial submission", "citizen@test.com", LocalDateTime.now().minusHours(2));
        ComplaintStatusHistory step2 = new ComplaintStatusHistory(101L, "SUBMITTED", "IN_PROGRESS", "Assigned to field technician officer@test.com", "officer@test.com", LocalDateTime.now().minusHours(1));

        when(complaintRepo.findByComplaintNumberIgnoreCase("tmc-2026-000123")).thenReturn(Optional.of(complaint));
        when(historyRepo.findByComplaintIdOrderByChangedAtAsc(101L)).thenReturn(List.of(step1, step2));
        when(slaService.dueAt(complaint)).thenReturn(LocalDateTime.now().plusHours(22));
        when(slaService.isOverdue(eq(complaint), any())).thenReturn(false);

        PublicComplaintController controller = new PublicComplaintController(complaintRepo, historyRepo, slaService);
        PublicComplaintController.PublicTrackResponse res = controller.trackComplaint("tmc-2026-000123");

        assertNotNull(res);
        assertEquals("TMC-2026-000123", res.complaintNumber());
        assertEquals("Broken Water Pipe", res.title());
        assertEquals("IN_PROGRESS", res.status());
        assertEquals("WATER", res.department());
        assertEquals("HIGH", res.priority());
        assertEquals(2, res.timeline().size());

        // Assert approximate / ward location is returned, not exact flat/door number
        assertTrue(res.location().contains("Panchpakhadi"));
        assertFalse(res.location().contains("Flat 402"));

        // Assert timeline reasons are sanitized (no emails or sensitive details)
        assertFalse(res.timeline().get(1).reason().contains("officer@test.com"));
        assertTrue(res.timeline().get(1).reason().contains("[redacted]"));

        // Assert removed fields are absent from PublicTrackResponse record definition
        Set<String> fieldNames = Arrays.stream(PublicComplaintController.PublicTrackResponse.class.getRecordComponents())
                .map(RecordComponent::getName)
                .collect(Collectors.toSet());

        assertFalse(fieldNames.contains("description"), "description must not be exposed");
        assertFalse(fieldNames.contains("latitude"), "latitude must not be exposed");
        assertFalse(fieldNames.contains("longitude"), "longitude must not be exposed");
        assertFalse(fieldNames.contains("citizenRating"), "citizenRating must not be exposed");
        assertFalse(fieldNames.contains("citizenFeedback"), "citizenFeedback must not be exposed");
        assertFalse(fieldNames.contains("imageUrl"), "imageUrl must not be exposed");
        assertFalse(fieldNames.contains("resolutionImageUrl"), "resolutionImageUrl must not be exposed");
    }

    @Test
    void returns404WhenComplaintNumberNotFound() {
        ComplaintRepository complaintRepo = mock(ComplaintRepository.class);
        ComplaintStatusHistoryRepository historyRepo = mock(ComplaintStatusHistoryRepository.class);
        ComplaintSlaService slaService = mock(ComplaintSlaService.class);

        when(complaintRepo.findByComplaintNumberIgnoreCase("TMC-INVALID")).thenReturn(Optional.empty());

        PublicComplaintController controller = new PublicComplaintController(complaintRepo, historyRepo, slaService);

        ResponseStatusException exception = assertThrows(ResponseStatusException.class,
                () -> controller.trackComplaint("TMC-INVALID"));

        assertEquals(404, exception.getStatusCode().value());
    }
}
