package com.tmc.complaintmanager.service;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnExpression;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

/**
 * SMTP-backed notification provider.
 *
 * <p>Activated only when <strong>both</strong> conditions are met:
 * <ul>
 *   <li>{@code app.notifications.enabled=true}</li>
 *   <li>{@code app.notifications.provider=smtp}</li>
 * </ul>
 *
 * <p>Required environment variables when enabled:
 * <ul>
 *   <li>{@code SMTP_HOST} / {@code SMTP_PORT} (default 587)</li>
 *   <li>{@code SMTP_USER} / {@code SMTP_PASS}</li>
 *   <li>{@code SMTP_FROM} — the From address in outgoing messages</li>
 * </ul>
 */
@Service
@ConditionalOnProperty(prefix = "app.notifications", name = "enabled", havingValue = "true")
@ConditionalOnExpression("'${app.notifications.provider:none}'.equals('smtp')")
public class SmtpNotificationProvider implements ComplaintNotificationProvider {

    private static final Logger log = LoggerFactory.getLogger(SmtpNotificationProvider.class);

    private final JavaMailSender mailSender;
    private final NotificationTemplateService templateService;
    private final String fromAddress;

    public SmtpNotificationProvider(
            JavaMailSender mailSender,
            NotificationTemplateService templateService,
            @Value("${app.notifications.smtp.from:noreply@tmc.gov.in}") String fromAddress
    ) {
        this.mailSender      = mailSender;
        this.templateService = templateService;
        this.fromAddress     = fromAddress;
    }

    @Override
    public void sendStatusNotification(ComplaintStatusNotification notification) {
        NotificationEventType eventType = switch (notification.status() == null ? "" : notification.status()) {
            case "SUBMITTED"        -> NotificationEventType.SUBMISSION_RECEIVED;
            case "RESOLVED"        -> NotificationEventType.RESOLVED;
            case "REOPEN_REQUESTED" -> NotificationEventType.REOPEN_REQUESTED;
            default                -> NotificationEventType.STATUS_CHANGED;
        };

        NotificationEvent event = NotificationEvent.create(
                notification.recipientEmail(),
                notification.complaintNumber(),
                "Complaint " + notification.complaintNumber(),
                notification.status(),
                null,
                eventType
        );

        NotificationTemplateService.RenderedMessage rendered = templateService.render(event, "en");

        try {
            MimeMessage mime = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(mime, false, "UTF-8");
            helper.setFrom(fromAddress);
            helper.setTo(notification.recipientEmail());
            helper.setSubject(rendered.subject());
            helper.setText(rendered.body(), false);
            mailSender.send(mime);
            log.info("SMTP notification sent to {} for complaint {} ({})",
                    notification.recipientEmail(), notification.complaintNumber(), notification.status());
        } catch (MessagingException ex) {
            throw new RuntimeException("Failed to send SMTP notification: " + ex.getMessage(), ex);
        }
    }
}
