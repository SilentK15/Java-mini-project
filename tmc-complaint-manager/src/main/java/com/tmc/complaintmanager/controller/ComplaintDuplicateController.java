package com.tmc.complaintmanager.controller;

import com.tmc.complaintmanager.entity.Complaint;
import com.tmc.complaintmanager.service.ComplaintDuplicateDetectionService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import java.util.List;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/complaints")
@PreAuthorize("hasAnyRole('CITIZEN', 'ADMIN', 'STAFF', 'FIELD_STAFF', 'DEPARTMENT_OFFICER', 'SUPERVISOR')")
public class ComplaintDuplicateController {
    private final ComplaintDuplicateDetectionService duplicateDetection;

    public ComplaintDuplicateController(ComplaintDuplicateDetectionService duplicateDetection) {
        this.duplicateDetection = duplicateDetection;
    }

    @PostMapping("/possible-duplicates")
    public DuplicateCheckResult possibleDuplicates(@RequestBody DuplicateCheckRequest request) {
        String category = request.category() != null ? request.category().trim().toUpperCase(java.util.Locale.ROOT) : "OTHER";
        String title = request.title() != null ? request.title().trim() : "";
        String description = request.description() != null ? request.description().trim() : title;
        String location = request.location() != null ? request.location().trim() : "";

        Complaint draft = new Complaint();
        draft.setTitle(title);
        draft.setDescription(description);
        draft.setCategory(category);
        draft.setLocation(location);
        draft.setLatitude(request.latitude());
        draft.setLongitude(request.longitude());

        List<ComplaintDuplicateDetectionService.Suggestion> duplicates = duplicateDetection.findPossibleDuplicates(draft);
        return new DuplicateCheckResult(!duplicates.isEmpty(), duplicates);
    }

    public record DuplicateCheckRequest(
            String title,
            String description,
            String category,
            String location,
            Double latitude,
            Double longitude) {
        public DuplicateCheckRequest(String title, String description, String category, String location) {
            this(title, description, category, location, null, null);
        }
    }

    public record DuplicateCheckResult(boolean possibleMatch, List<ComplaintDuplicateDetectionService.Suggestion> duplicates) {
        public DuplicateCheckResult(boolean possibleMatch) {
            this(possibleMatch, List.of());
        }
    }
}
