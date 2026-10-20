package com.tmc.complaintmanager.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "complaint_sequences")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class ComplaintSequence {
    @Id
    @Column(name = "year_val", nullable = false)
    private Integer yearVal;

    @Column(name = "current_val", nullable = false)
    private Long currentVal;
}
