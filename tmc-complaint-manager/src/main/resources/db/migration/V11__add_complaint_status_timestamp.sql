ALTER TABLE complaints
    ADD COLUMN status_changed_at DATETIME(6) NULL;

UPDATE complaints
SET status_changed_at = COALESCE(
    (SELECT MAX(h.changed_at) FROM complaint_status_history h WHERE h.complaint_id = complaints.id),
    created_at,
    CURRENT_TIMESTAMP(6)
)
WHERE status_changed_at IS NULL;

ALTER TABLE complaints
    MODIFY COLUMN status_changed_at DATETIME(6) NOT NULL;

CREATE INDEX idx_complaints_sla_status_created
    ON complaints (status, created_at);

CREATE INDEX idx_complaints_sla_status_changed
    ON complaints (status, status_changed_at);

CREATE INDEX idx_complaints_sla_department_created
    ON complaints (department, status, created_at);

CREATE INDEX idx_complaints_sla_department_changed
    ON complaints (department, status, status_changed_at);

CREATE INDEX idx_complaints_unassigned_department_status
    ON complaints (department, assigned_staff_id, status);
