# CivicConnect - Changes Log

## Baseline
- Backend: 119 existing JUnit tests passing.
- Frontend: 15 existing unit tests passing, ESLint passing, Vite build successful.

## Phase 1 — Foundations
- **Java package layout**: Moved `controller`, `service`, `entity`, and `repository` folders from `src/main/java/` to `src/main/java/com/tmc/complaintmanager/` so directory structure exactly matches the declared packages.
- **Docker health check**: Moved `HealthProbe.java` to `docker/HealthProbe.java` and updated `Dockerfile` build instructions (`COPY docker/HealthProbe.java docker/` and `javac -d /workspace/health-check docker/HealthProbe.java`).
- **Lombok consistency**: Replaced manual getter/setter boilerplate with Lombok annotations (`@Getter`, `@Setter`, `@NoArgsConstructor`) across `AppUser`, `AdminAuditLog`, `ComplaintInternalNote`, and `ComplaintStatusHistory`, consistent with `Complaint`.
- **Spring Boot devtools**: Configured `<excludeDevtools>true</excludeDevtools>` in the `spring-boot-maven-plugin` configuration and verified `<optional>true</optional>` and `<scope>runtime</scope>` so devtools is excluded from production jar packaging.
- **Image storage consistency**: Clarified WebP handling in `ComplaintImageStorage` where uploads validate JPG/PNG while legacy WebP resolution remains supported for backwards compatibility.
- **Git ignore verification**: Verified and updated root, backend, and frontend `.gitignore` files to cover `target/`, `node_modules/`, `dist/`, `uploads/`, `backups/`, `.idea/`, `.env` (while keeping `.env.example`).

## Phase 2 — Core Hardening & Public Services
- **Account Lockout**: Implemented lockout after 5 consecutive failed login attempts with a 15-minute lock window, responding with HTTP 423 Locked and remaining lockout time. Reset counters upon successful authentication. Added `failed_attempts` and `locked_until` columns via Flyway migration `V12__add_account_lockout.sql`.
- **Human-Readable Complaint Numbers**: Replaced raw random UUIDs with predictable, human-readable complaint identifiers in `TMC-YYYY-NNNNNN` format (e.g. `TMC-2026-000001`). Managed by `ComplaintNumberGenerator` backed by `complaint_sequences` table with pessimistic row locks (`@Lock(PESSIMISTIC_WRITE)`) and `REQUIRES_NEW` transactions for concurrency safety. Backfilled legacy complaint numbers via Flyway migration `V13__add_complaint_sequences_and_legacy_number.sql`.
- **Case-Insensitive & Legacy Lookup**: Updated `ComplaintRepository` with `findByComplaintNumberIgnoreCase` supporting both current `TMC-YYYY-NNNNNN` numbers and legacy UUID values regardless of casing.
- **Public Complaint Tracker**: Added unauthenticated `/api/complaints/public/track/{complaintNumber}` endpoint returning sanitized complaint status, department, category, location, and timeline without exposing internal notes or citizen personal data. Added `PublicTrackerModal` and navigation trigger in the frontend.
- **Rate Limiting**: Added `RateLimitFilter` to protect auth endpoints (`/api/auth/login`, `/api/auth/register`) and the public tracker against brute-force attacks and abuse, with configurable thresholds and per-IP tracking.
- **Testing**: Added test suites for account lockout, concurrent sequence generation, public tracker, and rate limiting. Backend test count increased from 119 to 132 passing tests.

## Phase 3 — Frontend Modular Architecture & Design System
- **Modular Frontend Architecture**: Refactored monolithic 2,558-line `App.jsx` into modular structure: `src/api/` (API client modules), `src/context/` (Auth and Toast contexts), `src/hooks/` (useAuth, useToast, useDebounce, useMediaQuery), `src/components/` (Header, Footer, PublicTrackerModal, LocationPicker, WardMapView, AnalyticsCharts, StatusBadge, etc.), `src/pages/` (Landing, CitizenDashboard, StaffQueue, AdminDashboard, ComplaintDetails), and `src/styles/`.
- **Modern Design System**: Built CSS variables design tokens supporting light and dark modes with seamless switching, responsive mobile layouts down to 375px, glassmorphic navigation header, accessible focus rings, and high contrast status badges.
- **Interactive Map Picker & Ward Visualization**: Integrated Leaflet with reverse geocoding via OpenStreetMap Nominatim for accurate location selection during complaint submission; added interactive Thane ward cluster maps.
- **Admin Visualizations**: Added interactive charts using Recharts for SLA metrics, department breakdown, complaint status distribution, and daily resolution trends.
- **Testing & Verification**: Created Vitest JSX test suite (`src/test/app.test.jsx`) and verified existing 15 Node test helper suites, passing with zero ESLint errors and production build verification.

## Phase 4 — Password Reset, Notifications & Demo Data
- **Password Reset Flow**: Implemented secure token-based password reset workflow with single-use cryptographically random 64-character URL-safe tokens (30-minute expiration). Table `password_reset_tokens` added via Flyway migration `V14__add_password_reset_tokens.sql`.
- **User Enumeration Protection**: Forgot-password endpoint (`POST /api/auth/forgot-password`) always returns HTTP 200 with standard response regardless of whether the account exists, preventing email harvesting.
- **Automated Token Purge**: Scheduled nightly purge (`@Scheduled(cron = "0 0 3 * * *")` enabled by `@EnableScheduling`) to prune expired and redeemed tokens.
- **SMTP Notification Provider**: Implemented `SmtpNotificationProvider` adhering to `ComplaintNotificationProvider` contract, conditionally active when `app.notifications.enabled=true` and `app.notifications.provider=smtp`, utilizing Spring Mail and customizable SMTP parameters.
- **Demo Data Seeding**: Created `DemoDataSeeder` activated only under `--spring.profiles.active=demo` (`@Profile("demo")`), providing pre-seeded citizen, staff, and admin accounts along with realistic Thane municipal complaints across departments and statuses.
- **Public Stats API**: Added `/api/complaints/public/stats` providing aggregated counts and average resolution times for public municipal transparency.
- **Testing**: Added unit test suites for `PasswordResetService`, `PasswordResetController`, and `PublicComplaintController.getPublicStats`. Backend test count increased to 142 passing tests.

