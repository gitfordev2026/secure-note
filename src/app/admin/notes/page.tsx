"use client";

import * as React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileText, Search, Users } from "lucide-react";

export default function AdminNotesPage() {
  const [notes, setNotes] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState("");

  React.useEffect(() => {
    loadNotes();
  }, [search]);

  async function loadNotes() {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/notes?search=${encodeURIComponent(search)}`);
      const data = await res.json();
      setNotes(data.notes || []);
    } catch {
      setNotes([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">All Notes</h1>
          <p className="text-muted-foreground">Centralized note management</p>
        </div>
        <div className="flex items-center gap-2">
          <Input
            placeholder="Search notes by title or content..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-80"
          />
        </div>
      </div>

      <div className="rounded-xl border border-input bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-60">Title</TableHead>
              <TableHead className="w-40">Owner</TableHead>
              <TableHead className="w-32">Category</TableHead>
              <TableHead className="w-20">Pinned</TableHead>
              <TableHead className="w-20">Archived</TableHead>
              <TableHead className="w-32">Created</TableHead>
              <TableHead className="w-32">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="h-40 text-center">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
                </TableCell>
              </TableRow>
            ) : notes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-40 text-center text-muted-foreground">
                  No notes found.
                </TableCell>
              </TableRow>
            ) : (
              notes.map((n) => (
                <TableRow key={n.id} className="hover:bg-accent/50">
                  <TableCell className="font-medium text-foreground line-clamp-1">{n.title || "Untitled"}</TableCell>
                  <TableCell className="text-muted-foreground">{n.user?.name || "Unknown"} ({n.user?.email})</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{n.category || "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{n.isPinned ? "Yes" : "No"}</TableCell>
                  <TableCell className="text-muted-foreground">{n.isArchived ? "Yes" : "No"}</TableCell>
                  <TableCell className="text-muted-foreground text-xs">{new Date(n.createdAt).toLocaleDateString()}</TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="outline" asChild>
                      <Link href={`/admin/notes/${n.id}`}>View</Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
