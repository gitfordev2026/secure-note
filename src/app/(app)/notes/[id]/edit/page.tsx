"use client";

import * as React from "react";
import { getNoteByIdAction, updateNoteAction } from "@/server/actions/notes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

interface NoteParams {
  params: Promise<{ id: string }>;
}

export default function EditNotePage({ params }: NoteParams) {
  const [note, setNote] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [title, setTitle] = React.useState("");
  const [content, setContent] = React.useState("");
  const [category, setCategory] = React.useState("");
  const [tags, setTags] = React.useState("");
  const [isPinned, setIsPinned] = React.useState(false);
  const [isArchived, setIsArchived] = React.useState(false);
  const [isPending, setIsPending] = React.useState(false);
  const [message, setMessage] = React.useState<{ type: "success" | "error"; text: string } | null>(null);

  const id = React.useMemo(() => {
    // params will be resolved
    return "";
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      const p = await params;
      const res = await getNoteByIdAction(p.id);
      if (cancelled) return;
      if (res.error) {
        notFound();
        return;
      }
      const n = res.note;
      if (!n) return;
      setNote(n);
      setTitle(n.title);
      setContent(n.content);
      setCategory(n.category || "");
      setTags(Array.isArray(n.tags) ? n.tags.join(", ") : (n.tags || ""));
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [params]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsPending(true);
    setMessage(null);

    const p = await params;
    const tagList = tags.split(",").map((t) => t.trim()).filter(Boolean);

    const res = await updateNoteAction(p.id, {
      title,
      content,
      category: category || undefined,
      tags: tagList,
      isPinned,
      isArchived,
    });

    setIsPending(false);
    if (res.error) {
      setMessage({ type: "error", text: res.error });
    } else {
      setMessage({ type: "success", text: "Note updated!" });
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
      </div>
    );
  }
  if (!note) return notFound();

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <Link href={`/notes/${id}`}>
          <Button variant="outline" size="sm" className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
        </Link>
        <h1 className="text-2xl font-bold text-foreground">Edit Note</h1>
      </div>

      {message && (
        <div className={`rounded-md p-4 text-sm ${
          message.type === "success"
            ? "bg-green-50 border border-green-200 text-green-800"
            : "bg-destructive/10 border border-destructive/20 text-destructive"
        }`}>
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Note details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="content">Content</Label>
              <Textarea id="content" value={content} onChange={(e) => setContent(e.target.value)} className="min-h-[250px]" required />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Input id="category" value={category} onChange={(e) => setCategory(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tags">Tags</Label>
                <Input id="tags" value={tags} onChange={(e) => setTags(e.target.value)} />
                <p className="text-xs text-muted-foreground">Comma-separated</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="isPinned" checked={Boolean(isPinned)} onCheckedChange={setIsPinned} />
              <Label htmlFor="isPinned" className="text-sm text-muted-foreground">Pin this note</Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="isArchived" checked={Boolean(isArchived)} onCheckedChange={setIsArchived} />
              <Label htmlFor="isArchived" className="text-sm text-muted-foreground">Archive this note</Label>
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-2">
          <Button type="submit" className="flex-1" disabled={isPending}>
            {isPending ? "Saving..." : "Save changes"}
          </Button>
          <Link href={`/notes/${id}`}>
            <Button variant="outline">Cancel</Button>
          </Link>
        </div>
      </form>
    </div>
  );
}
