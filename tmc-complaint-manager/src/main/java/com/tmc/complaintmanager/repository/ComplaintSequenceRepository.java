package com.tmc.complaintmanager.repository;

import com.tmc.complaintmanager.entity.ComplaintSequence;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface ComplaintSequenceRepository extends JpaRepository<ComplaintSequence, Integer> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT s FROM ComplaintSequence s WHERE s.yearVal = :year")
    Optional<ComplaintSequence> findByYearValForUpdate(@Param("year") Integer year);
}
