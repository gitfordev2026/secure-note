"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { destroySession } from "@/lib/auth";
import { clearSessionCookie } from "@/lib/session-cookies";

export async function logoutAction() {
  const token = (await cookies()).get("noteapp_session")?.value;
  if (token) {
    try {
      await destroySession(
        { DB: (process.env as any).DB, SESSION_SECRET: process.env.SESSION_SECRET || "" },
        token,
      );
    } catch {
      // ignore errors during logout
    }
  }
  clearSessionCookie();
  redirect("/login");
}
