package com.tmc.complaintmanager.controller;

import com.tmc.complaintmanager.entity.AppUser;
import com.tmc.complaintmanager.entity.Complaint;
import com.tmc.complaintmanager.entity.ComplaintStatusHistory;
import com.tmc.complaintmanager.entity.UserRole;
import com.tmc.complaintmanager.service.ComplaintImageStorage;
import com.tmc.complaintmanager.service.ComplaintSlaService;
import com.tmc.complaintmanager.service.ComplaintService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@RequestMapping("/api/complaints")
public class ComplaintController {
    private static final int MAX_SEARCH_LENGTH = 150;
    private final ComplaintService complaintService;
    private final ComplaintImageStorage imageStorage;
    private final ComplaintSlaService slaService;

    @Autowired
    public ComplaintController(ComplaintService complaintService, ComplaintImageStorage imageStorage,
                               ComplaintSlaService slaService) {
        this.complaintService = complaintService;
        this.imageStorage = imageStorage;
        this.slaService = slaService;
    }

    public ComplaintController(ComplaintService complaintService, ComplaintImageStorage imageStorage) {
        this(complaintService, imageStorage, new ComplaintSlaService(null, 0, 0));
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasRole('CITIZEN')")
    public ComplaintResponse createComplaint(@Valid @ModelAttribute ComplaintSubmissionRequest body,
                                     @RequestParam(required = false) MultipartFile image,
                                     @RequestHeader("Idempotency-Key") String submissionKey,
                                     @AuthenticationPrincipal AppUser user) {
        if (submissionKey == null || !submissionKey.matches("(?i)[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "A valid submission key is required");
        }
        ComplaintResponse priorReceipt = findOwnedSubmissionReceipt(submissionKey, user);
        if (priorReceipt != null) return priorReceipt;
        Complaint complaint = new Complaint();
        complaint.setTitle(body.title());
        complaint.setDescription(body.description());
        complaint.setCategory(body.category());
        complaint.setLocation(body.location());
        complaint.setPriority(body.priority());
        complaint.setLatitude(body.latitude());
        complaint.setLongitude(body.longitude());
        complaint.setSubmittedBy(user.getEmail());
        if ((complaint.getLatitude() == null) != (complaint.getLongitude() == null)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Provide both GPS coordinates or leave both blank");
        }
        String storageKey = imageStorage.store(image);
        complaint.setImageUrl(storageKey);
        try {
            return toResponse(complaintService.createComplaint(complaint, submissionKey), user);
        } catch (DataIntegrityViolationException exception) {
            imageStorage.delete(storageKey);
            ComplaintResponse concurrentReceipt = findOwnedSubmissionReceipt(submissionKey, user);
            if (concurrentReceipt != null) return concurrentReceipt;
            throw exception;
        } catch (RuntimeException exception) {
            imageStorage.delete(storageKey);
            throw exception;
        }
    }

    @GetMapping
    public ComplaintPage getComplaints(@AuthenticationPrincipal AppUser user,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String priority,
            @RequestParam(defaultValue = "NEWEST") String sort) {
        if (page < 0) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Page must be zero or greater");
        if (search != null && search.length() > MAX_SEARCH_LENGTH) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Search must be 150 characters or fewer");
        }
        int safeSize = Math.max(1, Math.min(size, 50));
        Page<Complaint> result = complaintService.search(user, page, safeSize,
                search == null ? null : search.trim(), status, category, priority, sort);
        Counts counts = new Counts(
                complaintService.countForScope(user, null),
                complaintService.countForScope(user, "SUBMITTED"),
                complaintService.countForScope(user, "IN_PROGRESS"),
                complaintService.countForScope(user, "RESOLVED"),
                complaintService.countAssignedForScope(user),
                slaService.countOverdueForScope(user, java.time.LocalDateTime.now()),
                slaService.countUnassignedForScope(user), slaService.isConfigured());
        return new ComplaintPage(result.getContent().stream().map(complaint -> toResponse(complaint, user)).toList(), result.getNumber(), result.getSize(),
                result.getTotalElements(), result.getTotalPages(), counts);
    }

    @GetMapping("/{id}")
    public ComplaintResponse getComplaintById(@PathVariable String id, @AuthenticationPrincipal AppUser user) {
        Complaint complaint = complaintService.getComplaintByIdOrNumber(id);
        boolean isAdmin = user.getRole() == UserRole.ADMIN;
        boolean isAssignedStaff = isDepartmentStaffFor(user, complaint);
        boolean isOwner = user.getRole() == UserRole.CITIZEN && user.getEmail().equalsIgnoreCase(complaint.getSubmittedBy());
        if (!isAdmin && !isAssignedStaff && !isOwner) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You cannot view this complaint");
        }
        return toResponse(complaint, user);
    }

