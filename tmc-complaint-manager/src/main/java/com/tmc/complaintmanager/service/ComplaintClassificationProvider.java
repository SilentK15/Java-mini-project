package com.tmc.complaintmanager.service;

import com.tmc.complaintmanager.entity.Department;

/** Provider boundary for an explicitly configured classification model. */
public interface ComplaintClassificationProvider {
    Recommendation recommend(Input input);

    record Input(String title, String description, String location) {}

    record Recommendation(String category, Department department, String priority,
                          double confidence, String explanation) {}
}
