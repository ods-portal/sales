# Daily Sales Report CMS — Product & UI Specification

> A role-based CMS for field sales reporting, doctor relationship management, and visit tracking — built with a clean white theme, modern component design, and full mobile responsiveness.

---

## 1. Overview

| Item | Detail |
|---|---|
| **Product Name** | Daily Sales Report CMS (DSR CMS) |
| **Purpose** | Centralize doctor master data, log field visits, manage dropdown configurations, and surface automated sales intelligence (overdue follow-ups, visit compliance, conversion rates) |
| **Theme** | Light / White theme, modern SaaS aesthetic |
| **Responsiveness** | Fully responsive — desktop, tablet, mobile |
| **Core Entities** | Doctor Registration (master), Visit Details (transactional log) |

---

## 2. Roles & Access Control

| Role | Read Access | Write Access | User Management | Dropdown Management |
|---|---|---|---|---|
| **Sales Person** | Own visits + assigned doctors | ❌ None | ❌ | ❌ |
| **Admin** | All records | ⚠️ Conditional — only if granted by Super Admin | ❌ | ✅ (if granted write access) |
| **Super Admin** | All records | ✅ Full | ✅ Create/edit/deactivate Admin & Sales Person accounts | ✅ Full |

### 2.1 Permission Logic
- By default, **Admin = Read Only**.
- Super Admin has a toggle per Admin account: **"Grant Write Access"** (On/Off).
- When Off → Admin sees all UI in **read-only / view mode** (disabled fields, no Save/Edit/Delete buttons, no "+ Add" buttons).
- When On → Admin gets full CRUD, *except* User Management (Super Admin only).
- Sales Person can **only submit new Visit Details** for doctors assigned to them — this is the one exception to "no write access," since it's their core daily task. All other modules are strictly read-only for them.
- All write actions are logged in an **Audit Trail** (who changed what, when) — visible only to Super Admin.

### 2.2 Access Matrix by Module

| Module | Sales Person | Admin (No Write) | Admin (Write) | Super Admin |
|---|---|---|---|---|
| Dashboard / Reports | View (own data) | View (all) | View (all) | View (all) |
| Doctor Registration | View assigned | View | Create/Edit/Delete | Create/Edit/Delete |
| Visit Details | Create own + View own | View all | Edit/Delete all | Edit/Delete all |
| Dropdown Manager | ❌ | View | Create/Edit/Delete* | Create/Edit/Delete* |
| User Management | ❌ | ❌ | ❌ | Full control |
| Audit Trail | ❌ | ❌ | ❌ | Full view |
| Settings | ❌ | View | Edit | Edit |

*Except Yes/No system dropdowns — locked, non-editable, non-deletable by anyone.

---

## 3. Login Page — UI Specification

A **split-screen layout**, 50/50 on desktop, stacking on mobile.

### 3.1 Left Panel — Visual/Brand Side
- Full-bleed gradient background (soft blue → white or brand-color gradient mesh)
- Abstract animated shapes / subtle floating geometric blobs or dot-grid pattern
- Large product logo top-left
- Bold headline (e.g., *"Track Every Visit. Grow Every Relationship."*)
- Supporting subtext (1 line)
- Optional: illustration or animated SVG (sales rep with tablet / doctor meeting icon set)
- Small carousel of 3 rotating value props with subtle fade transition:
  - "Real-time visit tracking"
  - "Automated follow-up alerts"
  - "Role-based secure access"
- Footer micro-text: subtle copyright / version tag

### 3.2 Right Panel — Login Form
- Centered card, max-width ~420px, generous white space
- **Elements (top to bottom):**
  - Small "Welcome Back" eyebrow text
  - Heading: "Sign in to your account"
  - Email/Username input — floating label style, rounded corners (12px radius), soft border, focus state = brand color glow
  - Password input — with show/hide eye icon toggle
  - "Remember me" checkbox + "Forgot Password?" link (right-aligned, same row)
  - Primary CTA button — full width, filled brand color, rounded, subtle hover elevation + shadow, loading spinner state on submit
  - Divider (optional, if SSO added later): "or continue with"
  - Error state: inline red helper text under field + shake micro-animation on failed login
  - Footer text: "Need help? Contact your Super Admin" (no public sign-up — accounts are provisioned only)

### 3.3 Interaction Details
- Smooth fade/slide-in on page load (200–300ms)
- Button press = scale-down micro-interaction (0.97)
- Fully keyboard-navigable, autofocus on email field
- On mobile: left panel collapses to a compact top banner (~25% height) with logo + headline only; form takes remaining scroll space

