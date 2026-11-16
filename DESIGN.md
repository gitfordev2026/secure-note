# NoteApp - Design Document

## Overview

NoteApp is a full-stack note-taking application built with Next.js 16, React 19, Drizzle ORM, and Cloudflare D1 database. It features authentication, role-based access control (user/admin), and a rich text editor (Tiptap).

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Cloudflare Pages                           │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │  Next.js App    │  │  @opennextjs/   │  │  D1 Database    │  │
│  │  (Edge Runtime) │──│  cloudflare     │──│  (SQLite)       │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### Tech Stack

| Layer | Technology | Version |
|-------|------------|---------|
| Framework | Next.js | 16.4.5 (App Router) |
| Runtime | React | 19.3.0 |
| Database | Drizzle ORM + Cloudflare D1 | 0.45.4 / 1.20261104.1 |
| Auth | Custom bcrypt + session cookies | - |
| Styling | Tailwind CSS v4 + Radix UI | 4.3.5 / 1.x |
| Editor | Tiptap | 3.33.0 |
| Validation | Zod | 4.6.7 |
| Deployment | @opennextjs/cloudflare + Wrangler | 1.20.17 / 4.158.0 |

## Feature Specification

### Core Features

#### 1. Authentication System
- **Signup**: Email, name, password (with complexity requirements)
- **Login**: Email + password with "remember me" (30d vs 7d session)
- **Logout**: Destroys session server-side and clears cookie
- **Session Management**: 
  - Cryptographically random 32-byte tokens
  - SHA-256 hashed before storage
  - 30-day expiry (configurable)
  - HttpOnly, Secure, SameSite=Lax cookies

#### 2. Notes Management (User)
- CRUD operations on personal notes
- Rich text editing via Tiptap
- Categorization and tagging
- Pin/Archive functionality
- Search (title + content)
- Pagination (default 20, max 100)

#### 3. Admin Panel
- User management (list, search, promote/demote, enable/disable, delete)
- Note oversight (view all notes across users)
- Audit logs (admin actions)
- Dashboard statistics

#### 4. Security Features
- Password hashing: bcrypt 12 rounds
- Session token hashing: SHA-256
- Role-based access control (user/admin)
- Account status (active/disabled)
- Input validation via Zod schemas

### Data Model

```sql
-- Users
users: id (PK), name, email (unique), password_hash, role, status, 
       created_at, updated_at, last_login_at

-- Notes  
notes: id (PK), user_id (FK), title, content, category, tags (JSON),
       is_pinned, is_archived, created_at, updated_at

-- Sessions
sessions: id (PK), user_id (FK), session_token_hash (unique), 
          expires_at, created_at

-- Audit Logs
audit_logs: id (PK), admin_id (FK, nullable), action, target_type,
            target_id, details (JSON), created_at
```

### API Routes

| Route | Method | Auth | Description |
|-------|--------|------|-------------|
| `/api/auth/login` | POST | Public | User login |
| `/api/auth/signup` | POST | Public | User registration |
| `/api/auth/logout` | POST | Auth | User logout |
| `/api/auth/session` | GET | Auth | Session validation |
| `/api/auth/forgot-password` | POST | Public | Password reset request |
| `/api/auth/reset-password` | POST | Public | Password reset submit |
| `/api/notes` | GET/POST | User | List/create notes |
| `/api/notes/[id]` | GET/PUT/DELETE | User | Note CRUD |
| `/api/notes/export` | GET | User | Export notes |
| `/api/admin/users` | GET | Admin | List users |
| `/api/admin/users/[id]` | GET/PATCH/DELETE | Admin | User management |
| `/api/admin/notes` | GET | Admin | List all notes |
| `/api/admin/audit-logs` | GET | Admin | View audit logs |
| `/api/admin/stats` | GET | Admin | Dashboard stats |
| `/api/ai/enhance` | POST | User | AI note enhancement |

### UI/UX Design

- **Color Scheme**: Tailwind CSS v4 with CSS variables (`@theme inline`)
- **Dark Mode**: System preference detection via `@media (prefers-color-scheme: dark)`
- **Components**: Radix UI primitives with custom styling
- **Layout**: Sidebar navigation for authenticated areas
- **Forms**: Server actions with Zod validation
- **Notifications**: Sonner toasts

## Detailed Implementation Plan

