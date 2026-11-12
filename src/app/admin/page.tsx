"use client";

import * as React from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, FileText, ShieldCheck, Settings, Activity, LayoutDashboard } from "lucide-react";

export default function AdminPage() {
  const [stats, setStats] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    fetch("/api/admin/stats")
      .then((r) => r.json())
      .then((data) => {
        setStats(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Admin Dashboard</h1>
          <p className="text-muted-foreground">Centralized control for NoteApp</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard title="Total Users" value={stats?.totalUsers ?? "--"} icon={<Users className="h-5 w-5" />} />
        <StatCard title="Total Notes" value={stats?.totalNotes ?? "--"} icon={<FileText className="h-5 w-5" />} />
        <StatCard title="Active Users" value={stats?.activeUsers ?? "--"} icon={<Activity className="h-5 w-5" />} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Recently registered users</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(stats?.recentUsers || []).map((u: any) => (
              <div key={u.id} className="flex items-center justify-between text-sm p-2 border-b border-input last:border-0">
                <div>
                  <div className="font-medium text-foreground">{u.name}</div>
                  <div className="text-xs text-muted-foreground">{u.email}</div>
                </div>
                <div className="text-xs text-muted-foreground">{new Date(u.createdAt).toLocaleDateString()}</div>
              </div>
            ))}
            {(stats?.recentUsers?.length ?? 0) === 0 && <p className="text-muted-foreground text-sm">No users yet.</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Recently created notes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(stats?.recentNotes || []).map((n: any) => (
              <div key={n.id} className="flex items-center justify-between text-sm p-2 border-b border-input last:border-0">
                <div>
                  <div className="font-medium text-foreground line-clamp-1">{n.title || "Untitled"}</div>
                  <div className="text-xs text-muted-foreground">User ID: {n.userId}</div>
                </div>
                <div className="text-xs text-muted-foreground">{new Date(n.createdAt).toLocaleDateString()}</div>
              </div>
            ))}
            {(stats?.recentNotes?.length ?? 0) === 0 && <p className="text-muted-foreground text-sm">No notes yet.</p>}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <AdminCard title="Users" href="/admin/users" icon={<Users className="h-5 w-5" />} description="Manage registered users" />
        <AdminCard title="All Notes" href="/admin/notes" icon={<FileText className="h-5 w-5" />} description="Centralized note management" />
        <AdminCard title="Audit Logs" href="/admin/audit-logs" icon={<ShieldCheck className="h-5 w-5" />} description="Administrative action history" />
        <AdminCard title="Settings" href="/admin/settings" icon={<Settings className="h-5 w-5" />} description="Application configuration" />
      </div>
    </div>
  );
}

function StatCard({ title, value, icon }: { title: string; value: React.ReactNode; icon: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold">{value}</div>
      </CardContent>
    </Card>
  );
}

function AdminCard({ title, href, icon, description }: { title: string; href: string; icon: React.ReactNode; description: string }) {
  return (
    <Card className="hover:shadow-md transition-shadow cursor-pointer group" onClick={() => { window.location.href = href; }}>
      <CardHeader className="pb-3">
        <div className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
          <div className="p-2 rounded-md bg-accent/50 text-accent-foreground">{icon}</div>
        </div>
        <CardDescription className="mt-2 text-sm">{description}</CardDescription>
      </CardHeader>
    </Card>
  );
}
