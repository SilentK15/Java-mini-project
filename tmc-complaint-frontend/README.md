# CivicConnect frontend

## Run locally

1. Start the backend first (see the backend project's README) and make sure MySQL is running.
2. Run `npm install` once, then `npm run dev`.
3. Open the local Vite address shown in the terminal. By default, the frontend calls `http://localhost:8080`.

Citizen users can create an account and update their display name from the profile control. Administrator and department-scoped staff accounts are configured before the backend's first start. Citizens see only their reports, staff see their department queue, and administrators can search, filter, and update all complaints. Complaint submissions show the generated reference number as a receipt.

Administrators can open **Manage staff** to create staff users, change department assignments, activate/deactivate accounts, and review recent administrative audit entries. Existing staff sessions are checked against the saved account status and department on each authenticated API request.

Administrators can assign or reassign active complaints to active staff in the complaint's department and must record a reason. Assignment changes appear in the administrative audit log.

Staff and administrators have a separate internal-notes panel for operational notes. The API restricts these notes to authorized staff/admins in the complaint's department; citizens only receive public status history.

Staff and administrators can optionally upload a validated JPG/PNG resolution photo for an active complaint. The reporting citizen sees the evidence after the complaint is resolved.

After a complaint is resolved, a citizen can submit one rating and optional comment or ask the department to reopen it with an explanation. Staff or administrators record a decision note when accepting or declining the reopening request.

Complaint submissions carry a unique request key. If the network fails and the same form is retried in the current page session, the backend returns the saved complaint instead of creating a duplicate. The form stays available after errors, and the message distinguishes expired sessions and connection failures.

Before sending a new complaint, the app checks for recent active reports in the same category with similar wording and location. If it finds a possible match, it asks whether to continue and shows no other resident's report details.

The complaint form can include a valid JPG or PNG photo up to 5 MB. Photos are requested through the backend, which checks complaint access. The location button asks the browser for permission to attach GPS coordinates; users can still enter a location manually if they decline.

The citizen sign-in, registration, and complaint intake screens, along with navigation controls, metric counters, status filters, card details, feedback/reopening dialogs, and pagination, support English, Marathi, and Hindi labels. The global language selector in the header toggles UI copy across the application. Submitted citizen text is preserved verbatim and is not automatically altered.

Citizens can use the **Suggest category & priority** assistant before submitting a complaint. This advisory tool sends the description to the backend classification service (`/api/complaints/classify`) and presents recommended category and priority with a confidence rating and reason. Citizens can choose to apply the recommendations with a single click or keep their manual selection. TMC municipal authorities should review all municipal translations and terminology before public deployment.

For citizens, unfinished complaint text and location are saved to session storage in the current browser tab, partitioned by account ID. A pending idempotency key is saved with the draft so a reload can safely retry a request. Drafts are removed after a successful submission or sign-out and when the tab session ends. Photo files are never saved in browser storage and must be selected again after a reload. Browser storage failures do not block complaint entry.

For Docker Compose deployment, use the frontend container and Nginx proxy defined alongside the backend project. Production builds use same-origin `/api` requests through that proxy; local Vite development continues to use `http://localhost:8080` by default.

Administrators can download the currently filtered complaint list as a CSV export. The server restricts this endpoint to admins and excludes reporter contact details and private staff notes.
