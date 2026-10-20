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
