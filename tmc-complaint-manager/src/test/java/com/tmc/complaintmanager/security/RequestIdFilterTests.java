package com.tmc.complaintmanager.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import org.junit.jupiter.api.Test;
import org.slf4j.MDC;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import java.io.IOException;
import java.util.concurrent.atomic.AtomicReference;

import static org.junit.jupiter.api.Assertions.*;

class RequestIdFilterTests {

    private final RequestIdFilter filter = new RequestIdFilter();

    @Test
    void generatesAndPropagatesRequestIdWhenHeaderAbsent() throws ServletException, IOException {
        MockHttpServletRequest request = new MockHttpServletRequest();
        MockHttpServletResponse response = new MockHttpServletResponse();
        AtomicReference<String> mdcValueInsideChain = new AtomicReference<>();

        FilterChain chain = (req, res) -> mdcValueInsideChain.set(MDC.get(RequestIdFilter.MDC_KEY));

        filter.doFilter(request, response, chain);

        String responseHeader = response.getHeader(RequestIdFilter.REQUEST_ID_HEADER);
        assertNotNull(responseHeader);
        assertFalse(responseHeader.isBlank());
        assertEquals(responseHeader, mdcValueInsideChain.get());
        assertNull(MDC.get(RequestIdFilter.MDC_KEY), "MDC key must be cleared after filter completion");
    }

    @Test
    void preservesAndPropagatesValidIncomingRequestId() throws ServletException, IOException {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader(RequestIdFilter.REQUEST_ID_HEADER, "req-custom-12345");
        MockHttpServletResponse response = new MockHttpServletResponse();
        AtomicReference<String> mdcValueInsideChain = new AtomicReference<>();

        FilterChain chain = (req, res) -> mdcValueInsideChain.set(MDC.get(RequestIdFilter.MDC_KEY));

        filter.doFilter(request, response, chain);

        assertEquals("req-custom-12345", response.getHeader(RequestIdFilter.REQUEST_ID_HEADER));
        assertEquals("req-custom-12345", mdcValueInsideChain.get());
        assertNull(MDC.get(RequestIdFilter.MDC_KEY));
    }

    @Test
    void sanitizesUnsafeCharactersFromIncomingRequestId() throws ServletException, IOException {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader(RequestIdFilter.REQUEST_ID_HEADER, "req-123\n\rBadChars!@#");
        MockHttpServletResponse response = new MockHttpServletResponse();
        AtomicReference<String> mdcValueInsideChain = new AtomicReference<>();

        FilterChain chain = (req, res) -> mdcValueInsideChain.set(MDC.get(RequestIdFilter.MDC_KEY));

        filter.doFilter(request, response, chain);

        String result = response.getHeader(RequestIdFilter.REQUEST_ID_HEADER);
        assertEquals("req-123BadChars", result);
        assertEquals("req-123BadChars", mdcValueInsideChain.get());
    }
}
