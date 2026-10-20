package com.tmc.complaintmanager.controller;

import com.tmc.complaintmanager.service.ComplaintClassificationProvider;
import com.tmc.complaintmanager.service.ComplaintClassificationService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Advisory complaint classification endpoint.
 * Recommendations are advisory suggestions only and are never automatically
 * applied as official municipal determinations.
 */
@RestController
@RequestMapping("/api/complaints")
@PreAuthorize("hasAnyRole('CITIZEN', 'STAFF', 'FIELD_STAFF', 'DEPARTMENT_OFFICER', 'SUPERVISOR', 'ADMIN')")
public class ComplaintClassificationController {

    private final ComplaintClassificationService classificationService;

    public ComplaintClassificationController(ComplaintClassificationService classificationService) {
        this.classificationService = classificationService;
    }

    @PostMapping("/classify")
    public ComplaintClassificationService.Result classify(@Valid @RequestBody ClassifyRequest request) {
        ComplaintClassificationProvider.Input input = new ComplaintClassificationProvider.Input(
                request.title().trim(),
                request.description().trim(),
                request.location().trim()
        );
        return classificationService.recommend(input);
    }

    public record ClassifyRequest(
            @NotBlank(message = "Title is required")
            @Size(max = 150, message = "Title must be 150 characters or fewer")
            String title,

            @NotBlank(message = "Description is required")
            @Size(max = 2000, message = "Description must be 2000 characters or fewer")
            String description,

            @NotBlank(message = "Location is required")
            @Size(max = 255, message = "Location must be 255 characters or fewer")
            String location
    ) {}
}
