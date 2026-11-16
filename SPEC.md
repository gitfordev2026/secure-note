# NoteApp - Technical Specification

## System Context

NoteApp is a multi-tenant note-taking SaaS deployed on Cloudflare's edge network. Users create accounts, write notes with rich text, and organize them. Admins manage users and monitor system activity.

## Functional Requirements

### FR-1: User Authentication
- **FR-1.1**: Users register with email, name, password
- **FR-1.2**: Password minimum 8 chars, 1 upper, 1 lower, 1 number, 1 special
- **FR-1.3**: Users login with email/password
- **FR-1.4**: "Remember me" extends session from 7 to 30 days
- **FR-1.5**: Sessions stored in D1, token hashed with SHA-256
- **FR-1.6**: Logout invalidates session server-side

### FR-2: Note Management
- **FR-2.1**: Authenticated users create notes with title, content, category, tags
- **FR-2.2**: Rich text content via Tiptap editor (HTML/JSON output)
- **FR-2.3**: Users list their notes with pagination, search, filter by category/pinned/archived
- **FR-2.4**: Users update/delete own notes only
- **FR-2.5**: Pin/archive toggles for organization

### FR-3: Admin Functions
- **FR-3.1**: Admins list all users with search, pagination
- **FR-3.2**: Admins change user role (user↔admin)
- **FR-3.3**: Admins enable/disable user accounts
- **FR-3.4**: Admins delete users (cascades to notes, sessions)
- **FR-3.5**: Admins view all notes across users
- **FR-3.6**: Admins view audit log of admin actions
- **FR-3.7**: Admins see dashboard statistics

### FR-4: Security
- **FR-4.1**: All passwords hashed with bcrypt cost 12
- **FR-4.2**: Session tokens cryptographically random (32 bytes)
- **FR-4.3**: Route protection via middleware + server action validation
- **FR-4.4**: Role-based access control enforced at API and UI level
- **FR-4.5**: Input validation on all mutations via Zod

## Non-Functional Requirements

### NFR-1: Performance
- **NFR-1.1**: Page load < 2s on 3G
- **NFR-1.2**: API p95 < 500ms
- **NFR-1.3**: Build time < 3min on Cloudflare Pages

### NFR-2: Security
- **NFR-2.1**: No critical/high vulnerabilities in production
- **NFR-2.2**: Session cookies: HttpOnly, Secure, SameSite=Strict
- **NFR-2.3**: Rate limiting: 10 req/min on auth endpoints
- **NFR-2.4**: CSP headers preventing XSS

### NFR-3: Reliability
- **NFR-3.1**: 99.9% uptime SLA
- **NFR-3.2**: Automatic D1 backup (Cloudflare managed)
- **NFR-3.3**: Graceful degradation if D1 unavailable

### NFR-4: Scalability
- **NFR-4.1**: Support 10k+ users on Cloudflare free tier
- **NFR-4.2**: Horizontal scaling via Cloudflare Workers

## Technical Constraints

| Constraint | Detail |
|------------|--------|
| Runtime | Cloudflare Workers (Node.js compat mode) |
| Database | D1 (SQLite), 10GB limit |
| Bundle Size | < 1MB worker script |
| CPU Time | 10ms per request (Workers limit) |
| Memory | 128MB per worker |

## API Contracts

### Auth Endpoints

#### POST /api/auth/login
```typescript
// Request
{ email: string, password: string, rememberMe?: boolean }

// Success Response (302 redirect)
Location: /dashboard (user) or /admin (admin)

// Error Response
{ error: "Invalid email or password" }
```

#### POST /api/auth/signup
```typescript
// Request
{ name: string, email: string, password: string, confirmPassword: string }

// Success Response (302 redirect)
Location: /dashboard

// Error Response
{ error: "An account with this email already exists" }
```

### Notes Endpoints

#### GET /api/notes
```typescript
// Query Params
page?: number (default 1)
pageSize?: number (default 20, max 100)
search?: string
category?: string
archived?: boolean
pinned?: boolean

// Response
{
  notes: Note[],
  pagination: { page, pageSize, total, totalPages }
}
```

#### POST /api/notes
```typescript
// Request
{ title: string, content: string, category?: string, tags?: string[], isPinned?: boolean, isArchived?: boolean }

// Response
{ success: true, note: Note }
```

### Admin Endpoints

#### GET /api/admin/users
```typescript
// Query Params
page, pageSize, search

// Response
{
  users: AdminUser[],
  pagination: PaginationMeta
}
```

#### PATCH /api/admin/users/[id]
```typescript
// Request
{ role?: "user" | "admin", status?: "active" | "disabled" }

// Response
{ success: true }
```

## Database Schema (Drizzle)

