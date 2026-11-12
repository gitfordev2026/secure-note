"use client";

import * as React from "react";
import { useCallback } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Placeholder } from "@tiptap/extension-placeholder";
import { TextStyle } from "@tiptap/extension-text-style";
import { Highlight } from "@tiptap/extension-highlight";
import { Image } from "@tiptap/extension-image";
import { Link } from "@tiptap/extension-link";
import { CharacterCount } from "@tiptap/extension-character-count";
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Heading,
  ListOrdered,
  List,
  Quote,
  Code2,
  Link as LinkIcon,
  Image as ImageIcon,
  MoreHorizontal,
  PlusCircle,
  Sparkles,
  Copy,
  ArrowRight,
} from "lucide-react";

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

const extensions = [
  StarterKit.configure({
    heading: {
      levels: [1, 2, 3],
    },
  }),
  Placeholder.configure({ placeholder: "Write your note..." }),
  TextStyle,
  Highlight,
  Image.configure({ allowBase64: true }),
  Link.configure({ openOnClick: false }),
  CharacterCount,
];

const toolbarButton = ({
  icon: IconComponent,
  title,
  active,
  onClick,
  disabled,
}: {
  icon: React.ElementType;
  title: string;
  active?: boolean;
  onClick: () => void;
  disabled?: boolean;
}) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`
      inline-flex items-center justify-center w-8 h-8 rounded-md border text-sm
      transition-colors focus:outline-none focus:ring-2
      ${active
        ? "border-primary bg-primary/10 text-primary"
        : "border-input bg-background text-muted-foreground hover:bg-accent hover:text-foreground"
      }
      ${disabled ? "opacity-50 cursor-not-allowed" : ""}
    `}
    title={title}
    aria-label={title}
  >
    <IconComponent className="h-4 w-4" />
  </button>
);

export function RichTextEditor({
  value,
  onChange,
  placeholder = "Write your note...",
  className = "",
  disabled = false,
}: RichTextEditorProps) {
  const editor = useEditor({
    extensions,
    content: value,
    editable: !disabled,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  const isActive = (format: string) => editor?.isActive(format) || false;

  const insertImage = useCallback(() => {
    const url = window.prompt("Image URL:");
    if (url) {
      editor?.chain().focus().setImage({ src: url, alt: "Image" }).run();
    }
  }, [editor]);

  const insertLink = useCallback(() => {
    const url = window.prompt("Link URL:");
    if (url) {
      editor?.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
    }
  }, [editor]);

  if (!editor) {
    return <div className="h-full animate-pulse rounded-md bg-muted"></div>;
  }

  return (
    <div className={`relative ${className}`}>
      {/* Toolbar */}
      <div className="flex items-center gap-1 border-b border-input bg-muted/50 p-2">
        {toolbarButton({
          icon: Bold,
          title: "Bold",
          active: isActive("bold"),
          onClick: () => editor.chain().focus().toggleBold().run(),
          disabled,
        })}
        {toolbarButton({
          icon: Italic,
          title: "Italic",
          active: isActive("italic"),
          onClick: () => editor.chain().focus().toggleItalic().run(),
          disabled,
        })}
        {toolbarButton({
          icon: Underline,
          title: "Underline",
          active: isActive("underline"),
          onClick: () => editor.chain().focus().toggleUnderline().run(),
          disabled,
        })}
        {toolbarButton({
          icon: Strikethrough,
          title: "Strikethrough",
          active: isActive("strike"),
          onClick: () => editor.chain().focus().toggleStrike().run(),
          disabled,
        })}
        <div className="h-4 w-px bg-border mx-1" />
        {toolbarButton({
          icon: Heading,
          title: "Heading",
          active: isActive("heading"),
          onClick: () => editor.chain().focus().toggleHeading({ level: 1 }).run(),
          disabled,
        })}
        {toolbarButton({
          icon: Heading,
          title: "Subheading",
          active: isActive("heading"),
          onClick: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
          disabled,
        })}
        <div className="h-4 w-px bg-border mx-1" />
        {toolbarButton({
          icon: List,
          title: "Bullet List",
          active: isActive("bulletList"),
          onClick: () => editor.chain().focus().toggleBulletList().run(),
          disabled,
        })}
        {toolbarButton({
          icon: ListOrdered,
          title: "Ordered List",
          active: isActive("orderedList"),
          onClick: () => editor.chain().focus().toggleOrderedList().run(),
          disabled,
        })}
        {toolbarButton({
          icon: Quote,
          title: "Quote",
          active: isActive("blockquote"),
          onClick: () => editor.chain().focus().toggleBlockquote().run(),
          disabled,
        })}
        <div className="h-4 w-px bg-border mx-1" />
        {toolbarButton({
          icon: LinkIcon,
          title: "Link",
          active: isActive("link"),
          onClick: insertLink,
          disabled,
        })}
        {toolbarButton({
          icon: ImageIcon,
          title: "Image",
          onClick: insertImage,
          disabled,
        })}
        <div className="ml-auto h-4 w-px bg-border" />
        {toolbarButton({
          icon: PlusCircle,
          title: "More",
          onClick: () => {},
          disabled: true,
        })}
      </div>

      {/* Editor Content */}
      <div className={`min-h-[300px] ${className}`}>
        <EditorContent editor={editor} className="prose prose-sm max-w-none" />
      </div>

      {/* Character Count Footer */}
      <div className="flex items-center justify-between px-2 py-1 text-xs text-muted-foreground border-t border-input">
        <span>
          {editor.getHTML().length} characters
        </span>
        <span>{editor.getText().length} words</span>
      </div>
    </div>
  );
}

export default RichTextEditor;
