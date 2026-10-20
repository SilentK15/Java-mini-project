ALTER TABLE complaints
    ADD COLUMN citizen_rating INT NULL,
    ADD COLUMN citizen_feedback VARCHAR(1000) NULL,
    ADD COLUMN feedback_at DATETIME(6) NULL;
