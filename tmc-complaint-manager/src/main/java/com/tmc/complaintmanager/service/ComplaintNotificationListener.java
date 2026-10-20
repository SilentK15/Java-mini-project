package com.tmc.complaintmanager.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionalEventListener;
import org.springframework.transaction.event.TransactionPhase;

@Component
@ConditionalOnProperty(prefix = "app.notifications", name = "enabled", havingValue = "true")
public class ComplaintNotificationListener {
    private static final Logger logger = LoggerFactory.getLogger(ComplaintNotificationListener.class);
    private final NotificationDeliveryService deliveryService;

    public ComplaintNotificationListener(NotificationDeliveryService deliveryService) {
        this.deliveryService = deliveryService;
    }

    public ComplaintNotificationListener(ObjectProvider<ComplaintNotificationProvider> providers) {
        this(new NotificationDeliveryService(providers, new NotificationTemplateService(), true, 3));
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void afterComplaintStatusCommit(ComplaintStatusNotification notification) {
        NotificationEventType eventType = switch (notification.status() == null ? "" : notification.status()) {
            case "SUBMITTED" -> NotificationEventType.SUBMISSION_RECEIVED;
            case "RESOLVED" -> NotificationEventType.RESOLVED;
            case "REOPEN_REQUESTED" -> NotificationEventType.REOPEN_REQUESTED;
            default -> NotificationEventType.STATUS_CHANGED;
        };

        NotificationEvent event = NotificationEvent.create(
                notification.recipientEmail(),
                notification.complaintNumber(),
                "Complaint " + notification.complaintNumber(),
                notification.status(),
                null,
                eventType
        );

        NotificationDeliveryService.DeliveryResult result = deliveryService.dispatch(event);
        logger.debug("Notification event {} dispatched with status {}", result.eventId(), result.status());
    }
}