    @GetMapping("/{id}/image")
    public ResponseEntity<Resource> getComplaintImage(@PathVariable Long id,
                                                       @AuthenticationPrincipal AppUser user) {
        Complaint complaint = complaintService.getComplaintByIdOrNumber(id);
        assertCanAccess(complaint, user);
        String storageKey = complaint.getImageUrl();
        java.nio.file.Path path = imageStorage.resolve(storageKey);
        return ResponseEntity.ok()
                .contentType(imageStorage.mediaType(storageKey))
                .cacheControl(CacheControl.noStore())
                .header("X-Content-Type-Options", "nosniff")
                .body(new FileSystemResource(path));
    }

    @PostMapping(value = "/{id}/resolution-evidence", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAnyRole('ADMIN', 'STAFF', 'FIELD_STAFF', 'DEPARTMENT_OFFICER', 'SUPERVISOR')")
    public ComplaintResponse addResolutionEvidence(@PathVariable Long id, @RequestParam MultipartFile image,
                                                    @AuthenticationPrincipal AppUser user) {
        Complaint complaint = complaintService.getComplaintByIdOrNumber(id);
        if (user.getRole().isDepartmentEmployee() && !isDepartmentStaffFor(user, complaint)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You can only add evidence for your department");
        }
        if (image == null || image.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Choose a resolution photo");
        }
        String previousImage = complaint.getResolutionImageUrl();
        String storageKey = imageStorage.store(image);
        try {
            Complaint saved = complaintService.updateResolutionImage(id, storageKey);
            if (previousImage != null && !previousImage.equals(storageKey)) imageStorage.delete(previousImage);
            return toResponse(saved, user);
        } catch (RuntimeException exception) {
            imageStorage.delete(storageKey);
            throw exception;
        }
    }

    @GetMapping("/{id}/resolution-image")
    public ResponseEntity<Resource> getResolutionImage(@PathVariable Long id,
                                                        @AuthenticationPrincipal AppUser user) {
        Complaint complaint = complaintService.getComplaintByIdOrNumber(id);
        assertCanAccess(complaint, user);
        if (user.getRole() == UserRole.CITIZEN && !List.of("RESOLVED", "REOPEN_REQUESTED").contains(complaint.getStatus())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Resolution evidence is available after resolution");
        }
        String storageKey = complaint.getResolutionImageUrl();
        java.nio.file.Path path = imageStorage.resolve(storageKey);
        return ResponseEntity.ok()
                .contentType(imageStorage.mediaType(storageKey))
                .cacheControl(CacheControl.noStore())
                .header("X-Content-Type-Options", "nosniff")
                .body(new FileSystemResource(path));
    }

    @GetMapping("/{id}/history")
    public List<StatusHistoryResponse> getComplaintHistory(@PathVariable Long id,
                                                            @AuthenticationPrincipal AppUser user) {
        Complaint complaint = complaintService.getComplaintByIdOrNumber(id);
        assertCanAccess(complaint, user);
        return complaintService.getStatusHistory(id).stream().map(event -> new StatusHistoryResponse(
                event.getId(), event.getPreviousStatus(), event.getNewStatus(), event.getReason(),
                user.getRole() == UserRole.ADMIN ? event.getActorEmail()
                        : event.getActorEmail().equalsIgnoreCase(user.getEmail()) ? "You" : "TMC staff",
                event.getChangedAt())).toList();
    }

    @PostMapping("/{id}/appeal")
    @PreAuthorize("hasRole('CITIZEN')")
    public ComplaintResponse requestReopen(@PathVariable Long id, @Valid @RequestBody AppealRequest body,
                                            @AuthenticationPrincipal AppUser user) {
        return toResponse(complaintService.requestReopen(id, user.getEmail(), body.reason()), user);
    }

    @PostMapping("/{id}/feedback")
    @PreAuthorize("hasRole('CITIZEN')")
    public ComplaintResponse submitFeedback(@PathVariable Long id, @Valid @RequestBody FeedbackRequest body,
                                             @AuthenticationPrincipal AppUser user) {
        return toResponse(complaintService.submitFeedback(id, user.getEmail(), body.rating(), body.feedback()), user);
    }

    @PutMapping("/{id}/status")
    @PreAuthorize("hasAnyRole('ADMIN', 'STAFF', 'FIELD_STAFF', 'DEPARTMENT_OFFICER', 'SUPERVISOR')")
    public ComplaintResponse updateStatus(@PathVariable Long id, @RequestParam String status,
                                  @RequestParam(required = false) String reason,
                                  @AuthenticationPrincipal AppUser user) {
        Complaint complaint = complaintService.getComplaintByIdOrNumber(id);
        if (user.getRole().isDepartmentEmployee() && !isDepartmentStaffFor(user, complaint)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You can only update complaints for your department");
        }
        return toResponse(complaintService.updateStatus(id, status, user.getEmail(), reason), user);
    }

    private void assertCanAccess(Complaint complaint, AppUser user) {
        boolean isAdmin = user.getRole() == UserRole.ADMIN;
        boolean isAssignedStaff = isDepartmentStaffFor(user, complaint);
        boolean isOwner = user.getRole() == UserRole.CITIZEN && user.getEmail().equalsIgnoreCase(complaint.getSubmittedBy());
        if (!isAdmin && !isAssignedStaff && !isOwner) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You cannot view this complaint");
        }
    }

