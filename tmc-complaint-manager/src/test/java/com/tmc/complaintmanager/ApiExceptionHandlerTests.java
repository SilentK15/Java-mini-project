package com.tmc.complaintmanager;

import com.tmc.complaintmanager.controller.ApiExceptionHandler;
import com.tmc.complaintmanager.controller.ComplaintDuplicateController;
import com.tmc.complaintmanager.service.ComplaintDuplicateDetectionService;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.Mockito.mock;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static org.springframework.test.web.servlet.setup.MockMvcBuilders.standaloneSetup;

class ApiExceptionHandlerTests {
    private MockMvc mvc() {
        ComplaintDuplicateDetectionService service = mock(ComplaintDuplicateDetectionService.class);
        return standaloneSetup(new ComplaintDuplicateController(service))
                .setControllerAdvice(new ApiExceptionHandler())
                .build();
    }

    @Test
    void invalidComplaintCoordinatesReturnSafeProblemDetails() throws Exception {
        mvc().perform(post("/api/complaints/possible-duplicates")
                        .contentType("application/json")
                        .content("""
                                {"title":"Water leak","description":"Pipe leak","category":"WATER",
                                 "location":"Ward 2","latitude":19.2,"longitude":null}
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(content().contentTypeCompatibleWith("application/problem+json"))
                .andExpect(jsonPath("$.detail").value("Provide both GPS coordinates or leave both blank"))
                .andExpect(jsonPath("$.instance").value("/api/complaints/possible-duplicates"));
    }

    @Test
    void validationErrorsReturnFieldDetailsWithoutEchoingSubmittedValues() throws Exception {
        mvc().perform(post("/api/complaints/possible-duplicates")
                        .contentType("application/json")
                        .content("""
                                {"title":"","description":"Pipe leak","category":"WATER",
                                 "location":"Ward 2","latitude":null,"longitude":null}
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(content().contentTypeCompatibleWith("application/problem+json"))
                .andExpect(jsonPath("$.detail").value("Correct the highlighted fields and try again."))
                .andExpect(jsonPath("$.errors.title").exists());
    }
}
