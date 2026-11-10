export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { resetPasswordSchema } from "@/validations/password-reset";
import { hashPassword, hashSessionToken } from "@/lib/auth";
import { createDb } from "@/db/connection";
import { users, passwordResetTokens } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = resetPasswordSchema.safeParse(body);
    if (!parsed.success) {
      const first = parsed.error.issues?.[0];
      return NextResponse.json(
        { error: first ? (first as any).message : "Invalid input" },
        { status: 400 },
      );
    }

    const { token, password } = parsed.data;

    const db = createDb({
      DB: (process.env as any).DB,
      SESSION_SECRET: process.env.SESSION_SECRET || "",
    });

    const tokenHash = await hashSessionToken(token);

    const [resetToken] = await db
      .select()
      .from(passwordResetTokens)
      .where(eq(passwordResetTokens.tokenHash, tokenHash))
      .limit(1);

    if (!resetToken) {
      return NextResponse.json({ error: "Invalid or expired reset token" }, { status: 400 });
    }

    if (resetToken.usedAt) {
      return NextResponse.json({ error: "Reset token already used" }, { status: 400 });
    }

    const now = new Date();
    if (new Date(resetToken.expiresAt) < now) {
      return NextResponse.json({ error: "Reset token expired" }, { status: 400 });
    }

    // Hash new password and update user
    const passwordHash = await hashPassword(password);

    await db
      .update(users)
      .set({ passwordHash, updatedAt: new Date() })
      .where(eq(users.id, resetToken.userId));

    // Mark token as used
    await db
      .update(passwordResetTokens)
      .set({ usedAt: new Date() })
      .where(eq(passwordResetTokens.id, resetToken.id));

    // Destroy all existing sessions for this user (force re-login)
    const { sessions } = await import("@/db/schema");
    await db.delete(sessions).where(eq(sessions.userId, resetToken.userId));

    return NextResponse.json({
      success: true,
      message: "Password reset successful. Please log in with your new password.",
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Reset password failed" }, { status: 500 });
  }
}
