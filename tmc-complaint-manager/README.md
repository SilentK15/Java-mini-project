# CivicConnect backend

## Local setup

1. For a fresh installation only, create the MySQL database: `CREATE DATABASE tmc_complaints;`. Do not run this as a workaround for an existing database connection or schema issue.
2. In PowerShell, set the database username and administrator email, then enter passwords through secure prompts. The password values are stored only in the current PowerShell process environment; do not print them or put them directly in commands:

   ```powershell
   function Set-SessionSecret([string]$Name, [string]$Prompt) {
       $secret = Read-Host $Prompt -AsSecureString
       $pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secret)
       try {
           $plain = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer)
           [Environment]::SetEnvironmentVariable($Name, $plain, "Process")
       }
       finally {
           [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer)
           Remove-Variable secret, pointer, plain -ErrorAction SilentlyContinue
       }
   }

   $env:DB_USERNAME = Read-Host -Prompt "MySQL application username"
   Set-SessionSecret "DB_PASSWORD" "MySQL password"
   # Optional: keep these lines only when seeding a first administrator.
   $env:APP_ADMIN_EMAIL = "admin@civicconnect.local"
   Set-SessionSecret "APP_ADMIN_PASSWORD" "New admin password (at least 8 characters; at most 72 UTF-8 bytes)"
   # Optional department staff login; set all four values before starting the backend.
   $env:APP_STAFF_NAME = "Roads Officer"
   $env:APP_STAFF_EMAIL = "officer@civicconnect.local"
   $env:APP_STAFF_DEPARTMENT = "PUBLIC_WORKS"
   Set-SessionSecret "APP_STAFF_PASSWORD" "New staff password (at least 8 characters; at most 72 UTF-8 bytes)"
   .\mvnw.cmd spring-boot:run
   ```

   Database credentials are required for startup. Admin credentials are optional unless an administrator account should be seeded; staff seed credentials are optional. Admin and environment-seeded staff accounts are created once; changing environment variables later does not change an existing account. Administrators can create, activate/deactivate, and reassign staff accounts from the app.
3. To start the backend quickly using your existing `.env` file without manually exporting variables each time, run:
   ```powershell
   .\scripts\Start-Backend.ps1
   ```
4. In the frontend folder, run `npm install` once, then `npm run dev`. Copy `.env.example` to `.env.local` only if the API is not at `http://localhost:8080`.

To create or regenerate the ignored backend `.env` through masked local prompts, run `. .\scripts\Configure-Environment.ps1` from a PowerShell terminal in this backend folder. It also sets `DB_USERNAME` and `DB_PASSWORD` only in that PowerShell process so local Maven commands in the same terminal can use them. It refuses to overwrite an existing `.env`. The Compose root password is separate from the application database user's password; if a Compose database volume already exists, enter that volume's current root password.

### Read-only preflight for an existing database

Before running the application against existing data, inspect the schema and migration history with a MySQL client. These PowerShell commands prompt for the password interactively; do not add a password value to the command:

```powershell
$dbUser = Read-Host "MySQL application username"
mysql --host=localhost --port=3306 --user=$dbUser --password --database=tmc_complaints --execute="SHOW TABLES;"
# Only run this query if flyway_schema_history appears in SHOW TABLES output.
mysql --host=localhost --port=3306 --user=$dbUser --password --database=tmc_complaints --execute="SELECT installed_rank, version, description, success FROM flyway_schema_history ORDER BY installed_rank;"
mysql --host=localhost --port=3306 --user=$dbUser --password --database=tmc_complaints --execute="SHOW CREATE TABLE app_users; SHOW CREATE TABLE complaints; SHOW CREATE TABLE complaint_status_history; SHOW CREATE TABLE admin_audit_logs; SHOW CREATE TABLE complaint_internal_notes;"
Remove-Variable dbUser
```

These queries are read-only. Compare their results with `src/main/resources/db/migration` before application startup; Flyway applies pending migrations automatically.

