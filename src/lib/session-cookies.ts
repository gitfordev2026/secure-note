import { cookies } from "next/headers";

// Cookie name for the session token
export const SESSION_COOKIE_NAME = "noteapp_session";

/** Read the session token from cookies (server-side). */
export async function getSessionTokenFromCookies(): Promise<string | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    return token ?? null;
  } catch {
    return null;
  }
}

/** Set the session cookie on the response (server-side, within Server Action). */
export async function setSessionCookie(token: string, rememberMe = false): Promise<void> {
  try {
    const cookieStore = await cookies();
    const maxAge = rememberMe ? 30 * 24 * 60 * 60 : 7 * 24 * 60 * 60; // 30d or 7d
    cookieStore.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge,
    });
  } catch {
    // cookies() may not be available outside of a Server Action/Route Handler context
  }
}

/** Clear the session cookie. */
export async function clearSessionCookie(): Promise<void> {
  try {
    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE_NAME, "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });
  } catch {
    // ignore
  }
}
