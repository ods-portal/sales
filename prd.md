# Product Requirements Document (PRD): Daily Sales Report (DSR) CMS

## 1. Overview
The Daily Sales Report CMS is a centralized platform tailored for field sales reporting, doctor relationship management, and visit tracking. It serves multiple roles (Sales Personnel, Admins, Super Admins) to monitor and optimize on-ground sales activities, ensuring compliance and generating automated sales intelligence.

---

## 2. User Roles & Access Matrix

- **Sales Person**: Core field worker. Can log new visits, view their assigned doctors, and view reports related to their own data. No admin configuration access.
- **Admin**: Managerial role. Defaults to Read-Only across all records. Super Admin can grant "Write Access," enabling them to manage doctors, visits, and dropdowns, but not user management.
- **Super Admin**: Highest privilege. Full access to all modules, including user management, role assignments, and audit trails.

---

## 3. Dashboards & Module Breakdown

The system is compartmentalized into specific dashboards/modules, accessible via the main navigation sidebar based on user roles.

### 3.1 Main Dashboard (Overview)
**Target Roles:** All (Data scoped to role)
**Purpose:** Provides a high-level snapshot of sales performance and urgent action items.
- **Key UI/Data Components:**
  - **KPI Cards:** Total Doctors, Visits This Month, Pending Follow-ups, Conversion Rate.
  - **Charts:** Visit trend line chart (daily/weekly/monthly), Category-wise doctor distribution (donut chart).
  - **Alerts Panel:** Scrollable list of overdue follow-ups with quick links to visit details.
  - **Activity Feed:** Real-time log of recently added visits and new doctor registrations.
- **Flows:**
  - View overall metrics upon login.
  - Click on an overdue follow-up alert to jump directly to the doctor's profile/visit scheduling page.

### 3.2 Doctor Management Dashboard (`/doctors`)
**Target Roles:** Sales Person (Assigned only), Admin, Super Admin
**Purpose:** Master database of all medical practitioners and prospects.
- **Key UI/Data Components:**
  - **Doctor List:** Searchable and filterable data table (by Category, Status, City, Assigned Rep).
  - **Profile Details (Tabs):** Profile, Practice Profile, Opportunity, Competitor Info, Attachments, Visit History.
- **Flows:**
  - **Add New Doctor (Write Access):** Multi-step form (Basic Info → Practice Details → Categorization → Opportunity → Competitors → Attachments).
  - **View/Edit Doctor:** Drill down into a specific doctor's profile to see past interactions and update their status (e.g., Active, Prospect, Lost).

### 3.3 Visit Management Dashboard (`/visits`)
**Target Roles:** Sales Person, Admin, Super Admin
**Purpose:** Transactional logging of daily field visits and meeting outcomes.
- **Key UI/Data Components:**
  - **Log New Visit:** Single-page scrollable form with sticky side navigation.
  - **All/Pending Visits:** Table views of completed and scheduled visits.
  - **Follow-up Calendar:** Visual calendar interface highlighting upcoming follow-up commitments.
- **Flows:**
  - **Log Visit Flow:** Select Doctor (dropdown lookup) → Enter Meeting Summary (min. 500 chars) → Set Next Follow-up Date → Save (with auto-save draft functionality).
  - **Review Visits (Admin):** Admins can filter visits by region or sales rep to audit daily field activity.

### 3.4 Alerts & Compliance Dashboard (`/alerts`)
**Target Roles:** Admin, Super Admin
**Purpose:** Ensure sales reps are meeting their coverage requirements and follow-ups.
- **Key UI/Data Components:**
  - **Overdue Follow-ups:** List of missed commitments.
  - **Missed Visit Frequency:** Tracking doctors who haven't been visited within their required frequency category (e.g., Category A needs weekly visits).
  - **Conversion Rates:** Analytics on moving doctors from Prospect to Active.
- **Flows:**
  - Identify underperforming territories or missed visits and initiate targeted action plans.

### 3.5 Reports Dashboard (`/reports`)
**Target Roles:** All (Data scoped to role)
**Purpose:** Analytics, extraction, and scheduled digests.
- **Key UI/Data Components:**
  - **Report Generators:** Daily, Weekly, and Monthly aggregations.
  - **Filter Bar:** Date range, Sales Person, Category, Region.
- **Flows:**
  - **Export Data:** Generate PDF or Excel exports of current table views.
  - **Schedule Digests:** Configure automated emails containing weekly or monthly performance summaries.

### 3.6 Configuration & Administration Dashboards
**Target Roles:** Admin (Conditional), Super Admin

#### Dropdown Manager (`/dropdowns`)
- **Purpose:** Manage global system taxonomy (Visit Types, Specialties, Categories).
- **Flow:** Click into a specific dropdown configuration, add/edit/reorder options, or delete options (triggers impact warning if options are in use).

#### User Management (`/users`)
- **Purpose:** Super Admin exclusive area to provision accounts.
- **Flow:** View User Table → Add User Modal (Name, Email, Role) → Toggle Admin Write Access → Suspend/Activate users.

#### Audit Trail (`/audit`)
- **Purpose:** Super Admin exclusive. Security and accountability tracking.
- **Flow:** Read-only log showing `[Actor]` performed `[Action]` on `[Entity]` at `[Timestamp]` with before/after state diffs.

#### Settings (`/settings`)
- **Purpose:** Personal and system preferences.
- **Flow:** Update personal profile, change notification preferences, and manage app-wide defaults.

---

## 4. Core System Workflows

### 4.1 Daily Field Operations Flow (Sales Person)
1. **Login:** Sales Person logs in from their mobile device or tablet.
2. **Review Dashboard:** Checks the Alerts panel for today's required follow-ups.
3. **Log Activity:** Completes a meeting, navigates to the Visit Management Dashboard, and initiates "Log New Visit".
4. **Draft & Submit:** Fills out the summary, assigns the next follow-up date, and submits. (Data is auto-saved as a draft during entry).

### 4.2 Data Governance & System Config Flow (Admin/Super Admin)
1. **Taxonomy Update:** Super Admin accesses the Dropdown Manager to add a new "Competitor Brand" to the system.
2. **Provisioning:** Super Admin accesses User Management to onboard a new Regional Manager (Admin), explicitly toggling "Grant Write Access" to ON.
3. **Auditing:** Super Admin reviews the Audit Trail to see who modified a high-value doctor's category recently.

---

## 5. UI & Technical Architecture Notes
- **Routing Structure:** Utilizes slug-based routing (e.g., `/doctors/dr-john-doe`) rather than exposing database IDs.
- **Tables & Data:** All lists are server-side paginated (default 20 rows), featuring sticky headers, sortable columns, and debounced search.
- **Responsiveness:** 
  - **Desktop:** Multi-column forms, full sidebars.
  - **Mobile:** Off-canvas sidebar drawers, stacked card views for tables, sticky bottom action bars for form submissions.
