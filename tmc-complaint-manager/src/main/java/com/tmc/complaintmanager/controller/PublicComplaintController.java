package com.tmc.complaintmanager.controller;

import com.tmc.complaintmanager.entity.Complaint;
import com.tmc.complaintmanager.entity.ComplaintStatusHistory;
import com.tmc.complaintmanager.repository.ComplaintRepository;
import com.tmc.complaintmanager.repository.ComplaintStatusHistoryRepository;
import com.tmc.complaintmanager.service.ComplaintImageStorage;
import com.tmc.complaintmanager.service.ComplaintSlaService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.nio.file.Path;
import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/complaints/public")
public class PublicComplaintController {

    private final ComplaintRepository complaintRepository;
    private final ComplaintStatusHistoryRepository historyRepository;
    private final ComplaintImageStorage imageStorage;
    private final ComplaintSlaService slaService;

    @Autowired
    public PublicComplaintController(ComplaintRepository complaintRepository,
                                     ComplaintStatusHistoryRepository historyRepository,
                                     ComplaintImageStorage imageStorage,
                                     ComplaintSlaService slaService) {
        this.complaintRepository = complaintRepository;
        this.historyRepository = historyRepository;
        this.imageStorage = imageStorage;
        this.slaService = slaService;
    }

    @GetMapping("/track/{complaintNumber}")
    public PublicTrackResponse trackComplaint(@PathVariable String complaintNumber) {
        if (complaintNumber == null || complaintNumber.trim().isEmpty() || complaintNumber.length() > 64) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid complaint number");
        }
        String cleanNumber = complaintNumber.trim().toUpperCase();
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

        String imageEndpoint = complaint.getImageUrl() != null
                ? "/api/complaints/public/" + complaint.getComplaintNumber() + "/image"
                : null;
        String resolutionImageEndpoint = (complaint.getResolutionImageUrl() != null && List.of("RESOLVED", "REOPEN_REQUESTED").contains(complaint.getStatus()))
                ? "/api/complaints/public/" + complaint.getComplaintNumber() + "/resolution-image"
                : null;

        return new PublicTrackResponse(
                complaint.getComplaintNumber(),
                complaint.getTitle(),
                complaint.getDescription(),
                complaint.getCategory(),
                complaint.getLocation(),
                complaint.getPriority(),
                complaint.getStatus(),
                complaint.getDepartment() != null ? complaint.getDepartment().name() : null,
                complaint.getCreatedAt(),
                slaService.dueAt(complaint),
                slaService.isOverdue(complaint, LocalDateTime.now()),
                complaint.getCitizenRating(),
                complaint.getCitizenFeedback(),
                imageEndpoint,
                resolutionImageEndpoint,
                timeline
        );
    }

    @GetMapping("/{complaintNumber}/image")
    public ResponseEntity<Resource> getPublicComplaintImage(@PathVariable String complaintNumber) {
        Complaint complaint = complaintRepository.findByComplaintNumberIgnoreCase(complaintNumber)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Complaint not found"));
        if (complaint.getImageUrl() == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Image not found");
        }
        Path path = imageStorage.resolve(complaint.getImageUrl());
        return ResponseEntity.ok()
                .contentType(imageStorage.mediaType(complaint.getImageUrl()))
                .cacheControl(CacheControl.noStore())
                .header("X-Content-Type-Options", "nosniff")
                .body(new FileSystemResource(path));
    }

    @GetMapping("/{complaintNumber}/resolution-image")
    public ResponseEntity<Resource> getPublicResolutionImage(@PathVariable String complaintNumber) {
        Complaint complaint = complaintRepository.findByComplaintNumberIgnoreCase(complaintNumber)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Complaint not found"));
        if (complaint.getResolutionImageUrl() == null || !List.of("RESOLVED", "REOPEN_REQUESTED").contains(complaint.getStatus())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Resolution image not available");
        }
        Path path = imageStorage.resolve(complaint.getResolutionImageUrl());
        return ResponseEntity.ok()
                .contentType(imageStorage.mediaType(complaint.getResolutionImageUrl()))
                .cacheControl(CacheControl.noStore())
                .header("X-Content-Type-Options", "nosniff")
                .body(new FileSystemResource(path));
    }

    private String sanitizeReason(String reason) {
        if (reason == null || reason.trim().isEmpty()) {
            return "Status update recorded";
        }
        return reason.trim();
    }

    public record PublicTimelineItem(Long id, String previousStatus, String newStatus, String reason, LocalDateTime changedAt) {}

    public record PublicTrackResponse(
            String complaintNumber,
            String title,
            String description,
            String category,
            String location,
            String priority,
            String status,
            String department,
            LocalDateTime createdAt,
            LocalDateTime slaDueAt,
            boolean overdue,
            Integer citizenRating,
            String citizenFeedback,
            String imageUrl,
            String resolutionImageUrl,
            List<PublicTimelineItem> timeline
    ) {}
}