```typescript
// users table
export const users = sqliteTable("users", {
  id: text("id").primaryKey().$default(() => crypto.randomUUID()),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: text("role", { enum: ["user", "admin"] }).notNull().default("user"),
  status: text("status", { enum: ["active", "disabled"] }).notNull().default("active"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
  lastLoginAt: integer("last_login_at", { mode: "timestamp" }),
});

// notes table
export const notes = sqliteTable("notes", {
  id: text("id").primaryKey().$default(() => crypto.randomUUID()),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull().default("Untitled"),
  content: text("content").notNull().default(""),
  category: text("category"),
  tags: text("tags"), // JSON string
  isPinned: integer("is_pinned", { mode: "boolean" }).notNull().default(false),
  isArchived: integer("is_archived", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
});

// sessions table
export const sessions = sqliteTable("sessions", {
  id: text("id").primaryKey().$default(() => crypto.randomUUID()),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  sessionTokenHash: text("session_token_hash").notNull().unique(),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
});

// audit_logs table
export const auditLogs = sqliteTable("audit_logs", {
  id: text("id").primaryKey().$default(() => crypto.randomUUID()),
  adminId: text("admin_id").references(() => users.id, { onDelete: "set null" }),
  action: text("action").notNull(),
  targetType: text("target_type").notNull(),
  targetId: text("target_id"),
  details: text("details"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
});
```

## Deployment Specification

### Build Process
1. `pnpm install --frozen-lockfile` (with .npmrc allowing esbuild/workerd builds)
2. `pnpm build` → Next.js compiles to `.next/`
3. `@opennextjs/cloudflare` adapts `.next/` to Cloudflare Workers format
4. `wrangler pages deploy` uploads to Cloudflare Pages

### Wrangler Configuration
```toml
name = "noteapp"
compatibility_date = "2026-11-13"
compatibility_flags = ["nodejs_compat"]

[[d1_databases]]
binding = "DB"
database_name = "noteapp-db"
database_id = "4c48548d-84d8-4244-8c48-068fb40d5024"

[vars]
NEXT_PUBLIC_APP_URL = "https://noteapp.pages.dev"
NEXT_PUBLIC_SITE_NAME = "NoteApp"

[build]
command = "pnpm build"
```

### OpenNext Configuration
```typescript
import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import r2IncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/r2-incremental-cache";

export default defineCloudflareConfig({
  incrementalCache: r2IncrementalCache,
});
```

## Security Specification

### Authentication Flow
```
1. User submits credentials → /api/auth/login
2. Server validates bcrypt hash
3. generateSessionToken() → 32 random bytes
4. hashSessionToken() → SHA-256
5. Store hash in sessions table with 30d expiry
6. Set cookie: noteapp_session=plaintoken; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=2592000
7. Redirect to dashboard
```

### Authorization Matrix

| Resource | Anonymous | User | Admin |
|----------|-----------|------|-------|
| /auth/* | ✅ | ❌ (redirect) | ❌ (redirect) |
| /dashboard | ❌ | ✅ | ✅ |
| /notes/* | ❌ | ✅ (own) | ✅ (all) |
| /settings | ❌ | ✅ | ✅ |
| /admin/* | ❌ | ❌ | ✅ |
| /api/admin/* | ❌ | ❌ | ✅ |

### Threat Model

| Threat | Mitigation |
|--------|------------|
| Credential stuffing | Rate limiting (TODO), bcrypt |
| Session hijacking | HttpOnly, Secure, SHA-256 storage |
| SQL injection | Drizzle parameterized queries |
| XSS | CSP headers (TODO), React auto-escape |
| CSRF | SameSite=Strict, Server Actions (TODO for fetch) |
| Privilege escalation | requireAdmin() on all admin routes |
| Audit log tampering | Hash chains (TODO) |

## Testing Strategy

### Unit Tests
- Auth functions (hash, verify, token gen)
- Validation schemas
- Utility functions

### Integration Tests
- Auth flow (signup → login → session → logout)
- Notes CRUD with ownership
- Admin actions with role checks

### E2E Tests
- Critical user journeys
- Admin panel workflows

## Monitoring & Observability

- **Logs**: Cloudflare Pages observability enabled
- **Errors**: Console errors captured in Cloudflare dashboard
- **Performance**: Web Vitals via Cloudflare analytics
- **Database**: D1 query stats in Cloudflare dashboard

## Rollback Procedure

1. Cloudflare Pages: Previous deployment available via dashboard
2. D1: Point-in-time recovery via Cloudflare dashboard
3. DNS: No changes required (pages.dev subdomain)

## Open Questions

1. **Email verification**: Required for production? (Currently not implemented)
2. **Password reset**: Token delivery via email provider? (Resend, SendGrid?)
3. **Rate limiting storage**: Upstash Redis or Cloudflare KV?
4. **File uploads**: Notes currently text-only; images via Tiptap need R2/S3
5. **Multi-region**: D1 is single-region; read replicas not yet available