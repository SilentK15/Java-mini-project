package com.tmc.complaintmanager;

import com.tmc.complaintmanager.controller.AdminComplaintAssignmentController;
import com.tmc.complaintmanager.entity.AdminAuditLog;
import com.tmc.complaintmanager.entity.AppUser;
import com.tmc.complaintmanager.entity.Complaint;
import com.tmc.complaintmanager.entity.Department;
import com.tmc.complaintmanager.entity.UserRole;
import com.tmc.complaintmanager.repository.AdminAuditLogRepository;
import com.tmc.complaintmanager.repository.AppUserRepository;
import com.tmc.complaintmanager.repository.ComplaintRepository;
import org.junit.jupiter.api.Test;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.server.ResponseStatusException;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class AdminComplaintAssignmentControllerTests {
    @Test
    void assignsOnlyActiveStaffFromTheComplaintDepartmentAndAuditsTheChange() {
        ComplaintRepository complaints = mock(ComplaintRepository.class);
        AppUserRepository users = mock(AppUserRepository.class);
        AdminAuditLogRepository audits = mock(AdminAuditLogRepository.class);
        Complaint complaint = complaint(7L, Department.PUBLIC_WORKS);
        AppUser staff = mock(AppUser.class);
        AppUser admin = mock(AppUser.class);
        when(complaints.findById(7L)).thenReturn(Optional.of(complaint));
        when(users.findById(9L)).thenReturn(Optional.of(staff));
        when(staff.getRole()).thenReturn(UserRole.STAFF);
        when(staff.isEnabled()).thenReturn(true);
        when(staff.getDepartment()).thenReturn(Department.PUBLIC_WORKS);
        when(admin.getEmail()).thenReturn("admin@example.test");

        var response = new AdminComplaintAssignmentController(complaints, users, audits).assign(7L,
                new AdminComplaintAssignmentController.AssignmentRequest(9L, "Assign to road inspection team"), admin);

        assertEquals(9L, response.assignedStaffId());
        assertEquals("Assign to road inspection team", complaint.getAssignmentReason());
        verify(complaints).save(complaint);
        verify(audits).save(argThat((AdminAuditLog log) -> log.getAction().equals("COMPLAINT_ASSIGNED")
                && log.getActorEmail().equals("admin@example.test")
                && log.getDetails().contains("Assign to road inspection team")));
        assertEquals("hasRole('ADMIN')", AdminComplaintAssignmentController.class.getAnnotation(PreAuthorize.class).value());
    }

    @Test
    void rejectsCrossDepartmentAssignmentWithoutWriting() {
        ComplaintRepository complaints = mock(ComplaintRepository.class);
        AppUserRepository users = mock(AppUserRepository.class);
        AdminAuditLogRepository audits = mock(AdminAuditLogRepository.class);
        when(complaints.findById(7L)).thenReturn(Optional.of(complaint(7L, Department.PUBLIC_WORKS)));
        AppUser staff = mock(AppUser.class);
        when(users.findById(9L)).thenReturn(Optional.of(staff));
        when(staff.getRole()).thenReturn(UserRole.STAFF);
        when(staff.isEnabled()).thenReturn(true);
        when(staff.getDepartment()).thenReturn(Department.WATER);

        ResponseStatusException exception = assertThrows(ResponseStatusException.class,
                () -> new AdminComplaintAssignmentController(complaints, users, audits).assign(7L,
                        new AdminComplaintAssignmentController.AssignmentRequest(9L, "Wrong department test"), mock(AppUser.class)));

        assertEquals(400, exception.getStatusCode().value());
        verify(complaints, never()).save(any());
        verifyNoInteractions(audits);
    }

    @Test
    void rejectsAssignmentWhenEitherDepartmentIsMissing() {
        ComplaintRepository complaints = mock(ComplaintRepository.class);
        AppUserRepository users = mock(AppUserRepository.class);
        AdminAuditLogRepository audits = mock(AdminAuditLogRepository.class);
        when(complaints.findById(7L)).thenReturn(Optional.of(complaint(7L, null)));
        AppUser staff = mock(AppUser.class);
        when(users.findById(9L)).thenReturn(Optional.of(staff));
        when(staff.getRole()).thenReturn(UserRole.STAFF);
        when(staff.isEnabled()).thenReturn(true);
        when(staff.getDepartment()).thenReturn(null);

        ResponseStatusException exception = assertThrows(ResponseStatusException.class,
                () -> new AdminComplaintAssignmentController(complaints, users, audits).assign(7L,
                        new AdminComplaintAssignmentController.AssignmentRequest(9L, "No department test"), mock(AppUser.class)));

        assertEquals(400, exception.getStatusCode().value());
        verify(complaints, never()).save(any());
        verifyNoInteractions(audits);
    }

    private Complaint complaint(Long id, Department department) {
        Complaint complaint = new Complaint();
        complaint.setId(id);
        complaint.setDepartment(department);
        complaint.setStatus("SUBMITTED");
        return complaint;
    }
}
