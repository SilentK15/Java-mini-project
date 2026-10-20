package com.tmc.complaintmanager.controller;

import com.tmc.complaintmanager.entity.AppUser;
import com.tmc.complaintmanager.entity.Complaint;
import com.tmc.complaintmanager.entity.ComplaintInternalNote;
import com.tmc.complaintmanager.entity.UserRole;
import com.tmc.complaintmanager.repository.ComplaintInternalNoteRepository;
import com.tmc.complaintmanager.repository.ComplaintRepository;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/complaints/{complaintId}/internal-notes")
@PreAuthorize("hasAnyRole('ADMIN', 'STAFF', 'FIELD_STAFF', 'DEPARTMENT_OFFICER', 'SUPERVISOR')")
public class ComplaintInternalNoteController {
    private final ComplaintRepository complaints;
    private final ComplaintInternalNoteRepository notes;

    public ComplaintInternalNoteController(ComplaintRepository complaints, ComplaintInternalNoteRepository notes) {
        this.complaints = complaints;
        this.notes = notes;
    }

    @GetMapping
    public List<InternalNoteResponse> list(@PathVariable Long complaintId, @AuthenticationPrincipal AppUser user) {
        assertDepartmentAccess(complaintId, user);
        return notes.findByComplaintIdOrderByCreatedAtAsc(complaintId).stream()
                .map(note -> new InternalNoteResponse(note.getId(),
                        user.getRole() == UserRole.ADMIN ? note.getAuthorEmail() : "Staff colleague",
                        note.getBody(), note.getCreatedAt())).toList();
    }

    @PostMapping
    @Transactional
    @ResponseStatus(HttpStatus.CREATED)
    public InternalNoteResponse add(@PathVariable Long complaintId, @Valid @RequestBody NoteRequest request,
                                    @AuthenticationPrincipal AppUser user) {
        assertDepartmentAccess(complaintId, user);
        ComplaintInternalNote saved = notes.save(new ComplaintInternalNote(complaintId, user.getEmail(),
                request.body().trim(), LocalDateTime.now()));
        return new InternalNoteResponse(saved.getId(), user.getRole() == UserRole.ADMIN ? user.getEmail() : "Staff colleague",
                saved.getBody(), saved.getCreatedAt());
    }

    private void assertDepartmentAccess(Long complaintId, AppUser user) {
        Complaint complaint = complaints.findById(complaintId).orElseThrow(() ->
                new ResponseStatusException(HttpStatus.NOT_FOUND, "Complaint not found"));
        if (user.getRole() != UserRole.ADMIN
                && (user.getDepartment() == null || user.getDepartment() != complaint.getDepartment())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You cannot access notes for this complaint");
        }
    }

    public record NoteRequest(@NotBlank @Size(max = 2000) String body) {}
    public record InternalNoteResponse(Long id, String author, String body, LocalDateTime createdAt) {}
}
