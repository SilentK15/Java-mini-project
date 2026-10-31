package com.tmc.complaintmanager.controller;

import com.tmc.complaintmanager.entity.AdminAuditLog;
import com.tmc.complaintmanager.entity.AppUser;
import com.tmc.complaintmanager.entity.Department;
import com.tmc.complaintmanager.entity.UserRole;
import com.tmc.complaintmanager.repository.AdminAuditLogRepository;
import com.tmc.complaintmanager.repository.AppUserRepository;
import com.tmc.complaintmanager.security.PasswordPolicy;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;

@RestController
@RequestMapping("/api/admin")
@PreAuthorize("hasRole('ADMIN')")
public class AdminStaffController {
    private final AppUserRepository users;
    private final AdminAuditLogRepository auditLogs;
    private final PasswordEncoder passwordEncoder;

    public AdminStaffController(AppUserRepository users, AdminAuditLogRepository auditLogs, PasswordEncoder passwordEncoder) {
        this.users = users;
        this.auditLogs = auditLogs;
        this.passwordEncoder = passwordEncoder;
    }

    @GetMapping("/staff")
    public List<StaffAccountResponse> listStaff() {
        return users.findAllByRoleInOrderByNameAsc(departmentRoles()).stream().map(this::staffView).toList();
    }

    @PostMapping("/staff")
    @ResponseStatus(HttpStatus.CREATED)
    @Transactional
    public StaffAccountResponse createStaff(@Valid @RequestBody CreateStaffRequest body,
                                             @AuthenticationPrincipal AppUser admin) {
        PasswordPolicy.validate(body.password());
        if (body.role() == null || !body.role().isDepartmentEmployee()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Choose a department employee role");
        }
        String email = body.email().trim().toLowerCase(Locale.ROOT);
        if (users.existsByEmailIgnoreCase(email)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "An account with this email already exists");
        }
        AppUser staff = users.save(new AppUser(body.name().trim(), email,
                passwordEncoder.encode(body.password()), body.role(), body.department()));
        audit("STAFF_CREATED", admin, staff.getId(), "Role: " + staff.getRole() + "; department: " + staff.getDepartment());
        return staffView(staff);
    }

    @PutMapping("/staff/{id}/active")
    @Transactional
    public StaffAccountResponse setStaffActive(@PathVariable Long id, @Valid @RequestBody ActiveRequest body,
                                                @AuthenticationPrincipal AppUser admin) {
        AppUser staff = getStaff(id);
        staff.setEnabled(body.active());
        AppUser saved = users.save(staff);
        audit(body.active() ? "STAFF_ACTIVATED" : "STAFF_DEACTIVATED", admin, id, null);
        return staffView(saved);
    }

    @PostMapping("/staff/{id}/enable")
    @Transactional
    public StaffAccountResponse enableStaffAlias(@PathVariable Long id, @AuthenticationPrincipal AppUser admin) {
        return setStaffActive(id, new ActiveRequest(true), admin);
    }

    @PostMapping("/staff/{id}/disable")
    @Transactional
    public StaffAccountResponse disableStaffAlias(@PathVariable Long id, @AuthenticationPrincipal AppUser admin) {
        return setStaffActive(id, new ActiveRequest(false), admin);
    }

    @PutMapping("/staff/{id}/department")
    @Transactional
    public StaffAccountResponse setStaffDepartment(@PathVariable Long id,
                                                    @Valid @RequestBody DepartmentRequest body,
                                                    @AuthenticationPrincipal AppUser admin) {
        AppUser staff = getStaff(id);
        Department previous = staff.getDepartment();
        staff.setDepartment(body.department());
        AppUser saved = users.save(staff);
        audit("STAFF_DEPARTMENT_CHANGED", admin, id, previous + " -> " + saved.getDepartment());
        return staffView(saved);
    }

    @PutMapping("/staff/{id}/role")
    @Transactional
    public StaffAccountResponse setStaffRole(@PathVariable Long id, @Valid @RequestBody RoleRequest body,
                                              @AuthenticationPrincipal AppUser admin) {
        if (body.role() == null || !body.role().isDepartmentEmployee()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Choose a department employee role");
        }
        AppUser staff = getStaff(id);
        UserRole previous = staff.getRole();
        staff.setRole(body.role());
        AppUser saved = users.save(staff);
        audit("STAFF_ROLE_CHANGED", admin, id, previous + " -> " + saved.getRole());
        return staffView(saved);
    }

    @GetMapping("/audit")
    public AuditPage audit(@RequestParam(defaultValue = "0") int page,
                           @RequestParam(defaultValue = "25") int size) {
        if (page < 0) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Page must be zero or greater");
        Page<AdminAuditLog> result = auditLogs.findAllByOrderByCreatedAtDesc(
                PageRequest.of(page, Math.max(1, Math.min(size, 100)), Sort.unsorted()));
        return new AuditPage(result.getContent(), result.getNumber(), result.getSize(),
                result.getTotalElements(), result.getTotalPages());
    }

    private AppUser getStaff(Long id) {
        AppUser staff = users.findById(id).orElseThrow(() ->
                new ResponseStatusException(HttpStatus.NOT_FOUND, "Staff account not found"));
        if (!staff.getRole().isDepartmentEmployee()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Staff account not found");
        }
        return staff;
    }

    private void audit(String action, AppUser admin, Long targetId, String details) {
        auditLogs.save(new AdminAuditLog(admin.getEmail(), action, targetId, details, LocalDateTime.now()));
    }

    private StaffAccountResponse staffView(AppUser staff) {
        return new StaffAccountResponse(staff.getId(), staff.getName(), staff.getEmail(),
                staff.getDepartment(), staff.getRole(), staff.isEnabled());
    }

    private List<UserRole> departmentRoles() {
        return List.of(UserRole.STAFF, UserRole.FIELD_STAFF, UserRole.DEPARTMENT_OFFICER, UserRole.SUPERVISOR);
    }

    public record CreateStaffRequest(@NotBlank @Size(max = 100) String name,
                                     @NotBlank @Email @Size(max = 190) String email,
                                     @NotBlank @Size(min = 10, max = 72) String password,
                                     @NotNull Department department, @NotNull UserRole role) {
        public CreateStaffRequest(String name, String email, String password, Department department) {
            this(name, email, password, department, UserRole.STAFF);
        }
    }
    public record ActiveRequest(boolean active) {}
    public record DepartmentRequest(@NotNull Department department) {}
    public record RoleRequest(@NotNull UserRole role) {}
    public record StaffAccountResponse(Long id, String name, String email, Department department, UserRole role, boolean active) {}
    public record AuditPage(List<AdminAuditLog> events, int page, int size, long totalElements, int totalPages) {}
}
