import { useEffect, useRef } from "react";

interface BlockRowProps {
  id: string;
  html: string | null;
  onChange: (id: string, html: string) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLDivElement>) => void;
}

// Remove Unicode BiDi control characters that can flip text direction
const sanitizeBidi = (s: string) => s.replace(/[\u061C\u200E\u200F\u202A-\u202E\u2066-\u2069]/g, "");

export function BlockRow({ id, html, onChange, onKeyDown }: BlockRowProps) {
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

  return (
    <div
      ref={ref}
      contentEditable
      suppressContentEditableWarning
      className="org-ltr min-h-[24px] w-full whitespace-pre-wrap px-0 py-1 focus:outline-none text-left"
      style={{ direction: "ltr", unicodeBidi: "isolate-override" }}
      onInput={(e) => onChange(id, sanitizeBidi((e.currentTarget as HTMLDivElement).innerHTML || ""))}
      onKeyDown={onKeyDown}
    />
  );
}
