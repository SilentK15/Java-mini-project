package com.tmc.complaintmanager.controller;

import com.tmc.complaintmanager.entity.AdminAuditLog;
import com.tmc.complaintmanager.entity.AppUser;
import com.tmc.complaintmanager.entity.Complaint;
import com.tmc.complaintmanager.entity.UserRole;
import com.tmc.complaintmanager.repository.AdminAuditLogRepository;
import com.tmc.complaintmanager.repository.AppUserRepository;
import com.tmc.complaintmanager.repository.ComplaintRepository;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;

@RestController
@RequestMapping("/api/admin/complaints")
@PreAuthorize("hasRole('ADMIN')")
public class AdminComplaintAssignmentController {
    private final ComplaintRepository complaints;
    private final AppUserRepository users;
    private final AdminAuditLogRepository auditLogs;

    public AdminComplaintAssignmentController(ComplaintRepository complaints, AppUserRepository users,
                                               AdminAuditLogRepository auditLogs) {
        this.complaints = complaints;
        this.users = users;
        this.auditLogs = auditLogs;
    }

    @PutMapping("/{complaintId}/assignment")
    @Transactional
    public AssignmentResponse assign(@PathVariable Long complaintId, @Valid @RequestBody AssignmentRequest request,
                                     @AuthenticationPrincipal AppUser admin) {
        Complaint complaint = complaints.findById(complaintId).orElseThrow(() ->
                new ResponseStatusException(HttpStatus.NOT_FOUND, "Complaint not found"));
        if (!java.util.List.of("SUBMITTED", "IN_PROGRESS", "REOPEN_REQUESTED").contains(complaint.getStatus())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Only active complaints can be assigned");
        }
        Long previousStaffId = complaint.getAssignedStaffId();
        AppUser nextStaff = null;
        if (request.staffId() != null) {
            nextStaff = users.findById(request.staffId()).orElseThrow(() ->
                    new ResponseStatusException(HttpStatus.NOT_FOUND, "Staff account not found"));
            if (!nextStaff.getRole().isDepartmentEmployee() || !nextStaff.isEnabled()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Choose an active staff account");
            }
            if (nextStaff.getDepartment() == null || complaint.getDepartment() == null
                    || nextStaff.getDepartment() != complaint.getDepartment()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Staff must belong to the complaint department");
            }
        }
        if (request.staffId() == null && previousStaffId == null) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "This complaint is already unassigned");
        }

        complaint.setAssignedStaffId(request.staffId());
        complaint.setAssignmentAt(LocalDateTime.now());
        complaint.setAssignmentReason(request.reason().trim());
        complaints.save(complaint);

        String action = request.staffId() == null ? "COMPLAINT_UNASSIGNED"
                : previousStaffId == null ? "COMPLAINT_ASSIGNED" : "COMPLAINT_REASSIGNED";
        String details = "Complaint " + complaintId + "; previous staff " + previousStaffId
                + "; new staff " + request.staffId() + "; reason: " + request.reason().trim();
        auditLogs.save(new AdminAuditLog(admin.getEmail(), action, request.staffId(), details, LocalDateTime.now()));
        return new AssignmentResponse(complaintId, request.staffId(), complaint.getAssignmentAt(), complaint.getAssignmentReason());
    }

    public record AssignmentRequest(Long staffId, @NotBlank @Size(max = 300) String reason) {}
    public record AssignmentResponse(Long complaintId, Long assignedStaffId, LocalDateTime assignedAt, String reason) {}
}
