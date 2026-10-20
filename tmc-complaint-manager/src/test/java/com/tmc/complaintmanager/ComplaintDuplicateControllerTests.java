package com.tmc.complaintmanager;

import com.tmc.complaintmanager.controller.ComplaintDuplicateController;
import com.tmc.complaintmanager.service.ComplaintDuplicateDetectionService;
import org.junit.jupiter.api.Test;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class ComplaintDuplicateControllerTests {
    @Test
    void requiresCitizenRoleAndReturnsOnlyGenericMatchSignal() {
        ComplaintDuplicateDetectionService detection = mock(ComplaintDuplicateDetectionService.class);
        when(detection.findPossibleDuplicates(any())).thenReturn(List.of(new ComplaintDuplicateDetectionService.Suggestion(
                "TMC-PRIVATE", "Private complaint title", "Private location", "SUBMITTED", LocalDateTime.now(), 0.8)));
        var request = new ComplaintDuplicateController.DuplicateCheckRequest("Pothole", "Large road damage",
                "ROAD", "Ghodbunder Road", null, null);

        var result = new ComplaintDuplicateController(detection).possibleDuplicates(request);

        assertEquals(new ComplaintDuplicateController.DuplicateCheckResult(true), result);
        assertEquals("hasRole('CITIZEN')", ComplaintDuplicateController.class.getAnnotation(PreAuthorize.class).value());
    }

    @Test
    void rejectsSingleGpsCoordinate() {
        ComplaintDuplicateDetectionService detection = mock(ComplaintDuplicateDetectionService.class);
        var request = new ComplaintDuplicateController.DuplicateCheckRequest("Pothole", "Large road damage",
                "ROAD", "Ghodbunder Road", 19.2, null);

        ResponseStatusException exception = assertThrows(ResponseStatusException.class,
                () -> new ComplaintDuplicateController(detection).possibleDuplicates(request));

        assertEquals(400, exception.getStatusCode().value());
        verifyNoInteractions(detection);
    }
}
