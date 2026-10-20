package com.tmc.complaintmanager;

import com.tmc.complaintmanager.controller.AdminStaffController;
import com.tmc.complaintmanager.entity.AppUser;
import com.tmc.complaintmanager.entity.Department;
import com.tmc.complaintmanager.entity.UserRole;
import com.tmc.complaintmanager.repository.AdminAuditLogRepository;
import com.tmc.complaintmanager.repository.AppUserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.password.PasswordEncoder;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class AdminStaffControllerTests {
    @Test
    void adminCreatesOnlyDepartmentScopedStaffWithEncodedPasswordAndAuditEntry() {
        AppUserRepository users = mock(AppUserRepository.class);
        AdminAuditLogRepository logs = mock(AdminAuditLogRepository.class);
        PasswordEncoder encoder = mock(PasswordEncoder.class);
        when(users.existsByEmailIgnoreCase("roads@example.test")).thenReturn(false);
        when(encoder.encode("test-password")).thenReturn("encoded-test-password");
        when(users.save(any(AppUser.class))).thenAnswer(invocation -> invocation.getArgument(0));
        AppUser admin = new AppUser("Administrator", "admin@example.test", "admin-hash", UserRole.ADMIN);
        AdminStaffController controller = new AdminStaffController(users, logs, encoder);

        var created = controller.createStaff(new AdminStaffController.CreateStaffRequest(
                "Road Officer", " Roads@Example.Test ", "test-password", Department.PUBLIC_WORKS), admin);

        assertEquals("roads@example.test", created.email());
        assertEquals(Department.PUBLIC_WORKS, created.department());
        assertTrue(created.active());
        verify(users).save(argThat(staff -> staff.getRole() == UserRole.STAFF
                && staff.getPassword().equals("encoded-test-password")
                && staff.getDepartment() == Department.PUBLIC_WORKS));
        verify(logs).save(argThat(log -> log.getActorEmail().equals("admin@example.test")
                && log.getAction().equals("STAFF_CREATED")
                && !log.getDetails().contains("password")));
    }

    @Test
    void deactivationIsSoftAndChangesLoginEnabledState() {
        AppUserRepository users = mock(AppUserRepository.class);
        AdminAuditLogRepository logs = mock(AdminAuditLogRepository.class);
        AppUser staff = new AppUser("Road Officer", "staff@example.test", "hash", UserRole.STAFF, Department.PUBLIC_WORKS);
        when(users.findById(5L)).thenReturn(java.util.Optional.of(staff));
        when(users.save(any(AppUser.class))).thenAnswer(invocation -> invocation.getArgument(0));

        var result = new AdminStaffController(users, logs, mock(PasswordEncoder.class))
                .setStaffActive(5L, new AdminStaffController.ActiveRequest(false),
                        new AppUser("Admin", "admin@example.test", "hash", UserRole.ADMIN));

        assertFalse(result.active());
        assertFalse(staff.isEnabled());
        verify(users).save(staff);
        verify(logs).save(argThat(log -> log.getAction().equals("STAFF_DEACTIVATED")));
    }

    @Test
    void administratorCanCreateAndChangeDepartmentEmployeeRolesWithAudit() {
        AppUserRepository users = mock(AppUserRepository.class);
        AdminAuditLogRepository logs = mock(AdminAuditLogRepository.class);
        PasswordEncoder encoder = mock(PasswordEncoder.class);
        when(users.existsByEmailIgnoreCase("officer@example.test")).thenReturn(false);
        when(encoder.encode("test-password")).thenReturn("encoded");
        when(users.save(any(AppUser.class))).thenAnswer(invocation -> invocation.getArgument(0));
        AdminStaffController controller = new AdminStaffController(users, logs, encoder);
        AppUser admin = new AppUser("Administrator", "admin@example.test", "hash", UserRole.ADMIN);

        var created = controller.createStaff(new AdminStaffController.CreateStaffRequest(
                "Department Officer", "officer@example.test", "test-password", Department.WATER,
                UserRole.DEPARTMENT_OFFICER), admin);
        assertEquals(UserRole.DEPARTMENT_OFFICER, created.role());

        when(users.findById(9L)).thenReturn(java.util.Optional.of(new AppUser(
                "Field Employee", "field@example.test", "hash", UserRole.FIELD_STAFF, Department.WATER)));
        var changed = controller.setStaffRole(9L,
                new AdminStaffController.RoleRequest(UserRole.SUPERVISOR), admin);
        assertEquals(UserRole.SUPERVISOR, changed.role());
        verify(logs).save(argThat(log -> log.getAction().equals("STAFF_ROLE_CHANGED")
                && log.getDetails().equals("FIELD_STAFF -> SUPERVISOR")));
    }

    @Test
    void staffManagementRejectsAdminRoleEscalation() {
        AppUserRepository users = mock(AppUserRepository.class);
        AdminAuditLogRepository logs = mock(AdminAuditLogRepository.class);
        AdminStaffController controller = new AdminStaffController(users, logs, mock(PasswordEncoder.class));

        var exception = assertThrows(org.springframework.web.server.ResponseStatusException.class,
                () -> controller.createStaff(new AdminStaffController.CreateStaffRequest(
                        "Escalation", "admin2@example.test", "test-password", Department.WATER, UserRole.ADMIN),
                        new AppUser("Admin", "admin@example.test", "hash", UserRole.ADMIN)));

        assertEquals(400, exception.getStatusCode().value());
        verifyNoInteractions(users, logs);
    }

    @Test
    void staffCreationRejectsPasswordsOverTheBcryptUtf8ByteLimitBeforeDatabaseAccess() {
        AppUserRepository users = mock(AppUserRepository.class);
        AdminAuditLogRepository logs = mock(AdminAuditLogRepository.class);
        PasswordEncoder encoder = mock(PasswordEncoder.class);
        AdminStaffController controller = new AdminStaffController(users, logs, encoder);

        var exception = assertThrows(org.springframework.web.server.ResponseStatusException.class,
                () -> controller.createStaff(new AdminStaffController.CreateStaffRequest(
                        "Staff", "staff@example.test", "é".repeat(37), Department.WATER),
                        new AppUser("Admin", "admin@example.test", "hash", UserRole.ADMIN)));

        assertEquals(400, exception.getStatusCode().value());
        verifyNoInteractions(users, logs, encoder);
    }
}
