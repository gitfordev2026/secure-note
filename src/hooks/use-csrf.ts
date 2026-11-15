"use client";

import * as React from "react";

interface CsrfState {
  token: string | null;
  loading: boolean;
  error: string | null;
}

export function useCsrf() {
  const [state, setState] = React.useState<CsrfState>({
    token: null,
    loading: true,
    error: null,
  });

  const fetchCsrfToken = React.useCallback(async () => {
    try {
      const res = await fetch("/api/csrf-token", {
        method: "GET",
        credentials: "include",
      });
      if (!res.ok) {
        throw new Error("Failed to fetch CSRF token");
      }
      const data = await res.json();
      setState({ token: data.csrfToken, loading: false, error: null });
    } catch (e: any) {
      setState({ token: null, loading: false, error: e.message || "Unknown error" });
    }
  }, []);

  // Fetch CSRF token on mount
  React.useEffect(() => {
    fetchCsrfToken();
  }, [fetchCsrfToken]);

  return {
    token: state.token,
    loading: state.loading,
    error: state.error,
    refresh: fetchCsrfToken,
  };
}
