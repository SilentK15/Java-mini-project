package com.tmc.complaintmanager.entity;

public enum UserRole {
    CITIZEN,
    STAFF,
    FIELD_STAFF,
    DEPARTMENT_OFFICER,
    SUPERVISOR,
    ADMIN;

    public boolean isDepartmentEmployee() {
        return this == STAFF || this == FIELD_STAFF || this == DEPARTMENT_OFFICER || this == SUPERVISOR;
    }
}