---

## 4. Design System

### 4.1 Color Palette (White Theme)
| Token | Usage | Example |
|---|---|---|
| `--bg-primary` | Page background | `#FFFFFF` |
| `--bg-secondary` | Card/section background | `#F7F9FC` |
| `--border-subtle` | Dividers, input borders | `#E5E9F0` |
| `--brand-primary` | Primary actions, active states | Deep Indigo / Teal (`#4F46E5` or `#0EA5A4`) |
| `--brand-primary-hover` | Hover states | Slightly darker shade |
| `--text-primary` | Headings, body | `#111827` |
| `--text-secondary` | Muted labels | `#6B7280` |
| `--success` | Active / positive status | `#16A34A` |
| `--warning` | Overdue / pending alerts | `#F59E0B` |
| `--danger` | Lost / delete actions | `#DC2626` |
| `--info` | Neutral badges | `#3B82F6` |

### 4.2 Typography
- **Font:** Inter / Satoshi / General Sans (modern, geometric sans-serif)
- **Headings:** Semi-bold, tight letter spacing
- **Body:** Regular, 14–15px base, 1.5 line height
- **Labels:** 12–13px, uppercase, letter-spaced, muted color

### 4.3 Components
- **Cards:** 16px radius, soft shadow (`0 2px 8px rgba(0,0,0,0.06)`), 1px subtle border
- **Buttons:** Pill or 10px radius, filled / outline / ghost variants, icon + text combos
- **Inputs:** Floating labels, 10px radius, focus ring in brand color
- **Badges/Tags:** Pill-shaped, color-coded by status (Active = green, Prospect = blue, Lost = red, Dormant = grey)
- **Tables:** Zebra-free, generous row padding, sticky header, hover row highlight, sortable column headers
- **Modals:** Centered, blurred backdrop, slide-up entrance
- **Toasts:** Top-right, auto-dismiss, color-coded by type (success/error/info)
- **Empty States:** Friendly illustration + short message + CTA where relevant
- **Skeleton Loaders:** For all data-heavy views (tables, dashboard cards)

---

## 5. Navigation — Sidebar Structure

Collapsible sidebar with **grouped section headings**, each expandable to reveal related pages. Active route highlighted with brand-color left border + tinted background.

```
[Logo / Product Name]                         [Collapse ⇔]

🔍 Search...

▾ DASHBOARD
   • Overview
   • My Reports (Sales Person only)
   • Team Reports (Admin/Super Admin)

▾ DOCTOR MANAGEMENT
   • All Doctors
   • Add New Doctor          (write-access only)
   • Category & Status View
   • Doctor Profile (detail/drill-down)

▾ VISIT MANAGEMENT
   • Log New Visit           (Sales Person)
   • All Visits
   • Pending Visits
   • Follow-up Calendar

▾ ALERTS & COMPLIANCE
   • Overdue Follow-ups
   • Missed Visit Frequency
   • Conversion Rate by Salesperson

▾ REPORTS
   • Daily Report
   • Weekly Report
   • Monthly Report
   • Export Center

▾ CONFIGURATION                (Admin w/ write + Super Admin)
   • Dropdown Manager
   • Visit Category Rules

▾ USER MANAGEMENT              (Super Admin only)
   • Manage Users
   • Roles & Permissions
   • Audit Trail

▾ SETTINGS
   • Profile
   • Notifications
   • App Preferences

[User Avatar · Name · Role Badge]     [Logout]
```

### 5.1 Sidebar Behavior
- Each heading is a **collapsible accordion** (chevron rotates on expand/collapse)
- Only one section expanded at a time on mobile (accordion-style), multiple allowed on desktop
- Role-based sections **auto-hide** if the user lacks access (not just disabled — hidden entirely for a cleaner UI)
- On mobile: sidebar becomes an off-canvas drawer, triggered by hamburger icon in top bar; overlay backdrop on open
- Collapsed (icon-only) state available on desktop via toggle — shows icons with tooltips on hover

---

## 6. Key Pages — Functional Breakdown

### 6.1 Dashboard (Overview)
- Top row: KPI cards — *Total Doctors, Visits This Month, Pending Follow-ups, Conversion Rate*
- Chart section: Visit trend line chart (daily/weekly/monthly toggle), Category-wise doctor distribution (donut chart)
- Alerts panel: Overdue follow-ups list (scrollable, click to jump to visit)
- Recent Activity feed (latest visits logged, doctors added)

