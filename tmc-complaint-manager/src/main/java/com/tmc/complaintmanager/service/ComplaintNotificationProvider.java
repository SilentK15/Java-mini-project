package com.tmc.complaintmanager.service;

/** Optional integration boundary. No provider is configured by default. */
public interface ComplaintNotificationProvider {
    void sendStatusNotification(ComplaintStatusNotification notification);
}
