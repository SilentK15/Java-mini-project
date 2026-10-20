package com.tmc.complaintmanager;

import com.tmc.complaintmanager.entity.AppUser;
import com.tmc.complaintmanager.entity.Complaint;
import com.tmc.complaintmanager.entity.Department;
import com.tmc.complaintmanager.entity.UserRole;
import com.tmc.complaintmanager.repository.ComplaintRepository;
import com.tmc.complaintmanager.service.ComplaintSlaService;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class ComplaintSlaServiceTests {
    @Test
    void computesSeparateSubmissionAndResolutionDeadlinesAndDisablesResolvedComplaints() {
        LocalDateTime submittedAt = LocalDateTime.of(2026, 1, 1, 10, 0);
        ComplaintSlaService sla = new ComplaintSlaService(mock(ComplaintRepository.class), 24, 72);
        Complaint submitted = complaint("SUBMITTED", submittedAt, submittedAt);
        Complaint progressing = complaint("IN_PROGRESS", submittedAt, submittedAt.plusHours(30));
        Complaint reopened = complaint("REOPEN_REQUESTED", submittedAt, submittedAt.plusDays(2));
        Complaint resolved = complaint("RESOLVED", submittedAt, submittedAt.plusDays(3));

        assertEquals(submittedAt.plusHours(24), sla.dueAt(submitted));
        assertEquals(submittedAt.plusHours(30).plusHours(72), sla.dueAt(progressing));
        assertEquals(submittedAt.plusDays(2).plusHours(24), sla.dueAt(reopened));
        assertNull(sla.dueAt(resolved));
        assertTrue(sla.isOverdue(submitted, submittedAt.plusHours(24).plusNanos(1)));
        assertFalse(sla.isOverdue(submitted, submittedAt.plusHours(24)));
    }

    @Test
    void defaultsToDisabledUntilTargetsAreConfigured() {
        ComplaintSlaService sla = new ComplaintSlaService(mock(ComplaintRepository.class), 0, 0);
        Complaint submitted = complaint("SUBMITTED", LocalDateTime.now().minusYears(1), null);

        assertFalse(sla.isConfigured());
        assertNull(sla.dueAt(submitted));
        assertFalse(sla.isOverdue(submitted, LocalDateTime.now()));
    }

    @Test
    void overdueAndUnassignedCountsAreLimitedToEmployeeDepartment() {
        ComplaintRepository complaints = mock(ComplaintRepository.class);
        LocalDateTime now = LocalDateTime.of(2026, 2, 1, 12, 0);
        LocalDateTime responseCutoff = now.minusHours(24);
        LocalDateTime resolutionCutoff = now.minusHours(72);
        when(complaints.countByDepartmentAndStatusAndCreatedAtBefore(Department.WATER, "SUBMITTED", responseCutoff)).thenReturn(2L);
        when(complaints.countByDepartmentAndStatusAndStatusChangedAtBefore(Department.WATER, "REOPEN_REQUESTED", responseCutoff)).thenReturn(1L);
        when(complaints.countByDepartmentAndStatusAndStatusChangedAtBefore(Department.WATER, "IN_PROGRESS", resolutionCutoff)).thenReturn(3L);
        when(complaints.countByDepartmentAndAssignedStaffIdIsNullAndStatusIn(Department.WATER,
                List.of("SUBMITTED", "IN_PROGRESS", "REOPEN_REQUESTED"))).thenReturn(4L);
        ComplaintSlaService sla = new ComplaintSlaService(complaints, 24, 72);
        AppUser officer = new AppUser("Water Officer", "officer@example.test", "hash",
                UserRole.DEPARTMENT_OFFICER, Department.WATER);

        assertEquals(6L, sla.countOverdueForScope(officer, now));
        assertEquals(4L, sla.countUnassignedForScope(officer));
        verify(complaints, never()).countByStatusAndCreatedAtBefore(any(), any());
        verify(complaints, never()).countByAssignedStaffIdIsNullAndStatusIn(any());
    }

    @Test
    void citizensReceiveOnlyTheirOwnOverdueCountAndNoDepartmentWorkloadCount() {
        ComplaintRepository complaints = mock(ComplaintRepository.class);
        LocalDateTime now = LocalDateTime.of(2026, 3, 1, 12, 0);
        when(complaints.countBySubmittedByIgnoreCaseAndStatusAndCreatedAtBefore(
                "citizen@example.test", "SUBMITTED", now.minusHours(12))).thenReturn(1L);
        ComplaintSlaService sla = new ComplaintSlaService(complaints, 12, 0);
        AppUser citizen = new AppUser("Citizen", "citizen@example.test", "hash", UserRole.CITIZEN);

        assertEquals(1L, sla.countOverdueForScope(citizen, now));
        assertEquals(0L, sla.countUnassignedForScope(citizen));
        verify(complaints).countBySubmittedByIgnoreCaseAndStatusAndCreatedAtBefore(
                "citizen@example.test", "SUBMITTED", now.minusHours(12));
        verify(complaints).countBySubmittedByIgnoreCaseAndStatusAndStatusChangedAtBefore(
                "citizen@example.test", "REOPEN_REQUESTED", now.minusHours(12));
        verify(complaints, never()).countByAssignedStaffIdIsNullAndStatusIn(any());
    }

    private Complaint complaint(String status, LocalDateTime createdAt, LocalDateTime statusChangedAt) {
        Complaint complaint = new Complaint();
        complaint.setStatus(status);
        complaint.setCreatedAt(createdAt);
        complaint.setStatusChangedAt(statusChangedAt);
        return complaint;
    }
}
