# Cloudflare Pages deployment configuration
# Build command: pnpm build
# Deploy command: npx wrangler pages deploy .next
# Root directory: /
# Node.js version: 20
# Production branch: main

# Environment variables required:
# - SESSION_SECRET (generate: openssl rand -base64 32)
# - NEXT_PUBLIC_APP_URL (your Pages URL)
# - NEXT_PUBLIC_SITE_NAME (optional)
# - BOOTSTRAP_TOKEN (for admin bootstrap)
# - ADMIN_EMAIL (for admin bootstrap)
# - ADMIN_PASSWORD (for admin bootstrap)
# - ADMIN_NAME (for admin bootstrap)

# D1 Database binding:
# - Pages → Settings → D1 databases → Bind noteapp-db to DB
