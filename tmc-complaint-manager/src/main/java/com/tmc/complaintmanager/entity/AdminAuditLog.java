package com.tmc.complaintmanager.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "admin_audit_logs", indexes = {
        @Index(name = "idx_admin_audit_created_at", columnList = "created_at")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AdminAuditLog {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "actor_email", nullable = false, length = 190)
    private String actorEmail;

    @Column(nullable = false, length = 60)
    private String action;

    @Column(name = "target_user_id")
    private Long targetUserId;

    @Column(length = 500)
    private String details;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    public AdminAuditLog(String actorEmail, String action, Long targetUserId, String details, LocalDateTime createdAt) {
        this.actorEmail = actorEmail;
        this.action = action;
        this.targetUserId = targetUserId;
        this.details = details;
        this.createdAt = createdAt;
    }
}
