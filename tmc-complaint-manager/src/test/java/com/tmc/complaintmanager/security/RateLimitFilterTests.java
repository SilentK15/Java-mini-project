package com.tmc.complaintmanager.security;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import static org.junit.jupiter.api.Assertions.*;

class RateLimitFilterTests {

    private RateLimitFilter filter;

    @BeforeEach
    void setUp() {
        filter = new RateLimitFilter(true, 5, 60, 3, 3600, 30, 60);
    }

    @Test
    void allowsLoginRequestsUpToLimitAndBlocksSubsequentWith429AndRetryAfter() throws Exception {
        for (int i = 0; i < 5; i++) {
            MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/auth/login");
            request.setRemoteAddr("192.168.1.100");
            MockHttpServletResponse response = new MockHttpServletResponse();
            MockFilterChain chain = new MockFilterChain();

            filter.doFilter(request, response, chain);
            assertEquals(200, response.getStatus());
            assertNotNull(chain.getRequest());
        }

        // 6th attempt should be blocked
        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/auth/login");
        request.setRemoteAddr("192.168.1.100");
        MockHttpServletResponse response = new MockHttpServletResponse();
        MockFilterChain chain = new MockFilterChain();

        filter.doFilter(request, response, chain);
        assertEquals(429, response.getStatus());
        assertNull(chain.getRequest());
        assertNotNull(response.getHeader("Retry-After"));
        assertTrue(Integer.parseInt(response.getHeader("Retry-After")) > 0);
        assertTrue(response.getContentAsString().contains("Too Many Requests"));
        assertTrue(response.getContentType().contains("application/problem+json"));
    }

    @Test
    void rateLimitsRegistrationByIp() throws Exception {
        for (int i = 0; i < 3; i++) {
            MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/auth/register");
            request.setRemoteAddr("10.0.0.1");
            MockHttpServletResponse response = new MockHttpServletResponse();
            filter.doFilter(request, response, new MockFilterChain());
            assertEquals(200, response.getStatus());
        }

        // 4th registration from same IP is blocked
        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/auth/register");
        request.setRemoteAddr("10.0.0.1");
        MockHttpServletResponse response = new MockHttpServletResponse();
        filter.doFilter(request, response, new MockFilterChain());
        assertEquals(429, response.getStatus());
        assertNotNull(response.getHeader("Retry-After"));

        // Different IP can still register
        MockHttpServletRequest request2 = new MockHttpServletRequest("POST", "/api/auth/register");
        request2.setRemoteAddr("10.0.0.2");
        MockHttpServletResponse response2 = new MockHttpServletResponse();
        filter.doFilter(request2, response2, new MockFilterChain());
        assertEquals(200, response2.getStatus());
    }

    @Test
    void respectsForwardedForHeaderWhenBehindProxy() throws Exception {
        for (int i = 0; i < 5; i++) {
            MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/auth/login");
            request.setRemoteAddr("127.0.0.1");
            request.addHeader("X-Forwarded-For", "203.0.113.195, 10.0.0.1");
            MockHttpServletResponse response = new MockHttpServletResponse();
            filter.doFilter(request, response, new MockFilterChain());
            assertEquals(200, response.getStatus());
        }

        // 6th from original client IP is rate limited
        MockHttpServletRequest blockedRequest = new MockHttpServletRequest("POST", "/api/auth/login");
        blockedRequest.setRemoteAddr("127.0.0.1");
        blockedRequest.addHeader("X-Forwarded-For", "203.0.113.195, 10.0.0.1");
        MockHttpServletResponse blockedResponse = new MockHttpServletResponse();
        filter.doFilter(blockedRequest, blockedResponse, new MockFilterChain());
        assertEquals(429, blockedResponse.getStatus());

        // Different forwarded client IP succeeds
        MockHttpServletRequest otherRequest = new MockHttpServletRequest("POST", "/api/auth/login");
        otherRequest.setRemoteAddr("127.0.0.1");
        otherRequest.addHeader("X-Forwarded-For", "198.51.100.55");
        MockHttpServletResponse otherResponse = new MockHttpServletResponse();
        filter.doFilter(otherRequest, otherResponse, new MockFilterChain());
        assertEquals(200, otherResponse.getStatus());
    }

    @Test
    void bypassedWhenDisabled() throws Exception {
        RateLimitFilter disabledFilter = new RateLimitFilter(false, 1, 60, 1, 60, 1, 60);
        for (int i = 0; i < 10; i++) {
            MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/auth/login");
            request.setRemoteAddr("1.2.3.4");
            MockHttpServletResponse response = new MockHttpServletResponse();
            disabledFilter.doFilter(request, response, new MockFilterChain());
            assertEquals(200, response.getStatus());
        }
    }
}
