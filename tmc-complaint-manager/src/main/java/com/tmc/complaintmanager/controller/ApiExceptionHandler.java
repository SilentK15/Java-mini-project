package com.tmc.complaintmanager.controller;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.server.ResponseStatusException;

import java.net.URI;
import java.util.Map;
import java.util.stream.Collectors;

@RestControllerAdvice
public class ApiExceptionHandler {
    @ExceptionHandler(ResponseStatusException.class)
    ResponseEntity<ProblemDetail> handleResponseStatus(ResponseStatusException exception, HttpServletRequest request) {
        String detail = exception.getReason() == null ? "The request could not be completed." : exception.getReason();
        ProblemDetail problem = problem(exception.getStatusCode(), detail, request);
        return ResponseEntity.status(exception.getStatusCode()).body(problem);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    ResponseEntity<ProblemDetail> handleInvalidArguments(MethodArgumentNotValidException exception,
                                                           HttpServletRequest request) {
        ProblemDetail problem = problem(HttpStatus.BAD_REQUEST, "Correct the highlighted fields and try again.", request);
        Map<String, String> errors = exception.getBindingResult().getFieldErrors().stream()
                .collect(Collectors.toMap(error -> error.getField(), error -> error.getDefaultMessage() == null
                        ? "Invalid value" : error.getDefaultMessage(), (first, next) -> first));
        problem.setProperty("errors", errors);
        return ResponseEntity.badRequest().body(problem);
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    ResponseEntity<ProblemDetail> handleUnreadableBody(HttpMessageNotReadableException exception,
                                                         HttpServletRequest request) {
        return ResponseEntity.badRequest().body(problem(HttpStatus.BAD_REQUEST,
                "The request body is invalid.", request));
    }

    private ProblemDetail problem(org.springframework.http.HttpStatusCode status, String detail,
                                  HttpServletRequest request) {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(status, detail);
        problem.setInstance(URI.create(request.getRequestURI()));
        return problem;
    }
}
