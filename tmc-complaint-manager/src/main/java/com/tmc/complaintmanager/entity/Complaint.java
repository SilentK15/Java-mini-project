package com.tmc.complaintmanager.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.DecimalMax;
import com.fasterxml.jackson.annotation.JsonIgnore;

@Entity
@Table(name = "complaints")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Complaint {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String complaintNumber;

    @Column(name = "legacy_complaint_number")
    private String legacyComplaintNumber;

    @Column(length = 36, unique = true)
    private String submissionKey;

    @Column(name = "assigned_staff_id")
    private Long assignedStaffId;

    @Column(name = "assignment_at")
    private LocalDateTime assignmentAt;

    @Column(name = "assignment_reason", length = 400)
    private String assignmentReason;

    @Column(nullable = false)
    @NotBlank(message = "Title is required")
    @Size(max = 150, message = "Title must be 150 characters or fewer")
    private String title;

    @Column(nullable = false, length = 2000)
    @NotBlank(message = "Description is required")
    @Size(max = 2000, message = "Description must be 2000 characters or fewer")
    private String description;

    @Column(nullable = false)
    @NotBlank(message = "Category is required")
    @Pattern(regexp = "ROAD|GARBAGE|WATER|ELECTRICITY|STREET_LIGHT|DRAINAGE|OTHER", message = "Choose a valid category")
    private String category;

    @Column(nullable = false)
    @NotBlank(message = "Location is required")
    @Size(max = 255, message = "Location must be 255 characters or fewer")
    private String location;

    @Column(nullable = false)
    @NotBlank(message = "Priority is required")
    @Pattern(regexp = "LOW|MEDIUM|HIGH", message = "Choose a valid priority")
    private String priority;

    @Column(nullable = false)
    private String status;

    @Column(length = 190)
    @JsonIgnore
    private String submittedBy;

    @Enumerated(EnumType.STRING)
    @Column(length = 40)
    private Department department;

    @Column(length = 500)
    private String imageUrl;

    @Column(name = "resolution_image_url", length = 500)
    private String resolutionImageUrl;

    private Integer citizenRating;

    @Column(length = 1000)
    private String citizenFeedback;

    private LocalDateTime feedbackAt;

    @DecimalMin(value = "-90.0")
    @DecimalMax(value = "90.0")
    private Double latitude;

    @DecimalMin(value = "-180.0")
    @DecimalMax(value = "180.0")
    private Double longitude;

    private LocalDateTime createdAt;

    @Column(name = "status_changed_at", nullable = false)
    private LocalDateTime statusChangedAt;
}
