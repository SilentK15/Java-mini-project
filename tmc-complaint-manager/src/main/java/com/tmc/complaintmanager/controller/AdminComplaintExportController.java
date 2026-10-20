package com.tmc.complaintmanager.controller;

import com.tmc.complaintmanager.entity.AppUser;
import com.tmc.complaintmanager.entity.AdminAuditLog;
import com.tmc.complaintmanager.entity.Complaint;
import com.tmc.complaintmanager.repository.AdminAuditLogRepository;
import com.tmc.complaintmanager.service.ComplaintService;
import org.springframework.data.domain.Page;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.servlet.mvc.method.annotation.StreamingResponseBody;

import java.io.BufferedWriter;
import java.io.OutputStreamWriter;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/admin/complaints")
@PreAuthorize("hasRole('ADMIN')")
public class AdminComplaintExportController {
    private static final int PAGE_SIZE = 200;
    private final ComplaintService complaints;
    private final AdminAuditLogRepository auditLogs;

    public AdminComplaintExportController(ComplaintService complaints, AdminAuditLogRepository auditLogs) {
        this.complaints = complaints;
        this.auditLogs = auditLogs;
    }

    @GetMapping(value = "/export.csv", produces = "text/csv;charset=UTF-8")
    public ResponseEntity<StreamingResponseBody> export(
            @AuthenticationPrincipal AppUser admin,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String priority,
            @RequestParam(defaultValue = "NEWEST") String sort) {
        if (search != null && search.length() > 150) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Search must be 150 characters or fewer");
        }
        String safeSearch = search == null ? null : search.trim();
        auditLogs.save(new AdminAuditLog(admin.getEmail(), "COMPLAINTS_EXPORTED", null,
                "Filtered complaint CSV; status=" + status + "; category=" + category + "; priority=" + priority + "; sort=" + sort,
                LocalDateTime.now()));
        StreamingResponseBody body = output -> {
            try (BufferedWriter writer = new BufferedWriter(new OutputStreamWriter(output, StandardCharsets.UTF_8))) {
                writer.write('\uFEFF');
                writeRow(writer, List.of("Reference", "Title", "Description", "Category", "Location", "Priority",
                        "Status", "Department", "Latitude", "Longitude", "Created at"));
                int pageNumber = 0;
                Page<Complaint> page;
                do {
                    page = complaints.search(admin, pageNumber++, PAGE_SIZE, safeSearch, status, category, priority, sort);
                    for (Complaint complaint : page.getContent()) writeComplaint(writer, complaint);
                } while (page.hasNext());
                writer.flush();
            }
        };
        return ResponseEntity.ok()
                .contentType(new MediaType("text", "csv", StandardCharsets.UTF_8))
                .cacheControl(CacheControl.noStore())
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"civicconnect-complaints.csv\"")
                .body(body);
    }

    private void writeComplaint(BufferedWriter writer, Complaint complaint) throws java.io.IOException {
        writeRow(writer, List.of(value(complaint.getComplaintNumber()), value(complaint.getTitle()),
                value(complaint.getDescription()), value(complaint.getCategory()), value(complaint.getLocation()),
                value(complaint.getPriority()), value(complaint.getStatus()),
                value(complaint.getDepartment() == null ? null : complaint.getDepartment().name()),
                value(complaint.getLatitude()), value(complaint.getLongitude()), value(complaint.getCreatedAt())));
    }

    private void writeRow(BufferedWriter writer, List<String> cells) throws java.io.IOException {
        for (int index = 0; index < cells.size(); index++) {
            if (index > 0) writer.write(',');
            writer.write(csvCell(cells.get(index)));
        }
        writer.write("\r\n");
    }

    static String csvCell(String value) {
        String safe = value == null ? "" : value;
        String trimmed = safe.stripLeading();
        if (!trimmed.isEmpty() && "=+-@".indexOf(trimmed.charAt(0)) >= 0) safe = "'" + safe;
        return "\"" + safe.replace("\"", "\"\"") + "\"";
    }

    private String value(Object item) { return item == null ? "" : item.toString(); }
}
