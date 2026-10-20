package com.tmc.complaintmanager;

import com.tmc.complaintmanager.entity.Department;
import com.tmc.complaintmanager.service.ComplaintClassificationProvider;
import com.tmc.complaintmanager.service.ComplaintClassificationService;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class ComplaintClassificationServiceTests {
    private static final ComplaintClassificationProvider.Input INPUT =
            new ComplaintClassificationProvider.Input("Water leak", "A pipe is leaking near the park", "Ward 4");

    @Test
    void disabledClassifierFallsBackToManualEntryWithoutCallingProvider() {
        ComplaintClassificationProvider provider = mock(ComplaintClassificationProvider.class);

        var result = new ComplaintClassificationService(List.of(provider), false, 0.75).recommend(INPUT);

        assertEquals(ComplaintClassificationService.Status.UNAVAILABLE, result.status());
        assertNull(result.category());
        verifyNoInteractions(provider);
    }

    @Test
    void missingProviderReturnsSafeFallbackEvenIfEnabled() {
        var result = new ComplaintClassificationService(List.of(), true, 0.75).recommend(INPUT);

        assertEquals(ComplaintClassificationService.Status.UNAVAILABLE, result.status());
        assertTrue(result.explanation().contains("manually"));
    }

    @Test
    void lowConfidenceRecommendationRequiresManualReviewAndRemainsAdvisory() {
        ComplaintClassificationProvider provider = mock(ComplaintClassificationProvider.class);
        when(provider.recommend(INPUT)).thenReturn(new ComplaintClassificationProvider.Recommendation(
                "WATER", Department.WATER, "HIGH", 0.60, "Possible water supply leak."));

        var result = new ComplaintClassificationService(List.of(provider), true, 0.75).recommend(INPUT);

        assertEquals(ComplaintClassificationService.Status.MANUAL_REVIEW_REQUIRED, result.status());
        assertEquals("WATER", result.category());
        assertEquals(Department.WATER, result.department());
        assertEquals(0.60, result.confidence());
    }

    @Test
    void providerErrorsFallBackWithoutLeakingDetails() {
        ComplaintClassificationProvider provider = mock(ComplaintClassificationProvider.class);
        when(provider.recommend(INPUT)).thenThrow(new IllegalStateException("contains private complaint text"));

        var result = new ComplaintClassificationService(List.of(provider), true, 0.75).recommend(INPUT);

        assertEquals(ComplaintClassificationService.Status.UNAVAILABLE, result.status());
        assertFalse(result.explanation().contains("private complaint text"));
    }

    @Test
    void rejectsUnsupportedCategoryFromProvider() {
        ComplaintClassificationProvider provider = mock(ComplaintClassificationProvider.class);
        when(provider.recommend(INPUT)).thenReturn(new ComplaintClassificationProvider.Recommendation(
                "UNSUPPORTED", Department.WATER, "HIGH", 0.95, "Unexpected category."));

        var result = new ComplaintClassificationService(List.of(provider), true, 0.75).recommend(INPUT);

        assertEquals(ComplaintClassificationService.Status.UNAVAILABLE, result.status());
    }

    @Test
    void rejectsInvalidConfidenceThresholdConfiguration() {
        assertThrows(IllegalArgumentException.class,
                () -> new ComplaintClassificationService(List.of(), true, 1.1));
    }
}
