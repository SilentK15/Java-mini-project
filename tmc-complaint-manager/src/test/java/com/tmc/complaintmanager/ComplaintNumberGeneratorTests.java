package com.tmc.complaintmanager;

import com.tmc.complaintmanager.entity.Complaint;
import com.tmc.complaintmanager.entity.ComplaintSequence;
import com.tmc.complaintmanager.entity.Department;
import com.tmc.complaintmanager.repository.ComplaintRepository;
import com.tmc.complaintmanager.repository.ComplaintSequenceRepository;
import com.tmc.complaintmanager.service.ComplaintNumberGenerator;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.*;

import static org.junit.jupiter.api.Assertions.*;

@DataJpaTest
@ActiveProfiles("test")
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Import(ComplaintNumberGenerator.class)
class ComplaintNumberGeneratorTests {

    @Autowired
    private ComplaintSequenceRepository sequenceRepository;

    @Autowired
    private ComplaintRepository complaintRepository;

    @Autowired
    private ComplaintNumberGenerator generator;

    @Test
    void generatesHumanReadableComplaintNumbersMatchingFormat() {
        String number1 = generator.nextComplaintNumber();
        String number2 = generator.nextComplaintNumber();

        assertTrue(number1.matches("^TMC-\\d{4}-\\d{6}$"), "Expected TMC-YYYY-XXXXXX format but got: " + number1);
        assertTrue(number2.matches("^TMC-\\d{4}-\\d{6}$"), "Expected TMC-YYYY-XXXXXX format but got: " + number2);

        // Sequence numbers should increment
        long seq1 = Long.parseLong(number1.substring(9));
        long seq2 = Long.parseLong(number2.substring(9));
        assertEquals(seq1 + 1, seq2);
    }

    @Test
    @Transactional(propagation = Propagation.NOT_SUPPORTED)
    void generatesUniqueComplaintNumbersUnderHighConcurrency() throws Exception {
        int threadCount = 20;
        ExecutorService executor = Executors.newFixedThreadPool(threadCount);
        CountDownLatch startLatch = new CountDownLatch(1);
        List<Future<String>> futures = new ArrayList<>();

        for (int i = 0; i < threadCount; i++) {
            futures.add(executor.submit(() -> {
                startLatch.await();
                return generator.nextComplaintNumber();
            }));
        }

        startLatch.countDown();
        Set<String> generatedNumbers = new HashSet<>();
        for (Future<String> future : futures) {
            String number = future.get(5, TimeUnit.SECONDS);
            assertNotNull(number);
            assertTrue(number.matches("^TMC-\\d{4}-\\d{6}$"));
            generatedNumbers.add(number);
        }
        executor.shutdown();

        // Assert all 20 generated complaint numbers are strictly unique
        assertEquals(threadCount, generatedNumbers.size(), "All generated complaint numbers under concurrency must be unique");
    }

    @Test
    void complaintLookupIsCaseInsensitiveAndResolvesLegacyNumbers() {
        Complaint complaint = new Complaint();
        complaint.setComplaintNumber("TMC-2026-000042");
        complaint.setLegacyComplaintNumber("LEGACY-UUID-9999");
        complaint.setTitle("Test Issue");
        complaint.setDescription("Detailed description");
        complaint.setCategory("ROAD");
        complaint.setLocation("Naupada");
        complaint.setPriority("LOW");
        complaint.setStatus("SUBMITTED");
        complaint.setDepartment(Department.PUBLIC_WORKS);
        complaint.setCreatedAt(LocalDateTime.now());
        complaint.setStatusChangedAt(LocalDateTime.now());
        complaintRepository.save(complaint);

        // Current number lookup - exact case
        assertTrue(complaintRepository.findByComplaintNumberIgnoreCase("TMC-2026-000042").isPresent());
        // Current number lookup - lowercase
        assertTrue(complaintRepository.findByComplaintNumberIgnoreCase("tmc-2026-000042").isPresent());
        // Legacy number lookup - exact case
        assertTrue(complaintRepository.findByComplaintNumberIgnoreCase("LEGACY-UUID-9999").isPresent());
        // Legacy number lookup - lowercase
        assertTrue(complaintRepository.findByComplaintNumberIgnoreCase("legacy-uuid-9999").isPresent());

        // Check existsByComplaintNumber
        assertTrue(complaintRepository.existsByComplaintNumber("tmc-2026-000042"));
        assertTrue(complaintRepository.existsByComplaintNumber("legacy-uuid-9999"));
        assertFalse(complaintRepository.existsByComplaintNumber("NONEXISTENT-123"));
    }
}
