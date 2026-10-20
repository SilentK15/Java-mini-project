package com.tmc.complaintmanager.controller;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.SQLException;

@RestController
@RequestMapping("/api/health")
public class HealthController {
    private final DataSource dataSource;

    public HealthController(DataSource dataSource) {
        this.dataSource = dataSource;
    }

    @GetMapping("/live")
    public HealthResponse live() {
        return new HealthResponse("UP");
    }

    @GetMapping("/ready")
    public ResponseEntity<HealthResponse> ready() {
        try (Connection connection = dataSource.getConnection()) {
            if (connection.isValid(2)) return ResponseEntity.ok(new HealthResponse("UP"));
        } catch (SQLException ignored) {
            // Keep connection and driver details out of the public health response.
        }
        return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(new HealthResponse("DOWN"));
    }

    public record HealthResponse(String status) {}
}
