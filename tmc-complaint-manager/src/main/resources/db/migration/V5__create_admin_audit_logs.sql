CREATE TABLE admin_audit_logs (
    id BIGINT NOT NULL AUTO_INCREMENT,
    actor_email VARCHAR(190) NOT NULL,
    action VARCHAR(60) NOT NULL,
    target_user_id BIGINT NULL,
    details VARCHAR(500) NULL,
    created_at DATETIME(6) NOT NULL,
    PRIMARY KEY (id),
    INDEX idx_admin_audit_created_at (created_at)
) ENGINE=InnoDB;
