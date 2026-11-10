"use client";

import * as React from "react";
import { useState } from "react";
import { createNoteAction } from "@/server/actions/notes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import Link from "next/link";
import { RichTextEditor } from "@/components/notes/rich-text-editor";
import { Plus, Sparkles, ArrowRight, Copy } from "lucide-react";

interface AIEnhancementState {
  loading: boolean;
  result: {
    summary?: string;
    tags?: string[];
    title?: string;
  } | null;
  error?: string;
}

export default function NewNotePage() {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("");
  const [tags, setTags] = useState("");
  const [isPinned, setIsPinned] = useState(false);
  const [isArchived, setIsArchived] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [aiState, setAIState] = useState<AIEnhancementState>({
    loading: false,
    result: null,
    error: undefined,
  });
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

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
      setAIState({ loading: false, result: null, error: undefined });
    }
  }

  async function handleAIEnhance() {
    if (!content.trim()) {
      setAIState({ loading: false, result: null, error: "Please write some content first" });
      return;
    }

    setAIState({ loading: true, result: null, error: undefined });

    try {
      const res = await fetch("/api/ai/enhance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });

      const data = await res.json();

      if (!res.ok) {
        setAIState({ loading: false, result: null, error: data.error || "AI enhancement failed" });
        return;
      }

      setAIState({
        loading: false,
        result: {
          summary: data.summary?.summary,
          tags: data.tags?.tags,
          title: data.title?.title,
        },
        error: undefined,
      });
    } catch {
      setAIState({ loading: false, result: null, error: "AI enhancement failed" });
    }
  }

  function applyAIResult() {
    if (!aiState.result) return;

    const { title: aiTitle, tags: aiTags, summary: aiSummary } = aiState.result;

    if (aiTitle && !title) {
      setTitle(aiTitle);
    }

    if (aiTags && aiTags.length > 0) {
      setTags(aiTags.join(", "));
    }

    if (aiSummary) {
      setContent((prev) => (prev ? `${prev}\n\n---\n\n${aiSummary}` : aiSummary));
    }

    setAIState({ loading: false, result: null, error: undefined });
  }

  const tagList = tags.split(",").map((t) => t.trim()).filter(Boolean);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">New Note</h1>
          <p className="text-muted-foreground">Create a new note with rich text formatting</p>
        </div>
        <Link href="/notes">
          <Button variant="outline">
            <ArrowRight className="ml-2 h-4 w-4" /> Back to notes
          </Button>
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
              <div className="flex items-center gap-2">
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Untitled note"
                  required
                  className="flex-1"
                />
                {aiState.result?.title && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setTitle(aiState.result!.title!)}
                    disabled={!aiState.result.title}
                  >
                    <Sparkles className="h-4 w-4" /> AI
                  </Button>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="content">Content</Label>
              <RichTextEditor
                value={content}
                onChange={setContent}
                placeholder="Write your note here..."
              />
              <div className="flex items-center gap-2 mt-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleAIEnhance}
                  disabled={aiState.loading || !content.trim()}
                >
                  {aiState.loading ? "Enhancing..." : "✨ AI Enhance"}
                </Button>
                {aiState.result && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={applyAIResult}
                  >
                    <Copy className="h-4 w-4 ml-2" /> Apply Suggestions
                  </Button>
                )}
              </div>
              {aiState.error && (
                <div className="rounded-md bg-destructive/10 p-3 text-destructive text-sm">
                  {aiState.error}
                </div>
              )}
              {aiState.result && (
                <div className="mt-3 p-3 rounded-md bg-accent/50 border border-accent/20">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium text-foreground">AI Suggestions</span>
                  </div>
                  {aiState.result.summary && (
                    <div className="mb-2">
                      <div className="text-xs font-medium text-muted-foreground mb-1">Summary</div>
                      <p className="text-sm text-muted-foreground">{aiState.result.summary}</p>
                    </div>
                  )}
                  {aiState.result.tags && aiState.result.tags.length > 0 && (
                    <div className="mb-2">
                      <div className="text-xs font-medium text-muted-foreground mb-1">Suggested Tags</div>
                      <div className="flex gap-1 flex-wrap">
                        {aiState.result.tags.map((tag) => (
                          <span key={tag} className="px-2 py-0.5 rounded text-xs bg-primary/10 text-primary">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Input
                  id="category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="e.g. Work"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tags">Tags</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="tags"
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                    placeholder="tag1, tag2"
                  />
                  {aiState.result?.tags && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const newTags = [...new Set([...tagList, ...(aiState.result?.tags || [])])];
                        setTags(newTags.join(", "));
                      }}
                    >
                      <Plus className="h-4 w-4" /> AI Tags
                    </Button>
                  )}
                </div>
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
