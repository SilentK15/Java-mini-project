package com.tmc.complaintmanager;

import com.tmc.complaintmanager.controller.ComplaintController;
import com.tmc.complaintmanager.entity.AppUser;
import com.tmc.complaintmanager.entity.Complaint;
import com.tmc.complaintmanager.entity.Department;
import com.tmc.complaintmanager.entity.UserRole;
import com.tmc.complaintmanager.service.ComplaintImageStorage;
import com.tmc.complaintmanager.service.ComplaintService;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.nio.file.Path;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class ComplaintControllerTests {
    @Test
    void assignedDepartmentStaffCanAddResolutionEvidence() {
        ComplaintService complaints = mock(ComplaintService.class);
        ComplaintImageStorage images = mock(ComplaintImageStorage.class);
        Complaint complaint = new Complaint();
        complaint.setId(21L);
        complaint.setDepartment(Department.PUBLIC_WORKS);
        complaint.setStatus("IN_PROGRESS");
        when(complaints.getComplaintById(21L)).thenReturn(complaint);
        when(images.store(any())).thenReturn("resolved-photo.jpg");
        when(complaints.updateResolutionImage(21L, "resolved-photo.jpg")).thenAnswer(invocation -> {
            complaint.setResolutionImageUrl(invocation.getArgument(1));
            return complaint;
        });
        AppUser staff = new AppUser("Roads Officer", "staff@example.test", "hash", UserRole.STAFF, Department.PUBLIC_WORKS);
        MockMultipartFile image = new MockMultipartFile("image", "repair.jpg", "image/jpeg", new byte[]{1});

        var response = new ComplaintController(complaints, images).addResolutionEvidence(21L, image, staff);

        assertEquals("/api/complaints/21/resolution-image", response.resolutionImageUrl());
        verify(images).store(image);
        verify(complaints).updateResolutionImage(21L, "resolved-photo.jpg");
    }

    @Test
    void deniesResolutionEvidenceUploadFromAnotherDepartment() {
        ComplaintService complaints = mock(ComplaintService.class);
        ComplaintImageStorage images = mock(ComplaintImageStorage.class);
        Complaint complaint = new Complaint();
        complaint.setId(22L);
        complaint.setDepartment(Department.WATER);
        when(complaints.getComplaintById(22L)).thenReturn(complaint);
        AppUser staff = new AppUser("Roads Officer", "staff@example.test", "hash", UserRole.STAFF, Department.PUBLIC_WORKS);
        MockMultipartFile image = new MockMultipartFile("image", "repair.jpg", "image/jpeg", new byte[]{1});

        ResponseStatusException exception = assertThrows(ResponseStatusException.class,
                () -> new ComplaintController(complaints, images).addResolutionEvidence(22L, image, staff));

        assertEquals(403, exception.getStatusCode().value());
        verifyNoInteractions(images);
        verify(complaints, never()).updateResolutionImage(anyLong(), any());
    }

    @Test
    void citizenCannotViewResolutionEvidenceBeforeComplaintIsResolved() {
        ComplaintService complaints = mock(ComplaintService.class);
        ComplaintImageStorage images = mock(ComplaintImageStorage.class);
        Complaint complaint = new Complaint();
        complaint.setId(23L);
        complaint.setSubmittedBy("citizen@example.test");
        complaint.setStatus("IN_PROGRESS");
        complaint.setResolutionImageUrl("resolved-photo.jpg");
        when(complaints.getComplaintById(23L)).thenReturn(complaint);
        AppUser citizen = new AppUser("Citizen", "citizen@example.test", "hash", UserRole.CITIZEN);

        ResponseStatusException exception = assertThrows(ResponseStatusException.class,
                () -> new ComplaintController(complaints, images).getResolutionImage(23L, citizen));

        assertEquals(403, exception.getStatusCode().value());
        verifyNoInteractions(images);
    }

    @Test
    void returnsExistingComplaintForRetriedSubmissionWithoutStoringAnotherImage() {
        ComplaintService complaints = mock(ComplaintService.class);
        ComplaintImageStorage images = mock(ComplaintImageStorage.class);
        Complaint prior = new Complaint();
        prior.setId(8L);
        prior.setComplaintNumber("TMC-RETRY");
        prior.setSubmittedBy("citizen@example.test");
        when(complaints.findComplaintBySubmissionKey("123e4567-e89b-42d3-a456-426614174000")).thenReturn(prior);
        AppUser citizen = new AppUser("Citizen", "citizen@example.test", "hash", UserRole.CITIZEN);

        var result = new ComplaintController(complaints, images).createComplaint(submission(), null,
                "123e4567-e89b-42d3-a456-426614174000", citizen);

        assertEquals("TMC-RETRY", result.complaintNumber());
        verifyNoInteractions(images);
        verify(complaints, never()).createComplaint(any(Complaint.class), any());
    }

    @Test
    void complaintSubmissionRequestExposesOnlyCitizenEditableFields() {
        String[] fields = java.util.Arrays.stream(ComplaintController.ComplaintSubmissionRequest.class.getRecordComponents())
                .map(java.lang.reflect.RecordComponent::getName).toArray(String[]::new);

        assertArrayEquals(new String[]{"title", "description", "category", "location", "priority", "latitude", "longitude"}, fields);
    }

    @Test
    void concurrentRetryReturnsTheSavedReceiptAndRemovesItsTemporaryImage() {
        ComplaintService complaints = mock(ComplaintService.class);
        ComplaintImageStorage images = mock(ComplaintImageStorage.class);
        String key = "123e4567-e89b-42d3-a456-426614174000";
        Complaint saved = new Complaint();
        saved.setId(9L);
        saved.setComplaintNumber("TMC-CONCURRENT");
        saved.setSubmittedBy("citizen@example.test");
        when(complaints.findComplaintBySubmissionKey(key)).thenReturn(null, saved);
        when(images.store(null)).thenReturn("temporary-photo.jpg");
        when(complaints.createComplaint(any(Complaint.class), eq(key)))
                .thenThrow(new DataIntegrityViolationException("duplicate request key"));
        AppUser citizen = new AppUser("Citizen", "citizen@example.test", "hash", UserRole.CITIZEN);

        var result = new ComplaintController(complaints, images).createComplaint(submission(), null, key, citizen);

        assertEquals("TMC-CONCURRENT", result.complaintNumber());
        verify(images).delete("temporary-photo.jpg");
    }

    @Test
    void concurrentRetryDoesNotExposeAnotherCitizensReceipt() {
        ComplaintService complaints = mock(ComplaintService.class);
        ComplaintImageStorage images = mock(ComplaintImageStorage.class);
        String key = "123e4567-e89b-42d3-a456-426614174000";
        Complaint saved = new Complaint();
        saved.setId(10L);
        saved.setSubmittedBy("owner@example.test");
        when(complaints.findComplaintBySubmissionKey(key)).thenReturn(null, saved);
        when(images.store(null)).thenReturn("temporary-photo.jpg");
        when(complaints.createComplaint(any(Complaint.class), eq(key)))
                .thenThrow(new DataIntegrityViolationException("duplicate request key"));
        AppUser citizen = new AppUser("Citizen", "citizen@example.test", "hash", UserRole.CITIZEN);

        ResponseStatusException exception = assertThrows(ResponseStatusException.class,
                () -> new ComplaintController(complaints, images).createComplaint(submission(), null, key, citizen));

        assertEquals(409, exception.getStatusCode().value());
        verify(images).delete("temporary-photo.jpg");
    }

    @Test
    void rejectsIncompleteCoordinatesBeforeWritingAnImage() {
        ComplaintService complaints = mock(ComplaintService.class);
        ComplaintImageStorage images = mock(ComplaintImageStorage.class);
        when(complaints.findComplaintBySubmissionKey("123e4567-e89b-42d3-a456-426614174000")).thenReturn(null);
        ComplaintController.ComplaintSubmissionRequest form = new ComplaintController.ComplaintSubmissionRequest(
                "Water leak", "Pipe is leaking", "WATER", "Ward 2", "MEDIUM", 19.2, null);
        AppUser citizen = new AppUser("Citizen", "citizen@example.test", "hash", UserRole.CITIZEN);

        ResponseStatusException exception = assertThrows(ResponseStatusException.class,
                () -> new ComplaintController(complaints, images).createComplaint(form, null,
                        "123e4567-e89b-42d3-a456-426614174000", citizen));

        assertEquals(400, exception.getStatusCode().value());
        verifyNoInteractions(images);
        verify(complaints, never()).createComplaint(any(Complaint.class), any());
    }

    @Test
    void rejectsOversizedSearchBeforeCallingTheComplaintService() {
        ComplaintService complaints = mock(ComplaintService.class);
        AppUser citizen = new AppUser("Citizen", "citizen@example.test", "hash", UserRole.CITIZEN);

        ResponseStatusException exception = assertThrows(ResponseStatusException.class,
                () -> new ComplaintController(complaints, mock(ComplaintImageStorage.class))
                        .getComplaints(citizen, 0, 10, "x".repeat(151), null, null, null, "NEWEST"));

        assertEquals(400, exception.getStatusCode().value());
        verifyNoInteractions(complaints);
    }

    @Test
    void rejectsAnotherCitizensAttemptToReadComplaintImage() {
        ComplaintService complaints = mock(ComplaintService.class);
        ComplaintImageStorage images = mock(ComplaintImageStorage.class);
        Complaint complaint = new Complaint();
        complaint.setId(3L);
        complaint.setImageUrl("123e4567-e89b-12d3-a456-426614174000.png");
        complaint.setSubmittedBy("owner@example.test");
        when(complaints.getComplaintById(3L)).thenReturn(complaint);
        AppUser stranger = new AppUser("Other citizen", "stranger@example.test", "hash", UserRole.CITIZEN);

        ResponseStatusException exception = assertThrows(ResponseStatusException.class,
                () -> new ComplaintController(complaints, images).getComplaintImage(3L, stranger));

        assertEquals(403, exception.getStatusCode().value());
        verifyNoInteractions(images);
    }

    @Test
    void rejectsAnotherCitizenAttemptToReadComplaintDetails() {
        ComplaintService complaints = mock(ComplaintService.class);
        Complaint complaint = new Complaint();
        complaint.setId(5L);
        complaint.setSubmittedBy("owner@example.test");
        when(complaints.getComplaintById(5L)).thenReturn(complaint);
        AppUser stranger = new AppUser("Other citizen", "stranger@example.test", "hash", UserRole.CITIZEN);

        ResponseStatusException exception = assertThrows(ResponseStatusException.class,
                () -> new ComplaintController(complaints, mock(ComplaintImageStorage.class)).getComplaintById(5L, stranger));

        assertEquals(403, exception.getStatusCode().value());
    }

    @Test
    void unassignedDepartmentStaffCannotReadComplaintWithoutADepartment() {
        ComplaintService complaints = mock(ComplaintService.class);
        Complaint complaint = new Complaint();
        complaint.setId(12L);
        when(complaints.getComplaintById(12L)).thenReturn(complaint);
        AppUser staffWithoutDepartment = new AppUser("Staff", "staff@example.test", "hash", UserRole.STAFF);

        ResponseStatusException exception = assertThrows(ResponseStatusException.class,
                () -> new ComplaintController(complaints, mock(ComplaintImageStorage.class))
                        .getComplaintById(12L, staffWithoutDepartment));

        assertEquals(403, exception.getStatusCode().value());
    }

    @Test
    void rejectsStatusUpdateFromAnotherDepartment() {
        ComplaintService complaints = mock(ComplaintService.class);
        Complaint complaint = new Complaint();
        complaint.setId(6L);
        complaint.setDepartment(Department.WATER);
        when(complaints.getComplaintById(6L)).thenReturn(complaint);
        AppUser staff = new AppUser("Roads Officer", "staff@example.test", "hash", UserRole.STAFF,
                Department.PUBLIC_WORKS);

        ResponseStatusException exception = assertThrows(ResponseStatusException.class,
                () -> new ComplaintController(complaints, mock(ComplaintImageStorage.class))
                        .updateStatus(6L, "IN_PROGRESS", null, staff));

        assertEquals(403, exception.getStatusCode().value());
        verify(complaints, never()).updateStatus(anyLong(), anyString(), anyString(), any());
    }

    @Test
    void unassignedDepartmentStaffCannotUpdateComplaintWithoutADepartment() {
        ComplaintService complaints = mock(ComplaintService.class);
        Complaint complaint = new Complaint();
        complaint.setId(13L);
        when(complaints.getComplaintById(13L)).thenReturn(complaint);
        AppUser staffWithoutDepartment = new AppUser("Staff", "staff@example.test", "hash", UserRole.STAFF);

        ResponseStatusException exception = assertThrows(ResponseStatusException.class,
                () -> new ComplaintController(complaints, mock(ComplaintImageStorage.class))
                        .updateStatus(13L, "IN_PROGRESS", null, staffWithoutDepartment));

        assertEquals(403, exception.getStatusCode().value());
        verify(complaints, never()).updateStatus(anyLong(), anyString(), anyString(), any());
    }

    @Test
    void allowsAssignedDepartmentStaffToReadComplaintImage() {
        ComplaintService complaints = mock(ComplaintService.class);
        ComplaintImageStorage images = mock(ComplaintImageStorage.class);
        Complaint complaint = new Complaint();
        complaint.setId(4L);
        complaint.setDepartment(Department.PUBLIC_WORKS);
        complaint.setImageUrl("123e4567-e89b-12d3-a456-426614174000.jpg");
        when(complaints.getComplaintById(4L)).thenReturn(complaint);
        when(images.resolve(complaint.getImageUrl())).thenReturn(Path.of("image.jpg"));
        AppUser staff = new AppUser("Roads Officer", "staff@example.test", "hash", UserRole.STAFF, Department.PUBLIC_WORKS);

        var response = new ComplaintController(complaints, images).getComplaintImage(4L, staff);

        assertEquals(200, response.getStatusCode().value());
        assertEquals("no-store", response.getHeaders().getCacheControl());
        verify(images).resolve(complaint.getImageUrl());
    }

    private static ComplaintController.ComplaintSubmissionRequest submission() {
        return new ComplaintController.ComplaintSubmissionRequest(
                "Water leak", "Pipe is leaking", "WATER", "Ward 2", "MEDIUM", null, null);
    }
}