### 6.2 Doctor Registration
- List view: searchable, filterable table (Category, Status, City, Assigned Rep)
- Detail view: tabbed layout — *Profile | Practice Profile | Opportunity | Competitor Info | Attachments | Visit History*
- "Add New Doctor" opens a **multi-step form** (Doctor Info → Practice Profile → Categorization → Opportunity → Competitor → Attachments) with progress indicator at top

### 6.3 Visit Details (Log New Visit)
- Single-scroll form with sticky section navigation on the side (jump to Meeting Summary, Follow-up, etc.)
- Doctor lookup field at top (searchable dropdown, pulls existing registration)
- Character counter live-updates under Meeting Summary field; Save button disabled until 500-character minimum met
- Auto-save draft indicator ("Saved just now") to prevent data loss on long forms

### 6.4 Dropdown Manager (Admin/Super Admin)
- List of all configurable dropdown fields (Visit Type, Speciality, Category, etc.)
- Click into a dropdown → manage its options: **Add / Edit / Reorder (drag handle) / Delete**
- **Yes/No system dropdowns are visually locked** — greyed "System Default" badge, no edit/delete icons shown
- Deleting an option in-use triggers a confirmation modal warning how many records reference it

### 6.5 User Management (Super Admin)
- Table: Name, Role, Email, Write Access (toggle switch inline), Status (Active/Suspended), Last Login
- "Grant Write Access" toggle only visible on Admin rows (not Sales Person, not Super Admin)
- Add User modal: Name, Email, Role selector, initial password/invite-link option

### 6.6 Reports
- Filter bar: Date range, Sales Person, Category, Region
- Export options: PDF / Excel
- Scheduled report toggle (auto-email daily/weekly/monthly digest)

---

## 7. Mobile Responsiveness Rules

| Breakpoint | Behavior |
|---|---|
| **≥1280px (Desktop)** | Full sidebar visible, multi-column forms, side-by-side login |
| **768–1279px (Tablet)** | Collapsible icon sidebar, forms move to single column, tables scroll horizontally |
| **≤767px (Mobile)** | Off-canvas sidebar drawer, bottom sticky action bar for primary CTAs (e.g., "Save Visit"), login stacks vertically, tables convert to stacked card view instead of horizontal scroll |

- All tap targets minimum 44x44px
- Forms use full-width inputs on mobile with increased vertical spacing for thumb usability
- Sticky "Save/Submit" bar at bottom of screen for long forms on mobile

---

## 8. Data Tables, Pagination & URL Structure (Best Practices)

All list views (Doctors, Visits, Users, Reports, Dropdown options) follow a single consistent table pattern — no page ever dumps full raw data at once.

### 8.1 Table Presentation Rules
- **Never render an entire dataset on one page.** Every list is paginated server-side — data is fetched page-by-page, not loaded fully and sliced on the client.
- **Default page size:** 20 rows (configurable per user: 10 / 20 / 50 / 100), with a "Rows per page" selector bottom-left of the table.
- **Pagination controls:** bottom-right — First / Prev / Page numbers (with ellipsis for long ranges) / Next / Last, plus a "Jump to page" input for large datasets.
- **Sticky table header** on scroll, with sortable columns (click header → asc/desc arrow indicator).
- **Column visibility toggle** — users can show/hide non-essential columns (e.g., hide "City" on smaller screens automatically, restore on desktop).
- **Search + Filters bar** above every table: debounced search input (300ms), filter chips (Category, Status, Date range, Assigned Rep) that combine with AND logic, and a visible "Clear all filters" action.
- **Row actions:** icon-only kebab menu (View / Edit / Delete) — Edit/Delete only rendered if the logged-in role+permission allows it (not just disabled, hidden — consistent with sidebar rule).
- **Bulk actions:** checkbox column + sticky action bar appears when rows are selected (e.g., bulk export, bulk reassign) — write-access roles only.
- **Loading state:** skeleton rows (not spinners) so the table shape doesn't jump.
- **Empty/filtered-empty state:** distinct illustration + message ("No doctors match these filters" vs. "No doctors added yet").
- **Mobile:** table rows collapse into stacked cards (as defined in Section 7), each card showing 2–3 key fields + "View details" tap target; full field set available on the detail/drill-down page.

### 8.2 Slugs Instead of IDs in URLs
Numeric/UUID primary keys stay internal to the database and API payloads, but **never appear in the browser URL**. Every entity that's navigated to individually gets a human-readable, unique **slug**.

**URL pattern examples:**
```
/doctors/dr-ravi-mehta-orthodontist-gurugram
/visits/2026-08-07-dr-ravi-mehta-follow-up
/users/priya-sharma
/reports/monthly-2026-07
```

