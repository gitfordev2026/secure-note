"use client";

import * as React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Trash2, Edit3 } from "lucide-react";

interface NoteParams {
  params: Promise<{ id: string }>;
}

export default function NotePage({ params }: NoteParams) {
  const [note, setNote] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(false);
  const idRef = React.useRef<string>("");

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      const p = await params;
      idRef.current = p.id;
      try {
        const res = await fetch(`/api/notes/${p.id}`);
        const data = await res.json();
        if (cancelled) return;
        if (data.error || !data.note) {
          setError(true);
          return;
        }
        setNote(data.note);
      } catch {
        setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [params]);

  async function handleDelete() {
    if (!confirm("Delete this note? This cannot be undone.")) return;
    try {
      await fetch("/api/notes/" + idRef.current, { method: "DELETE" });
      window.location.href = "/notes";
    } catch {
      alert("Failed to delete note.");
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
      </div>
    );
  }
  if (error || !note) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <h2 className="text-lg font-medium text-foreground">Note not found</h2>
          <Link href="/notes" className="mt-4 inline-flex items-center gap-2 text-primary underline decoration-primary decoration-2">
            Back to notes
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <Link href="/notes">
          <Button variant="outline" size="sm" className="flex items-center gap-2">
            ← Back to notes
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div>
            <h1 className="text-2xl font-bold text-foreground">{note.title || "Untitled"}</h1>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>{new Date(note.createdAt).toLocaleString()}</span>
              <span>•</span>
              <span>Updated {new Date(note.updatedAt).toLocaleString()}</span>
            </div>
          </div>
          <div className="flex gap-2">
            <Link href={`/notes/${note.id}/edit`}>
              <Button size="sm">Edit</Button>
            </Link>
            <Button size="sm" variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="prose prose-sm max-w-none text-muted-foreground whitespace-pre-wrap break-words">
            {note.content}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
