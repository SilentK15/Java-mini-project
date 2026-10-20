package com.tmc.complaintmanager.controller;

import com.tmc.complaintmanager.entity.Department;
import com.tmc.complaintmanager.repository.ComplaintRepository;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Arrays;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/analytics")
@PreAuthorize("hasRole('ADMIN')")
public class AdminAnalyticsController {
    private final ComplaintRepository complaints;

    public AdminAnalyticsController(ComplaintRepository complaints) {
        this.complaints = complaints;
    }

    @GetMapping("/departments")
    public List<DepartmentSummary> departments() {
        Map<Department, MutableSummary> totals = new EnumMap<>(Department.class);
        Arrays.stream(Department.values()).forEach(department -> totals.put(department, new MutableSummary()));
        MutableSummary unassigned = new MutableSummary();
        for (Object[] row : complaints.countByDepartmentAndStatusGrouped()) {
            Department department = (Department) row[0];
            String status = (String) row[1];
            long count = ((Number) row[2]).longValue();
            MutableSummary summary = department == null ? unassigned : totals.get(department);
            summary.total += count;
            switch (status) {
                case "SUBMITTED" -> summary.submitted = count;
                case "IN_PROGRESS" -> summary.inProgress = count;
                case "REOPEN_REQUESTED" -> summary.reopenRequested = count;
                case "RESOLVED" -> summary.resolved = count;
                default -> { }
            }
        }
        List<DepartmentSummary> summaries = Arrays.stream(Department.values()).map(department -> {
            MutableSummary summary = totals.get(department);
            return new DepartmentSummary(department.name(), summary.total, summary.submitted,
                    summary.inProgress, summary.reopenRequested, summary.resolved);
        }).collect(java.util.stream.Collectors.toCollection(java.util.ArrayList::new));
        summaries.add(new DepartmentSummary("UNASSIGNED", unassigned.total, unassigned.submitted,
                unassigned.inProgress, unassigned.reopenRequested, unassigned.resolved));
        return List.copyOf(summaries);
    }

    private static final class MutableSummary {
        private long total;
        private long submitted;
        private long inProgress;
        private long reopenRequested;
        private long resolved;
    }

    public record DepartmentSummary(String department, long total, long submitted, long inProgress,
                                    long reopenRequested, long resolved) {}
}
