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
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/complaints")
@PreAuthorize("hasRole('CITIZEN')")
public class ComplaintDuplicateController {
    private final ComplaintDuplicateDetectionService duplicateDetection;

    public ComplaintDuplicateController(ComplaintDuplicateDetectionService duplicateDetection) {
        this.duplicateDetection = duplicateDetection;
    }

    @PostMapping("/possible-duplicates")
    public DuplicateCheckResult possibleDuplicates(@Valid @RequestBody DuplicateCheckRequest request) {
        if ((request.latitude() == null) != (request.longitude() == null)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Provide both GPS coordinates or leave both blank");
        }
        Complaint draft = new Complaint();
        draft.setTitle(request.title().trim());
        draft.setDescription(request.description().trim());
        draft.setCategory(request.category().trim().toUpperCase(java.util.Locale.ROOT));
        draft.setLocation(request.location().trim());
        draft.setLatitude(request.latitude());
        draft.setLongitude(request.longitude());
        return new DuplicateCheckResult(!duplicateDetection.findPossibleDuplicates(draft).isEmpty());
    }

    public record DuplicateCheckRequest(
            @NotBlank @Size(max = 150) String title,
            @NotBlank @Size(max = 2000) String description,
            @NotBlank @Pattern(regexp = "(?i)ROAD|GARBAGE|WATER|ELECTRICITY|STREET_LIGHT|DRAINAGE|OTHER") String category,
            @NotBlank @Size(max = 255) String location,
            @DecimalMin("-90.0") @DecimalMax("90.0") Double latitude,
            @DecimalMin("-180.0") @DecimalMax("180.0") Double longitude) {}

    public record DuplicateCheckResult(boolean possibleMatch) {}
}