**Slug generation rules:**
- Auto-generated on record creation from key fields (e.g., Doctor: name + speciality + city; Visit: date + doctor name + visit type).
- Lowercase, hyphen-separated, special characters stripped.
- Uniqueness enforced with an auto-incrementing suffix on collision (`dr-ravi-mehta-2`), never exposing the raw ID.
- Slugs are **immutable once created** (editing a doctor's name doesn't break existing links/bookmarks/shares); a separate `previous_slugs` table can 301-redirect old links if a slug must change.
- All internal navigation (sidebar links, table row clicks, breadcrumbs) resolves through the slug — the ID is only used in backend joins and API internals, never surfaced to the user or the address bar.

### 8.3 API & Coding Practice Notes
- **Pagination:** cursor-based or offset+limit at the API level (`?page=2&limit=20`), returning `{ data, totalCount, totalPages, currentPage }` — consistent envelope across all endpoints.
- **Lookups by slug:** `GET /api/doctors/:slug` instead of `GET /api/doctors/:id` — IDs never leave the backend.
- **Filtering/sorting:** passed as query params (`?category=A&status=active&sort=-visitDate`), validated and whitelisted server-side to prevent arbitrary field injection.
- **Consistent naming:** camelCase in API/JSON, kebab-case in URLs/slugs, snake_case reserved for DB columns only — kept separate by a mapping layer, not leaked across boundaries.
- **Rate-limited & permission-checked at the API layer**, not just hidden in the UI — a read-only Admin hitting a write endpoint directly gets a 403, regardless of what the frontend shows.

---

## 9. Full Requirements — Tools, Libraries & Services

Everything needed to actually build this, grouped by layer. Items marked **(Core)** are non-negotiable for the spec as written; items marked **(Optional)** are recommended enhancements.

### 9.1 Frontend
| Requirement | Suggestion | Why |
|---|---|---|
| Framework | Next.js (React) **(Core)** | SSR/SSG for fast loads, built-in routing matches slug-based URLs cleanly |
| Styling | Tailwind CSS **(Core)** | Utility-first, fastest way to hit the white-theme design tokens consistently |
| Component Primitives | shadcn/ui or Radix UI **(Core)** | Accessible, unstyled base components (dialogs, dropdowns, toggles) customized to theme |
| Icons | Lucide Icons **(Core)** | Clean, consistent icon set matching modern SaaS look |
| Forms & Validation | React Hook Form + Zod **(Core)** | Performant multi-step forms; Zod schemas double as frontend + backend validation source of truth |
| Tables | TanStack Table (React Table v8) **(Core)** | Handles sorting, pagination, column visibility — exactly what Section 8 needs |
| Charts | Recharts **(Core)** | Dashboard KPI trend lines, donut charts |
| State/Data Fetching | TanStack Query (React Query) **(Core)** | Server-state caching, pagination, background refetch |
| Global UI State | Zustand **(Optional)** | Lightweight store for sidebar collapse state, theme, etc. |
| Animations | Framer Motion **(Optional)** | Login page transitions, accordion sidebar, modal slide-ups |
| Date Handling | date-fns or Day.js **(Core)** | Follow-up date logic, "days since last visit" calculations |
| Rich Text (if needed) | Tiptap **(Optional)** | Only if Meeting Summary needs formatting beyond plain textarea |

### 9.2 Backend
| Requirement | Suggestion | Why |
|---|---|---|
| Runtime/Framework | Node.js + Express, or NestJS **(Core)** | NestJS if the team wants stronger structure (modules, guards for RBAC) out of the box |
| Database | PostgreSQL **(Core)** | Relational integrity for Doctor ↔ Visit (1-to-many), strong support for unique slug indexes |
| ORM | Prisma **(Core)** | Type-safe queries, easy migrations, works well with slug-based lookups |
| Authentication | JWT (access + refresh token pair) **(Core)** | Stateless auth, role claims embedded in token |
| Authorization | Custom RBAC middleware / NestJS Guards **(Core)** | Enforces the read/write matrix server-side, not just UI-side (per Section 8.3) |
| Password Hashing | bcrypt or argon2 **(Core)** | Never store plaintext passwords |
| Validation | Zod (shared with frontend) **(Core)** | Single schema source, no drift between client and server rules |
| File Uploads | Multer (or direct signed S3 uploads) **(Core)** | For clinic photos, visiting cards, case photos, documents |
| Slug Generation | slugify (npm) + custom collision-suffix logic **(Core)** | Powers Section 8.2 URL rules |
| API Documentation | Swagger / OpenAPI **(Optional)** | Useful once the API surface grows past a handful of endpoints |
| Background Jobs | BullMQ + Redis **(Core)** | Scheduled daily/weekly/monthly report generation, overdue-alert checks |
| Email/Notifications | Resend, Postmark, or AWS SES **(Core)** | Follow-up overdue emails, scheduled report digests |
| Rate Limiting | express-rate-limit or NestJS Throttler **(Core)** | Protects login and API endpoints from abuse |

