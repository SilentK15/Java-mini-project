# CivicConnect — Deployment & Operations Guide

CivicConnect is a production-grade municipal complaint management system built for the Thane Municipal Corporation (TMC). It features a Spring Boot 4 / Java 21 REST backend and a modern React 19 / Vite frontend.

---

## 1. Architecture Overview

- **Backend**: Spring Boot 4.1.1, Java 21, Spring Security (Session cookies + CSRF protection), Spring Data JPA, Flyway migrations, Spring Boot Actuator, springdoc-openapi.
- **Database**: MySQL 8.0 with InnoDB utf8mb4 engine.
- **Frontend**: React 19, Vite, Leaflet mapping with OpenStreetMap, Recharts metrics visualization, plain CSS design tokens.
- **Monitoring & Tracing**: Actuator health & metrics (`/actuator`), MDC request correlation via `X-Request-Id`.

---

## 2. Quickstart with Docker Compose

Ensure Docker and Docker Compose are installed.

```bash
# Clone and enter workspace
git clone <repo-url> civicconnect
cd civicconnect

# Start MySQL database and Spring Boot backend
docker compose up -d --build

# View container logs
docker compose logs -f backend
```

Once running:
- **Backend API**: `http://localhost:8080`
- **Swagger UI**: `http://localhost:8080/swagger-ui.html`
- **OpenAPI Schema**: `http://localhost:8080/api-docs`
- **Health Probes**: `http://localhost:8080/actuator/health` or `/api/health/live`
- **MySQL Database**: `localhost:3306`

To start the React frontend in development mode:
```bash
cd tmc-complaint-frontend
npm install
npm run dev
# Accessible at http://localhost:5173
```

---

## 3. Environment Variables Reference

All credentials and dynamic configs are externalized as environment variables.

| Variable | Default Value | Description |
|---|---|---|
| `SPRING_DATASOURCE_URL` | `jdbc:mysql://localhost:3306/tmc_complaints` | JDBC database connection URL |
| `DB_USERNAME` | *(Required in prod)* | MySQL database username |
| `DB_PASSWORD` | *(Required in prod)* | MySQL database password |
| `CORS_ALLOWED_ORIGINS` | `http://localhost:5173` | Comma-separated list of allowed CORS origins |
| `SESSION_COOKIE_SECURE`| `false` | Set to `true` when running behind HTTPS in production |
| `UPLOAD_DIR` | `uploads` | Directory for complaint images and evidence |
| `RATE_LIMIT_ENABLED` | `true` | Enable brute-force protection filter |
| `RATE_LIMIT_LOGIN_LIMIT` | `5` | Max login attempts per 60s per IP |
| `NOTIFICATIONS_ENABLED` | `false` | Enable email status notifications |
| `NOTIFICATIONS_PROVIDER` | `none` | Notification provider (`none` or `smtp`) |
| `SMTP_HOST` | `localhost` | Outgoing SMTP server hostname |
| `SMTP_PORT` | `587` | Outgoing SMTP server port |
| `SMTP_USER` | `""` | SMTP authentication user |
| `SMTP_PASS` | `""` | SMTP authentication password |
| `SMTP_FROM` | `noreply@tmc.gov.in` | Sender address on outgoing notification emails |
| `APP_ADMIN_EMAIL` | `""` | Default administrator seed email (if bootstrapping) |
| `APP_ADMIN_PASSWORD` | `""` | Default administrator seed password |

---

## 4. Flyway Database Migrations

Database schema versioning is managed strictly through Flyway scripts under `src/main/resources/db/migration/`.

| Migration | Summary |
|---|---|
| `V2__create_initial_schema.sql` | Core schema (`app_users`, `complaints`, `complaint_status_history`) |
| `V3__add_citizen_feedback.sql` | Citizen star rating and resolution feedback |
| `V4__enable_staff_management.sql` | Active flag and department field on staff accounts |
| `V5__create_admin_audit_logs.sql` | Audit logging table for administrative actions |
| `V6__add_complaint_submission_key.sql` | Idempotency key column for complaint submissions |
| `V7__index_recent_active_complaints.sql` | Composite indexes for active category/status queries |
| `V8__add_complaint_assignment.sql` | Department and assigned staff tracking columns |
| `V9__create_complaint_internal_notes.sql` | Municipal officer internal notes table |
| `V10__add_resolution_evidence.sql` | Resolution photo evidence image URLs |
| `V11__add_complaint_status_timestamp.sql` | Status change timestamp tracking column |
| `V12__add_account_lockout.sql` | Consecutive failed attempt counter & lock expiry for brute-force protection |
| `V13__add_complaint_sequences_and_legacy_number.sql` | `TMC-YYYY-NNNNNN` human-readable numbers & pessimistic sequence counter |
| `V14__add_password_reset_tokens.sql` | Single-use 64-character URL-safe password reset token table |

> **Rule:** Never modify existing migration scripts once applied. All database schema evolutions must be added as new versioned migrations (e.g., `V15__...sql`).

---

## 5. Security & Reverse Proxy (Nginx)

In production, run the application behind an SSL-terminating reverse proxy such as Nginx.

```nginx
server {
    listen 443 ssl http2;
    server_name civicconnect.tmc.gov.in;

    ssl_certificate /etc/letsencrypt/live/civicconnect.tmc.gov.in/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/civicconnect.tmc.gov.in/privkey.pem;

    # Static React frontend build
    location / {
        root /var/www/civicconnect-frontend/dist;
        try_files $uri $uri/ /index.html;
    }

    # Proxy REST API to Spring Boot
    location /api/ {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
    }

    # Actuator & Swagger UI
    location ~ ^/(actuator|swagger-ui|api-docs) {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

Ensure `SESSION_COOKIE_SECURE=true` is set in production environment variables so authentication cookies carry the `Secure` flag.

---

## 6. Backup and Recovery

### Database Backup (Daily Cron)
```bash
mysqldump -u tmc_user -p tmc_complaints --single-transaction --quick > /backups/tmc_$(date +\%F).sql
```

### Media Attachments Backup
Back up the persistent uploads directory (`/app/uploads` in Docker or directory configured via `UPLOAD_DIR`):
```bash
tar -czf /backups/uploads_$(date +\%F).tar.gz /app/uploads
```