    private boolean isDepartmentStaffFor(AppUser user, Complaint complaint) {
        return user.getRole().isDepartmentEmployee()
                && user.getDepartment() != null
                && complaint.getDepartment() != null
                && user.getDepartment() == complaint.getDepartment();
    }

    private ComplaintResponse findOwnedSubmissionReceipt(String submissionKey, AppUser user) {
        Complaint prior = complaintService.findComplaintBySubmissionKey(submissionKey);
        if (prior == null) return null;
        if (prior.getSubmittedBy() == null || !prior.getSubmittedBy().equalsIgnoreCase(user.getEmail())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "This submission key has already been used");
        }
        return toResponse(prior, user);
    }

    private ComplaintResponse toResponse(Complaint complaint, AppUser viewer) {
        String imageEndpoint = complaint.getImageUrl() == null ? null : "/api/complaints/" + complaint.getId() + "/image";
        String resolutionImageEndpoint = complaint.getResolutionImageUrl() == null
                || (viewer.getRole() == UserRole.CITIZEN
                    && !List.of("RESOLVED", "REOPEN_REQUESTED").contains(complaint.getStatus())) ? null
                : "/api/complaints/" + complaint.getId() + "/resolution-image";
        return new ComplaintResponse(complaint.getId(), complaint.getComplaintNumber(), complaint.getTitle(),
                complaint.getDescription(), complaint.getCategory(), complaint.getLocation(), complaint.getPriority(),
                complaint.getStatus(), complaint.getDepartment(), imageEndpoint, complaint.getLatitude(),
                complaint.getLongitude(), complaint.getCreatedAt(), complaint.getCitizenRating(),
                complaint.getCitizenFeedback(), complaint.getFeedbackAt(),
                viewer.getRole() == UserRole.CITIZEN ? null : complaint.getAssignedStaffId(), resolutionImageEndpoint,
                slaService.dueAt(complaint), slaService.isOverdue(complaint, java.time.LocalDateTime.now()));
    }

    public record Counts(long total, long submitted, long inProgress, long resolved, long assigned,
                         long overdue, long unassigned, boolean slaConfigured) {}
    public record StatusHistoryResponse(Long id, String previousStatus, String newStatus, String reason,
                                        String actor, java.time.LocalDateTime changedAt) {}
    public record AppealRequest(@NotBlank @Size(max = 1000) String reason) {}
    public record FeedbackRequest(@Min(1) @Max(5) int rating, @Size(max = 1000) String feedback) {}
    public record ComplaintResponse(Long id, String complaintNumber, String title, String description, String category,
                                    String location, String priority, String status,
                                    com.tmc.complaintmanager.entity.Department department, String imageUrl,
                                    Double latitude, Double longitude, java.time.LocalDateTime createdAt,
                                    Integer citizenRating, String citizenFeedback, java.time.LocalDateTime feedbackAt,
                                    Long assignedStaffId, String resolutionImageUrl,
                                    java.time.LocalDateTime slaDueAt, boolean overdue) {}
    public record ComplaintPage(List<ComplaintResponse> complaints, int page, int size,
                                long totalElements, int totalPages, Counts counts) {}
    public record ComplaintSubmissionRequest(
            @NotBlank @Size(max = 150) String title,
            @NotBlank @Size(max = 2000) String description,
            @NotBlank @Pattern(regexp = "ROAD|GARBAGE|WATER|ELECTRICITY|STREET_LIGHT|DRAINAGE|OTHER") String category,
            @NotBlank @Size(max = 255) String location,
            @NotBlank @Pattern(regexp = "LOW|MEDIUM|HIGH") String priority,
            @DecimalMin("-90.0") @DecimalMax("90.0") Double latitude,
            @DecimalMin("-180.0") @DecimalMax("180.0") Double longitude) {}
}
