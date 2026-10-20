package com.tmc.complaintmanager.repository;

import com.tmc.complaintmanager.entity.Complaint;
import com.tmc.complaintmanager.entity.Department;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import jakarta.persistence.LockModeType;
import java.util.Optional;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Collection;

public interface ComplaintRepository extends JpaRepository<Complaint, Long>, JpaSpecificationExecutor<Complaint> {
    boolean existsByComplaintNumber(String complaintNumber);
    Optional<Complaint> findByComplaintNumberIgnoreCase(String complaintNumber);
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select complaint from Complaint complaint where complaint.id = :id")
    Optional<Complaint> findByIdForUpdate(@Param("id") Long id);
    Optional<Complaint> findBySubmissionKey(String submissionKey);
    List<Complaint> findTop100ByCategoryAndStatusInAndCreatedAtAfterOrderByCreatedAtDesc(
            String category, Collection<String> statuses, LocalDateTime createdAfter);
    long countByStatus(String status);
    long countByDepartment(Department department);
    long countByDepartmentAndStatus(Department department, String status);
    @Query("select complaint.department, complaint.status, count(complaint) from Complaint complaint " +
            "group by complaint.department, complaint.status")
    List<Object[]> countByDepartmentAndStatusGrouped();
    long countBySubmittedByIgnoreCase(String submittedBy);
    long countBySubmittedByIgnoreCaseAndStatus(String submittedBy, String status);
    long countByStatusAndCreatedAtBefore(String status, LocalDateTime cutoff);
    long countByStatusAndStatusChangedAtBefore(String status, LocalDateTime cutoff);
    long countByDepartmentAndStatusAndCreatedAtBefore(Department department, String status, LocalDateTime cutoff);
    long countByDepartmentAndStatusAndStatusChangedAtBefore(Department department, String status, LocalDateTime cutoff);
    long countBySubmittedByIgnoreCaseAndStatusAndCreatedAtBefore(String submittedBy, String status, LocalDateTime cutoff);
    long countBySubmittedByIgnoreCaseAndStatusAndStatusChangedAtBefore(String submittedBy, String status, LocalDateTime cutoff);
    long countByAssignedStaffIdIsNullAndStatusIn(Collection<String> statuses);
    long countByDepartmentAndAssignedStaffIdIsNullAndStatusIn(Department department, Collection<String> statuses);
    long countByAssignedStaffIdIsNotNullAndStatusIn(Collection<String> statuses);
    long countByDepartmentAndAssignedStaffIdIsNotNullAndStatusIn(Department department, Collection<String> statuses);
    long countBySubmittedByIgnoreCaseAndAssignedStaffIdIsNotNullAndStatusIn(String submittedBy, Collection<String> statuses);
}
