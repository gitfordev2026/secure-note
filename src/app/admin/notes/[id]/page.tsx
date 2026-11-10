"use client";

import * as React from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface NotePageParams {
  params: Promise<{ id: string }>;
}

export default function AdminNoteDetailPage({ params }: NotePageParams) {
  const [note, setNote] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const idRef = React.useRef<string>("");

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      const p = await params;
      idRef.current = p.id;
      try {
        const res = await fetch(`/api/admin/notes/${p.id}`);
        if (cancelled) return;
        if (!res.ok) { setLoading(false); return; }
        const data = await res.json();
        setNote(data.note);
      } catch {}
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [params]);

  async function deleteNote() {
    if (!confirm("Delete this note? This cannot be undone.")) return;
    await fetch(`/api/admin/notes/${idRef.current}`, { method: "DELETE" });
    window.location.href = "/admin/notes";
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
      </div>
    );
  }
  if (!note) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Link href="/admin/notes"><Button>Back to notes</Button></Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <Link href="/admin/notes">
          <Button variant="outline" size="sm" className="flex items-center gap-2">
            <ChevronLeft className="h-4 w-4" /> Back to notes
          </Button>
        </Link>
        <h1 className="text-2xl font-bold text-foreground">Note: {note.title || "Untitled"}</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Note details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground uppercase">Owner</label>
              <p className="text-foreground">{note.user?.name || "Unknown"}</p>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground uppercase">Owner Email</label>
              <p className="text-foreground">{note.user?.email || "—"}</p>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground uppercase">Category</label>
              <p className="text-foreground">{note.category || "—"}</p>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground uppercase">Status</label>
              <div className="flex gap-2">
                <span className={`px-2 py-1 rounded text-xs font-medium ${note.isPinned ? "bg-primary/10 text-primary" : "bg-accent text-accent-foreground"}`}>
                  {note.isPinned ? "Pinned" : "Not pinned"}
                </span>
                <span className={`px-2 py-1 rounded text-xs font-medium ${note.isArchived ? "bg-destructive/10 text-destructive" : "bg-accent text-accent-foreground"}`}>
                  {note.isArchived ? "Archived" : "Active"}
                </span>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground uppercase">Created</label>
              <p className="text-foreground">{new Date(note.createdAt).toLocaleString()}</p>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground uppercase">Updated</label>
              <p className="text-foreground">{new Date(note.updatedAt).toLocaleString()}</p>
            </div>
          </div>
          <div className="pt-4 border-t border-input">
            <label className="text-xs font-medium text-muted-foreground uppercase block mb-2">Content</label>
            <div className="whitespace-pre-wrap break-words text-muted-foreground">{note.content}</div>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-2">
        <Button variant="outline" onClick={deleteNote} className="w-full">
          Delete Note
        </Button>
      </div>
    </div>
  );
}
