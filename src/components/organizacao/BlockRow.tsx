import { useEffect, useRef } from "react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
  ContextMenuSeparator,
  ContextMenuLabel,
} from "@/components/ui/context-menu";

interface BlockRowProps {
  id: string;
  html: string | null;
  onChange: (id: string, html: string) => void;
  onSplit?: (id: string, beforeHtml: string, afterHtml: string) => Promise<string | null>;
  onKeyDown?: (e: React.KeyboardEvent<HTMLDivElement>) => void;
  autoFocus?: boolean;
  onFocusDone?: () => void;
}

// Remove Unicode BiDi control characters that can flip text direction
const sanitizeBidi = (s: string) => s.replace(/[\u061C\u200E\u200F\u202A-\u202E\u2066-\u2069]/g, "");

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

export function BlockRow({ id, html, onChange, onSplit, onKeyDown, autoFocus, onFocusDone }: BlockRowProps) {
  const ref = useRef<HTMLDivElement | null>(null);

  // Sync external html into the editor only when not focused to preserve caret position
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const isActive = document.activeElement === el;
    const sanitized = sanitizeBidi(html || "");
    if (!isActive && el.innerHTML !== sanitized) {
      el.innerHTML = sanitized;
    }
  }, [html]);

  // Initialize once on mount
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.innerHTML = sanitizeBidi(html || "");
  }, []);

  // Autofocus newly created row at start
  useEffect(() => {
    if (!autoFocus) return;
    const el = ref.current;
    if (!el) return;
    el.focus();
    const range = document.createRange();
    range.setStart(el, 0);
    range.collapse(true);
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);
    onFocusDone?.();
  }, [autoFocus, onFocusDone]);

  const withinEditor = () => {
    const el = ref.current;
    const sel = window.getSelection();
    if (!el || !sel || sel.rangeCount === 0) return false;
    const contains = (node: Node | null) => !!node && (node === el || el.contains(node));
    return contains(sel.anchorNode) && contains(sel.focusNode);
  };

  const applyBold = () => {
    if (!withinEditor()) return;
    document.execCommand("bold", false);
    const next = ref.current?.innerHTML || "";
    onChange(id, sanitizeBidi(next));
  };

  const applyColor = (c: ColorName) => {
    if (!withinEditor()) return;
    const el = ref.current;
    if (!el) return;
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed) return;
    const range = sel.getRangeAt(0);
    const span = document.createElement("span");
    span.className = colorClass(c);
    try {
      const extracted = range.extractContents();
      span.appendChild(extracted);
      range.insertNode(span);
      sel.removeAllRanges();
      const after = document.createRange();
      after.setStartAfter(span);
      after.collapse(true);
      sel.addRange(after);
    } catch {
      const text = sel.toString();
      span.textContent = text;
      range.deleteContents();
      range.insertNode(span);
    }
    const next = ref.current?.innerHTML || "";
    onChange(id, sanitizeBidi(next));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      const el = ref.current;
      const sel = window.getSelection();
      if (!el || !sel || sel.rangeCount === 0) return;
      const caret = sel.getRangeAt(0);
      const beforeRange = caret.cloneRange();
      beforeRange.setStart(el, 0);
      const afterRange = caret.cloneRange();
      afterRange.setEnd(el, el.childNodes.length);
      const beforeFrag = beforeRange.cloneContents();
      const afterFrag = afterRange.cloneContents();
      const beforeDiv = document.createElement('div');
      const afterDiv = document.createElement('div');
      beforeDiv.appendChild(beforeFrag);
      afterDiv.appendChild(afterFrag);
      const beforeHtml = sanitizeBidi(beforeDiv.innerHTML);
      const afterHtml = sanitizeBidi(afterDiv.innerHTML);
      // Optimistically update current line to show split immediately
      el.innerHTML = beforeHtml;
      // Release focus so the new row can grab it
      (el as HTMLElement).blur();
      onSplit?.(id, beforeHtml, afterHtml);
      return;
    }
    onKeyDown?.(e);
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          ref={ref}
          contentEditable
          suppressContentEditableWarning
          className="org-ltr min-h-[24px] w-full whitespace-pre-wrap px-0 py-1 focus:outline-none text-left"
          style={{ direction: "ltr", unicodeBidi: "isolate-override" }}
          onInput={(e) => onChange(id, sanitizeBidi((e.currentTarget as HTMLDivElement).innerHTML || ""))}
          onKeyDown={handleKeyDown}
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
      </ContextMenuContent>
    </ContextMenu>
  );
}
