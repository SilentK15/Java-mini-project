package com.tmc.complaintmanager;

import com.tmc.complaintmanager.controller.ComplaintInternalNoteController;
import com.tmc.complaintmanager.entity.AppUser;
import com.tmc.complaintmanager.entity.Complaint;
import com.tmc.complaintmanager.entity.Department;
import com.tmc.complaintmanager.entity.UserRole;
import com.tmc.complaintmanager.repository.ComplaintInternalNoteRepository;
import com.tmc.complaintmanager.repository.ComplaintRepository;
import org.junit.jupiter.api.Test;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.server.ResponseStatusException;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.Mockito.*;

class ComplaintInternalNoteControllerTests {
    @Test
    void departmentStaffCanAddAnInternalNoteThatIsNotPublicStatusHistory() {
        ComplaintRepository complaints = mock(ComplaintRepository.class);
        ComplaintInternalNoteRepository notes = mock(ComplaintInternalNoteRepository.class);
        Complaint complaint = complaint(12L, Department.WATER);
        when(complaints.findById(12L)).thenReturn(Optional.of(complaint));
        AppUser staff = mock(AppUser.class);
        when(staff.getRole()).thenReturn(UserRole.SUPERVISOR);
        when(staff.getDepartment()).thenReturn(Department.WATER);
        when(staff.getEmail()).thenReturn("water.staff@example.test");
        when(notes.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        var response = new ComplaintInternalNoteController(complaints, notes).add(12L,
                new ComplaintInternalNoteController.NoteRequest("Crew dispatched at 10:30"), staff);

        assertEquals("Crew dispatched at 10:30", response.body());
        assertEquals("Staff colleague", response.author());
        verify(notes).save(argThat(note -> note.getComplaintId().equals(12L)
                && note.getAuthorEmail().equals("water.staff@example.test")
                && note.getBody().equals("Crew dispatched at 10:30")));
        assertEquals("hasAnyRole('ADMIN', 'STAFF', 'FIELD_STAFF', 'DEPARTMENT_OFFICER', 'SUPERVISOR')",
                ComplaintInternalNoteController.class.getAnnotation(PreAuthorize.class).value());
    }

    @Test
    void rejectsStaffOutsideComplaintDepartment() {
        ComplaintRepository complaints = mock(ComplaintRepository.class);
        ComplaintInternalNoteRepository notes = mock(ComplaintInternalNoteRepository.class);
        when(complaints.findById(12L)).thenReturn(Optional.of(complaint(12L, Department.WATER)));
        AppUser staff = mock(AppUser.class);
        when(staff.getRole()).thenReturn(UserRole.STAFF);
        when(staff.getDepartment()).thenReturn(Department.PUBLIC_WORKS);

        ResponseStatusException exception = assertThrows(ResponseStatusException.class,
                () -> new ComplaintInternalNoteController(complaints, notes).list(12L, staff));

        assertEquals(403, exception.getStatusCode().value());
        verifyNoInteractions(notes);
    }

    @Test
    void rejectsDepartmentStaffWithoutDepartmentEvenForDepartmentlessComplaint() {
        ComplaintRepository complaints = mock(ComplaintRepository.class);
        ComplaintInternalNoteRepository notes = mock(ComplaintInternalNoteRepository.class);
        when(complaints.findById(12L)).thenReturn(Optional.of(complaint(12L, null)));
        AppUser staff = mock(AppUser.class);
        when(staff.getRole()).thenReturn(UserRole.STAFF);
        when(staff.getDepartment()).thenReturn(null);

        ResponseStatusException exception = assertThrows(ResponseStatusException.class,
                () -> new ComplaintInternalNoteController(complaints, notes).list(12L, staff));

        assertEquals(403, exception.getStatusCode().value());
        verifyNoInteractions(notes);
    }

    private Complaint complaint(Long id, Department department) {
        Complaint complaint = new Complaint();
        complaint.setId(id);
        complaint.setDepartment(department);
        return complaint;
    }
}
