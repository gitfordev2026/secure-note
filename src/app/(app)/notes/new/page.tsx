"use client";

import * as React from "react";
import { createNoteAction } from "@/server/actions/notes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import Link from "next/link";

export default function NewNotePage() {
  const [title, setTitle] = React.useState("");
  const [content, setContent] = React.useState("");
  const [category, setCategory] = React.useState("");
  const [tags, setTags] = React.useState("");
  const [isPinned, setIsPinned] = React.useState(false);
  const [isArchived, setIsArchived] = React.useState(false);
  const [isPending, setIsPending] = React.useState(false);
  const [message, setMessage] = React.useState<{ type: "success" | "error"; text: string } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsPending(true);
    setMessage(null);

    const tagList = tags.split(",").map((t) => t.trim()).filter(Boolean);

    const res = await createNoteAction({
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
      setMessage({ type: "success", text: "Note created successfully!" });
      setTitle("");
      setContent("");
      setCategory("");
      setTags("");
      setIsPinned(false);
      setIsArchived(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">New Note</h1>
          <p className="text-muted-foreground">Create a new note</p>
        </div>
        <Link href="/notes">
          <Button variant="outline">Back to notes</Button>
        </Link>
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
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Untitled note"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="content">Content</Label>
              <Textarea
                id="content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Write your note here..."
                className="min-h-[200px]"
                required
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Input id="category" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="e.g. Work" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tags">Tags</Label>
                <Input id="tags" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="tag1, tag2" />
                <p className="text-xs text-muted-foreground">Comma-separated</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="isPinned" checked={Boolean(isPinned)} onCheckedChange={setIsPinned} />
              <Label htmlFor="isPinned" className="text-sm text-muted-foreground">
                Pin this note
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="isArchived" checked={Boolean(isArchived)} onCheckedChange={setIsArchived} />
              <Label htmlFor="isArchived" className="text-sm text-muted-foreground">
                Archive this note
              </Label>
            </div>
          </CardContent>
        </Card>

        <Button type="submit" className="w-full" disabled={isPending}>
          {isPending ? "Creating..." : "Create Note"}
        </Button>
      </form>
    </div>
  );
}
