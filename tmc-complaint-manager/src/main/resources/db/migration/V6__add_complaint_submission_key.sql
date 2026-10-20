ALTER TABLE complaints
    ADD COLUMN submission_key VARCHAR(36) NULL,
    ADD UNIQUE KEY uk_complaints_submission_key (submission_key);
