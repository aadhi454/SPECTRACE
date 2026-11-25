<div align="center">

# SpecTrace
### Deterministic Industrial Product Intelligence & Spec Selection Workbench
***"Parse-Once, Filter-Deterministically, Verify-by-Citation"***

[![Status](https://img.shields.io/badge/Status-Production_Ready-10B981?style=for-the-badge&logo=checkmarx&logoColor=white)](#)
[![Architecture](https://img.shields.io/badge/Engine-Two--Lane_SQL_%2B_Contextual_RAG-2563EB?style=for-the-badge&logo=databricks&logoColor=white)](#two-lane-hybrid-architecture)
[![Security](https://img.shields.io/badge/Access_Control-Strict_Allowlist_%2B_RLS-7C3AED?style=for-the-badge&logo=letsencrypt&logoColor=white)](#strict-private-authentication--database-security)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-0284C7?style=for-the-badge&logo=typescript&logoColor=white)](#technology-stack)
[![React](https://img.shields.io/badge/React-19-06B6D4?style=for-the-badge&logo=react&logoColor=white)](#technology-stack)
[![SQLite](https://img.shields.io/badge/Database-Node_SQLite_WAL-0F172A?style=for-the-badge&logo=sqlite&logoColor=white)](#database-schema--row-level-security)

</div>

---

> [!IMPORTANT]
> **Why SpecTrace Exists:** Standard LLM/RAG chatbots fail dangerously in industrial hardware selection because vector similarity cannot reliably evaluate numerical inequalities (`24V DC`, `I_out >= 3.2A`, `T_amb = 60°C` thermal derating) or enforce datasheet revision governance. **SpecTrace** separates hard electrical/thermal constraints from qualitative clause retrieval using a **Two-Lane Hybrid Architecture** inside a strictly private, invitation-only engineering workspace.

---

## Table of Contents

1. [Core Capabilities](#-core-capabilities)
2. [Two-Lane Hybrid Architecture](#-two-lane-hybrid-architecture)
3. [Strict Private Authentication & Database Security](#-strict-private-authentication--database-security)
4. [Pre-Loaded Industrial Corpus (Mean Well DIN-Rail PSUs)](#-pre-loaded-industrial-corpus-mean-well-din-rail-psus)
5. [Database Schema & Row-Level Security](#-database-schema--row-level-security)
6. [12-Scenario Live Security Verification Suite](#-12-scenario-live-security-verification-suite)
7. [Technology Stack](#-technology-stack)
8. [Getting Started & Deployment](#-getting-started--deployment)
9. [API Reference](#-api-reference)

---

## Core Capabilities

| Module | Badge | Functional Description |
| :--- | :--- | :--- |
| **1. Product Finder (`WorkbenchView`)** | ![Deterministic](https://img.shields.io/badge/Lane_1-Deterministic_SQL-10B981?style=flat-square) | Evaluates every approved SKU against strict electrical, thermal, certification, and envelope constraints with real-time thermal derating math and exact bound-failure diagnostics. |
| **2. Datasheet Assistant (`DatasheetViewer`)** | ![Grounded RAG](https://img.shields.io/badge/Lane_2-Citation_Anchored-2563EB?style=flat-square) | Slide-over multi-page datasheet inspector and grounded Q&A engine that answers qualitative installation/derating questions with clickable `[MODEL \| Rev \| Page X]` badges and automatic lexical fallback. |
| **3. Datasheet Manager (`IngestView`)** | ![Governance](https://img.shields.io/badge/Governance-Revision_Gatekeeper-F59E0B?style=flat-square) | Client-side PDF text extraction (`PDF.js`) + human review gatekeeper. Approving a new revision automatically flips older revisions of the same model to `SUPERSEDED`. |
| **4. Selection Sign-Off (`SignOffView`)** | ![Audit Dossier](https://img.shields.io/badge/Compliance-JSON_%26_Markdown-0284C7?style=flat-square) | Human engineer suitability sign-off workflow with Row-Level Security (RLS) ownership and one-click exportable Markdown & JSON compliance dossiers. |
| **5. Review Benchmarks (`EvaluationLabView`)** | ![Ablation](https://img.shields.io/badge/Telemetry-4--Way_Ablation-7C3AED?style=flat-square) | Live benchmark runner comparing **Keyword Search**, **Naive Vector RAG**, **SQL Filter Only**, and **SpecTrace Two-Lane Hybrid** across 6 industrial failure modes. |
| **6. Access & Security (`AdminSecurityView`)** | ![Zero Trust](https://img.shields.io/badge/Zero_Trust-Allowlist_%2B_Scrypt-E11D48?style=flat-square) | Administrator console for managing the email allowlist, role-based access (`admin` / `user`), single-use 15-minute password reset tokens, session revocation, audit logs, and the 12-scenario live security self-test. |

---

## Two-Lane Hybrid Architecture

```mermaid
flowchart LR
    subgraph Ingest["Stage 0: Parse-Once Ingestion Gate"]
        PDF["Raw Datasheet PDF"]:::slate --> EXTRACT["PDF Extractor & Clause Chunker"]:::blue
        EXTRACT --> GATE{"Human Engineer\nReview & Sign-Off"}:::amber
        GATE -->|"Approve & Publish"| DB[("SQLite Corpus\n(APPROVED)")]:::emerald
        GATE -->|"Auto-Retire Older Rev"| SUP[("Archived\n(SUPERSEDED)")]:::rose
    end

    subgraph Runtime["Runtime: Two-Lane Query & Selection Engine"]
        USER["Authenticated Engineer"]:::slate --> LANE1["Lane 1: Deterministic SQL Predicate Engine\n• V_out = 24V, I_out ≥ 3.2A\n• Thermal Derating @ T_amb = 60°C\n• Width ≤ 45mm & Required Certifications"]:::emerald
        USER --> LANE2["Lane 2: Contextual RAG & Lexical Engine\n• Approved-Only Page Chunks\n• Strict [MODEL | Rev | Page] Citations\n• Explicit Refusal on Missing Specs"]:::blue
    end

    DB --> LANE1
    DB --> LANE2
    LANE1 --> DOSSIER["Verified Selection & Compliance Dossier"]:::violet
    LANE2 --> DOSSIER

    classDef emerald fill:#ECFDF5,stroke:#10B981,stroke-width:2px,color:#065F46;
    classDef blue fill:#EFF6FF,stroke:#2563EB,stroke-width:2px,color:#1E40AF;
    classDef amber fill:#FFFBEB,stroke:#F59E0B,stroke-width:2px,color:#92400E;
    classDef rose fill:#FFF1F2,stroke:#E11D48,stroke-width:2px,color:#9F1239;
    classDef violet fill:#F5F3FF,stroke:#7C3AED,stroke-width:2px,color:#5B21B6;
    classDef slate fill:#F8FAFC,stroke:#64748B,stroke-width:2px,color:#0F172A;
```

> [!TIP]
> **Thermal Derating Precision:** When an engineer specifies an ambient temperature above a power supply's full-load threshold (e.g., `60°C` when derating begins at `50°C` at `2.5%/°C`), SpecTrace computes the exact effective continuous power and current:
> $$\text{Effective LoadFactor} = 1 - \frac{(60 - 50) \times 2.5}{100} = 0.75 \quad (75\% \text{ rated output})$$
> Any SKU whose derated current falls below the required load is deterministically disqualified with a page-cited diagnostic.

---

## Strict Private Authentication & Database Security

SpecTrace operates as a **strictly private, invitation-only application**. Unauthenticated visitors cannot view datasheets, invoke Q&A, or create accounts.

```mermaid
sequenceDiagram
    autonumber
    actor User as Client Browser (In-Memory Token + Cookie)
    participant API as Express Security Gate (server.ts)
    participant DB as SQLite Security DB (node:sqlite)

    User->>API: POST /api/auth/login { email, password }
    API->>API: Normalize email + Check IP Rate Limiter
    API->>DB: SELECT user WHERE email = ? (Parameterized)
    alt Unknown Email
        API->>API: Run Constant-Time Dummy scrypt Verification
        API->>DB: INSERT login_audit_logs (UNKNOWN_EMAIL_REJECTED)
        API-->>User: 401 Generic "Invalid email or password"
    else Disabled Account (is_active = 0)
        API->>DB: INSERT login_audit_logs (INACTIVE_ACCOUNT_REJECTED)
        API-->>User: 403 "Account is not authorized"
    else Temporary Lockout Active
        API-->>User: 429 "Temporarily locked due to 5 failed attempts"
    else Active Allowlisted Account
        API->>API: Verify scrypt hash via crypto.timingSafeEqual
        API->>DB: Rotate Session (Store SHA-256 token_hash + CSRF token)
        API-->>User: 200 OK + HttpOnly/Secure/Partitioned Cookie + CSRF Token
    end
```

### Security Controls Summary

- ![Allowlist](https://img.shields.io/badge/Allowlist_Only-10B981?style=flat-square) **Zero Public Signup:** `POST /api/auth/register` is permanently blocked (`403 Forbidden`). Only administrators can add users to the allowlist.
- ![Scrypt](https://img.shields.io/badge/Password_Hashing-scrypt_(N%3D16384)-2563EB?style=flat-square) **Memory-Hard Cryptography:** Passwords are salted with 16 CSPRNG bytes and hashed with `scrypt` (`N=16384, r=8, p=1`, 64-byte key) and compared via `crypto.timingSafeEqual`.
- ![Sessions](https://img.shields.io/badge/Session_Storage-SHA--256_Hashed-7C3AED?style=flat-square) **Zero Browser Storage Tokens:** Raw session tokens are never stored in SQLite (only `SHA-256` hashes) and never persisted to `localStorage` or `sessionStorage`.
- ![Brute Force](https://img.shields.io/badge/Brute_Force-15m_Cooldown_%2B_IP_Rate_Limit-F59E0B?style=flat-square) **Lockout & Rate Limiting:** 5 consecutive failed password attempts trigger a temporary 15-minute account cooldown alongside IP-based rate limiting.
- ![CSRF & Headers](https://img.shields.io/badge/Headers-CSP_%2B_CSRF_%2B_XFO-0284C7?style=flat-square) **Defense-in-Depth Headers:** Enforces Content-Security-Policy (CSP), `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`, and dual `X-CSRF-Token` + `X-Requested-With` validation on all state-changing requests.

---

## Pre-Loaded Industrial Corpus (Mean Well DIN-Rail PSUs)

| Model Code | Revision | Governance Status | Output Rating | Width | Full-Load Temp | Derating Slope | Key Certifications |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| **`DR-75-24`** | `Rev 2024-11` | ![APPROVED](https://img.shields.io/badge/APPROVED-10B981?style=flat-square) | `24V DC / 3.2A (76.8W)` | `55.5 mm` | `50°C` | `2.5% / °C` | `UL508, TUV BS EN/EN62368-1, EAC, CE, UKCA` |
| **`DR-75-12`** | `Rev 2024-09` | ![APPROVED](https://img.shields.io/badge/APPROVED-10B981?style=flat-square) | `12V DC / 6.3A (75.6W)` | `55.5 mm` | `50°C` | `2.5% / °C` | `UL508, TUV BS EN/EN62368-1, CE, UKCA` |
| **`DR-75-48`** | `Rev 2024-09` | ![APPROVED](https://img.shields.io/badge/APPROVED-10B981?style=flat-square) | `48V DC / 1.6A (76.8W)` | `55.5 mm` | `50°C` | `2.5% / °C` | `UL508, TUV BS EN/EN62368-1, CE, UKCA` |
| **`SDR-120-24`** | `Rev 2024-10` | ![APPROVED](https://img.shields.io/badge/APPROVED-10B981?style=flat-square) | `24V DC / 5.0A (120W)` | `40.0 mm` | `60°C` | `2.5% / °C` | `UL508, TUV BS EN/EN62368-1, SEMI F47, GL, CE` |
| **`NDR-75-24`** | `Rev 2024-08` | ![APPROVED](https://img.shields.io/badge/APPROVED-10B981?style=flat-square) | `24V DC / 3.2A (76.8W)` | `32.0 mm` | `50°C` | `2.5% / °C` | `UL508, TUV BS EN/EN62368-1, CE, UKCA` |
| **`DR-75-24`** | `Rev 2019-03` | ![SUPERSEDED](https://img.shields.io/badge/SUPERSEDED-E11D48?style=flat-square) | `24V DC / 3.2A (76.8W)` | `55.5 mm` | `45°C` | `3.0% / °C` | `UL508, EN60950-1 (Legacy), CE` |

---

## Database Schema & Row-Level Security

All application security and state persistence live in `data/spectrace_security.sqlite`:

| Table Name | Primary Key | Purpose & Security Policy |
| :--- | :--- | :--- |
| **`users`** | `id (TEXT)` | Allowlisted accounts (`email UNIQUE`, `password_hash`, `role`, `is_active`, `failed_login_attempts`, `locked_until`, `last_login`). `password_hash` is stripped at the database query layer. |
| **`sessions`** | `id (TEXT)` | Active server-side sessions storing `token_hash (SHA-256)`, `csrf_token`, `user_id`, `ip_address`, `last_active_at` (30m idle timeout), and `expires_at` (8h max TTL). |
| **`password_reset_tokens`** | `id (TEXT)` | Single-use 15-minute reset tokens stored as `SHA-256` hashes (`token_hash`, `expires_at`, `used_at`). Consuming a token automatically revokes all existing sessions for that user. |
| **`login_audit_logs`** | `id (TEXT)` | Immutable security ledger recording timestamp, normalized email, event type, outcome (`ALLOW` / `DENY` / `INFO`), IP address, and details. |
| **`corpus_revisions`** | `id (TEXT)` | Revision-controlled datasheet records (`APPROVED`, `DRAFT`, `SUPERSEDED`). Only `admin` users can approve or reset corpus revisions. |
| **`signoff_audits`** | `id (TEXT)` | Suitability sign-off records enforced with **Row-Level Security (`owner_user_id`)** so standard users can only read or write their own sign-off records. |

---

## 12-Scenario Live Security Verification Suite

Inside the application (**Access & Security → Run 12-Scenario Verification Suite**), administrators can execute an automated live test suite against the SQLite database:

1. ![PASS](https://img.shields.io/badge/TEST_01-PASS-10B981?style=flat-square) **Registered Active User Login** — Valid credentials authenticate and create a server session.
2. ![PASS](https://img.shields.io/badge/TEST_02-PASS-10B981?style=flat-square) **Unregistered Email Login Rejected** — Unknown email fails with a generic message after constant-time dummy verification.
3. ![PASS](https://img.shields.io/badge/TEST_03-PASS-10B981?style=flat-square) **Registered Email + Wrong Password Rejected** — Invalid password increments failure counter and rejects login.
4. ![PASS](https://img.shields.io/badge/TEST_04-PASS-10B981?style=flat-square) **Disabled Account (`is_active = false`) Rejected** — Deactivating an account immediately revokes active sessions and blocks login.
5. ![PASS](https://img.shields.io/badge/TEST_05-PASS-10B981?style=flat-square) **Direct Unauthenticated URL/API Access Blocked** — Unauthenticated requests to `/api/datasheets` return `401 Unauthorized`.
6. ![PASS](https://img.shields.io/badge/TEST_06-PASS-10B981?style=flat-square) **Public Registration Disabled** — `POST /api/auth/register` returns `403 Forbidden`.
7. ![PASS](https://img.shields.io/badge/TEST_07-PASS-10B981?style=flat-square) **Expired / Tampered Session Token Rejected** — Forged bearer tokens fail SHA-256 session lookup.
8. ![PASS](https://img.shields.io/badge/TEST_08-PASS-10B981?style=flat-square) **Logout Destroys Session Immediately** — `POST /api/auth/logout` deletes the session row so replay fails.
9. ![PASS](https://img.shields.io/badge/TEST_09-PASS-10B981?style=flat-square) **Brute-Force Protection (5 Failed Attempts)** — 5 consecutive failures enforce a temporary 15-minute account cooldown.
10. ![PASS](https://img.shields.io/badge/TEST_10-PASS-10B981?style=flat-square) **SQL Injection Payload Blocked** — `' OR 1=1 --` and `' UNION SELECT * FROM users --` are safely neutralized by parameterized queries.
11. ![PASS](https://img.shields.io/badge/TEST_11-PASS-10B981?style=flat-square) **Non-Admin User Blocked from `/api/admin/*`** — Standard `user` role cannot access administrator endpoints (`403 Forbidden`).
12. ![PASS](https://img.shields.io/badge/TEST_12-PASS-10B981?style=flat-square) **Single-Use Password Reset Token Lifecycle** — Token expires in 15m, updates password, revokes old sessions, and rejects replay.

---

## Technology Stack

- **Frontend:** React 19, TypeScript, Tailwind CSS v4, Lucide Icons, PDF.js (`pdfjs-dist` for real browser PDF text extraction)
- **Backend:** Node.js 22, Express, TypeScript (`tsx`)
- **Database & Cryptography:** Built-in `node:sqlite` (`DatabaseSync` in WAL mode), Node `node:crypto` (`scryptSync`, `timingSafeEqual`, `randomBytes`, `createHash('sha256')`)
- **AI Grounding:** `@google/genai` (`gemini-2.5-flash` server-side grounded Q&A with deterministic lexical fallback)

---

## Getting Started & Deployment

### 1. Environment Configuration

Copy `.env.example` to `.env` and configure your environment variables:

```bash
# Required for live Gemini grounded Q&A (falls back to deterministic lexical engine if omitted)
GEMINI_API_KEY="your_gemini_api_key"

# Optional: Pre-seed the initial administrator account on first boot.
# If omitted, the login screen presents a one-time atomic First-Run Admin Claim form.
INITIAL_ADMIN_EMAIL="admin@company.com"
INITIAL_ADMIN_PASSWORD="YourStrongPassword!2026"
```

> [!WARNING]
> Never commit `.env` or `data/*.sqlite` to version control. Both paths are pre-configured in `.gitignore`.

### 2. Install & Run in Development

```bash
npm install
npm run dev
```
The full-stack Express + Vite server will start on `http://localhost:3000`.

### 3. Production Build & Start

```bash
npm run build
npm start
```

---

## API Reference

| Method | Endpoint | Access Level | Description |
| :---: | :--- | :---: | :--- |
| `GET` | `/api/auth/status` | ![Public](https://img.shields.io/badge/Public-64748B?style=flat-square) | Checks whether the initial administrator account has been claimed. |
| `POST` | `/api/auth/bootstrap` | ![First-Run Only](https://img.shields.io/badge/One--Time-F59E0B?style=flat-square) | Atomically claims the initial admin account when `users` count is `0`; permanently returns `403` thereafter. |
| `POST` | `/api/auth/register` | ![Blocked](https://img.shields.io/badge/403_Disabled-E11D48?style=flat-square) | Always returns `403 Forbidden` (public signup disabled). |
| `POST` | `/api/auth/login` | ![Rate Limited](https://img.shields.io/badge/Rate_Limited-2563EB?style=flat-square) | Authenticates allowlisted active users and rotates session & CSRF tokens. |
| `POST` | `/api/auth/logout` | ![Authenticated](https://img.shields.io/badge/Auth_Required-10B981?style=flat-square) | Destroys the active server-side session row and clears the `HttpOnly` cookie. |
| `GET` | `/api/datasheets` | ![Authenticated](https://img.shields.io/badge/Auth_Required-10B981?style=flat-square) | Returns the revision-controlled datasheet corpus. |
| `GET/POST` | `/api/audits` | ![RLS Protected](https://img.shields.io/badge/RLS_Scoped-0284C7?style=flat-square) | Lists or records suitability sign-off records scoped by `owner_user_id`. |
| `POST` | `/api/qa` | ![Authenticated](https://img.shields.io/badge/Auth_Required-10B981?style=flat-square) | Executes grounded Q&A over `APPROVED` datasheet chunks via server-side Gemini API. |
| `GET/POST` | `/api/admin/users` | ![Admin Only](https://img.shields.io/badge/Admin_Only-7C3AED?style=flat-square) | Lists or adds allowlisted user accounts, toggles `is_active`, changes roles, or issues 15-minute reset tokens. |
| `POST` | `/api/security/run-self-test` | ![Admin Only](https://img.shields.io/badge/Admin_Only-7C3AED?style=flat-square) | Runs the 12-scenario live security verification suite against SQLite. |
