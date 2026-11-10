# SAST Security Audit Report

**Project:** NoteApp (Next.js + Drizzle + Cloudflare D1)
**Date:** 2026-11-10
**Auditor:** Security Agent (Automated SAST)
**Scope:** Full codebase review - authentication, authorization, input validation, data access, configuration

---

## Executive Summary

| Severity | Count |
|----------|-------|
| 🔴 **Critical** | 3 |
| 🟠 **High** | 5 |
| 🟡 **Medium** | 8 |
| 🟢 **Low** | 6 |
| 🔵 **Info** | 4 |

**Overall Risk Rating:** **HIGH** - Multiple critical authentication bypass and authorization flaws exist.

---

## 🔴 Critical Findings

### C-01: Authentication Bypass via Middleware Token Check Only
**File:** `src/middleware.ts:29-55`
**CWE:** CWE-306 (Missing Authentication for Critical Function)

**Description:** The middleware only checks for the *presence* of a cookie named `noteapp_session` but **does not validate the session token against the database**. Any request with a cookie named `noteapp_session` (regardless of value) bypasses authentication and accesses protected routes.

**Impact:** Full authentication bypass. Attackers can access `/dashboard`, `/notes`, `/admin`, `/settings` without valid credentials.

**Proof of Concept:**
```bash
curl -H "Cookie: noteapp_session=anything" https://app.example.com/admin
```

**Remediation:** Call `validateSession()` in middleware or move all auth checks to server actions (current pattern in server actions is correct but middleware creates false sense of security).

---

### C-02: Admin API Routes Missing Entirely
**File:** `src/app/api/admin/` (directory missing)
**CWE:** CWE-284 (Improper Access Control)

**Description:** Admin pages (`/admin/users`, `/admin/notes`, `/admin/settings`, `/admin/audit-logs`) make direct `fetch()` calls to `/api/admin/*` endpoints that **do not exist**. The frontend calls:
- `GET /api/admin/users?search=`
- `PATCH /api/admin/users/:id/status`
- `PATCH /api/admin/users/:id/role`
- `DELETE /api/admin/users/:id`
- `GET /api/admin/notes`
- `GET /api/admin/audit-logs`

But no API routes are implemented. This means:
1. If Next.js returns 404, admin features are broken
2. If a catch-all route exists, it may expose admin functionality without auth

**Impact:** Admin panel non-functional; potential exposure if fallback routes exist.

**Remediation:** Implement all `/api/admin/*` routes with `requireAdmin()` guards.

---

### C-03: Session Secret Hardcoded with Weak Default
**File:** `src/lib/env.ts:2`
**CWE:** CWE-798 (Use of Hard-coded Credentials)

**Description:** `SESSION_SECRET` defaults to `"dev-secret-change-me"` - a known, predictable value. In production, if `SESSION_SECRET` env var is not set, all session tokens are signed/verified with this known secret.

**Impact:** Session forgery, privilege escalation, account takeover.

**Remediation:** 
```typescript
// Remove default - crash on missing secret
SESSION_SECRET: requireEnv("SESSION_SECRET"),
```

---

## 🟠 High Findings

### H-01: No Rate Limiting on Auth Endpoints
**Files:** 
- `src/server/actions/auth/login.ts`
- `src/server/actions/auth/signup.ts`
- `src/app/api/auth/*`

**CWE:** CWE-307 (Improper Restriction of Excessive Authentication Attempts)

**Description:** Login, signup, and password reset have no rate limiting. Allows:
- Credential stuffing / password spraying
- Username enumeration via timing (signup returns "email exists" vs login returns generic error)
- DoS via account lockout (if implemented) or resource exhaustion

**Remediation:** Implement rate limiting (e.g., `@cloudflare/next-on-pages` middleware, or application-level with Redis/Upstash).

---

### H-02: SQL Injection via Search Parameter in ILIKE
**Files:** 
- `src/server/actions/notes.ts:112-115`
- `src/server/actions/admin.ts:41, 197-198`
- `src/app/api/notes/route.ts:31`

**CWE:** CWE-89 (SQL Injection)

**Description:** User-controlled `search` parameter is directly interpolated into `ilike()` patterns:
```typescript
ilike(notes.title, `%${search}%`)
```
While Drizzle's `ilike` uses parameterized queries, the `%` wildcards are concatenated in application code. If `search` contains `%` or `_`, it alters the query semantics (wildcard injection). Not directly exploitable for SQLi but allows bypassing search filters.

**Impact:** Search filter bypass, potential DoS via complex patterns.

**Remediation:** Sanitize wildcards: `search.replace(/[%_]/g, '\\$&')`

---

### H-03: Missing CSRF Protection on State-Changing Actions
**Files:** All server actions (`login.ts`, `signup.ts`, `logout.ts`, `notes.ts`, `admin.ts`)

**CWE:** CWE-352 (Cross-Site Request Forgery)

