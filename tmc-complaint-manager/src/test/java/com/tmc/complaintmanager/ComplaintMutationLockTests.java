package com.tmc.complaintmanager;

import com.tmc.complaintmanager.repository.ComplaintRepository;
import com.tmc.complaintmanager.service.ComplaintService;
import jakarta.persistence.LockModeType;
import org.junit.jupiter.api.Test;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.transaction.annotation.Transactional;

import static org.junit.jupiter.api.Assertions.*;

class ComplaintMutationLockTests {
    @Test
    void lifecycleMutationsUseATransactionAndPessimisticWriteLock() throws Exception {
        var lock = ComplaintRepository.class.getMethod("findByIdForUpdate", Long.class)
                .getAnnotation(Lock.class);
        assertNotNull(lock);
        assertEquals(LockModeType.PESSIMISTIC_WRITE, lock.value());

        assertTransactional("updateStatus", Long.class, String.class, String.class, String.class);
        assertTransactional("updateResolutionImage", Long.class, String.class);
        assertTransactional("requestReopen", Long.class, String.class, String.class);
        assertTransactional("submitFeedback", Long.class, String.class, int.class, String.class);
    }

    private void assertTransactional(String method, Class<?>... parameterTypes) throws Exception {
        assertTrue(ComplaintService.class.getMethod(method, parameterTypes)
                .isAnnotationPresent(Transactional.class), method + " must keep the row lock in a transaction");
    }
}