Flyway applies versioned schema migrations at startup. Existing non-empty databases are baselined automatically; the migration creates missing CivicConnect tables with `IF NOT EXISTS`, and Hibernate validates mappings without automatically altering tables. **Before starting this application against any existing database, inspect its tables and `flyway_schema_history`, compare them with the migration files, and take a verified backup.** `baseline-on-migrate` may mark an existing schema as a baseline and startup then applies pending migrations automatically; it is not a dry-run. Do not point the application at an existing database until that compatibility review is complete. Run backend tests with `.\mvnw.cmd test`; the Spring application-context test uses a disposable in-memory H2 database in MySQL compatibility mode, with Flyway disabled for that test only. This verifies application wiring, not MySQL behavior or migration compatibility. A live MySQL schema check and migration review are still required before starting against the existing `tmc_complaints` database.

Current migrations V2–V11 create the initial tables, status history, citizen feedback fields, staff activation state, administrative audit log, a unique complaint-submission key for safe request retries, an index for recent active duplicate checks, complaint-to-staff assignments, private internal notes, resolution evidence storage, and the status-change timestamp used for service-target tracking.

Complaint evidence accepts valid JPEG and PNG files up to 5 MB. Files are stored under `uploads` by default and are served only through the authenticated complaint image endpoint after checking complaint ownership or department access. Use persistent storage for deployments.

Authentication uses Spring Security server-side sessions with an `HttpOnly`, `SameSite=Lax` session cookie; set `SESSION_COOKIE_SECURE=true` behind HTTPS. Mutating requests require the CSRF token cookie/header pair (`XSRF-TOKEN` / `X-XSRF-TOKEN`). The app does not store bearer tokens in browser storage. Authenticated endpoints enforce citizen, department employee, and administrator permissions on the server; health probes and the initial CSRF/login/registration endpoints are public. `@PreAuthorize` role checks are enabled globally.

Category-to-department routing is a provisional demo mapping. TMC must verify and approve department ownership before real use. Complaint search, filtering, pagination, and allowlisted sorting (`NEWEST`, `OLDEST`, `TITLE`, `PRIORITY`) run on the server.

Complaint-list and CSV export search terms are limited to 150 characters; `%`, `_`, and backslash characters are treated literally.

Citizen accounts can register and update their display name in the app. After resolution, citizens can rate the outcome or request reopening with a reason; department employees/admins must record a decision note. Password recovery is not available until a verified email or SMS delivery provider is configured. Administrators can create department employee accounts with the roles `FIELD_STAFF`, `DEPARTMENT_OFFICER`, or `SUPERVISOR`, manage departments, change employee roles, and deactivate/reactivate accounts. Legacy `STAFF` accounts remain supported. All department employee roles currently share the same department-scoped complaint, status, evidence, and internal-note permissions; TMC must define role-specific permission boundaries before those roles can safely receive different powers. Role and department changes are reloaded from MySQL on authenticated requests. The complaint list is paginated and filters/search run on the server. Citizens can access only their own complaints, department employees only their department queue, and administrators all complaints.

Do not commit local passwords or environment files.

Complaint submission uses a client request key and a unique database column so retrying the same request returns its existing complaint. A changed form receives a new key. GPS latitude and longitude must be provided together; both remain optional.

Administrators can assign active complaints to active staff within the complaint's routed department. Assignment changes require a reason and are recorded in the admin audit log. Ward and field-team assignments remain unavailable until TMC supplies the relevant structure.

Staff and administrators can add internal notes to complaints only within their permitted department scope; citizens cannot read or create these notes. Internal notes are stored separately from the citizen-visible status history and each entry records its author and timestamp.

Staff/admins can attach a separately validated JPG/PNG resolution photo to an active complaint. The reporting citizen can view this evidence after resolution or while a reopening request is under review; department staff and administrators can view it within their scope.

Before a citizen submits, the app checks recent active reports in the same category using shared words and location proximity. It returns only a generic possible-match signal and does not disclose another resident's report details or merge records. Tune `DUPLICATE_LOOKBACK_DAYS`, `DUPLICATE_MINIMUM_SCORE` (0–1), and `DUPLICATE_LOCATION_RADIUS_METERS`; this is a simple lexical/location heuristic, not semantic or AI matching.

## Classification status and advisory endpoint

Complaint classification provides advisory category, department, and priority suggestions via `POST /api/complaints/classify`. It is disabled by default (`CLASSIFICATION_ENABLED=false`) and falls back to safe manual entry whenever no model provider is registered. Enabling the flag alone does not activate classification: exactly one `ComplaintClassificationProvider` implementation must be configured and tested. Recommendations are strictly advisory and are never applied automatically to complaint records or department routing. Any provider must be reviewed for privacy, Marathi/Hindi/English language support, accuracy, latency, and cost before citizen text is sent to it. `CLASSIFICATION_MINIMUM_CONFIDENCE` controls when a provider result is marked for manual review (default `0.75`). Department routing remains provisional and requires TMC approval.

