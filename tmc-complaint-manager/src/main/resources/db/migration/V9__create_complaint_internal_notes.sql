CREATE TABLE complaint_internal_notes (
    id BIGINT NOT NULL AUTO_INCREMENT,
    complaint_id BIGINT NOT NULL,
    author_email VARCHAR(190) NOT NULL,
    body VARCHAR(2000) NOT NULL,
    created_at DATETIME(6) NOT NULL,
    PRIMARY KEY (id),
    INDEX idx_internal_notes_complaint_time (complaint_id, created_at),
    CONSTRAINT fk_internal_notes_complaint FOREIGN KEY (complaint_id) REFERENCES complaints (id)
) ENGINE=InnoDB;
