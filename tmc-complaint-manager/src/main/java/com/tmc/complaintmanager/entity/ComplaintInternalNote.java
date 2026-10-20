package com.tmc.complaintmanager.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import java.time.LocalDateTime;

@Entity
@Table(name = "complaint_internal_notes", indexes = {
        @Index(name = "idx_internal_notes_complaint_time", columnList = "complaint_id, created_at")
})
@Getter
@Setter
@NoArgsConstructor
public class ComplaintInternalNote {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "complaint_id", nullable = false)
    private Long complaintId;

    @Column(name = "author_email", nullable = false, length = 190)
    private String authorEmail;

    @Column(nullable = false, length = 2000)
    private String body;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    public ComplaintInternalNote(Long complaintId, String authorEmail, String body, LocalDateTime createdAt) {
        this.complaintId = complaintId;
        this.authorEmail = authorEmail;
        this.body = body;
        this.createdAt = createdAt;
    }
}

