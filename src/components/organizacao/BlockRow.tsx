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
  onJoinPrev?: (id: string, currentHtml: string) => Promise<string | null>;
  onKeyDown?: (e: React.KeyboardEvent<HTMLDivElement>) => void;
  onArrowNavigate?: (dir: 'prev' | 'next', place: 'start' | 'end') => void;
  autoFocus?: boolean;
  autoFocusAtEnd?: boolean;
  onFocusDone?: () => void;
  onBeginCrossSelect?: () => void;
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

export function BlockRow({ id, html, onChange, onSplit, onJoinPrev, onKeyDown, onArrowNavigate, autoFocus, autoFocusAtEnd, onFocusDone, onBeginCrossSelect }: BlockRowProps) {
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

  // Autofocus newly created row at start or end
  useEffect(() => {
    if (!autoFocus) return;
    const el = ref.current;
    if (!el) return;
    el.focus();
    const range = document.createRange();
    range.selectNodeContents(el);
    if (autoFocusAtEnd) {
      range.collapse(false); // end
    } else {
      range.collapse(true); // start
    }
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);
    onFocusDone?.();
  }, [autoFocus, autoFocusAtEnd, onFocusDone]);

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
    const el = ref.current;
    const sel = window.getSelection();
    if (e.key === "Backspace" || e.key === "Delete") {
      if (!el || !sel || sel.rangeCount === 0) return;
      const range = sel.getRangeAt(0);
      const pre = range.cloneRange();
      pre.selectNodeContents(el);
      pre.setEnd(range.startContainer, range.startOffset);
      const atStart = pre.toString().length === 0;
      const isEmpty = (el.textContent || "").length === 0 || el.innerHTML === "<br>";
      if ((e.key === "Backspace" && atStart) || (e.key === "Delete" && atStart && isEmpty)) {
        e.preventDefault();
        (el as HTMLElement).blur();
        onJoinPrev?.(id, el.innerHTML || "");
        return;
      }
    }

    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
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

    // Arrow navigation across rows with precise caret placement
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      if (!el || !sel || sel.rangeCount === 0) return;
      const range = sel.getRangeAt(0);

      // Determine caret position relative to the line
      const pre = range.cloneRange();
      pre.selectNodeContents(el);
      pre.setEnd(range.startContainer, range.startOffset);
      const atStart = pre.toString().length === 0;

      const post = range.cloneRange();
      post.selectNodeContents(el);
      post.setStart(range.endContainer, range.endOffset);
      const atEnd = post.toString().length === 0;

      if (atStart || atEnd) {
        e.preventDefault();
        (el as HTMLElement).blur();
        if (e.key === 'ArrowUp') {
          onArrowNavigate?.('prev', atEnd ? 'end' : 'start');
        } else {
          onArrowNavigate?.('next', atEnd ? 'end' : 'start');
        }
        return;
      }
    }

    onKeyDown?.(e);
  };

  const handleMouseDown = (_e: React.MouseEvent<HTMLDivElement>) => {
    // Begin cross-line selection mode in parent
    onBeginCrossSelect?.();
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          ref={ref}
          data-org-row
          contentEditable
          suppressContentEditableWarning
          className="org-ltr min-h-[24px] w-full whitespace-pre-wrap px-0 py-1 focus:outline-none text-left"
          style={{ 
            direction: "ltr", 
            unicodeBidi: "isolate-override",
            userSelect: "text",
            WebkitUserSelect: "text"
          }}
          onInput={(e) => onChange(id, sanitizeBidi((e.currentTarget as HTMLDivElement).innerHTML || ""))}
          onKeyDown={handleKeyDown}
          onMouseDown={handleMouseDown}
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
