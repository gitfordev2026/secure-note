"use client";

import * as React from "react";

interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
}

export function useSession() {
  const [user, setUser] = React.useState<SessionUser | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((data: { user?: SessionUser | null }) => {
        if (cancelled) return;
        setUser(data.user ?? null);
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { user, loading };
}
