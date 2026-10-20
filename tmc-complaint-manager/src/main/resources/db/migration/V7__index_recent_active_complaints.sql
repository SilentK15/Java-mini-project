CREATE INDEX idx_complaints_duplicate_scan
    ON complaints (category(40), status(30), created_at);
