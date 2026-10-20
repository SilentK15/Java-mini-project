package com.tmc.complaintmanager.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Provider-independent notification dispatcher with retry handling and idempotency.
 * Isolate database transactions from third-party notification provider downtime.
 */
@Service
public class NotificationDeliveryService {
    private static final Logger logger = LoggerFactory.getLogger(NotificationDeliveryService.class);

    private final ObjectProvider<ComplaintNotificationProvider> providers;
    private final NotificationTemplateService templateService;
    private final int maxRetries;
    private final boolean enabled;

    // Cache of processed event IDs to prevent duplicate transmissions
    private final Set<String> processedEvents = Collections.newSetFromMap(
            new LinkedHashMap<String, Boolean>(200, 0.75f, true) {
                @Override
                protected boolean removeEldestEntry(Map.Entry<String, Boolean> eldest) {
                    return size() > 500;
                }
            }
    );

    public NotificationDeliveryService(
            ObjectProvider<ComplaintNotificationProvider> providers,
            NotificationTemplateService templateService,
            @Value("${app.notifications.enabled:false}") boolean enabled,
            @Value("${app.notifications.max-retries:3}") int maxRetries
    ) {
        this.providers = providers;
        this.templateService = templateService;
        this.enabled = enabled;
        this.maxRetries = Math.max(1, Math.min(maxRetries, 5));
    }

    public DeliveryResult dispatch(NotificationEvent event) {
        if (!enabled) {
            logger.debug("Notifications are disabled; skipping event {}", event.eventId());
            return new DeliveryResult(event.eventId(), DeliveryStatus.DISABLED, 0, null);
        }

        if (processedEvents.contains(event.eventId())) {
            logger.info("Notification event {} already dispatched; skipping duplicate", event.eventId());
            return new DeliveryResult(event.eventId(), DeliveryStatus.DUPLICATE_IGNORED, 0, null);
        }

        var providerList = providers.orderedStream().toList();
        if (providerList.isEmpty()) {
            logger.debug("No notification provider is configured; notification event {} recorded in dry-run mode", event.eventId());
            processedEvents.add(event.eventId());
            return new DeliveryResult(event.eventId(), DeliveryStatus.NO_PROVIDER_CONFIGURED, 0, null);
        }

        ComplaintStatusNotification legacyNotification = new ComplaintStatusNotification(
                event.recipientEmail(),
                event.complaintNumber(),
                event.status()
        );

        int attempts = 0;
        Exception lastException = null;

        for (ComplaintNotificationProvider provider : providerList) {
            boolean delivered = false;
            attempts = 0;

            while (!delivered && attempts < maxRetries) {
                attempts++;
                try {
                    provider.sendStatusNotification(legacyNotification);
                    delivered = true;
                } catch (RuntimeException ex) {
                    lastException = ex;
                    logger.warn("Notification delivery attempt {}/{} failed for event {}",
                            attempts, maxRetries, event.eventId());
                }
            }

            if (delivered) {
                processedEvents.add(event.eventId());
                logger.info("Notification event {} delivered successfully on attempt {}", event.eventId(), attempts);
                return new DeliveryResult(event.eventId(), DeliveryStatus.DELIVERED, attempts, null);
            }
        }

        logger.warn("Notification event {} could not be delivered after {} attempts", event.eventId(), attempts);
        return new DeliveryResult(event.eventId(), DeliveryStatus.FAILED, attempts,
                lastException == null ? "Unknown failure" : lastException.getMessage());
    }

    public boolean isEnabled() {
        return enabled;
    }

    public int getMaxRetries() {
        return maxRetries;
    }

    public NotificationTemplateService getTemplateService() {
        return templateService;
    }

    public enum DeliveryStatus {
        DELIVERED,
        FAILED,
        DISABLED,
        NO_PROVIDER_CONFIGURED,
        DUPLICATE_IGNORED
    }

    public record DeliveryResult(String eventId, DeliveryStatus status, int attempts, String failureReason) {}
}