### 9.3 Storage & Infrastructure
| Requirement | Suggestion | Why |
|---|---|---|
| File Storage | AWS S3 / Cloudflare R2 **(Core)** | Attachments (photos, documents) — never store binaries in the DB |
| CDN | Cloudflare or AWS CloudFront **(Optional)** | Faster asset delivery, especially for image-heavy doctor profiles |
| Hosting (Frontend) | Vercel **(Core)** | Native Next.js support, preview deployments per branch |
| Hosting (Backend) | Railway, Render, or AWS ECS **(Core)** | Managed deploys with autoscaling |
| Database Hosting | Supabase, Neon, or AWS RDS (Postgres) **(Core)** | Managed Postgres with backups |
| Environment Config | dotenv + a secrets manager (AWS Secrets Manager / Doppler) **(Core)** | Never commit credentials |

### 9.4 Security & Compliance
| Requirement | Suggestion | Why |
|---|---|---|
| HTTPS Everywhere | Enforced via hosting provider **(Core)** | Non-negotiable, especially with doctor PII |
| Input Sanitization | Zod validation + parameterized queries via Prisma **(Core)** | Prevents SQL injection/XSS |
| CSRF Protection | SameSite cookies / CSRF tokens if using cookie-based auth **(Core)** | Only relevant if not purely bearer-token based |
| Audit Logging | Custom `audit_logs` table (actor, action, entity, before/after, timestamp) **(Core)** | Backs the Audit Trail page for Super Admin |
| Data Backup | Automated daily DB snapshots **(Core)** | Doctor/visit data is business-critical |
| Role Enforcement | Server-side guard on every mutating endpoint **(Core)** | UI hiding buttons is not security — backend must independently check permissions |

### 9.5 Testing & Quality
| Requirement | Suggestion | Why |
|---|---|---|
| Unit/Integration Tests | Vitest or Jest **(Core)** | Backend business logic (visit-frequency rules, slug generation, RBAC) |
| E2E Testing | Playwright **(Optional)** | Login flow, form submission, pagination across roles |
| Linting/Formatting | ESLint + Prettier **(Core)** | Consistent code style across the team |
| Type Safety | TypeScript end-to-end **(Core)** | Frontend, backend, and Prisma schema all typed — catches mismatches early |
| CI/CD | GitHub Actions **(Core)** | Lint + test + build on every PR, auto-deploy on merge |

### 9.6 Export & Reporting
| Requirement | Suggestion | Why |
|---|---|---|
| PDF Export | Puppeteer (server-side) or react-pdf **(Core)** | Daily/weekly/monthly report exports mentioned in Section 6.6 |
| Excel Export | ExcelJS or SheetJS **(Core)** | Table data export for reports and doctor lists |
| Scheduled Digest Emails | BullMQ cron jobs + email service above **(Core)** | Auto-emailed reports per Section 6.6 |

---

## 10. Suggested Tech Stack Summary *(condensed reference)*

| Layer | Choice |
|---|---|
| Frontend | Next.js + Tailwind CSS + shadcn/ui |
| Forms/Validation | React Hook Form + Zod |
| Tables | TanStack Table + TanStack Query |
| Backend | NestJS (or Express) + Prisma |
| Database | PostgreSQL |
| Auth | JWT (access + refresh) + bcrypt/argon2 |
| File Storage | AWS S3 / Cloudflare R2 |
| Background Jobs | BullMQ + Redis |
| Hosting | Vercel (frontend) + Railway/Render (backend) + Supabase/Neon (DB) |
| Testing | Vitest/Jest + Playwright |
| CI/CD | GitHub Actions |

---

## 11. Open Decisions to Confirm

1. Should **Sales Person** be able to *edit* their own visit within a short window (e.g., 24 hours) after submission, or is it strictly append-only once saved?
2. Should **Admin without write access** still be able to *export* reports, or is export also gated behind write permission?
3. Do we need **multi-level Super Admin** (e.g., regional super admins) or is it a single top-level role?
4. Password policy / SSO requirement — internal-only tool, so is email+password sufficient or does it need SSO (Google Workspace/Microsoft)?