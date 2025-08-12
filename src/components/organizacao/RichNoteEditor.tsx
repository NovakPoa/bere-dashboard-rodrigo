import { useEffect, useRef, useState } from "react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
  ContextMenuSeparator,
  ContextMenuLabel,
} from "@/components/ui/context-menu";

// Simple freeform rich note editor with right-click actions
// Props keep persistence and navigation in parent component
interface RichNoteEditorProps {
  html: string;
  onChange: (html: string) => void; // persist debounced
  onConvertToPage: (title: string) => Promise<string | null>; // returns new page id
  onOpenPage: (pageId: string) => void;
}

const COLORS = [
  "default",
  "gray",
  "brown",
  "orange",
  "yellow",
  "green",
  "blue",
  "purple",
  "pink",
  "red",
] as const;

type ColorName = typeof COLORS[number];

const colorClass = (c: ColorName) => (c === "default" ? "org-text-default" : `org-text-${c}`);

export default function RichNoteEditor({ html, onChange, onConvertToPage, onOpenPage }: RichNoteEditorProps) {
  const editorRef = useRef<HTMLDivElement | null>(null);
  const [localHtml, setLocalHtml] = useState<string>(html || "");
  const saveTimer = useRef<number | null>(null);

  useEffect(() => {
    setLocalHtml(html || "");
  }, [html]);

  // Debounced save
  const scheduleSave = (nextHtml: string) => {
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      onChange(nextHtml);
    }, 500);
  };

  const withinEditor = () => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return false;
    const anchor = sel.anchorNode as Node | null;
    const focus = sel.focusNode as Node | null;
    const root = editorRef.current;
    if (!root) return false;
    const contains = (node: Node | null) => !!node && (node === root || root.contains(node));
    return contains(anchor) && contains(focus);
  };

  const applyBold = () => {
    if (!withinEditor()) return;
    document.execCommand("bold", false);
    // sync HTML
    const next = editorRef.current?.innerHTML || "";
    setLocalHtml(next);
    scheduleSave(next);
  };

  const applyColor = (c: ColorName) => {
    if (!withinEditor()) return;
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed) return;
    const range = sel.getRangeAt(0);
    // Wrap selection in a span with our color class
    const span = document.createElement("span");
    span.className = colorClass(c);
    try {
      const extracted = range.extractContents();
      span.appendChild(extracted);
      range.insertNode(span);
      // Move caret after inserted span
      sel.removeAllRanges();
      const after = document.createRange();
      after.setStartAfter(span);
      after.collapse(true);
      sel.addRange(after);
    } catch {
      // Fallback: insert plain text wrapped (may drop nested markup)
      const text = sel.toString();
      span.textContent = text;
      range.deleteContents();
      range.insertNode(span);
    }
    const next = editorRef.current?.innerHTML || "";
    setLocalHtml(next);
    scheduleSave(next);
  };

  const convertSelectionToPage = async () => {
    if (!withinEditor()) return;
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed) return;
    const text = sel.toString().trim().slice(0, 80) || "Nova página";
    const pageId = await onConvertToPage(text);
    if (!pageId) return;

    const range = sel.getRangeAt(0);
    const link = document.createElement("a");
    link.textContent = text;
    link.href = `/organizacao/${pageId}`;
    link.setAttribute("data-page-id", pageId);
    link.className = "underline underline-offset-4 text-primary hover:opacity-80 transition-smooth";
    range.deleteContents();
    range.insertNode(link);

    const next = editorRef.current?.innerHTML || "";
    setLocalHtml(next);
    scheduleSave(next);
  };

  const handleInput = () => {
    const next = editorRef.current?.innerHTML || "";
    setLocalHtml(next);
    scheduleSave(next);
  };

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target?.tagName === "A" && target.dataset.pageId) {
      e.preventDefault();
      onOpenPage(target.dataset.pageId);
    }
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          className="min-h-[320px] whitespace-pre-wrap rounded-none border-0 bg-transparent px-0 py-2 focus:outline-none"
          onInput={handleInput}
          onClick={handleClick}
          dangerouslySetInnerHTML={{ __html: localHtml }}
        />
      </ContextMenuTrigger>
      <ContextMenuContent className="z-50">
        <ContextMenuItem onSelect={applyBold}>Negrito</ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuLabel>Cor</ContextMenuLabel>
        {COLORS.map((c) => (
          <ContextMenuItem key={c} onSelect={() => applyColor(c)}>
            <span className={colorClass(c)}>{c}</span>
          </ContextMenuItem>
        ))}
        <ContextMenuSeparator />
        <ContextMenuItem onSelect={convertSelectionToPage}>Converter em página</ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
