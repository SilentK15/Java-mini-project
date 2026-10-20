package com.tmc.complaintmanager.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import java.time.LocalDateTime;

@Entity
@Table(name = "complaint_status_history", indexes = {
        @Index(name = "idx_status_history_complaint_time", columnList = "complaint_id, changed_at")
})
@Getter
@Setter
@NoArgsConstructor
public class ComplaintStatusHistory {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "complaint_id", nullable = false)
    private Long complaintId;

    @Column(name = "previous_status", length = 30)
    private String previousStatus;

    @Column(name = "new_status", nullable = false, length = 30)
    private String newStatus;

    @Column(length = 1000)
    private String reason;

    @Column(name = "actor_email", nullable = false, length = 190)
    private String actorEmail;

    @Column(name = "changed_at", nullable = false)
    private LocalDateTime changedAt;

    public ComplaintStatusHistory(Long complaintId, String previousStatus, String newStatus,
                                  String reason, String actorEmail, LocalDateTime changedAt) {
        this.complaintId = complaintId;
        this.previousStatus = previousStatus;
        this.newStatus = newStatus;
        this.reason = reason;
        this.actorEmail = actorEmail;
        this.changedAt = changedAt;
    }
}