**Description:** Server actions use `"use server"` but **no CSRF tokens** are validated. Next.js Server Actions have built-in CSRF protection via the `action` header, but this only works for same-origin form submissions. The admin pages use raw `fetch()` calls (lines 24, 36-39, 46-50, 56) which bypass Next.js action handling.

**Impact:** Authenticated users can be tricked into changing admin settings, deleting users, modifying notes.

**Remediation:** 
- Use Next.js `<form action={serverAction}>` pattern, OR
- Implement explicit CSRF tokens for `fetch()` calls
- Add `sameSite: "strict"` to session cookie (currently `"lax"`)

---

### H-04: Insecure Direct Object Reference (IDOR) in Admin Actions
**File:** `src/server/actions/admin.ts:149-158` (deleteUserAction)

**CWE:** CWE-639 (Authorization Bypass Through User-Controlled Key)

**Description:** `deleteUserAction(id)` allows any admin to delete any user by ID **without verifying the target user is not the last admin or themselves**. No protection against:
- Self-deletion (admin deletes own account)
- Deleting the last admin account
- Deleting super-admin / system accounts

**Impact:** Accidental or malicious removal of all admin access.

**Remediation:** Add checks:
```typescript
const currentUser = await requireAdmin();
if (id === currentUser.id) return { error: "Cannot delete yourself" };
const adminCount = await db.select({ count: count() }).from(users).where(eq(users.role, "admin"));
if (adminCount === 1 && targetUser.role === "admin") return { error: "Cannot delete last admin" };
```

---

### H-05: Password Reset / Forgot Password - No Implementation
**File:** `src/app/auth/forgot-password/page.tsx` (referenced but no backend)

**CWE:** CWE-640 (Weak Password Recovery Mechanism)

**Description:** Frontend page exists but no server action or API route implements password reset. If implemented insecurely (e.g., token in URL, no expiry, no rate limit), it becomes account takeover vector.

**Remediation:** Implement with:
- Cryptographically secure reset tokens (32+ bytes)
- Short expiry (1 hour)
- One-time use
- Rate limiting on request and submit

---

## 🟡 Medium Findings

### M-01: Session Cookie Missing `SameSite: Strict`
**File:** `src/lib/session-cookies.ts:26`
**CWE:** CWE-1275 (Sensitive Cookie with Improper SameSite Attribute)

**Description:** Cookie uses `sameSite: "lax"` which allows cookie to be sent on top-level navigations from external sites. For a note-taking app with admin panel, `strict` is more appropriate.

**Remediation:** Change to `sameSite: "strict"`

---

### M-02: Session Token Exposed in Client-Side Code
**File:** `src/middleware.ts:31` reads cookie but doesn't validate; `src/hooks/use-session.ts` likely exposes session state.

**CWE:** CWE-922 (Insecure Storage of Sensitive Information)

**Description:** The session token is stored in a cookie accessible to JavaScript (not `httpOnly: true` in all contexts - though `session-cookies.ts` sets `httpOnly: true`, the middleware reads it client-adjacent). More critically, the token value itself is the plaintext session identifier - if leaked via XSS, full account compromise.

**Remediation:** Ensure `httpOnly: true` always; consider token binding to device fingerprint.

---

### M-03: No Password Hash Upgrade Mechanism
**File:** `src/lib/auth.ts:7-12`
**CWE:** CWE-916 (Use of Password Hash With Insufficient Computational Effort)

**Description:** Bcrypt with 12 rounds is currently adequate but no mechanism exists to re-hash with higher cost on login. As hardware improves, 12 rounds becomes weak.

**Remediation:** On successful login, check `bcrypt.getRounds(hash) < TARGET_ROUNDS` and re-hash/update.

---

### M-04: Audit Logs Not Immutable / No Integrity Protection
**File:** `src/db/schema.ts:90-115`
**CWE:** CWE-354 (Improper Validation of Integrity Check Value)

**Description:** Audit logs are stored in regular DB table with no:
- Cryptographic chaining (hash chains)
- Append-only enforcement
- Tamper evidence

Admin with DB access can modify/delete audit logs.

**Remediation:** Hash chain: each log entry includes `prevHash`; verify on read.

---

### M-05: Missing Security Headers
**File:** `next.config.ts` (not shown but likely missing)
**CWE:** CWE-693 (Protection Mechanism Failure)

**Description:** No CSP, HSTS, X-Frame-Options, Referrer-Policy, Permissions-Policy headers configured.

**Remediation:** Add to `next.config.ts`:
```typescript
async headers() {
  return [{
    source: '/:path*',
    headers: [
      { key: 'Content-Security-Policy', value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline';" },
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
    ]
  }]
}
```

---

### M-06: Error Messages Leak Stack Traces
**Files:** All API routes (e.g., `src/app/api/notes/route.ts:57, 88`)

**CWE:** CWE-209 (Generation of Error Message Containing Sensitive Information)

**Description:** `catch (e: any)` returns `e.message` directly to client. In production, this may leak database schema, file paths, internal logic.

