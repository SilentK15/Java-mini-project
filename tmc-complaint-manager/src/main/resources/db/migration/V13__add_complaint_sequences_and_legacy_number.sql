CREATE TABLE IF NOT EXISTS complaint_sequences (
    year_val INT NOT NULL,
    current_val BIGINT NOT NULL,
    PRIMARY KEY (year_val)
) ENGINE=InnoDB;

ALTER TABLE complaints
    ADD COLUMN legacy_complaint_number VARCHAR(255) NULL,
    ADD INDEX idx_complaints_legacy_number (legacy_complaint_number);

-- Preserve current complaint numbers into legacy_complaint_number
UPDATE complaints
SET legacy_complaint_number = complaint_number
WHERE legacy_complaint_number IS NULL AND complaint_number IS NOT NULL;

-- Backfill existing complaint numbers to human-readable TMC-<YYYY>-<6-digit sequence> if not already formatted
UPDATE complaints
SET complaint_number = CONCAT('TMC-', COALESCE(YEAR(created_at), 2026), '-', LPAD(id, 6, '0'))
WHERE complaint_number NOT REGEXP '^TMC-[0-9]{4}-[0-9]{6}$';

-- Initialize sequence for 2026 if not present
INSERT INTO complaint_sequences (year_val, current_val)
SELECT 2026, COALESCE(MAX(id), 0)
FROM complaints
ON DUPLICATE KEY UPDATE current_val = current_val;
