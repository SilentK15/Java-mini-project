package com.tmc.complaintmanager.service;

public record ComplaintStatusNotification(String recipientEmail, String complaintNumber, String status) {}
