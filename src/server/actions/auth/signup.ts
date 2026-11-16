"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { signupSchema, type SignupInput } from "@/validations";
import { hashPassword, createSession } from "@/lib/auth";
import { setSessionCookie } from "@/lib/session-cookies";
import { createDb } from "@/db/connection";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { checkRateLimit, rateLimiters } from "@/lib/rate-limit";

export async function signupAction(formData: FormData) {
  // Rate limiting: 5 requests per minute per email
  const email = formData.get("email") as string;
  if (email) {
    const rateLimitResult = checkRateLimit(email, rateLimiters.auth);
    if (!rateLimitResult.allowed) {
      return {
        error: "Too many signup attempts. Please try again later.",
        retryAfter: rateLimitResult.retryAfter
      };
    }
  }

  const raw = {
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  };

  const parsed = signupSchema.safeParse(raw);
  if (!parsed.success) {
    const first = parsed.error.issues?.[0];
    return { error: first ? (first as any).message : "Invalid input" };
  }

  const { name, email: parsedEmail, password } = parsed.data;

  const dbInst = createDb({
    DB: (process.env as any).DB,
    SESSION_SECRET: process.env.SESSION_SECRET || "",
  });

  // Check for duplicate email
  const [existing] = await dbInst
    .select()
    .from(users)
    .where(eq(users.email, parsedEmail))
    .limit(1);

  if (existing) {
    return { error: "An account with this email already exists" };
  }

  // Hash password and create user
  const passwordHash = await hashPassword(password);

  const [user] = await dbInst
    .insert(users)
    .values({ name, email: parsedEmail, passwordHash, role: "user", status: "active" })
    .returning();

  // Create session
  const { token } = await createSession(
    { DB: (process.env as any).DB, SESSION_SECRET: process.env.SESSION_SECRET || "" },
    user.id,
  );

  setSessionCookie(token, false);

  redirect("/dashboard");
}
