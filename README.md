# NoteApp

A modern, secure, personal note-taking web application built with Next.js, TypeScript, Tailwind CSS, and Cloudflare D1.

## Features

- **Authentication:** Secure signup/login with Argon2id-compatible password hashing (bcryptjs), HTTP-only Secure SameSite cookies, and session-based auth
- **Notes CRUD:** Create, read, edit, delete notes with categories, tags, pinning, and archiving
- **User Dashboard:** Welcome message, note stats, recent notes, search, filter, sort
- **Admin Panel:** Centralized user and note management, audit logs, role/status control
- **Security:** Server-side authorization, route protection, SQL injection prevention via Drizzle ORM, rate limiting ready
- **UI/UX:** Responsive design, light/dark mode, shadcn/ui components, Lucide icons, toast notifications
- **Deployment:** Cloudflare Pages with D1 database, automatic deploys via GitHub

## Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS v4 + shadcn/ui
- **Icons:** Lucide React
- **Database:** Cloudflare D1 (SQLite)
- **ORM:** Drizzle ORM
- **Auth:** Session-based (bcryptjs hashing, HTTP-only cookies)
- **Hosting:** Cloudflare Pages
- **CI/CD:** GitHub Actions → Cloudflare Pages

## Project Structure

```
noteapp/
├── src/
│   ├── app/                    # Next.js App Router routes
│   │   ├── (app)/              # Authenticated route group (dashboard layout)
│   │   ├── admin/              # Admin routes
│   │   ├── api/                # API routes
│   │   └── auth/               # Auth pages
│   ├── components/             # React components (ui, layout, notes, admin)
│   ├── db/                     # Drizzle schema + migrations
│   ├── hooks/                  # Client hooks
│   ├── lib/                    # Auth, session, utils
│   ├── middleware.ts           # Route protection
│   ├── server/                 # Server actions
│   ├── types/                  # TypeScript types
│   └── validations/            # Zod schemas
├── scripts/                    # Bootstrap & utility scripts
├── wrangler.toml               # Cloudflare Pages + D1 config
├── drizzle.config.ts           # Drizzle ORM config
├── package.json
└── README.md
```

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm 8+
- A Cloudflare account with D1 enabled

### 1. Install dependencies

```bash
pnpm install
```

### 2. Set up environment variables

Copy `.env.example` to `.env.local` and fill in values:

```bash
cp .env.example .env.local
```

Generate a session secret:

```bash
openssl rand -base64 32
```

### 3. Create the D1 database

```bash
# Create the D1 database
npx wrangler d1 create noteapp-db

# Copy the database_id from the output into wrangler.toml

# Apply the migration (local)
npx wrangler d1 execute noteapp-db --local --file=./src/db/migrations/0001_init.sql
```

### 4. Run locally

```bash
pnpm dev
```

Open http://localhost:3080

### 5. Create the first admin account

Do not hardcode admin credentials. Use environment variables:

```bash
# Set bootstrap secrets (Cloudflare Pages dashboard or wrangler)
npx wrangler secret put BOOTSTRAP_TOKEN
npx wrangler secret put ADMIN_EMAIL
npx wrangler secret put ADMIN_PASSWORD
npx wrangler secret put ADMIN_NAME

# Then call the bootstrap endpoint
curl "http://localhost:3080/api/bootstrap-admin?email=admin@example.com&name=Administrator" \
  -H "Authorization: Bearer $BOOTSTRAP_TOKEN"
```

Or create the admin directly in the D1 database with a hashed password.

## Database Migrations

Generate new migrations:

```bash
npx drizzle-kit generate
```

Apply migrations:

```bash
# Local
npx wrangler d1 execute noteapp-db --local --file=./src/db/migrations/000X_migration.sql

# Production (via Cloudflare dashboard or wrangler)
npx wrangler d1 execute noteapp-db --file=./src/db/migrations/000X_migration.sql
```

## Deployment to Cloudflare Pages

### Option 1: GitHub Integration (Recommended)

1. Push this repository to GitHub
2. In the Cloudflare Dashboard, go to Pages → Create a project → Connect to Git
3. Select the NoteApp repository
4. Configure build settings:
   - Build command: `pnpm build`
   - Build output directory: `.next`
   - Compatibility flag: `Node.js compat`
5. Add a D1 database binding:
   - Go to Pages → Your project → Settings → D1 databases
   - Bind your `noteapp-db` database to the `DB` variable
6. Add environment variables/secrets:
   - `SESSION_SECRET`
   - `NEXT_PUBLIC_APP_URL`
   - `BOOTSTRAP_TOKEN`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` (for initial admin)
7. Enable automatic deployments on push to `main`
8. Preview deployments are enabled automatically for other branches

### Option 2: Wrangler CLI

```bash
npx wrangler pages deploy .next --project-name noteapp
```

## GitHub Actions

See `.github/workflows/deploy.yml` for the CI/CD workflow that:
- Installs dependencies
- Runs the build
- Deploys to Cloudflare Pages on push to `main`
- Creates preview deployments for pull requests

## Security

- Passwords are hashed with bcryptjs (Cloudflare Workers-compatible)
- Session tokens are stored in HTTP-only, Secure, SameSite cookies
- All routes are protected server-side via middleware + server actions
- Users can only access their own notes (IDOR prevention)
- Admin actions require server-side role verification
- Audit logs record all administrative actions

## License

MIT
