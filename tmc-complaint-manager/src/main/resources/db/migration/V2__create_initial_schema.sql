CREATE TABLE IF NOT EXISTS app_users (
    id BIGINT NOT NULL AUTO_INCREMENT,
    department VARCHAR(40) NULL,
    email VARCHAR(190) NOT NULL,
    name VARCHAR(100) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uk_app_users_email (email)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS complaints (
    id BIGINT NOT NULL AUTO_INCREMENT,
    category VARCHAR(255) NOT NULL,
    complaint_number VARCHAR(255) NOT NULL,
    created_at DATETIME(6) NULL,
    department VARCHAR(40) NULL,
    description VARCHAR(2000) NOT NULL,
    image_url VARCHAR(500) NULL,
    latitude DOUBLE NULL,
    location VARCHAR(255) NOT NULL,
    longitude DOUBLE NULL,
    priority VARCHAR(255) NOT NULL,
    status VARCHAR(255) NOT NULL,
    submitted_by VARCHAR(190) NULL,
    title VARCHAR(255) NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uk_complaints_complaint_number (complaint_number)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS complaint_status_history (
    id BIGINT NOT NULL AUTO_INCREMENT,
    complaint_id BIGINT NOT NULL,
    previous_status VARCHAR(30) NULL,
    new_status VARCHAR(30) NOT NULL,
    reason VARCHAR(1000) NULL,
    actor_email VARCHAR(190) NOT NULL,
    changed_at DATETIME(6) NOT NULL,
    PRIMARY KEY (id),
    INDEX idx_status_history_complaint_time (complaint_id, changed_at),
    CONSTRAINT fk_status_history_complaint FOREIGN KEY (complaint_id) REFERENCES complaints (id)
) ENGINE=InnoDB;
