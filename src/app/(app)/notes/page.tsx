"use client";

import * as React from "react";
import { getNotesAction, deleteNoteAction, togglePinNoteAction } from "@/server/actions/notes";
import { Button } from "@/components/ui/button";
import { Plus, FileText, Trash2, Pin, Search, Download } from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Link from "next/link";

interface NoteItem {
  id: string;
  title: string;
  content: string;
  category: string | null;
  tags: string[] | null;
  isPinned: boolean;
  isArchived: boolean;
  updatedAt: Date;
  createdAt: Date;
}

export default function NotesPage() {
  const [notes, setNotes] = React.useState<NoteItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState("");
  const [category, setCategory] = React.useState("");
  const [archived, setArchived] = React.useState(false);
  const [exportFormat, setExportFormat] = React.useState<"json" | "markdown" | "text">("json");

  React.useEffect(() => {
    loadNotes();
  }, [search, category, archived]);

  async function loadNotes() {
    setLoading(true);
    const res = await getNotesAction({
      page: 1,
      pageSize: 50,
      search: search || undefined,
      category: category || undefined,
      archived,
    });
    setNotes(res.notes);
    setLoading(false);
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this note? This cannot be undone.")) return;
    await deleteNoteAction(id);
    loadNotes();
  }

  async function handleTogglePin(id: string, current: boolean) {
    await togglePinNoteAction(id);
    loadNotes();
  }

  async function handleExport() {
    const res = await fetch(`/api/notes/export?format=${exportFormat}`);
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `noteapp-export-${new Date().toISOString().split("T")[0]}.${exportFormat}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {archived ? "Archived Notes" : "All Notes"}
          </h1>
          <p className="text-muted-foreground">
            Manage your notes here.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2">
            <Label htmlFor="export-format" className="text-xs text-muted-foreground">
              Export:
            </Label>
            <Select value={exportFormat} onValueChange={setExportFormat}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Format" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="json">JSON</SelectItem>
                <SelectItem value="markdown">Markdown</SelectItem>
                <SelectItem value="text">Plain Text</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={handleExport} size="sm" variant="outline">
              <Download className="ml-2 h-4 w-4" />
            </Button>
          </div>
          <Link href="/notes/new">
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" /> New Note
            </Button>
          </Link>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search notes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-10 w-full pl-9 pr-3 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          />
        </div>
        <Button onClick={() => setArchived(!archived)}>
          {archived ? "Show Active" : "Show Archived"}
        </Button>
      </div>

      {loading ? (
        <div className="h-96 flex items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
        </div>
      ) : notes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <FileText className="h-12 w-12 text-muted-foreground mb-3 opacity-50" />
          <h3 className="text-lg font-medium text-foreground">No notes found</h3>
          <p className="text-muted-foreground">Create a new note to get started.</p>
          <Link href="/notes/new">
            <Button>Create Note</Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {notes.map((note) => (
            <Card key={note.id} className="hover:shadow-md transition-shadow group cursor-pointer" onClick={() => {}}>
              <CardHeader className="pb-3">
                <div className="flex flex-row items-center justify-between space-y-0 mb-2">
                  <CardTitle className="text-sm font-semibold line-clamp-1">{note.title || "Untitled"}</CardTitle>
                  {note.isPinned && (
                    <Pin className="h-4 w-4 text-primary" />
                  )}
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
                  {note.category && (
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-accent text-accent-foreground text-xs">
                      {note.category}
                    </span>
                  )}
                  <span>{new Date(note.updatedAt).toLocaleDateString()}</span>
                </div>
                <p className="line-clamp-2 text-sm text-muted-foreground mb-3">
                  {note.content}
                </p>
              </CardHeader>
              <CardFooter className="flex items-center justify-between gap-2">
                <Button size="sm" variant="outline" asChild onClick={(e) => { e.stopPropagation(); }}>
                  <Link href={`/notes/${note.id}`}>
                    View
                  </Link>
                </Button>
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={(e) => { e.stopPropagation(); handleTogglePin(note.id, note.isPinned); }}
                    className={note.isPinned ? "text-primary" : ""}
                  >
                    <Pin className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={(e) => { e.stopPropagation(); handleDelete(note.id); }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
