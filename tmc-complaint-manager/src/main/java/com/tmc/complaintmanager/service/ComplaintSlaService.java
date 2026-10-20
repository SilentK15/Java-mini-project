package com.tmc.complaintmanager.service;

import com.tmc.complaintmanager.entity.AppUser;
import com.tmc.complaintmanager.entity.Complaint;
import com.tmc.complaintmanager.entity.Department;
import com.tmc.complaintmanager.entity.UserRole;
import com.tmc.complaintmanager.repository.ComplaintRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class ComplaintSlaService {
    private static final List<String> ACTIVE_STATUSES = List.of("SUBMITTED", "IN_PROGRESS", "REOPEN_REQUESTED");

    private final ComplaintRepository complaints;
    private final int responseHours;
    private final int resolutionHours;

    public ComplaintSlaService(ComplaintRepository complaints,
                              @Value("${app.sla.response-hours:0}") int responseHours,
                              @Value("${app.sla.resolution-hours:0}") int resolutionHours) {
        this.complaints = complaints;
        this.responseHours = Math.max(0, responseHours);
        this.resolutionHours = Math.max(0, resolutionHours);
    }

    public LocalDateTime dueAt(Complaint complaint) {
        if (complaint == null) return null;
        String status = complaint.getStatus();
        if ("SUBMITTED".equals(status) && responseHours > 0 && complaint.getCreatedAt() != null) {
            return complaint.getCreatedAt().plusHours(responseHours);
        }
        if ("REOPEN_REQUESTED".equals(status) && responseHours > 0) {
            LocalDateTime anchor = complaint.getStatusChangedAt() != null ? complaint.getStatusChangedAt() : complaint.getCreatedAt();
            return anchor == null ? null : anchor.plusHours(responseHours);
        }
        if ("IN_PROGRESS".equals(status) && resolutionHours > 0) {
            LocalDateTime anchor = complaint.getStatusChangedAt() != null ? complaint.getStatusChangedAt() : complaint.getCreatedAt();
            return anchor == null ? null : anchor.plusHours(resolutionHours);
        }
        return null;
    }

    public boolean isOverdue(Complaint complaint, LocalDateTime now) {
        LocalDateTime dueAt = dueAt(complaint);
        return dueAt != null && dueAt.isBefore(now);
    }

    public long countOverdueForScope(AppUser user, LocalDateTime now) {
        if (user == null) return 0;
        boolean responseEnabled = responseHours > 0;
        boolean resolutionEnabled = resolutionHours > 0;
        if (!responseEnabled && !resolutionEnabled) return 0;

        LocalDateTime responseCutoff = responseEnabled ? now.minusHours(responseHours) : null;
        LocalDateTime resolutionCutoff = resolutionEnabled ? now.minusHours(resolutionHours) : null;
        UserRole role = user.getRole();
        if (role == UserRole.ADMIN) {
            return countGlobal(responseEnabled, responseCutoff, resolutionEnabled, resolutionCutoff);
        }
        if (role.isDepartmentEmployee()) {
            Department department = user.getDepartment();
            if (department == null) return 0;
            return countDepartment(department, responseEnabled, responseCutoff, resolutionEnabled, resolutionCutoff);
        }
        return countCitizen(user.getEmail(), responseEnabled, responseCutoff, resolutionEnabled, resolutionCutoff);
    }

    public long countUnassignedForScope(AppUser user) {
        if (user == null || !user.getRole().isDepartmentEmployee() && user.getRole() != UserRole.ADMIN) return 0;
        if (user.getRole() == UserRole.ADMIN) return complaints.countByAssignedStaffIdIsNullAndStatusIn(ACTIVE_STATUSES);
        return user.getDepartment() == null ? 0
                : complaints.countByDepartmentAndAssignedStaffIdIsNullAndStatusIn(user.getDepartment(), ACTIVE_STATUSES);
    }

    public boolean isConfigured() { return responseHours > 0 || resolutionHours > 0; }

    private long countGlobal(boolean responseEnabled, LocalDateTime responseCutoff,
                             boolean resolutionEnabled, LocalDateTime resolutionCutoff) {
        long count = 0;
        if (responseEnabled) {
            count += complaints.countByStatusAndCreatedAtBefore("SUBMITTED", responseCutoff);
            count += complaints.countByStatusAndStatusChangedAtBefore("REOPEN_REQUESTED", responseCutoff);
        }
        if (resolutionEnabled) count += complaints.countByStatusAndStatusChangedAtBefore("IN_PROGRESS", resolutionCutoff);
        return count;
    }

    private long countDepartment(Department department, boolean responseEnabled, LocalDateTime responseCutoff,
                                 boolean resolutionEnabled, LocalDateTime resolutionCutoff) {
        long count = 0;
        if (responseEnabled) {
            count += complaints.countByDepartmentAndStatusAndCreatedAtBefore(department, "SUBMITTED", responseCutoff);
            count += complaints.countByDepartmentAndStatusAndStatusChangedAtBefore(department, "REOPEN_REQUESTED", responseCutoff);
        }
        if (resolutionEnabled) count += complaints.countByDepartmentAndStatusAndStatusChangedAtBefore(department, "IN_PROGRESS", resolutionCutoff);
        return count;
    }

    private long countCitizen(String email, boolean responseEnabled, LocalDateTime responseCutoff,
                              boolean resolutionEnabled, LocalDateTime resolutionCutoff) {
        if (email == null) return 0;
        long count = 0;
        if (responseEnabled) {
            count += complaints.countBySubmittedByIgnoreCaseAndStatusAndCreatedAtBefore(email, "SUBMITTED", responseCutoff);
            count += complaints.countBySubmittedByIgnoreCaseAndStatusAndStatusChangedAtBefore(email, "REOPEN_REQUESTED", responseCutoff);
        }
        if (resolutionEnabled) count += complaints.countBySubmittedByIgnoreCaseAndStatusAndStatusChangedAtBefore(email, "IN_PROGRESS", resolutionCutoff);
        return count;
    }
}
