package com.tmc.complaintmanager.service;

import com.tmc.complaintmanager.entity.AppUser;
import com.tmc.complaintmanager.entity.UserRole;
import com.tmc.complaintmanager.repository.ComplaintRepository;
import com.tmc.complaintmanager.repository.ComplaintStatusHistoryRepository;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class ComplaintSearchTests {
    @Test
    void escapesLikeWildcardsAndEscapeCharacters() {
        assertEquals("road\\%\\_\\\\repair",
                ComplaintService.escapeLikeSearch("road%_\\repair"));
    }

    @Test
    void rejectsSearchesOverTheLimitBeforeQueryingTheRepository() {
        ComplaintRepository complaints = mock(ComplaintRepository.class);
        ComplaintService service = new ComplaintService(complaints, mock(ComplaintStatusHistoryRepository.class));
        AppUser admin = new AppUser("Admin", "admin@example.test", "hash", UserRole.ADMIN);

        ResponseStatusException exception = assertThrows(ResponseStatusException.class,
                () -> service.search(admin, 0, 10, "x".repeat(151), null, null, null));

        assertEquals(400, exception.getStatusCode().value());
        verifyNoInteractions(complaints);
    }
}