### Phase 1: Core Infrastructure ✅
- [x] Next.js 16 App Router setup
- [x] Drizzle ORM + D1 schema
- [x] Authentication library (bcrypt, sessions)
- [x] Middleware route protection
- [x] Server action auth helpers (`requireUser`, `requireAdmin`)

### Phase 2: User Features ✅
- [x] Signup/Login/Logout pages & actions
- [x] Notes CRUD (server actions + API routes)
- [x] Dashboard, Notes list, Pinned, Archived views
- [x] Rich text editor (Tiptap)
- [x] Search, filtering, pagination

### Phase 3: Admin Features ✅
- [x] Admin middleware protection
- [x] User management API + UI
- [x] Notes oversight API + UI
- [x] Audit logs API + UI
- [x] Admin dashboard stats

### Phase 4: Cloudflare Deployment ✅
- [x] @opennextjs/cloudflare adapter config
- [x] Wrangler.toml with D1 binding
- [x] GitHub Actions deploy workflow
- [x] Build fixes (.npmrc, postcss.config, opennext.config)

### Phase 5: Security Hardening 🔄 (In Progress)
- [ ] Fix middleware auth bypass (C-01)
- [ ] Remove hardcoded SESSION_SECRET default (C-03)
- [ ] Add rate limiting to auth endpoints (H-01)
- [ ] Implement CSRF protection for admin fetch() calls (H-03)
- [ ] Add self-deletion/last-admin protection (H-04)
- [ ] Implement secure password reset (H-05)
- [ ] Add security headers (M-05)
- [ ] Sanitize error responses (M-06)
- [ ] Add account lockout (M-07)

### Phase 6: Polish & Production
- [ ] Email verification on signup
- [ ] Concurrent session limits
- [ ] Password hash upgrade mechanism
- [ ] Audit log integrity (hash chains)
- [ ] Comprehensive testing

## Deployment Strategy

### Cloudflare Pages Configuration
- **Build Command**: `pnpm build`
- **Output**: Handled by @opennextjs/cloudflare (`.next` → Cloudflare Workers)
- **Node Version**: 22 (via GitHub Actions)
- **Package Manager**: pnpm 11.15.1

### Environment Variables (Production)
| Variable | Source |
|----------|--------|
| `SESSION_SECRET` | Cloudflare Pages Secret (generate: `openssl rand -base64 32`) |
| `NEXT_PUBLIC_APP_URL` | Cloudflare Pages Env Var |
| `NEXT_PUBLIC_SITE_NAME` | Cloudflare Pages Env Var |
| `BOOTSTRAP_TOKEN` | Cloudflare Pages Secret |
| `ADMIN_EMAIL` | Cloudflare Pages Secret |
| `ADMIN_PASSWORD` | Cloudflare Pages Secret |
| `ADMIN_NAME` | Cloudflare Pages Secret |

### D1 Database
- **Binding Name**: `DB`
- **Database Name**: `noteapp-db`
- **Database ID**: `4c48548d-84d8-4244-8c48-068fb40d5024`
- **Migrations**: Applied via `wrangler d1 execute` in deploy workflow

### CI/CD Pipeline
1. Push to `main` triggers GitHub Actions
2. `pnpm install --frozen-lockfile` (with .npmrc allowing build scripts)
3. `pnpm build` (Next.js + OpenNext adaptation)
3. `wrangler pages deploy .next` to Cloudflare Pages
4. D1 migration applied on main branch only

## Security Considerations

### Current Vulnerabilities (from SAST)
| Severity | Issue | Status |
|----------|-------|--------|
| 🔴 Critical | Middleware auth bypass | 🔴 Open |
| 🔴 Critical | Missing admin API routes | ✅ Fixed |
| 🔴 Critical | Hardcoded weak SESSION_SECRET | 🔴 Open |
| 🟠 High | No rate limiting on auth | 🔴 Open |
| 🟠 High | Wildcard injection in search | 🔴 Open |
| 🟠 High | Missing CSRF on admin actions | 🔴 Open |
| 🟠 High | Admin self-deletion possible | 🔴 Open |
| 🟠 High | Password reset not implemented | 🔴 Open |

### Mitigation Plan
All Critical and High issues targeted for Phase 5 completion before production launch.

## Success Criteria

1. **Deployable**: Build passes on Cloudflare Pages without errors
2. **Secure**: All Critical/High SAST findings resolved
3. **Functional**: All user and admin features work end-to-end
4. **Performant**: Page loads < 2s, API responses < 500ms
5. **Maintainable**: TypeScript strict mode, linting clean, test coverage > 80%