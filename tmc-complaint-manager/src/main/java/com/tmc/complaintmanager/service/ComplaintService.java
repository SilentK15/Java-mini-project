package com.tmc.complaintmanager.service;

import com.tmc.complaintmanager.entity.AppUser;
import com.tmc.complaintmanager.entity.Complaint;
import com.tmc.complaintmanager.entity.ComplaintStatusHistory;
import com.tmc.complaintmanager.entity.Department;
import com.tmc.complaintmanager.entity.UserRole;
import com.tmc.complaintmanager.repository.ComplaintRepository;
import com.tmc.complaintmanager.repository.ComplaintStatusHistoryRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;

@Service
public class ComplaintService {
    private static final int MAX_SEARCH_LENGTH = 150;
    private static final List<String> ACTIVE_STATUSES = List.of("SUBMITTED", "IN_PROGRESS", "REOPEN_REQUESTED");
    private final ComplaintRepository complaintRepository;
    private final ComplaintStatusHistoryRepository historyRepository;
    private final ApplicationEventPublisher events;
    private final ComplaintNumberGenerator numberGenerator;

    public ComplaintService(ComplaintRepository complaintRepository, ComplaintStatusHistoryRepository historyRepository) {
        this(complaintRepository, historyRepository, event -> { }, null);
    }

    public ComplaintService(ComplaintRepository complaintRepository, ComplaintStatusHistoryRepository historyRepository,
                            ApplicationEventPublisher events) {
        this(complaintRepository, historyRepository, events, null);
    }

    @Autowired
    public ComplaintService(ComplaintRepository complaintRepository, ComplaintStatusHistoryRepository historyRepository,
                            ApplicationEventPublisher events, ComplaintNumberGenerator numberGenerator) {
        this.complaintRepository = complaintRepository;
        this.historyRepository = historyRepository;
        this.events = events;
        this.numberGenerator = numberGenerator;
    }

    @Transactional
    public Complaint createComplaint(Complaint complaint) {
        return createComplaint(complaint, null);
    }

    @Transactional
    public Complaint createComplaint(Complaint complaint, String submissionKey) {
        if (submissionKey != null) {
            Complaint prior = complaintRepository.findBySubmissionKey(submissionKey).orElse(null);
            if (prior != null) {
                if (prior.getSubmittedBy() == null || !prior.getSubmittedBy().equalsIgnoreCase(complaint.getSubmittedBy())) {
                    throw new ResponseStatusException(HttpStatus.CONFLICT, "This submission key has already been used");
                }
                return prior;
            }
            complaint.setSubmissionKey(submissionKey);
        }
        complaint.setId(null);
        complaint.setAssignedStaffId(null);
        complaint.setAssignmentAt(null);
        complaint.setAssignmentReason(null);
        complaint.setResolutionImageUrl(null);
        complaint.setCitizenRating(null);
        complaint.setCitizenFeedback(null);
        complaint.setFeedbackAt(null);
        complaint.setDepartment(routeDepartment(complaint.getCategory()));
        String complaintNumber;
        if (numberGenerator != null) {
            complaintNumber = numberGenerator.nextComplaintNumber();
        } else {
            int year = LocalDateTime.now().getYear();
            long fallbackCount = complaintRepository.count() + 1;
            complaintNumber = String.format(Locale.ROOT, "TMC-%d-%06d", year, fallbackCount);
        }
        complaint.setComplaintNumber(complaintNumber);
        complaint.setStatus("SUBMITTED");
        LocalDateTime submittedAt = LocalDateTime.now();
        complaint.setCreatedAt(submittedAt);
        complaint.setStatusChangedAt(submittedAt);
        Complaint saved = complaintRepository.save(complaint);
        historyRepository.save(new ComplaintStatusHistory(saved.getId(), null, "SUBMITTED",
                "Complaint submitted", saved.getSubmittedBy(), submittedAt));
        publishStatusNotification(saved);
        return saved;
    }

    public Page<Complaint> search(AppUser user, int page, int size, String search,
                                  String status, String category, String priority) {
        return search(user, page, size, search, status, category, priority, "NEWEST");
    }

