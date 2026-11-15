"use client";

import * as React from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Mail, Lock, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { useCsrf } from "@/hooks/use-csrf";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const { token: csrfToken, loading: csrfLoading, refresh: refreshCsrf } = useCsrf();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (csrfToken) {
        headers["x-csrf-token"] = csrfToken;
      }

      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers,
        body: JSON.stringify({ email }),
      });
      const data = await res.json();

      if (!res.ok) {
        refreshCsrf();
        setError(data.error || "Failed to send reset instructions");
        setLoading(false);
        return;
      }

      setSuccess("If an account exists, a reset link has been sent to your email.");
      setLoading(false);
    } catch {
      setError("An unexpected error occurred");
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Forgot password</CardTitle>
          <CardDescription>
            Enter your email and we'll send you instructions to reset your password.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                placeholder="you@example.com"
                required
              />
            </div>
            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-destructive text-sm">{error}</div>
            )}
            {success && (
              <div className="rounded-md bg-green-50 p-3 text-green-800 text-sm">{success}</div>
            )}
            {csrfLoading && (
              <div className="flex items-center justify-center py-2">
                <span className="text-xs text-muted-foreground">Initializing security...</span>
              </div>
            )}
            <Button type="submit" className="w-full" disabled={loading || !csrfToken || csrfLoading}>
              {loading ? "Sending..." : "Send reset instructions"}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col gap-2">
          <p className="text-sm text-muted-foreground text-center">
            Remember your password?{" "}
            <Link href="/login" className="text-primary underline decoration-primary decoration-2">
              Sign in
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
