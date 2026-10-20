package com.tmc.complaintmanager;

import com.tmc.complaintmanager.controller.ApiExceptionHandler;
import com.tmc.complaintmanager.controller.ComplaintController;
import com.tmc.complaintmanager.service.ComplaintImageStorage;
import com.tmc.complaintmanager.service.ComplaintService;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static org.springframework.test.web.servlet.setup.MockMvcBuilders.standaloneSetup;

class ComplaintSubmissionBindingTests {
    @Test
    void multipartSubmissionBindsOnlyTheValidatedCitizenFields() throws Exception {
        ComplaintService complaints = mock(ComplaintService.class);
        ComplaintImageStorage images = mock(ComplaintImageStorage.class);
        MockMvc mvc = standaloneSetup(new ComplaintController(complaints, images))
                .setControllerAdvice(new ApiExceptionHandler())
                .build();

        mvc.perform(multipart("/api/complaints")
                        .param("title", "Water leak")
                        .param("description", "Pipe is leaking")
                        .param("category", "UNSUPPORTED")
                        .param("location", "Ward 2")
                        .param("priority", "MEDIUM")
                        .param("latitude", "19.2")
                        .param("longitude", "72.9")
                        .param("assignedStaffId", "77")
                        .param("citizenRating", "5")
                        .header("Idempotency-Key", "123e4567-e89b-42d3-a456-426614174000"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.category").exists());

        verifyNoInteractions(complaints, images);
    }
}
