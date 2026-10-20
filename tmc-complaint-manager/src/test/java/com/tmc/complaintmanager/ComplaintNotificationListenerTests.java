package com.tmc.complaintmanager;

import com.tmc.complaintmanager.service.ComplaintNotificationListener;
import com.tmc.complaintmanager.service.ComplaintNotificationProvider;
import com.tmc.complaintmanager.service.ComplaintStatusNotification;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import java.util.stream.Stream;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.*;

class ComplaintNotificationListenerTests {
    @Test
    void dispatchesStatusEventToConfiguredProvider() {
        ObjectProvider<ComplaintNotificationProvider> providers = mock(ObjectProvider.class);
        ComplaintNotificationProvider provider = mock(ComplaintNotificationProvider.class);
        when(providers.orderedStream()).thenReturn(Stream.of(provider));
        ComplaintNotificationListener listener = new ComplaintNotificationListener(providers);
        var notification = new ComplaintStatusNotification("citizen@example.test", "TMC-123", "RESOLVED");

        listener.afterComplaintStatusCommit(notification);

        verify(provider).sendStatusNotification(notification);
    }

    @Test
    void noConfiguredProviderIsAnExplicitNoOpAndDispatchHappensAfterCommit() throws NoSuchMethodException {
        ObjectProvider<ComplaintNotificationProvider> providers = mock(ObjectProvider.class);
        when(providers.orderedStream()).thenReturn(Stream.empty());
        var method = ComplaintNotificationListener.class.getMethod("afterComplaintStatusCommit", ComplaintStatusNotification.class);
        var eventListener = method.getAnnotation(TransactionalEventListener.class);
        var enabledCondition = ComplaintNotificationListener.class.getAnnotation(ConditionalOnProperty.class);

        new ComplaintNotificationListener(providers).afterComplaintStatusCommit(
                new ComplaintStatusNotification("citizen@example.test", "TMC-123", "SUBMITTED"));

        assertEquals(TransactionPhase.AFTER_COMMIT, eventListener.phase());
        assertEquals("app.notifications", enabledCondition.prefix());
        assertEquals("enabled", enabledCondition.name()[0]);
        assertEquals("true", enabledCondition.havingValue());
    }

    @Test
    void providerFailureDoesNotUndoTheAlreadyCommittedComplaint() {
        ObjectProvider<ComplaintNotificationProvider> providers = mock(ObjectProvider.class);
        ComplaintNotificationProvider provider = mock(ComplaintNotificationProvider.class);
        when(providers.orderedStream()).thenReturn(Stream.of(provider));
        doThrow(new IllegalStateException("provider down")).when(provider).sendStatusNotification(any());

        new ComplaintNotificationListener(providers).afterComplaintStatusCommit(
                new ComplaintStatusNotification("citizen@example.test", "TMC-123", "IN_PROGRESS"));

        verify(provider, atLeastOnce()).sendStatusNotification(any());
    }
}
