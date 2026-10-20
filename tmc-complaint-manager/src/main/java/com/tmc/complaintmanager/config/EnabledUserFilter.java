package com.tmc.complaintmanager.config;

import com.tmc.complaintmanager.entity.AppUser;
import com.tmc.complaintmanager.repository.AppUserRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

public class EnabledUserFilter extends OncePerRequestFilter {
    private final AppUserRepository users;
    private final SecurityContextRepository contexts;

    public EnabledUserFilter(AppUserRepository users, SecurityContextRepository contexts) {
        this.users = users;
        this.contexts = contexts;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        Authentication current = SecurityContextHolder.getContext().getAuthentication();
        if (current != null && current.getPrincipal() instanceof AppUser principal) {
            AppUser account = users.findById(principal.getId()).orElse(null);
            if (account == null || !account.isEnabled()) {
                SecurityContextHolder.clearContext();
                HttpSession session = request.getSession(false);
                if (session != null) session.invalidate();
                response.sendError(HttpServletResponse.SC_UNAUTHORIZED, "Account is inactive");
                return;
            }
            SecurityContext refreshed = SecurityContextHolder.createEmptyContext();
            UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(
                    account, null, account.getAuthorities());
            authentication.setDetails(current.getDetails());
            refreshed.setAuthentication(authentication);
            SecurityContextHolder.setContext(refreshed);
            contexts.saveContext(refreshed, request, response);
        }
        chain.doFilter(request, response);
    }
}
