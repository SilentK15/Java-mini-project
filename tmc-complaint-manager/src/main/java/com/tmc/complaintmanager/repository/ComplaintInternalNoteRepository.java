package com.tmc.complaintmanager.repository;

import com.tmc.complaintmanager.entity.ComplaintInternalNote;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ComplaintInternalNoteRepository extends JpaRepository<ComplaintInternalNote, Long> {
    List<ComplaintInternalNote> findByComplaintIdOrderByCreatedAtAsc(Long complaintId);
}
