package com.tmc.complaintmanager;

import com.tmc.complaintmanager.config.EnabledUserFilter;
import com.tmc.complaintmanager.entity.AppUser;
import com.tmc.complaintmanager.entity.Department;
import com.tmc.complaintmanager.entity.UserRole;
import com.tmc.complaintmanager.repository.AppUserRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class EnabledUserFilterTests {
    @AfterEach
    void clearContext() { SecurityContextHolder.clearContext(); }

    @Test
    void invalidatesSessionsForDeactivatedAccounts() throws Exception {
        AppUser principal = mock(AppUser.class);
        when(principal.getId()).thenReturn(8L);
        AppUserRepository users = mock(AppUserRepository.class);
        AppUser inactive = new AppUser("Inactive", "staff@example.test", "hash", UserRole.STAFF);
        inactive.setEnabled(false);
        when(users.findById(8L)).thenReturn(Optional.of(inactive));
        SecurityContextRepository contexts = mock(SecurityContextRepository.class);
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(principal, null, java.util.List.of()));
        MockHttpServletResponse response = new MockHttpServletResponse();
        MockFilterChain chain = new MockFilterChain();

        new EnabledUserFilter(users, contexts).doFilter(new MockHttpServletRequest(), response, chain);

        assertEquals(401, response.getStatus());
        assertNull(chain.getRequest());
        assertNull(SecurityContextHolder.getContext().getAuthentication());
    }

    @Test
    void refreshesDepartmentFromDatabaseForAnActiveStaffSession() throws Exception {
        AppUser principal = mock(AppUser.class);
        when(principal.getId()).thenReturn(9L);
        AppUser active = new AppUser("Officer", "staff@example.test", "hash", UserRole.STAFF, Department.WATER);
        ReflectionTestUtils.setField(active, "id", 9L);
        AppUserRepository users = mock(AppUserRepository.class);
        when(users.findById(9L)).thenReturn(Optional.of(active));
        SecurityContextRepository contexts = mock(SecurityContextRepository.class);
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(principal, null, java.util.List.of()));
        MockHttpServletRequest request = new MockHttpServletRequest();
        MockHttpServletResponse response = new MockHttpServletResponse();
        MockFilterChain chain = new MockFilterChain();

        new EnabledUserFilter(users, contexts).doFilter(request, response, chain);

        assertNotNull(chain.getRequest());
        assertEquals(Department.WATER,
                ((AppUser) SecurityContextHolder.getContext().getAuthentication().getPrincipal()).getDepartment());
        verify(contexts).saveContext(any(), eq(request), eq(response));
    }
}
