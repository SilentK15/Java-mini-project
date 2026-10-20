package com.tmc.complaintmanager;

import com.tmc.complaintmanager.entity.Complaint;
import com.tmc.complaintmanager.repository.ComplaintRepository;
import com.tmc.complaintmanager.service.ComplaintDuplicateDetectionService;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class ComplaintDuplicateDetectionServiceTests {
    @Test
    void suggestsRecentOpenComplaintWithSimilarWordsAndLocation() {
        ComplaintRepository repository = mock(ComplaintRepository.class);
        Complaint candidate = complaint("Pothole causing traffic on Ghodbunder Road",
                "Large pothole has damaged the road and slows vehicles", "Ghodbunder Road near the bus stop");
        candidate.setComplaintNumber("TMC-EXISTING");
        candidate.setStatus("SUBMITTED");
        candidate.setCreatedAt(LocalDateTime.now().minusDays(2));
        when(repository.findTop100ByCategoryAndStatusInAndCreatedAtAfterOrderByCreatedAtDesc(eq("ROAD"), any(), any()))
                .thenReturn(List.of(candidate));

        var results = new ComplaintDuplicateDetectionService(repository).findPossibleDuplicates(
                complaint("Large pothole causing traffic", "Road damage is slowing vehicles near the bus stop",
                        "Ghodbunder Road close to bus stop"));

        assertEquals(1, results.size());
        assertEquals("TMC-EXISTING", results.getFirst().complaintNumber());
        assertTrue(results.getFirst().score() >= 0.4);
    }

    @Test
    void doesNotSuggestClosedComplaints() {
        ComplaintRepository repository = mock(ComplaintRepository.class);
        Complaint candidate = complaint("Pothole causing traffic on Ghodbunder Road",
                "Large pothole has damaged the road and slows vehicles", "Ghodbunder Road near the bus stop");
        candidate.setComplaintNumber("TMC-CLOSED");
        candidate.setStatus("RESOLVED");
        candidate.setCreatedAt(LocalDateTime.now().minusDays(1));
        when(repository.findTop100ByCategoryAndStatusInAndCreatedAtAfterOrderByCreatedAtDesc(eq("ROAD"), any(), any()))
                .thenReturn(List.of(candidate));

        var results = new ComplaintDuplicateDetectionService(repository).findPossibleDuplicates(
                complaint("Large pothole causing traffic", "Road damage is slowing vehicles near the bus stop",
                        "Ghodbunder Road close to bus stop"));

        assertTrue(results.isEmpty());
    }

    @Test
    void recognizesNearbyCoordinatesAcrossTheInternationalDateLine() {
        ComplaintRepository repository = mock(ComplaintRepository.class);
        Complaint candidate = complaint("Broken street light", "Street light is not working", "Unknown location");
        candidate.setLatitude(0.0);
        candidate.setLongitude(179.999);
        candidate.setComplaintNumber("TMC-DATELINE");
        candidate.setStatus("SUBMITTED");
        candidate.setCreatedAt(LocalDateTime.now().minusDays(1));
        when(repository.findTop100ByCategoryAndStatusInAndCreatedAtAfterOrderByCreatedAtDesc(eq("ROAD"), any(), any()))
                .thenReturn(List.of(candidate));

        Complaint draft = complaint("Broken street light", "Street light is not working", "Unknown location");
        draft.setLatitude(0.0);
        draft.setLongitude(-179.999);

        var results = new ComplaintDuplicateDetectionService(repository).findPossibleDuplicates(draft);

        assertEquals(1, results.size());
        assertEquals("TMC-DATELINE", results.getFirst().complaintNumber());
    }

    private Complaint complaint(String title, String description, String location) {
        Complaint complaint = new Complaint();
        complaint.setCategory("ROAD");
        complaint.setTitle(title);
        complaint.setDescription(description);
        complaint.setLocation(location);
        return complaint;
    }
}
