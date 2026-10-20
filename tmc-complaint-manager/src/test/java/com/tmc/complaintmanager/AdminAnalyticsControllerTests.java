package com.tmc.complaintmanager;

import com.tmc.complaintmanager.controller.AdminAnalyticsController;
import com.tmc.complaintmanager.entity.Department;
import com.tmc.complaintmanager.repository.ComplaintRepository;
import org.junit.jupiter.api.Test;
import org.springframework.security.access.prepost.PreAuthorize;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class AdminAnalyticsControllerTests {
    @Test
    void returnsZeroFilledStatusBreakdownForEveryDepartment() {
        ComplaintRepository complaints = mock(ComplaintRepository.class);
        when(complaints.countByDepartmentAndStatusGrouped()).thenReturn(java.util.List.of(
                new Object[]{Department.WATER, "SUBMITTED", 2L},
                new Object[]{Department.WATER, "IN_PROGRESS", 3L},
                new Object[]{Department.WATER, "REOPEN_REQUESTED", 1L},
                new Object[]{Department.WATER, "RESOLVED", 4L},
                new Object[]{null, "SUBMITTED", 1L},
                new Object[]{null, "RESOLVED", 2L}));

        var summaries = new AdminAnalyticsController(complaints).departments();

        assertEquals(Department.values().length + 1, summaries.size());
        var water = summaries.stream().filter(item -> item.department().equals("WATER")).findFirst().orElseThrow();
        assertEquals(new AdminAnalyticsController.DepartmentSummary("WATER", 10, 2, 3, 1, 4), water);
        var sewerage = summaries.stream().filter(item -> item.department().equals("SEWERAGE")).findFirst().orElseThrow();
        assertEquals(new AdminAnalyticsController.DepartmentSummary("SEWERAGE", 0, 0, 0, 0, 0), sewerage);
        var unassigned = summaries.stream().filter(item -> item.department().equals("UNASSIGNED")).findFirst().orElseThrow();
        assertEquals(new AdminAnalyticsController.DepartmentSummary("UNASSIGNED", 3, 1, 0, 0, 2), unassigned);
        verify(complaints).countByDepartmentAndStatusGrouped();
    }

    @Test
    void analyticsIsAdminOnly() {
        assertEquals("hasRole('ADMIN')", AdminAnalyticsController.class.getAnnotation(PreAuthorize.class).value());
    }
}
