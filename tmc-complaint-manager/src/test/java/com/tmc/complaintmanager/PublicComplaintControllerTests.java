package com.tmc.complaintmanager;

import com.tmc.complaintmanager.controller.PublicComplaintController;
import com.tmc.complaintmanager.entity.Complaint;
import com.tmc.complaintmanager.entity.ComplaintStatusHistory;
import com.tmc.complaintmanager.entity.Department;
import com.tmc.complaintmanager.repository.ComplaintRepository;
import com.tmc.complaintmanager.repository.ComplaintStatusHistoryRepository;
import com.tmc.complaintmanager.service.ComplaintImageStorage;
import com.tmc.complaintmanager.service.ComplaintSlaService;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class PublicComplaintControllerTests {

    @Test
    void canTrackComplaintPubliclyWithoutLogin() {
        ComplaintRepository complaintRepo = mock(ComplaintRepository.class);
        ComplaintStatusHistoryRepository historyRepo = mock(ComplaintStatusHistoryRepository.class);
        ComplaintImageStorage imageStorage = mock(ComplaintImageStorage.class);
        ComplaintSlaService slaService = mock(ComplaintSlaService.class);

        Complaint complaint = new Complaint();
        complaint.setId(101L);
        complaint.setComplaintNumber("TMC-12345");
        complaint.setTitle("Broken Water Pipe");
        complaint.setDescription("Water spilling across main road");
        complaint.setCategory("WATER");
        complaint.setLocation("Panchpakhadi Ward");
        complaint.setPriority("HIGH");
        complaint.setStatus("IN_PROGRESS");
        complaint.setDepartment(Department.WATER);
        complaint.setCreatedAt(LocalDateTime.now().minusHours(2));

        ComplaintStatusHistory step1 = new ComplaintStatusHistory(101L, null, "SUBMITTED", "Initial submission", "citizen@test.com", LocalDateTime.now().minusHours(2));
        ComplaintStatusHistory step2 = new ComplaintStatusHistory(101L, "SUBMITTED", "IN_PROGRESS", "Assigned to field technician", "officer@test.com", LocalDateTime.now().minusHours(1));

        when(complaintRepo.findByComplaintNumberIgnoreCase("TMC-12345")).thenReturn(Optional.of(complaint));
        when(historyRepo.findByComplaintIdOrderByChangedAtAsc(101L)).thenReturn(List.of(step1, step2));
        when(slaService.dueAt(complaint)).thenReturn(LocalDateTime.now().plusHours(22));
        when(slaService.isOverdue(eq(complaint), any())).thenReturn(false);

        PublicComplaintController controller = new PublicComplaintController(complaintRepo, historyRepo, imageStorage, slaService);
        PublicComplaintController.PublicTrackResponse res = controller.trackComplaint("tmc-12345");

        assertNotNull(res);
        assertEquals("TMC-12345", res.complaintNumber());
        assertEquals("Broken Water Pipe", res.title());
        assertEquals("IN_PROGRESS", res.status());
        assertEquals("WATER", res.department());
        assertEquals(2, res.timeline().size());
        assertEquals("Assigned to field technician", res.timeline().get(1).reason());
    }

    @Test
    void returns404WhenComplaintNumberNotFound() {
        ComplaintRepository complaintRepo = mock(ComplaintRepository.class);
        ComplaintStatusHistoryRepository historyRepo = mock(ComplaintStatusHistoryRepository.class);
        ComplaintImageStorage imageStorage = mock(ComplaintImageStorage.class);
        ComplaintSlaService slaService = mock(ComplaintSlaService.class);

        when(complaintRepo.findByComplaintNumberIgnoreCase("TMC-INVALID")).thenReturn(Optional.empty());

        PublicComplaintController controller = new PublicComplaintController(complaintRepo, historyRepo, imageStorage, slaService);

        ResponseStatusException exception = assertThrows(ResponseStatusException.class,
                () -> controller.trackComplaint("TMC-INVALID"));

        assertEquals(404, exception.getStatusCode().value());
    }
}
