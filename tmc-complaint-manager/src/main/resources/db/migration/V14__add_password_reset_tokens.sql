-- V14: Password reset token table
-- Tokens are single-use, expire after 30 minutes, and reference app_users by email.
CREATE TABLE password_reset_tokens (
    id            BIGINT       NOT NULL AUTO_INCREMENT PRIMARY KEY,
    email         VARCHAR(255) NOT NULL,
    token         VARCHAR(64)  NOT NULL UNIQUE,
    expires_at    DATETIME(6)  NOT NULL,
    used          BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at    DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    INDEX idx_prt_email (email),
    INDEX idx_prt_token (token)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
