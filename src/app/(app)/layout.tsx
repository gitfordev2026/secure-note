"use client";

import * as React from "react";
import { useSession } from "@/hooks/use-session";
import { Sidebar } from "@/components/layout/sidebar";
import { TopBar } from "@/components/layout/sidebar";
import { Toast } from "@/components/ui/toaster";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useSession();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar isAdmin={user.role === "admin"} />
      <div className="flex-1 ml-64 relative">
        <TopBar isAdmin={user.role === "admin"} />
        <main className="px-6 py-8">{children}</main>
      </div>
      <Toast />
    </div>
  );
}
