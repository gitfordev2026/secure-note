"use client";

import * as React from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AdminAuditLogsPage() {
  const [logs, setLogs] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    fetch("/api/admin/audit-logs")
      .then((r) => r.json())
      .then((data) => { setLogs(data.logs || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5" />
          <h1 className="text-2xl font-bold text-foreground">Audit Logs</h1>
        </div>
        <Link href="/admin">
          <Button variant="outline">Back to dashboard</Button>
        </Link>
      </div>

      <p className="text-muted-foreground">All administrative actions are recorded here for accountability.</p>

      <div className="rounded-xl border border-input bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-40">Admin</TableHead>
              <TableHead className="w-40">Action</TableHead>
              <TableHead className="w-32">Target Type</TableHead>
              <TableHead className="w-32">Target ID</TableHead>
              <TableHead>Details</TableHead>
              <TableHead className="w-40">Time</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="h-40 text-center">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
                </TableCell>
              </TableRow>
            ) : logs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-40 text-center text-muted-foreground">
                  No audit logs yet.
                </TableCell>
              </TableRow>
            ) : (
              logs.map((l) => (
                <TableRow key={l.id} className="hover:bg-accent/50">
                  <TableCell className="font-medium text-foreground">{l.adminId || "System"}</TableCell>
                  <TableCell className="text-muted-foreground">{l.action}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{l.targetType}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{l.targetId || "—"}</TableCell>
                  <TableCell className="text-muted-foreground text-xs">{l.details ? JSON.stringify(l.details) : "—"}</TableCell>
                  <TableCell className="text-muted-foreground text-xs">{new Date(l.createdAt).toLocaleString()}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