Administrators can export the filtered complaint queue as a streamed CSV. The export omits reporter email and internal notes, is marked no-store, and records the export action in the admin audit log. The export supports the current search, status, category, and priority filters.

Administrators can view a department workload breakdown at `GET /api/admin/analytics/departments`. It returns total counts and counts by lifecycle status for each configured department, including departments with no complaints, plus an `UNASSIGNED` row for complaints with no department. The endpoint is admin-only and does not include citizen contact information.

## Notifications and delivery architecture

Complaint submission and status transitions publish post-commit notification events handled by `NotificationDeliveryService` and formatted via `NotificationTemplateService` with English, Marathi, and Hindi templates for both Email and SMS (<= 160 characters). Each event carries a unique idempotency key (`eventId`) to prevent duplicate transmissions. `NotificationDeliveryService` includes safe retry handling (`app.notifications.max-retries`, default 3) and isolates the application database transaction from third-party provider failures. `NOTIFICATIONS_ENABLED` defaults to `false`; no live email/SMS gateway credentials are hardcoded or committed, so notifications operate in dry-run/mock mode until a TMC-approved provider is configured.

The dashboard returns status counts plus scoped counts of active assigned and unassigned complaints. The overdue dashboard supports configurable response and resolution targets. Set `SLA_RESPONSE_HOURS` to apply a response target to new submissions and reopening requests, and `SLA_RESOLUTION_HOURS` to apply a resolution target from the current in-progress transition. Both default to `0` (disabled); keep them disabled until TMC confirms the official targets. When configured, the API returns each active complaint's due time and overdue flag, plus scoped overdue and unassigned counts. Migration V11 backfills `status_changed_at` from existing status history (or the creation time) without deleting complaint data.

`GET /api/health/live` reports whether the API process is responding. `GET /api/health/ready` checks whether MySQL can accept a connection and returns only `UP` or `DOWN`; both expose no database details and are exempted from session authentication for infrastructure probes. Docker Compose waits for the database and backend readiness checks before starting the frontend.

## Run the full stack with Docker Compose

Docker Compose provides a private MySQL 8.4 service, the Spring Boot API, and the React web app. MySQL is not published to the host and is attached only to an internal database network shared with the backend; the frontend cannot connect to MySQL directly. MySQL data and uploaded complaint photos use named volumes and survive container replacement.

1. Copy `.env.example` to `.env` and replace both database password placeholders with different strong passwords. Keep `.env` private and out of source control. Set `DB_USERNAME` to a new non-root MySQL user name. Optionally set `APP_ADMIN_EMAIL` and `APP_ADMIN_PASSWORD` before the first startup to seed an administrator. To seed one department staff account instead, set all four `APP_STAFF_NAME`, `APP_STAFF_EMAIL`, `APP_STAFF_DEPARTMENT`, and `APP_STAFF_PASSWORD` values. The department must be one of `PUBLIC_WORKS`, `SOLID_WASTE`, `WATER`, `SEWERAGE`, `STREET_LIGHTING`, or `OTHER`. Leave these optional values blank when no bootstrap account is needed. Seed accounts are created only if their email does not already exist.
2. From this backend folder, run `docker compose up --build -d`.
3. Open `http://localhost` (or the port selected with `HTTP_PORT`). Check startup with `docker compose ps` and logs with `docker compose logs -f backend`.

For a public HTTPS deployment, terminate TLS at a trusted reverse proxy, set `SESSION_COOKIE_SECURE=true`, and set `CORS_ALLOWED_ORIGINS` to the exact public origin (for example, `https://civic.example`). Do not expose the backend or database ports publicly. Back up both the `mysql_data` and `complaint_uploads` volumes before upgrades. Flyway applies database migrations when the backend starts; keep backups before deploying migrations.

The Dockerfiles use a non-root backend runtime and do not bake `.env` files or uploaded photos into images. The Compose setup does not configure TLS certificates, email delivery, SMS, or an external backup service; those deployment integrations still need to be selected and configured for a real public launch.
