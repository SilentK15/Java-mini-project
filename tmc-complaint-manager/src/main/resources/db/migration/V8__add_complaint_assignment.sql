ALTER TABLE complaints
    ADD COLUMN assigned_staff_id BIGINT NULL,
    ADD COLUMN assignment_at DATETIME(6) NULL,
    ADD COLUMN assignment_reason VARCHAR(400) NULL,
    ADD CONSTRAINT fk_complaints_assigned_staff
        FOREIGN KEY (assigned_staff_id) REFERENCES app_users (id),
    ADD INDEX idx_complaints_assigned_status (assigned_staff_id, status);
