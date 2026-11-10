/**
 * Bootstrap script to create the first administrator account.
 *
 * Usage (local dev with D1):
 *   wrangler d1 execute noteapp-db --local --file=./scripts/bootstrap-admin.sql
 *   (then set ADMIN_EMAIL/ADMIN_PASSWORD env vars and run the seed below)
 *
 * Or run via wrangler script:
 *   npx wrangler d1 execute noteapp-db --command="INSERT ..."
 *
 * Secure approach:
 * 1. Set ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_NAME as Cloudflare Pages/secrets or wrangler secrets
 * 2. Run this script after deploying to create the first admin
 * 3. Unset/rotate the bootstrap password immediately after
 */

import { hashPassword } from "@/lib/auth";
import { createDb } from "@/db/connection";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

export default {
  async fetch(request: Request, env: any): Promise<Response> {
    // Protected by a bootstrap token to prevent unauthorized admin creation
    const auth = request.headers.get("Authorization");
    if (auth !== `Bearer ${env.BOOTSTRAP_TOKEN}`) {
      return new Response("Unauthorized", { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const email = searchParams.get("email") || env.ADMIN_EMAIL;
    const name = searchParams.get("name") || env.ADMIN_NAME || "Administrator";
    const password = searchParams.get("password") || env.ADMIN_PASSWORD;

    if (!email || !password) {
      return new Response("Missing email or password", { status: 400 });
    }

    const db = createDb(env);

    const [existing] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (existing) {
      return new Response("Admin already exists", { status: 409 });
    }

    const passwordHash = await hashPassword(password);

    await db.insert(users).values({
      name,
      email,
      passwordHash,
      role: "admin",
      status: "active",
    });

    return new Response("Admin created successfully", { status: 200 });
  },
};
