package com.tmc.complaintmanager.service;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Immutable notification event carrying an idempotency key (eventId)
 * to guarantee safe retry and deduplication by notification providers.
 */
public record NotificationEvent(
        String eventId,
        String recipientEmail,
        String recipientPhone,
        String complaintNumber,
        String complaintTitle,
        String status,
        String reason,
        NotificationEventType eventType,
        LocalDateTime createdAt
) {
    public static NotificationEvent create(String recipientEmail, String complaintNumber,
                                          String complaintTitle, String status,
                                          String reason, NotificationEventType eventType) {
        return new NotificationEvent(
                UUID.randomUUID().toString(),
                recipientEmail,
                null,
                complaintNumber,
                complaintTitle,
                status,
                reason,
                eventType,
                LocalDateTime.now()
        );
    }
}
