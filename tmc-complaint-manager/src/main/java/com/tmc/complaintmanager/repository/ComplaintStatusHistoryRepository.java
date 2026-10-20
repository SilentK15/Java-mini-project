package com.tmc.complaintmanager.repository;

import com.tmc.complaintmanager.entity.ComplaintStatusHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ComplaintStatusHistoryRepository extends JpaRepository<ComplaintStatusHistory, Long> {
    List<ComplaintStatusHistory> findByComplaintIdOrderByChangedAtAsc(Long complaintId);
}