    public Page<Complaint> search(AppUser user, int page, int size, String search,
                                  String status, String category, String priority, String sortOption) {
        Sort sort = switch (sortOption == null ? "NEWEST" : sortOption.trim().toUpperCase(Locale.ROOT)) {
            case "OLDEST" -> Sort.by(Sort.Direction.ASC, "createdAt").and(Sort.by(Sort.Direction.ASC, "id"));
            case "TITLE" -> Sort.by(Sort.Direction.ASC, "title").and(Sort.by(Sort.Direction.DESC, "createdAt"))
                    .and(Sort.by(Sort.Direction.DESC, "id"));
            case "PRIORITY" -> Sort.by(Sort.Direction.ASC, "priority").and(Sort.by(Sort.Direction.DESC, "createdAt"))
                    .and(Sort.by(Sort.Direction.DESC, "id"));
            default -> Sort.by(Sort.Direction.DESC, "createdAt").and(Sort.by(Sort.Direction.DESC, "id"));
        };
        Pageable pageable = PageRequest.of(page, size, sort);
        Specification<Complaint> specification = (root, query, builder) -> builder.conjunction();
        if (user.getRole() == UserRole.CITIZEN) {
            specification = specification.and((root, query, builder) ->
                    builder.equal(builder.lower(root.get("submittedBy")), user.getEmail().toLowerCase(Locale.ROOT)));
        } else if (user.getRole().isDepartmentEmployee()) {
            if (user.getDepartment() == null) return Page.empty(pageable);
            specification = specification.and((root, query, builder) ->
                    builder.equal(root.get("department"), user.getDepartment()));
        }
        if (hasValue(status) && !"ALL".equalsIgnoreCase(status)) {
            String value = status.trim().toUpperCase(Locale.ROOT);
            specification = specification.and((root, query, builder) -> builder.equal(root.get("status"), value));
        }
        if (hasValue(category) && !"ALL".equalsIgnoreCase(category)) {
            String value = category.trim().toUpperCase(Locale.ROOT);
            specification = specification.and((root, query, builder) -> builder.equal(root.get("category"), value));
        }
        if (hasValue(priority) && !"ALL".equalsIgnoreCase(priority)) {
            String value = priority.trim().toUpperCase(Locale.ROOT);
            specification = specification.and((root, query, builder) -> builder.equal(root.get("priority"), value));
        }
        if (hasValue(search)) {
            if (search.length() > MAX_SEARCH_LENGTH) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Search must be 150 characters or fewer");
            }
            String value = "%" + escapeLikeSearch(search.trim().toLowerCase(Locale.ROOT)) + "%";
            specification = specification.and((root, query, builder) -> builder.or(
                    builder.like(builder.lower(root.get("complaintNumber")), value, '\\'),
                    builder.like(builder.lower(root.get("title")), value, '\\'),
                    builder.like(builder.lower(root.get("description")), value, '\\'),
                    builder.like(builder.lower(root.get("location")), value, '\\')));
        }
        return complaintRepository.findAll(specification, pageable);
    }

    public long countForScope(AppUser user, String status) {
        if (user.getRole() == UserRole.ADMIN) return status == null
                ? complaintRepository.count() : complaintRepository.countByStatus(status);
        if (user.getRole().isDepartmentEmployee()) {
            if (user.getDepartment() == null) return 0;
            return status == null ? complaintRepository.countByDepartment(user.getDepartment())
                    : complaintRepository.countByDepartmentAndStatus(user.getDepartment(), status);
        }
        return status == null ? complaintRepository.countBySubmittedByIgnoreCase(user.getEmail())
                : complaintRepository.countBySubmittedByIgnoreCaseAndStatus(user.getEmail(), status);
    }

    public long countAssignedForScope(AppUser user) {
        if (user.getRole() == UserRole.ADMIN) {
            return complaintRepository.countByAssignedStaffIdIsNotNullAndStatusIn(ACTIVE_STATUSES);
        }
        if (user.getRole().isDepartmentEmployee()) {
            if (user.getDepartment() == null) return 0;
            return complaintRepository.countByDepartmentAndAssignedStaffIdIsNotNullAndStatusIn(user.getDepartment(), ACTIVE_STATUSES);
        }
        return complaintRepository.countBySubmittedByIgnoreCaseAndAssignedStaffIdIsNotNullAndStatusIn(user.getEmail(), ACTIVE_STATUSES);
    }

    public Complaint getComplaintById(Long id) {
        return complaintRepository.findById(id).orElseThrow(() ->
                new ResponseStatusException(HttpStatus.NOT_FOUND, "Complaint not found"));
    }

    @Transactional
    public Complaint updateStatus(Long id, String status, String actorEmail, String reason) {
        Complaint complaint = getComplaintByIdForUpdate(id);
        String normalizedStatus = status == null ? "" : status.trim().toUpperCase(Locale.ROOT);
        if (!List.of("IN_PROGRESS", "RESOLVED").contains(normalizedStatus)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Choose IN_PROGRESS or RESOLVED");
        }
        if (reason != null && reason.length() > 1000) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Reason must be 1000 characters or fewer");
        }
        if (normalizedStatus.equals("RESOLVED") && (reason == null || reason.isBlank())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Add a public resolution note before resolving this complaint");
        }
        if ("REOPEN_REQUESTED".equals(complaint.getStatus()) && (reason == null || reason.isBlank())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "A decision note is required for a reopening request");
        }
        boolean allowedTransition = switch (complaint.getStatus()) {
            case "SUBMITTED" -> true;
            case "IN_PROGRESS" -> normalizedStatus.equals("RESOLVED");
            case "REOPEN_REQUESTED" -> true;
            default -> false;
        };
        if (!allowedTransition) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "This complaint cannot move to the requested status");
        }
        String previousStatus = complaint.getStatus();
        LocalDateTime changedAt = LocalDateTime.now();
        complaint.setStatus(normalizedStatus);
        complaint.setStatusChangedAt(changedAt);
        Complaint saved = complaintRepository.save(complaint);
        historyRepository.save(new ComplaintStatusHistory(saved.getId(), previousStatus, normalizedStatus,
                reason == null || reason.isBlank() ? null : reason.trim(), actorEmail, changedAt));
        publishStatusNotification(saved);
        return saved;
    }

    @Transactional
    public Complaint updateResolutionImage(Long id, String storageKey) {
        Complaint complaint = getComplaintByIdForUpdate(id);
        if (!List.of("SUBMITTED", "IN_PROGRESS", "REOPEN_REQUESTED").contains(complaint.getStatus())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Evidence can only be added to an active complaint");
        }
        complaint.setResolutionImageUrl(storageKey);
        return complaintRepository.save(complaint);
    }

    public Complaint findComplaintBySubmissionKey(String submissionKey) {
        return complaintRepository.findBySubmissionKey(submissionKey).orElse(null);
    }

    @Transactional
    public Complaint requestReopen(Long id, String citizenEmail, String reason) {
        Complaint complaint = getComplaintByIdForUpdate(id);
        if (complaint.getSubmittedBy() == null || !complaint.getSubmittedBy().equalsIgnoreCase(citizenEmail)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You can only request reopening your own complaint");
        }
        if (!"RESOLVED".equals(complaint.getStatus())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Only resolved complaints can be appealed");
        }
        if (reason == null || reason.isBlank() || reason.trim().length() > 1000) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Explain why the complaint should be reopened (1000 characters maximum)");
        }
        LocalDateTime changedAt = LocalDateTime.now();
        complaint.setStatus("REOPEN_REQUESTED");
        complaint.setStatusChangedAt(changedAt);
        Complaint saved = complaintRepository.save(complaint);
        historyRepository.save(new ComplaintStatusHistory(saved.getId(), "RESOLVED", "REOPEN_REQUESTED",
                reason.trim(), citizenEmail, changedAt));
        publishStatusNotification(saved);
        return saved;
    }

    @Transactional
    public Complaint submitFeedback(Long id, String citizenEmail, int rating, String feedback) {
        Complaint complaint = getComplaintByIdForUpdate(id);
        if (complaint.getSubmittedBy() == null || !complaint.getSubmittedBy().equalsIgnoreCase(citizenEmail)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You can only leave feedback on your own complaint");
        }
        if (!"RESOLVED".equals(complaint.getStatus())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Feedback is available after resolution");
        }
        if (complaint.getCitizenRating() != null) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Feedback has already been submitted");
        }
        if (rating < 1 || rating > 5 || (feedback != null && feedback.trim().length() > 1000)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Choose a rating from 1 to 5 and keep feedback within 1000 characters");
        }
        complaint.setCitizenRating(rating);
        complaint.setCitizenFeedback(feedback == null || feedback.isBlank() ? null : feedback.trim());
        complaint.setFeedbackAt(LocalDateTime.now());
        return complaintRepository.save(complaint);
    }

    private Complaint getComplaintByIdForUpdate(Long id) {
        return complaintRepository.findByIdForUpdate(id).orElseThrow(() ->
                new ResponseStatusException(HttpStatus.NOT_FOUND, "Complaint not found"));
    }

    private void publishStatusNotification(Complaint complaint) {
        if (complaint.getSubmittedBy() == null || complaint.getComplaintNumber() == null) return;
        events.publishEvent(new ComplaintStatusNotification(complaint.getSubmittedBy(),
                complaint.getComplaintNumber(), complaint.getStatus()));
    }

    public List<ComplaintStatusHistory> getStatusHistory(Long complaintId) {
        return historyRepository.findByComplaintIdOrderByChangedAtAsc(complaintId);
    }

    private Department routeDepartment(String category) {
        return switch (category) {
            case "ROAD" -> Department.PUBLIC_WORKS;
            case "GARBAGE" -> Department.SOLID_WASTE;
            case "WATER" -> Department.WATER;
            case "DRAINAGE" -> Department.SEWERAGE;
            case "ELECTRICITY", "STREET_LIGHT" -> Department.STREET_LIGHTING;
            default -> Department.OTHER;
        };
    }

    private boolean hasValue(String value) { return value != null && !value.isBlank(); }

    static String escapeLikeSearch(String value) {
        return value.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_");
    }
}
