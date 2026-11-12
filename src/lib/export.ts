/**
 * Export notes to various formats
 * 
 * Supports: JSON, Markdown, plain text
 */

export function exportToMarkdown(notes: any[]): string {
  let md = "# NoteApp Export\n\n";
  md += `Exported on: ${new Date().toISOString()}\n`;
  md += `Total notes: ${notes.length}\n\n---\n\n`;

  for (const note of notes) {
    md += `## ${note.title || "Untitled"}\n\n`;
    md += `**Created:** ${new Date(note.createdAt).toLocaleDateString()}\n`;
    md += `**Updated:** ${new Date(note.updatedAt).toLocaleDateString()}\n`;
    if (note.category) md += `**Category:** ${note.category}\n`;
    if (note.tags && note.tags.length > 0) md += `**Tags:** ${note.tags.join(", ")}\n`;
    if (note.isPinned) md += `**Pinned:** Yes\n`;
    md += `\n${note.content}\n\n---\n\n`;
  }

  return md;
}

export function exportToJSON(notes: any[]): string {
  const exportData = {
    exportedAt: new Date().toISOString(),
    totalNotes: notes.length,
    app: "NoteApp",
    version: "1.0.0",
    notes: notes.map((note) => ({
      id: note.id,
      title: note.title,
      content: note.content,
      category: note.category,
      tags: note.tags,
      isPinned: note.isPinned,
      isArchived: note.isArchived,
      createdAt: note.createdAt,
      updatedAt: note.updatedAt,
    })),
  };

  return JSON.stringify(exportData, null, 2);
}

export function exportToPlainText(notes: any[]): string {
  let txt = "NoteApp Export\n";
  txt += `Exported on: ${new Date().toISOString()}\n`;
  txt += `Total notes: ${notes.length}\n`;
  txt += "=".repeat(50) + "\n\n";

  for (const note of notes) {
    txt += `Title: ${note.title || "Untitled"}\n`;
    txt += `Created: ${new Date(note.createdAt).toLocaleDateString()}\n`;
    txt += `Updated: ${new Date(note.updatedAt).toLocaleDateString()}\n`;
    if (note.category) txt += `Category: ${note.category}\n`;
    txt += `\n${note.content}\n`;
    txt += "-".repeat(50) + "\n\n";
  }

  return txt;
}

export type ExportFormat = "json" | "markdown" | "text";

export function exportNotes(notes: any[], format: ExportFormat): string {
  switch (format) {
    case "markdown":
      return exportToMarkdown(notes);
    case "json":
      return exportToJSON(notes);
    case "text":
    default:
      return exportToPlainText(notes);
  }
}

export function getExportFilename(format: ExportFormat): string {
  const date = new Date().toISOString().split("T")[0];
  const extensions = { json: ".json", markdown: ".md", text: ".txt" };
  return `noteapp-export-${date}${extensions[format]}`;
}
