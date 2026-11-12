export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { forgotPasswordSchema } from "@/validations/password-reset";
import { createDb } from "@/db/connection";
import { users, passwordResetTokens } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { generateCsrfToken } from "@/lib/csrf";
import { hashSessionToken } from "@/lib/auth";

const RESET_TOKEN_EXPIRY_MS = 60 * 60 * 1000; // 1 hour

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = forgotPasswordSchema.safeParse(body);
    if (!parsed.success) {
      const first = parsed.error.issues?.[0];
      return NextResponse.json(
        { error: first ? (first as any).message : "Invalid input" },
        { status: 400 },
      );
    }

    const { email } = parsed.data;

    const db = createDb({
      DB: (process.env as any).DB,
      SESSION_SECRET: process.env.SESSION_SECRET || "",
    });

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    // Always return success to prevent email enumeration
    if (!user) {
      return NextResponse.json({
        success: true,
        message: "If an account exists, a reset link has been sent",
      });
    }

    // Invalidate any existing unused reset tokens for this user
    await db
      .update(passwordResetTokens)
      .set({ usedAt: new Date() })
      .where(
        and(
          eq(passwordResetTokens.userId, user.id),
          eq(passwordResetTokens.usedAt, null as any),
        ),
      );

    // Generate reset token
    const resetToken = generateCsrfToken();
    const tokenHash = await hashSessionToken(resetToken);
    const expiresAt = new Date(Date.now() + RESET_TOKEN_EXPIRY_MS);

    await db.insert(passwordResetTokens).values({
      userId: user.id,
      tokenHash,
      expiresAt,
    });

    const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3081"}/auth/reset-password?token=${resetToken}`;

    // In production, send email here. For now, return the URL (dev only)
    // TODO: Integrate with email provider (Resend, SendGrid, etc.)
    if (process.env.NODE_ENV === "development") {
      return NextResponse.json({
        success: true,
        message: "Reset token generated (dev mode)",
        resetUrl, // Remove this in production
      });
    }

    return NextResponse.json({
      success: true,
      message: "If an account exists, a reset link has been sent",
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Forgot password failed" }, { status: 500 });
  }
}
