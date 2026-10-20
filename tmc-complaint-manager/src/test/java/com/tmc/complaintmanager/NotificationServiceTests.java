package com.tmc.complaintmanager;

import com.tmc.complaintmanager.service.*;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.ObjectProvider;

import java.util.stream.Stream;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class NotificationServiceTests {

    @Test
    void templateServiceRendersEnglishMarathiAndHindi() {
        NotificationTemplateService templateService = new NotificationTemplateService();
        NotificationEvent event = NotificationEvent.create(
                "citizen@example.test",
                "TMC-998877",
                "Water leak in lane 4",
                "RESOLVED",
                "Repaired pipe joint",
                NotificationEventType.RESOLVED
        );

        var en = templateService.render(event, "en");
        assertTrue(en.subject().contains("TMC-998877"));
        assertTrue(en.body().contains("RESOLVED"));
        assertTrue(en.body().contains("Repaired pipe joint"));
        assertTrue(en.smsText().length() <= 160);

        var mr = templateService.render(event, "mr");
        assertTrue(mr.subject().contains("TMC-998877"));
        assertTrue(mr.body().contains("निवारण"));
        assertTrue(mr.smsText().length() <= 160);

        var hi = templateService.render(event, "hi");
        assertTrue(hi.subject().contains("TMC-998877"));
        assertTrue(hi.body().contains("हल"));
        assertTrue(hi.smsText().length() <= 160);
    }

    @Test
    void deliveryServiceRetriesOnTransientFailuresAndSucceeds() {
        ObjectProvider<ComplaintNotificationProvider> providers = mock(ObjectProvider.class);
        ComplaintNotificationProvider provider = mock(ComplaintNotificationProvider.class);
        when(providers.orderedStream()).thenReturn(Stream.of(provider));

        // Fail first call, succeed on second
        doThrow(new RuntimeException("network timeout"))
                .doNothing()
                .when(provider).sendStatusNotification(any());

        NotificationDeliveryService service = new NotificationDeliveryService(
                providers, new NotificationTemplateService(), true, 3);

        NotificationEvent event = NotificationEvent.create(
                "citizen@example.test", "TMC-12345", "Pothole", "SUBMITTED", null,
                NotificationEventType.SUBMISSION_RECEIVED
        );

        var result = service.dispatch(event);

        assertEquals(NotificationDeliveryService.DeliveryStatus.DELIVERED, result.status());
        assertEquals(2, result.attempts());
        verify(provider, times(2)).sendStatusNotification(any());
    }

    @Test
    void deliveryServiceIsIdempotentForDuplicateEventIds() {
        ObjectProvider<ComplaintNotificationProvider> providers = mock(ObjectProvider.class);
        ComplaintNotificationProvider provider = mock(ComplaintNotificationProvider.class);
        when(providers.orderedStream()).thenReturn(Stream.of(provider));

        NotificationDeliveryService service = new NotificationDeliveryService(
                providers, new NotificationTemplateService(), true, 3);

        NotificationEvent event = NotificationEvent.create(
                "citizen@example.test", "TMC-12345", "Pothole", "SUBMITTED", null,
                NotificationEventType.SUBMISSION_RECEIVED
        );

        var firstResult = service.dispatch(event);
        assertEquals(NotificationDeliveryService.DeliveryStatus.DELIVERED, firstResult.status());

        var secondResult = service.dispatch(event);
        assertEquals(NotificationDeliveryService.DeliveryStatus.DUPLICATE_IGNORED, secondResult.status());

        verify(provider, times(1)).sendStatusNotification(any());
    }

    @Test
    void deliveryServiceRecordsDryRunWhenNoProviderConfigured() {
        ObjectProvider<ComplaintNotificationProvider> providers = mock(ObjectProvider.class);
        when(providers.orderedStream()).thenReturn(Stream.empty());

        NotificationDeliveryService service = new NotificationDeliveryService(
                providers, new NotificationTemplateService(), true, 3);

        NotificationEvent event = NotificationEvent.create(
                "citizen@example.test", "TMC-12345", "Pothole", "SUBMITTED", null,
                NotificationEventType.SUBMISSION_RECEIVED
        );

        var result = service.dispatch(event);
        assertEquals(NotificationDeliveryService.DeliveryStatus.NO_PROVIDER_CONFIGURED, result.status());
    }

    @Test
    void deliveryServiceSkipsWhenDisabled() {
        ObjectProvider<ComplaintNotificationProvider> providers = mock(ObjectProvider.class);
        NotificationDeliveryService service = new NotificationDeliveryService(
                providers, new NotificationTemplateService(), false, 3);

        NotificationEvent event = NotificationEvent.create(
                "citizen@example.test", "TMC-12345", "Pothole", "SUBMITTED", null,
                NotificationEventType.SUBMISSION_RECEIVED
        );

        var result = service.dispatch(event);
        assertEquals(NotificationDeliveryService.DeliveryStatus.DISABLED, result.status());
        verifyNoInteractions(providers);
    }
}
