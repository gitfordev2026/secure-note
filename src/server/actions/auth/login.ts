"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { loginSchema, type LoginInput } from "@/validations";
import { verifyPassword, createSession } from "@/lib/auth";
import { setSessionCookie } from "@/lib/session-cookies";
import { createDb } from "@/db/connection";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function loginAction(formData: FormData) {
  const raw = {
    email: formData.get("email"),
    password: formData.get("password"),
    rememberMe: formData.get("rememberMe") === "on",
  };

  const parsed = loginSchema.safeParse(raw);
  if (!parsed.success) {
    const first = parsed.error.issues?.[0];
    return { error: first ? (first as any).message : "Invalid input" };
  }

  const { email, password, rememberMe } = parsed.data;

  const dbInst = createDb({
    DB: (process.env as any).DB,
    SESSION_SECRET: process.env.SESSION_SECRET || "",
  });

  const [user] = await dbInst
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (!user) {
    return { error: "Invalid email or password" };
  }

  if (user.status === "disabled") {
    return { error: "This account has been disabled. Contact support." };
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    return { error: "Invalid email or password" };
  }

  const { token } = await createSession(
    { DB: (process.env as any).DB, SESSION_SECRET: process.env.SESSION_SECRET || "" },
    user.id,
  );

  setSessionCookie(token, rememberMe);

  // Update last login
  await dbInst
    .update(users)
    .set({ lastLoginAt: new Date() })
    .where(eq(users.id, user.id));

  const redirectTo = (user.role === "admin" ? "/admin" : "/dashboard");
  redirect(redirectTo);
}
