package com.tmc.complaintmanager.service;

import com.tmc.complaintmanager.entity.ComplaintSequence;
import com.tmc.complaintmanager.repository.ComplaintSequenceRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.Locale;

@Service
public class ComplaintNumberGenerator {
    private final ComplaintSequenceRepository sequenceRepository;

    public ComplaintNumberGenerator(ComplaintSequenceRepository sequenceRepository) {
        this.sequenceRepository = sequenceRepository;
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public synchronized String nextComplaintNumber() {
        int year = LocalDate.now().getYear();
        ComplaintSequence sequence = sequenceRepository.findByYearValForUpdate(year)
                .orElseGet(() -> {
                    try {
                        return sequenceRepository.saveAndFlush(new ComplaintSequence(year, 0L));
                    } catch (Exception ex) {
                        return sequenceRepository.findByYearValForUpdate(year)
                                .orElseThrow(() -> new IllegalStateException("Failed to initialize sequence for year " + year));
                    }
                });

        long nextVal = sequence.getCurrentVal() + 1;
        sequence.setCurrentVal(nextVal);
        sequenceRepository.saveAndFlush(sequence);

        return String.format(Locale.ROOT, "TMC-%d-%06d", year, nextVal);
    }
}
