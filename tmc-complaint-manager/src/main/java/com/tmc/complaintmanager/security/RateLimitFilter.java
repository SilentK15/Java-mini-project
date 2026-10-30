package com.tmc.complaintmanager.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 50)
public class RateLimitFilter extends OncePerRequestFilter {

    private final boolean enabled;
    private final int loginLimit;
    private final long loginDurationMillis;
    private final int registerLimit;
    private final long registerDurationMillis;
    private final int trackLimit;
    private final long trackDurationMillis;

    private final Map<String, Deque<Long>> requestLogs = new ConcurrentHashMap<>();

    public RateLimitFilter(
            @Value("${app.rate-limit.enabled:true}") boolean enabled,
            @Value("${app.rate-limit.login.limit:5}") int loginLimit,
            @Value("${app.rate-limit.login.duration-seconds:60}") long loginDurationSeconds,
            @Value("${app.rate-limit.register.limit:3}") int registerLimit,
            @Value("${app.rate-limit.register.duration-seconds:3600}") long registerDurationSeconds,
            @Value("${app.rate-limit.track.limit:30}") int trackLimit,
            @Value("${app.rate-limit.track.duration-seconds:60}") long trackDurationSeconds) {
        this.enabled = enabled;
        this.loginLimit = loginLimit;
        this.loginDurationMillis = loginDurationSeconds * 1000L;
        this.registerLimit = registerLimit;
        this.registerDurationMillis = registerDurationSeconds * 1000L;
        this.trackLimit = trackLimit;
        this.trackDurationMillis = trackDurationSeconds * 1000L;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        if (!enabled) {
            filterChain.doFilter(request, response);
            return;
        }

        String path = request.getRequestURI();
        String method = request.getMethod();

        int limit = -1;
        long durationMillis = 0;
        String actionKey = null;

        if ("POST".equalsIgnoreCase(method) && "/api/auth/login".equals(path)) {
            limit = loginLimit;
            durationMillis = loginDurationMillis;
            actionKey = "login";
        } else if ("POST".equalsIgnoreCase(method) && "/api/auth/register".equals(path)) {
            limit = registerLimit;
            durationMillis = registerDurationMillis;
            actionKey = "register";
        } else if ("GET".equalsIgnoreCase(method) && path != null && path.startsWith("/api/complaints/public/track")) {
            limit = trackLimit;
            durationMillis = trackDurationMillis;
            actionKey = "track";
        }

        if (limit > 0 && durationMillis > 0) {
            String clientIp = resolveClientIp(request);
            String bucketKey = actionKey + ":" + clientIp;
            long now = System.currentTimeMillis();

            long retryAfterSeconds = checkRateLimit(bucketKey, limit, durationMillis, now);
            if (retryAfterSeconds > 0) {
                sendRateLimitResponse(request, response, retryAfterSeconds);
                return;
            }
        }

        filterChain.doFilter(request, response);
    }

    private String resolveClientIp(HttpServletRequest request) {
        String xff = request.getHeader("X-Forwarded-For");
        if (xff != null && !xff.isBlank()) {
            return xff.split(",")[0].trim();
        }
        return request.getRemoteAddr() != null ? request.getRemoteAddr() : "unknown";
    }

    private synchronized long checkRateLimit(String bucketKey, int maxLimit, long durationMillis, long now) {
        Deque<Long> timestamps = requestLogs.computeIfAbsent(bucketKey, k -> new ArrayDeque<>());
        long windowStart = now - durationMillis;

        while (!timestamps.isEmpty() && timestamps.peekFirst() <= windowStart) {
            timestamps.pollFirst();
        }

        if (timestamps.size() >= maxLimit) {
            long oldest = timestamps.peekFirst();
            long millisRemaining = (oldest + durationMillis) - now;
            return Math.max(1, (long) Math.ceil(millisRemaining / 1000.0));
        }

        timestamps.addLast(now);
        return 0;
    }

    private void sendRateLimitResponse(HttpServletRequest request, HttpServletResponse response, long retryAfterSeconds)
            throws IOException {
        String origin = request.getHeader("Origin");
        if (origin != null && !origin.isBlank()) {
            response.setHeader("Access-Control-Allow-Origin", origin);
            response.setHeader("Access-Control-Allow-Credentials", "true");
        }
        response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
        response.setHeader("Retry-After", String.valueOf(retryAfterSeconds));
        response.setContentType(MediaType.APPLICATION_PROBLEM_JSON_VALUE);

        String uri = request.getRequestURI() != null ? request.getRequestURI() : "";
        String json = String.format(Locale.ROOT,
                "{\"type\":\"about:blank\",\"title\":\"Too Many Requests\",\"status\":429,\"detail\":\"Too many requests. Please try again in %d second%s.\",\"instance\":\"%s\"}",
                retryAfterSeconds,
                retryAfterSeconds == 1 ? "" : "s",
                uri.replace("\"", "\\\""));
        response.getWriter().write(json);
    }

    public void clear() {
        requestLogs.clear();
    }
}
