package com.tmc.complaintmanager;

import com.tmc.complaintmanager.entity.Complaint;
import com.tmc.complaintmanager.entity.AppUser;
import com.tmc.complaintmanager.entity.Department;
import com.tmc.complaintmanager.entity.UserRole;
import com.tmc.complaintmanager.repository.ComplaintRepository;
import com.tmc.complaintmanager.repository.ComplaintStatusHistoryRepository;
import com.tmc.complaintmanager.service.ComplaintService;
import com.tmc.complaintmanager.service.ComplaintStatusNotification;
import org.springframework.context.ApplicationEventPublisher;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.CriteriaQuery;
import jakarta.persistence.criteria.Path;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;

import java.util.List;
import java.time.LocalDateTime;
import org.mockito.ArgumentCaptor;

import java.util.Optional;
import org.springframework.web.server.ResponseStatusException;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class ComplaintServiceTests {
    @Test
    void complaintSortingUsesOnlySupportedFieldsAndStableTieBreakers() {
        ComplaintRepository complaints = mock(ComplaintRepository.class);
        when(complaints.findAll(any(Specification.class), any(Pageable.class)))
                .thenAnswer(invocation -> Page.empty(invocation.getArgument(1)));
        ComplaintService service = new ComplaintService(complaints, mock(ComplaintStatusHistoryRepository.class));
        AppUser admin = new AppUser("Admin", "admin@example.test", "hash", UserRole.ADMIN);
        ArgumentCaptor<Pageable> pageable = ArgumentCaptor.forClass(Pageable.class);

        service.search(admin, 0, 10, null, null, null, null, "TITLE");
        verify(complaints).findAll(any(Specification.class), pageable.capture());

        assertEquals(Sort.Direction.ASC, pageable.getValue().getSort().getOrderFor("title").getDirection());
        assertEquals(Sort.Direction.DESC, pageable.getValue().getSort().getOrderFor("createdAt").getDirection());
    }

    @Test
    void unsupportedSortOptionFallsBackToNewestInsteadOfAcceptingAnEntityProperty() {
        ComplaintRepository complaints = mock(ComplaintRepository.class);
        when(complaints.findAll(any(Specification.class), any(Pageable.class)))
                .thenAnswer(invocation -> Page.empty(invocation.getArgument(1)));
        ComplaintService service = new ComplaintService(complaints, mock(ComplaintStatusHistoryRepository.class));
        AppUser admin = new AppUser("Admin", "admin@example.test", "hash", UserRole.ADMIN);
        ArgumentCaptor<Pageable> pageable = ArgumentCaptor.forClass(Pageable.class);

        service.search(admin, 0, 10, null, null, null, null, "submittedBy");
        verify(complaints).findAll(any(Specification.class), pageable.capture());

        assertEquals(Sort.Direction.DESC, pageable.getValue().getSort().getOrderFor("createdAt").getDirection());
        assertNull(pageable.getValue().getSort().getOrderFor("submittedBy"));
    }

    @Test
    void assignedCountIsScopedToAnEmployeeDepartmentAndActiveStatuses() {
        ComplaintRepository complaints = mock(ComplaintRepository.class);
        when(complaints.countByDepartmentAndAssignedStaffIdIsNotNullAndStatusIn(
                Department.WATER, List.of("SUBMITTED", "IN_PROGRESS", "REOPEN_REQUESTED"))).thenReturn(2L);
        ComplaintService service = new ComplaintService(complaints, mock(ComplaintStatusHistoryRepository.class));
        AppUser officer = new AppUser("Water Officer", "officer@example.test", "hash",
                UserRole.DEPARTMENT_OFFICER, Department.WATER);

        assertEquals(2L, service.countAssignedForScope(officer));
        verify(complaints).countByDepartmentAndAssignedStaffIdIsNotNullAndStatusIn(
                Department.WATER, List.of("SUBMITTED", "IN_PROGRESS", "REOPEN_REQUESTED"));
        verify(complaints, never()).countByAssignedStaffIdIsNotNullAndStatusIn(org.mockito.ArgumentMatchers.anyList());
    }

    @Test
    void assignedCountForEmployeeWithoutDepartmentIsZero() {
        ComplaintRepository complaints = mock(ComplaintRepository.class);
        ComplaintService service = new ComplaintService(complaints, mock(ComplaintStatusHistoryRepository.class));
        AppUser employee = new AppUser("No department", "employee@example.test", "hash",
                UserRole.FIELD_STAFF, null);

        assertEquals(0L, service.countAssignedForScope(employee));
        verifyNoInteractions(complaints);
    }

    @Test
    void supervisorCountsRemainLimitedToTheirDepartment() {
        ComplaintRepository complaints = mock(ComplaintRepository.class);
        when(complaints.countByDepartment(Department.WATER)).thenReturn(3L);
        ComplaintService service = new ComplaintService(complaints, mock(ComplaintStatusHistoryRepository.class));
        AppUser supervisor = new AppUser("Water Supervisor", "supervisor@example.test", "hash",
                UserRole.SUPERVISOR, Department.WATER);

        assertEquals(3L, service.countForScope(supervisor, null));
        verify(complaints).countByDepartment(Department.WATER);
        verify(complaints, never()).count();
    }

    @Test
    void employeeSearchAddsDepartmentPredicateBeforeQuerying() {
        ComplaintRepository complaints = mock(ComplaintRepository.class);
        when(complaints.findAll(any(Specification.class), any(Pageable.class)))
                .thenAnswer(invocation -> Page.empty(invocation.getArgument(1)));
        ComplaintService service = new ComplaintService(complaints, mock(ComplaintStatusHistoryRepository.class));
        AppUser employee = new AppUser("Water Officer", "officer@example.test", "hash",
                UserRole.DEPARTMENT_OFFICER, Department.WATER);
        @SuppressWarnings("unchecked")
        ArgumentCaptor<Specification<Complaint>> specification = ArgumentCaptor.forClass(Specification.class);

        service.search(employee, 0, 10, null, null, null, null);
        verify(complaints).findAll(specification.capture(), any(Pageable.class));

        Root<Complaint> root = mock(Root.class);
        CriteriaQuery<?> query = mock(CriteriaQuery.class);
        CriteriaBuilder builder = mock(CriteriaBuilder.class);
        Path<Object> departmentPath = mock(Path.class);
        Predicate basePredicate = mock(Predicate.class);
        Predicate departmentPredicate = mock(Predicate.class);
        Predicate combinedPredicate = mock(Predicate.class);
        when(builder.conjunction()).thenReturn(basePredicate);
        when(root.get("department")).thenReturn(departmentPath);
        when(builder.equal(departmentPath, Department.WATER)).thenReturn(departmentPredicate);
        when(builder.and(basePredicate, departmentPredicate)).thenReturn(combinedPredicate);

        assertSame(combinedPredicate, specification.getValue().toPredicate(root, query, builder));
        verify(builder).equal(departmentPath, Department.WATER);
    }

    @Test
    void createsLongUniqueReferenceAndInitialStatusHistory() {
        ComplaintRepository complaints = mock(ComplaintRepository.class);
        ComplaintStatusHistoryRepository history = mock(ComplaintStatusHistoryRepository.class);
        when(complaints.existsByComplaintNumber(any())).thenReturn(false);
        when(complaints.save(any(Complaint.class))).thenAnswer(invocation -> {
            Complaint complaint = invocation.getArgument(0);
            complaint.setId(17L);
            return complaint;
        });
        ApplicationEventPublisher events = mock(ApplicationEventPublisher.class);
        Complaint complaint = complaint();

        Complaint created = new ComplaintService(complaints, history, events).createComplaint(complaint);

        assertEquals(36, created.getComplaintNumber().length());
        assertTrue(created.getComplaintNumber().startsWith("TMC-"));
        assertEquals("A broken road", created.getTitle());
        assertEquals("SUBMITTED", created.getStatus());
        verify(history).save(argThat(event -> event.getComplaintId().equals(17L)
                && event.getPreviousStatus() == null
                && event.getNewStatus().equals("SUBMITTED")
                && event.getActorEmail().equals("citizen@example.test")));
        verify(events).publishEvent(new ComplaintStatusNotification(
                "citizen@example.test", created.getComplaintNumber(), "SUBMITTED"));
    }

    @Test
    void creationClearsAllStaffManagedAndPostResolutionFields() {
        ComplaintRepository complaints = mock(ComplaintRepository.class);
        ComplaintStatusHistoryRepository history = mock(ComplaintStatusHistoryRepository.class);
        when(complaints.existsByComplaintNumber(any())).thenReturn(false);
        when(complaints.save(any(Complaint.class))).thenAnswer(invocation -> invocation.getArgument(0));
        Complaint submitted = complaint();
        submitted.setAssignedStaffId(77L);
        submitted.setAssignmentAt(LocalDateTime.now());
        submitted.setAssignmentReason("forged assignment");
        submitted.setResolutionImageUrl("forged-resolution.png");
        submitted.setCitizenRating(5);
        submitted.setCitizenFeedback("forged feedback");
        submitted.setFeedbackAt(LocalDateTime.now());

        Complaint created = new ComplaintService(complaints, history).createComplaint(submitted);

        assertNull(created.getAssignedStaffId());
        assertNull(created.getAssignmentAt());
        assertNull(created.getAssignmentReason());
        assertNull(created.getResolutionImageUrl());
        assertNull(created.getCitizenRating());
        assertNull(created.getCitizenFeedback());
        assertNull(created.getFeedbackAt());
    }

    @Test
    void repeatedSubmissionKeyReturnsTheOriginalComplaintWithoutCreatingAnother() {
        ComplaintRepository complaints = mock(ComplaintRepository.class);
        ComplaintStatusHistoryRepository history = mock(ComplaintStatusHistoryRepository.class);
        Complaint saved = complaint();
        saved.setId(29L);
        saved.setSubmissionKey("123e4567-e89b-42d3-a456-426614174000");
        saved.setComplaintNumber("TMC-ORIGINAL");
        when(complaints.findBySubmissionKey(saved.getSubmissionKey())).thenReturn(Optional.of(saved));

        Complaint retried = new ComplaintService(complaints, history).createComplaint(complaint(), saved.getSubmissionKey());

        assertSame(saved, retried);
        verify(complaints, never()).save(any(Complaint.class));
        verifyNoInteractions(history);
    }

    @Test
    void preventsAnotherCitizenFromReusingASubmissionKey() {
        ComplaintRepository complaints = mock(ComplaintRepository.class);
        ComplaintStatusHistoryRepository history = mock(ComplaintStatusHistoryRepository.class);
        Complaint saved = complaint();
        saved.setSubmittedBy("different@example.test");
        when(complaints.findBySubmissionKey("123e4567-e89b-42d3-a456-426614174000")).thenReturn(Optional.of(saved));

        ResponseStatusException exception = assertThrows(ResponseStatusException.class,
                () -> new ComplaintService(complaints, history).createComplaint(complaint(), "123e4567-e89b-42d3-a456-426614174000"));

        assertEquals(409, exception.getStatusCode().value());
        verify(complaints, never()).save(any(Complaint.class));
        verifyNoInteractions(history);
    }

    @Test
    void recordsActorPreviousStatusAndReasonForStatusChanges() {
        ComplaintRepository complaints = mock(ComplaintRepository.class);
        ComplaintStatusHistoryRepository history = mock(ComplaintStatusHistoryRepository.class);
        Complaint complaint = complaint();
        complaint.setId(5L);
        complaint.setComplaintNumber("TMC-5");
        complaint.setStatus("SUBMITTED");
        when(complaints.findByIdForUpdate(5L)).thenReturn(Optional.of(complaint));
        when(complaints.save(any(Complaint.class))).thenAnswer(invocation -> invocation.getArgument(0));
        ApplicationEventPublisher events = mock(ApplicationEventPublisher.class);

        new ComplaintService(complaints, history, events).updateStatus(5L, "IN_PROGRESS", "staff@example.test", "Crew assigned");

        verify(history).save(argThat(event -> event.getComplaintId().equals(5L)
                && event.getPreviousStatus().equals("SUBMITTED")
                && event.getNewStatus().equals("IN_PROGRESS")
                && event.getReason().equals("Crew assigned")
                && event.getActorEmail().equals("staff@example.test")));
        verify(events).publishEvent(new ComplaintStatusNotification(
                "citizen@example.test", "TMC-5", "IN_PROGRESS"));
    }

    @Test
    void requiresAPublicResolutionNoteBeforeClosingAComplaint() {
        ComplaintRepository complaints = mock(ComplaintRepository.class);
        ComplaintStatusHistoryRepository history = mock(ComplaintStatusHistoryRepository.class);
        Complaint complaint = complaint();
        complaint.setId(5L);
        complaint.setStatus("IN_PROGRESS");
        when(complaints.findByIdForUpdate(5L)).thenReturn(Optional.of(complaint));

        ResponseStatusException exception = assertThrows(ResponseStatusException.class,
                () -> new ComplaintService(complaints, history).updateStatus(5L, "RESOLVED", "staff@example.test", " "));

        assertEquals(400, exception.getStatusCode().value());
        verify(complaints, never()).save(any(Complaint.class));
        verifyNoInteractions(history);
    }

    @Test
    void rejectsRepeatedAndClosedStatusTransitionsWithoutWritingHistory() {
        for (String currentStatus : List.of("IN_PROGRESS", "RESOLVED")) {
            ComplaintRepository complaints = mock(ComplaintRepository.class);
            ComplaintStatusHistoryRepository history = mock(ComplaintStatusHistoryRepository.class);
            Complaint complaint = complaint();
            complaint.setId(41L);
            complaint.setStatus(currentStatus);
            when(complaints.findByIdForUpdate(41L)).thenReturn(Optional.of(complaint));
            String requestedStatus = currentStatus.equals("IN_PROGRESS") ? "IN_PROGRESS" : "RESOLVED";

            ResponseStatusException exception = assertThrows(ResponseStatusException.class,
                    () -> new ComplaintService(complaints, history)
                            .updateStatus(41L, requestedStatus, "staff@example.test", "No new change"));

            assertEquals(409, exception.getStatusCode().value());
            verify(complaints, never()).save(any(Complaint.class));
            verifyNoInteractions(history);
        }
    }

    @Test
    void recordsCitizenReopeningRequestAsAnAuditedStatusTransition() {
        ComplaintRepository complaints = mock(ComplaintRepository.class);
        ComplaintStatusHistoryRepository history = mock(ComplaintStatusHistoryRepository.class);
        Complaint complaint = complaint();
        complaint.setId(9L);
        complaint.setStatus("RESOLVED");
        when(complaints.findByIdForUpdate(9L)).thenReturn(Optional.of(complaint));
        when(complaints.save(any(Complaint.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Complaint reopened = new ComplaintService(complaints, history).requestReopen(
                9L, "citizen@example.test", "The leak is still active.");

        assertEquals("REOPEN_REQUESTED", reopened.getStatus());
        verify(history).save(argThat(event -> event.getPreviousStatus().equals("RESOLVED")
                && event.getNewStatus().equals("REOPEN_REQUESTED")
                && event.getReason().equals("The leak is still active.")));
    }

    @Test
    void storesOneCitizenResolutionRatingAndComment() {
        ComplaintRepository complaints = mock(ComplaintRepository.class);
        ComplaintStatusHistoryRepository history = mock(ComplaintStatusHistoryRepository.class);
        Complaint complaint = complaint();
        complaint.setId(10L);
        complaint.setStatus("RESOLVED");
        when(complaints.findByIdForUpdate(10L)).thenReturn(Optional.of(complaint));
        when(complaints.save(any(Complaint.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Complaint rated = new ComplaintService(complaints, history).submitFeedback(
                10L, "citizen@example.test", 4, "The repair was completed.");

        assertEquals(4, rated.getCitizenRating());
        assertEquals("The repair was completed.", rated.getCitizenFeedback());
        assertNotNull(rated.getFeedbackAt());
    }

    private Complaint complaint() {
        Complaint complaint = new Complaint();
        complaint.setTitle("A broken road");
        complaint.setDescription("The road surface is damaged near the crossing.");
        complaint.setCategory("ROAD");
        complaint.setLocation("Near the crossing");
        complaint.setPriority("HIGH");
        complaint.setSubmittedBy("citizen@example.test");
        return complaint;
    }
}
