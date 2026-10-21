package com.tmc.complaintmanager.controller;

import com.tmc.complaintmanager.entity.Complaint;
import com.tmc.complaintmanager.entity.ComplaintStatusHistory;
import com.tmc.complaintmanager.repository.ComplaintRepository;
import com.tmc.complaintmanager.repository.ComplaintStatusHistoryRepository;
import com.tmc.complaintmanager.service.ComplaintSlaService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@RestController
@RequestMapping("/api/complaints/public")
public class PublicComplaintController {

    private final ComplaintRepository complaintRepository;
    private final ComplaintStatusHistoryRepository historyRepository;
    private final ComplaintSlaService slaService;

    @Autowired
    public PublicComplaintController(ComplaintRepository complaintRepository,
                                     ComplaintStatusHistoryRepository historyRepository,
                                     ComplaintSlaService slaService) {
        this.complaintRepository = complaintRepository;
        this.historyRepository = historyRepository;
        this.slaService = slaService;
    }

    @GetMapping("/track/{complaintNumber}")
    public PublicTrackResponse trackComplaint(@PathVariable String complaintNumber) {
        if (complaintNumber == null || complaintNumber.trim().isEmpty() || complaintNumber.length() > 64) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid complaint number");
        }
        String cleanNumber = complaintNumber.trim();
        Complaint complaint = complaintRepository.findByComplaintNumberIgnoreCase(cleanNumber)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "No grievance found with reference ID: " + cleanNumber));

        List<ComplaintStatusHistory> history = historyRepository.findByComplaintIdOrderByChangedAtAsc(complaint.getId());
        List<PublicTimelineItem> timeline = history.stream().map(h -> new PublicTimelineItem(
                h.getId(),
                h.getPreviousStatus(),
                h.getNewStatus(),
                sanitizeReason(h.getReason()),
                h.getChangedAt()
        )).toList();

        return new PublicTrackResponse(
                complaint.getComplaintNumber(),
                complaint.getTitle(),
                complaint.getCategory(),
                complaint.getDepartment() != null ? complaint.getDepartment().name() : null,
                complaint.getStatus(),
                complaint.getPriority(),
                complaint.getCreatedAt(),
                slaService.dueAt(complaint),
                slaService.isOverdue(complaint, LocalDateTime.now()),
                toApproximateLocation(complaint.getLocation()),
                timeline
        );
    }

    public static String toApproximateLocation(String location) {
        if (location == null || location.isBlank()) {
            return "Thane Municipal Area";
        }
        Matcher wardMatcher = Pattern.compile("(?i)(Ward\\s*\\d+[^,]*)").matcher(location);
        if (wardMatcher.find()) {
            return wardMatcher.group(1).trim();
        }
        String[] knownAreas = {
            "Naupada-Kopri", "Naupada", "Kopri", "Panchpakhadi", "Wagle Estate",
            "Vartak Nagar", "Upvan", "Yeoor", "Majiwada-Manpada", "Majiwada",
            "Manpada", "Ghodbunder Road", "Ghodbunder", "Kalwa", "Mumbra", "Diva",
            "Balkum", "Dhokali", "Kolshet", "Hiranandani Estate", "Kasarvadavali",
            "Waghbil", "Brahmand", "Lokmanya Nagar", "Savarkar Nagar"
        };
        for (String area : knownAreas) {
            if (Pattern.compile("(?i)\\b" + Pattern.quote(area) + "\\b").matcher(location).find()) {
                return area + " Area";
            }
        }
        String[] parts = location.split(",");
        if (parts.length >= 2) {
            return parts[parts.length - 2].trim() + ", " + parts[parts.length - 1].trim();
        }
        return location.trim();
    }

    @GetMapping("/stats")
    public PublicStatsResponse getPublicStats() {
        long total = complaintRepository.count();
        long resolved = complaintRepository.countByStatus("RESOLVED");
        long inProgress = complaintRepository.countByStatus("IN_PROGRESS");
        long pending = complaintRepository.countByStatus("SUBMITTED");

        List<Complaint> resolvedList = complaintRepository.findByStatus("RESOLVED");
        double avgHours = 0.0;
        if (!resolvedList.isEmpty()) {
            double totalHours = 0.0;
            int count = 0;
            for (Complaint c : resolvedList) {
                if (c.getCreatedAt() != null && c.getStatusChangedAt() != null) {
                    long minutes = java.time.Duration.between(c.getCreatedAt(), c.getStatusChangedAt()).toMinutes();
                    if (minutes > 0) {
                        totalHours += minutes / 60.0;
                        count++;
                    }
                }
            }
            if (count > 0) {
                avgHours = Math.round((totalHours / count) * 10.0) / 10.0;
            }
        }

        return new PublicStatsResponse(total, resolved, inProgress, pending, avgHours);
    }

    private String sanitizeReason(String reason) {
        if (reason == null || reason.trim().isEmpty()) {
            return "Status update recorded";
        }
        String sanitized = reason.replaceAll("[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}", "[redacted]");
        sanitized = sanitized.replaceAll("\\b\\d{10}\\b", "[redacted]");
        return sanitized.trim();
    }

    public record PublicTimelineItem(Long id, String previousStatus, String newStatus, String reason, LocalDateTime changedAt) {}

    public record PublicStatsResponse(
            long totalComplaints,
            long resolvedComplaints,
            long inProgressComplaints,
            long pendingComplaints,
            double averageResolutionHours
    ) {}

    public record PublicTrackResponse(
            String complaintNumber,
            String title,
            String category,
            String department,
            String status,
            String priority,
            LocalDateTime createdAt,
            LocalDateTime slaDueAt,
            boolean overdue,
            String location,
            List<PublicTimelineItem> timeline
    ) {}
}
