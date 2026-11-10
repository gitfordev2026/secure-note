"use client";

import * as React from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface UserPageParams {
  params: Promise<{ id: string }>;
}

export default function AdminUserDetailPage({ params }: UserPageParams) {
  const [user, setUser] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const idRef = React.useRef<string>("");

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      const p = await params;
      idRef.current = p.id;
      try {
        const res = await fetch(`/api/admin/users/${p.id}`);
        if (cancelled) return;
        if (!res.ok) {
          setLoading(false);
          return;
        }
        const data = await res.json();
        setUser(data.user);
      } catch {
        // ignore
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [params]);

  async function updateStatus(status: string) {
    await fetch(`/api/admin/users/${idRef.current}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    const res = await fetch(`/api/admin/users/${idRef.current}`);
    const data = await res.json();
    setUser(data.user);
  }

  async function updateRole(role: string) {
    await fetch(`/api/admin/users/${idRef.current}/role`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    const res = await fetch(`/api/admin/users/${idRef.current}`);
    const data = await res.json();
    setUser(data.user);
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
      </div>
    );
  }
  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Link href="/admin/users">
          <Button>Back to users</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <Link href="/admin/users">
          <Button variant="outline" size="sm" className="flex items-center gap-2">
            <ChevronLeft className="h-4 w-4" /> Back to users
          </Button>
        </Link>
        <h1 className="text-2xl font-bold text-foreground">{user.name}</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Account details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground uppercase">Name</label>
              <p className="text-foreground">{user.name}</p>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground uppercase">Email</label>
              <p className="text-foreground">{user.email}</p>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground uppercase">Role</label>
              <Badge variant={user.role === "admin" ? "default" : "outline"} onClick={() => updateRole(user.role === "admin" ? "user" : "admin")} className="cursor-pointer">
                {user.role}
              </Badge>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground uppercase">Status</label>
              <Badge variant={user.status === "active" ? "default" : "destructive"} onClick={() => updateStatus(user.status === "active" ? "disabled" : "active")} className="cursor-pointer">
                {user.status}
              </Badge>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground uppercase">Total Notes</label>
              <p className="text-foreground font-medium">{user.noteCount}</p>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground uppercase">Joined</label>
              <p className="text-foreground">{new Date(user.createdAt).toLocaleDateString()}</p>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground uppercase">Last Login</label>
              <p className="text-foreground">{user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : "Never"}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>User's notes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Updated</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell colSpan={4} className="h-32 text-center text-muted-foreground">
                    Note list coming soon — use /admin/notes for centralized note management.
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