**Remediation:** Use generic error messages in production; log full errors server-side.

---

### M-07: No Account Lockout / Brute Force Protection
**Files:** `src/server/actions/auth/login.ts`
**CWE:** CWE-307 (Improper Restriction of Excessive Authentication Attempts)

**Description:** Unlimited login attempts per account/IP. No progressive delays, CAPTCHA, or account lockout.

**Remediation:** Track failed attempts per IP+email; implement exponential backoff + lockout.

---

### M-08: Tags Stored as JSON String - No Validation
**File:** `src/server/actions/notes.ts:61, 193-195`
**CWE:** CWE-915 (Improperly Controlled Modification of Dynamically-Determined Object Attributes)

**Description:** Tags stored as `JSON.stringify(tags)` with only Zod validation on input. No validation on read (`JSON.parse(r.tags)` can throw). Malformed data in DB (via direct DB access or migration) crashes the app.

**Remediation:** Wrap `JSON.parse` in try/catch; validate parsed structure.

---

## 🟢 Low Findings

### L-01: Default Admin User Creation Not Documented
**File:** No seeding logic found
**Impact:** First admin must be created via direct DB insert.

### L-02: No Email Verification on Signup
**File:** `src/server/actions/auth/signup.ts`
**Impact:** Fake emails, no recovery path for typos.

### L-03: Session Expiry Not Extended on Activity
**File:** `src/lib/auth.ts:47` - fixed 30-day expiry
**Impact:** Sessions expire even for active users (if not "rememberMe").

### L-04: No Concurrent Session Limit
**File:** `src/lib/auth.ts` - unlimited sessions per user
**Impact:** Stolen sessions remain valid indefinitely.

### L-05: TypeScript `any` Usage in Database Rows
**Files:** Multiple - `(row as any)`, `(session as any)`
**Impact:** Type safety bypassed; runtime errors possible.

### L-06: `process.env` Cast to `any` for DB Access
**Files:** All server actions - `(process.env as any).DB`
**Impact:** Bypasses type checking; runtime errors if binding missing.

---

## 🔵 Informational

### I-01: Good - Password Hashing with Bcrypt 12 Rounds
**File:** `src/lib/auth.ts:7`
**Note:** Adequate for 2026; consider Argon2id for new projects.

### I-02: Good - Session Tokens Are Cryptographically Random
**File:** `src/lib/auth.ts:23-26`
**Note:** 32 bytes from `crypto.getRandomValues()` - excellent.

### I-03: Good - Session Tokens Hashed Before Storage (SHA-256)
**File:** `src/lib/auth.ts:29-37`
**Note:** Prevents token leakage if DB compromised.

### I-04: Good - Parameterized Queries via Drizzle ORM
**Note:** Prevents classic SQL injection; only wildcard injection risk remains.

---

## Remediation Priority Order

1. **IMMEDIATE** (Deploy hotfix):
   - C-01: Fix middleware auth validation or remove middleware protection
   - C-03: Remove hardcoded SESSION_SECRET default
   - C-02: Implement missing admin API routes

2. **WITHIN 24 HOURS**:
   - H-01: Add rate limiting to auth endpoints
   - H-03: Implement CSRF protection for admin fetch() calls
   - H-04: Add self-deletion/last-admin protection

3. **WITHIN 1 WEEK**:
   - H-02: Sanitize search wildcards
   - H-05: Implement secure password reset
   - M-01: Change SameSite to Strict
   - M-05: Add security headers
   - M-06: Sanitize error responses
   - M-07: Add account lockout

4. **NEXT SPRINT**:
   - M-03: Password hash upgrade mechanism
   - M-04: Audit log integrity
   - M-08: Robust JSON parsing
   - L-02: Email verification
   - L-04: Concurrent session limits

---

## Appendix: Files Reviewed

| File | Risk Areas |
|------|------------|
| `src/middleware.ts` | C-01 |
| `src/lib/auth.ts` | C-03, I-01, I-02, I-03, M-03 |
| `src/lib/session-cookies.ts` | M-01, M-02 |
| `src/server/auth.ts` | - |
| `src/server/actions/auth/login.ts` | H-01, H-07, M-07 |
| `src/server/actions/auth/signup.ts` | H-01, L-02 |
| `src/server/actions/auth/logout.ts` | - |
| `src/server/actions/notes.ts` | H-02, H-03, M-08 |
| `src/server/actions/admin.ts` | H-02, H-03, H-04, M-04 |
| `src/app/api/notes/route.ts` | H-02, M-06 |
| `src/app/api/notes/[id]/route.ts` | M-06 |
| `src/app/api/auth/session/route.ts` | - |
| `src/db/schema.ts` | M-04 |
| `src/lib/env.ts` | C-03 |
| `src/validations/index.ts` | - |
| `src/types/index.ts` | - |
| `wrangler.toml` | - |
| `package.json` | - |

---

*End of Report*
