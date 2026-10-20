package com.tmc.complaintmanager;

import com.tmc.complaintmanager.controller.ComplaintClassificationController;
import com.tmc.complaintmanager.entity.Department;
import com.tmc.complaintmanager.service.ComplaintClassificationProvider;
import com.tmc.complaintmanager.service.ComplaintClassificationService;
import org.junit.jupiter.api.Test;
import org.springframework.security.access.prepost.PreAuthorize;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class ComplaintClassificationControllerTests {

    @Test
    void forwardsValidInputToClassificationService() {
        ComplaintClassificationService service = mock(ComplaintClassificationService.class);
        when(service.recommend(any())).thenReturn(new ComplaintClassificationService.Result(
                ComplaintClassificationService.Status.RECOMMENDATION_AVAILABLE,
                "WATER",
                Department.WATER,
                "HIGH",
                0.85,
                "Likely a main pipe leak based on description"
        ));

        ComplaintClassificationController controller = new ComplaintClassificationController(service);
        var request = new ComplaintClassificationController.ClassifyRequest(
                "Water leak",
                "Large pipe burst in Sector 5",
                "Near Metro Station"
        );

        var result = controller.classify(request);

        assertEquals(ComplaintClassificationService.Status.RECOMMENDATION_AVAILABLE, result.status());
        assertEquals("WATER", result.category());
        assertEquals(Department.WATER, result.department());
        assertEquals("HIGH", result.priority());
        assertEquals(0.85, result.confidence());

        verify(service).recommend(eq(new ComplaintClassificationProvider.Input(
                "Water leak",
                "Large pipe burst in Sector 5",
                "Near Metro Station"
        )));
    }

    @Test
    void returnsUnavailableResultWhenServiceUnavailable() {
        ComplaintClassificationService service = mock(ComplaintClassificationService.class);
        when(service.recommend(any())).thenReturn(new ComplaintClassificationService.Result(
                ComplaintClassificationService.Status.UNAVAILABLE,
                null,
                null,
                null,
                null,
                "Classification is unavailable; choose a category and priority manually."
        ));

        ComplaintClassificationController controller = new ComplaintClassificationController(service);
        var request = new ComplaintClassificationController.ClassifyRequest(
                "Damaged street lamp",
                "Light pole flickering in residential lane",
                "Street 3"
        );

        var result = controller.classify(request);

        assertEquals(ComplaintClassificationService.Status.UNAVAILABLE, result.status());
        assertNull(result.category());
        assertTrue(result.explanation().contains("manually"));
    }

    @Test
    void preAuthorizeAnnotationEnforcesAuthentication() {
        PreAuthorize preAuthorize = ComplaintClassificationController.class.getAnnotation(PreAuthorize.class);
        assertNotNull(preAuthorize);
        assertTrue(preAuthorize.value().contains("CITIZEN"));
        assertTrue(preAuthorize.value().contains("STAFF"));
        assertTrue(preAuthorize.value().contains("ADMIN"));
    }
}
