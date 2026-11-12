/**
 * AI Features for NoteApp
 * 
 * Provides smart summarization, tag generation, and title generation
 * using the Cloudflare AI binding or OpenAI-compatible endpoints.
 * 
 * In production, set CLOUDFLARE_AI binding in wrangler.toml / Pages env.
 * Falls back to local heuristics when no AI provider is configured.
 */

import type { Env } from "@/types";

export interface AISummaryResult {
  summary: string;
  keyPoints: string[];
  readingTime: number;
}

export interface AITagResult {
  tags: string[];
  confidence: number;
}

export interface AITitleResult {
  title: string;
  confidence: number;
}

/** Estimate reading time based on word count */
function estimateReadingTime(text: string): number {
  const wordsPerMinute = 200;
  const wordCount = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.ceil(wordCount / wordsPerMinute);
}

/** Generate a smart summary of note content */
export async function generateSummary(
  content: string,
  env?: Env
): Promise<AISummaryResult> {
  // Try Cloudflare AI first
  if (env?.AI) {
    try {
      const summaryResp = await env.AI.run("@cf/facebook/bart-large-cnn", {
        input_text: content,
        max_length: 150,
      });

      const keyPointsResp = await env.AI.run("@cf/facebook/bart-large-cnn", {
        input_text: content,
        max_length: 300,
      });

      return {
        summary: (summaryResp as any).summary || "",
        keyPoints: extractKeyPoints(keyPointsResp as any),
        readingTime: estimateReadingTime(content),
      };
    } catch {
      // Fall through to heuristic fallback
    }
  }

  // Heuristic fallback: extract first paragraph + first sentence of each subsequent paragraph
  const paragraphs = content.split(/\n\s*\n/).filter((p) => p.trim());
  const summary = paragraphs.slice(0, 3).join(" ").substring(0, 200);
  const keyPoints = paragraphs.map((p) => p.trim().substring(0, 80)).slice(0, 5);

  return {
    summary: summary || "No content to summarize",
    keyPoints: keyPoints.filter(Boolean),
    readingTime: estimateReadingTime(content),
  };
}

/** Generate smart tags from content */
export async function generateTags(
  content: string,
  env?: Env
): Promise<AITagResult> {
  // Try Cloudflare AI embeddings + clustering (simplified)
  if (env?.AI) {
    try {
      const tagResp = await env.AI.run("@cf/meta/llama-3-8b-instruct", {
        messages: [
          {
            role: "system",
            content: "Extract 3-5 relevant tags from the following note content. Return only comma-separated tags, no explanation.",
          },
          { role: "user", content: content.substring(0, 2000) },
        ],
      });

      const tagsText = (tagResp as any).response || "";
      const tags = tagsText.split(",").map((t: string) => t.trim()).filter(Boolean);

      if (tags.length > 0) {
        return { tags, confidence: 0.85 };
      }
    } catch {
      // Fall through to heuristic
    }
  }

  // Heuristic fallback: extract capitalized words and common nouns
  const words = content.match(/\b[A-Z][a-z]+\b/g) || [];
  const tagCounts: Record<string, number> = {};
  words.forEach((w) => {
    tagCounts[w] = (tagCounts[w] || 0) + 1;
  });

  const tags = Object.entries(tagCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([tag]) => tag);

  return { tags, confidence: 0.6 };
}

/** Generate a title from content */
export async function generateTitle(
  content: string,
  env?: Env
): Promise<AITitleResult> {
  if (!content.trim()) {
    return { title: "Untitled", confidence: 1.0 };
  }

  if (env?.AI) {
    try {
      const titleResp = await env.AI.run("@cf/meta/llama-3-8b-instruct", {
        messages: [
          {
            role: "system",
            content: "Generate a concise title (max 8 words) for the following note content. Return only the title, no explanation.",
          },
          { role: "user", content: content.substring(0, 2000) },
        ],
      });

      const title = (titleResp as any).response?.trim();
      if (title) {
        return { title, confidence: 0.9 };
      }
    } catch {
      // Fall through
    }
  }

  // Heuristic: use first sentence or first line
  const firstLine = content.trim().split("\n")[0];
  const firstSentence = content.trim().split(/[.!?]+/)[0];
  const title = (firstSentence || firstLine || "Untitled").substring(0, 80);

  return { title: title || "Untitled", confidence: 0.5 };
}

/** Extract key points from AI response */
function extractKeyPoints(response: any): string[] {
  if (!response) return [];
  const text = response.summary || response.response || "";
  return text
    .split(/[.!?\n]+/)
    .map((s: string) => s.trim())
    .filter(Boolean)
    .slice(0, 5);
}

/** Full AI enhancement: summary, tags, title in one call */
export async function enhanceNote(
  content: string,
  env?: Env
): Promise<{
  summary: AISummaryResult;
  tags: AITagResult;
  title: AITitleResult;
}> {
  const [summary, tags, title] = await Promise.all([
    generateSummary(content, env),
    generateTags(content, env),
    generateTitle(content, env),
  ]);

  return { summary, tags, title };
}
