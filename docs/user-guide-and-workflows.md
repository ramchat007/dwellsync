# DwellSync — Product Architecture, Login & User Journey Guide

Welcome to **DwellSync** — the Multi-Tenant Housing Society Operating System.  
Philosophy: *"Every Rupee. Every Task. Every Decision. Accountable."*

---

## 1. How Authentication & Login Works

DwellSync uses a **Passwordless-First, Identity-Centric Authentication Flow**:
1. **Neutral Login Screen** ([`http://localhost:3000/login`](http://localhost:3000/login)):
   - You enter your Indian Mobile Number (`+91 98201 60376`) or Email (`ramchat007@gmail.com`).
   - Click **Send Verification Code**.
2. **6-Digit OTP Verification**:
   - In production: An SMS or Email OTP is dispatched.
   - In development: Enter `123456` or click **Auto-Fill**.
3. **Smart Post-Login Routing (Server-Side Evaluation)**:
   The server checks your identity in the database and automatically routes you:
   - **If you are a Platform Super Admin** $\rightarrow$ Routes to `/superadmin/view-as` (Private Console).
   - **If you are a Resident / Owner / Tenant** $\rightarrow$ Routes to `/resident/dashboard` with your flat preloaded.
   - **If you are a Society Admin** $\rightarrow$ Routes to `/society/[id]/dashboard`.
   - **If you are a Committee Member / Secretary** $\rightarrow$ Routes to `/committee/dashboard`.
   - **If you belong to Multiple Societies** $\rightarrow$ Displays the society picker before landing.
   - **If you are a brand new unassigned user** $\rightarrow$ Displays the "Request Society Access" form.

---

## 2. The 4 User Journeys

```
                           ┌──────────────────────────────┐
                           │   Passwordless Login Page    │
                           │   (Mobile OTP / Email OTP)   │
                           └──────────────┬───────────────┘
                                          │
                               Server Evaluates Role
                                          │
           ┌──────────────────────────────┼──────────────────────────────┐
           │                              │                              │
           ▼                              ▼                              ▼
┌──────────────────────┐      ┌──────────────────────┐      ┌──────────────────────┐
│  Super Admin Console │      │  Society Admin Portal│      │   Resident Portal    │
│ (/superadmin/view-as)│      │  (/society/[id]/...) │      │ (/resident/dashboard)│
└──────────────────────┘      └──────────────────────┘      └──────────────────────┘
```

---

### Journey A: Platform Super Admin
*Who: Platform Owner / Product Super Admin*
1. Log in with `+919820160376` or `ramchat007@gmail.com`.
2. Lands at **`/superadmin/view-as`**.
3. **Capabilities**:
   - Create and onboard new housing societies (`/superadmin/societies/new`).
   - Inspect platform metrics and audit logs (`/superadmin/audit-logs`).
   - **View-As Persona**: Select any society and any real user (e.g. Rahul Sharma - Resident) to see the exact application through their eyes.
   - Click **Exit View** on the top banner to return safely to the Super Admin console.

---

### Journey B: Society Admin / Hon. Secretary
*Who: Managing Committee / Society Administrator*
1. Log in with their registered mobile number or email.
2. Lands at **`/society/[id]/dashboard`**.
3. **Capabilities**:
   - **Manage Buildings & Wings** (`/society/[id]/buildings`).
   - **Manage Flats & Floors** (`/society/[id]/units`).
   - **Manage People & Approve Access Requests** (`/society/[id]/people`).
   - Assign resident roles (`OWNER`, `TENANT`, `RESIDENT`) and link flats.
   - Publish official circulars and notices.

---

### Journey C: Resident / Flat Owner / Tenant
*Who: Individual resident living in the housing complex*
1. Log in with their registered mobile number.
2. Lands at **`/resident/dashboard`**.
3. **Mobile-First Resident Features**:
   - **My Home** (`/resident/home`): View flat carpet area, bed/bath layout, assigned parking, and electricity/gas/water meters.
   - **Family & Household** (`/resident/family`): Add spouse, kids, parents and toggle gate security authorization.
   - **My Society & Emergency** (`/resident/society`): Office bearer contacts, office hours, and 1-click emergency speed-dial (Security Gate, Electrician, Plumber, Fire, Ambulance).
   - **Notices & Circulars** (`/resident/notices`): Read society circulars with category (Maintenance, Urgent, Event) and priority filters.
   - **Society Documents** (`/resident/documents`): Download bylaws, AGM minutes, and NOC forms.
   - **Community Directory** (`/resident/community`): Discover neighbors while respecting privacy settings.
   - **Privacy Preferences** (`/resident/settings/privacy`): Hide/show phone number and email from community directory.
   - **Profile & Account** (`/resident/profile`): Edit display name and view active society memberships.

---

### Journey D: New / Unassigned Resident
*Who: A resident who just installed the app before their flat is linked*
1. Logs in with mobile OTP.
2. The system detects no active society membership $\rightarrow$ Shows **"Request Society Access"**.
3. Resident enters Society Name (e.g. *"Green Valley CHS"*) and Flat Number (e.g. *"A-101"*).
4. **Approval Workflow**:
   - Society Admin or Manager opens `/society/[id]/people`.
   - Admin approves the request and designates role (`OWNER` or `TENANT`).
5. Next time the resident opens the app, they immediately land on `/resident/dashboard` with their flat connected!

---

## 3. Database & SQL Queries

### Do you have to run all migration files one-by-one?
**No!** You only need to run **one single master SQL script**:
📄 [`supabase/full_schema_setup.sql`](file:///c:/Rupesh/React%20Projects/DwellSync/supabase/full_schema_setup.sql)

Open **Supabase Dashboard $\rightarrow$ SQL Editor**, paste the content of `supabase/full_schema_setup.sql`, and click **Run**. It automatically builds:
- All 19 database tables.
- All roles, permissions, and RLS security policies.
- Triggers and functions.
- Creates and promotes your account (`ramchat007@gmail.com` / `+919820160376`) to `SUPER_ADMIN`.

---

## 4. Is the Super Admin Account Hardcoded?
**No.** There are zero hardcoded emails or passwords in application code.

Super Admin privileges are **100% database-driven**:
- The server checks if `user_id` exists in `public.platform_admins` with `role_id = 'SUPER_ADMIN'`.
- You can add or revoke Super Admin privileges anytime directly from the database table.

---

## 5. Quick Links & URL Map

| Route | Purpose | Audience |
| :--- | :--- | :--- |
| [`/login`](http://localhost:3000/login) | Passwordless Mobile / Email Login | Public |
| [`/superadmin/view-as`](http://localhost:3000/superadmin/view-as) | Private Super Admin Console | Platform Super Admin |
| [`/resident/dashboard`](http://localhost:3000/resident/dashboard) | Mobile Resident Dashboard | Residents / Owners |
| [`/resident/home`](http://localhost:3000/resident/home) | Flat Specs & Utility Meters | Residents |
| [`/resident/family`](http://localhost:3000/resident/family) | Household & Gate Security | Residents |
| [`/resident/society`](http://localhost:3000/resident/society) | Society Info & Emergency Dial | Residents |
| [`/resident/notices`](http://localhost:3000/resident/notices) | Official Notices & Circulars | Residents |
| [`/resident/documents`](http://localhost:3000/resident/documents) | Bylaws, Minutes & Forms | Residents |
| [`/resident/community`](http://localhost:3000/resident/community) | Neighbor Directory | Residents |
| [`/resident/settings/privacy`](http://localhost:3000/resident/settings/privacy) | Directory Privacy Toggles | Residents |
| [`/resident/profile`](http://localhost:3000/resident/profile) | Resident Profile & Logout | Residents |
| [`/api/health`](http://localhost:3000/api/health) | System Health Diagnostic | Internal / Monitoring |

