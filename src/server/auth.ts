"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { validateSession, destroySession, rotateSession } from "@/lib/auth";
import { clearSessionCookie } from "@/lib/session-cookies";
import { createDb } from "@/db/connection";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: "user" | "admin";
  status: "active" | "disabled";
};

/** Get the authenticated user from the session cookie. Returns null if not authenticated. */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const token = (await cookies()).get("noteapp_session")?.value;
  if (!token) return null;

  const env = {
    DB: (process.env as any).DB,
    SESSION_SECRET: process.env.SESSION_SECRET || "",
  };

  const result = await validateSession(env, token);
  if (!result) {
    clearSessionCookie();
    return null;
  }

  // Session token rotation: if token is old, rotate it
  if (result.needsRotation) {
    try {
      await rotateSession(env, token);
    } catch {
      // Ignore rotation errors - session is still valid
    }
  }

  return {
    id: result.user.id,
    name: result.user.name,
    email: result.user.email,
    role: result.user.role as "user" | "admin",
    status: result.user.status as "active" | "disabled",
  };
}

/** Require authentication; redirect to login if not authenticated. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  return user;
}

/** Require admin role; redirect or throw if not admin. */
export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role !== "admin") {
    redirect("/dashboard");
  }
  return user;
}
