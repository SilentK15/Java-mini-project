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
    public ComplaintClassificationService.Result classify(@RequestBody ClassifyRequest request) {
        String title = request.title() != null && !request.title().isBlank()
                ? request.title().trim()
                : (request.text() != null ? request.text().trim() : "Civic Issue");
        String description = request.description() != null && !request.description().isBlank()
                ? request.description().trim()
                : (request.text() != null ? request.text().trim() : title);
        String location = request.location() != null && !request.location().isBlank()
                ? request.location().trim()
                : "Thane";

        ComplaintClassificationProvider.Input input = new ComplaintClassificationProvider.Input(
                title.length() > 150 ? title.substring(0, 150) : title,
                description.length() > 2000 ? description.substring(0, 2000) : description,
                location.length() > 255 ? location.substring(0, 255) : location
        );
        return classificationService.recommend(input);
    }

    public record ClassifyRequest(
            String title,
            String description,
            String location,
            String text
    ) {
        public ClassifyRequest(String title, String description, String location) {
            this(title, description, location, null);
        }
    }
}
