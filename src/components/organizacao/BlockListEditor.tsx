import { useMemo, useState } from "react";
import { GripVertical, Plus } from "lucide-react";
import { BlockRow } from "./BlockRow";

export type OrgBlockItem = {
  id: string;
  content: string | null;
  order_index: number;
};

interface BlockListEditorProps {
  blocks: OrgBlockItem[];
  onChangeContent: (id: string, content: string) => void;
  onReorder: (sourceId: string, targetId: string, position: "before" | "after") => void;
  onMoveToPage?: (blockId: string, targetPageId: string) => void; // handled by PageTree drop
  onCreateAfter?: (afterId: string) => void;
  onSplit?: (id: string, beforeHtml: string, afterHtml: string) => Promise<string | null>;
  onJoinPrev?: (id: string, currentHtml: string) => Promise<string | null>;
}

export default function BlockListEditor({
  blocks,
  onChangeContent,
  onReorder,
  onMoveToPage,
  onCreateAfter,
  onSplit,
  onJoinPrev,
}: BlockListEditorProps) {
  const sorted = useMemo(
    () => [...blocks].sort((a, b) => a.order_index - b.order_index),
    [blocks]
  );

  const [dropOver, setDropOver] = useState<{ id: string; zone: "before" | "after" | null } | null>(null);
  const [focusId, setFocusId] = useState<string | null>(null);
  const [focusAtEnd, setFocusAtEnd] = useState(false);

  const handleDragStart = (id: string, e: React.DragEvent) => {
    e.dataTransfer.setData("text/plain", `block:${id}`);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (id: string, e: React.DragEvent) => {
    e.preventDefault();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const y = e.clientY - rect.top;
    const zone = y < rect.height / 2 ? "before" : "after";
    setDropOver({ id, zone });
  };

  const handleDragLeave = (id: string) => {
    setDropOver((prev) => (prev && prev.id === id ? null : prev));
  };

  const handleDrop = (id: string, e: React.DragEvent) => {
    e.preventDefault();
    const data = e.dataTransfer.getData("text/plain");
    const m = data.match(/^block:(.+)$/);
    if (!m) return;
    const sourceId = m[1];
    if (sourceId === id) return;
    const zone = dropOver?.zone || "before";
    onReorder(sourceId, id, zone);
    setDropOver(null);
  };

  const handleKeyDown = (id: string, e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onCreateAfter?.(id);
    }
  };

  return (
    <div 
      className="space-y-1" 
      style={{ userSelect: "text", WebkitUserSelect: "text" }}
      data-block-container
    >
      {sorted.map((b) => (
        <div
          key={b.id}
          onDragOver={(e) => handleDragOver(b.id, e)}
          onDragLeave={() => handleDragLeave(b.id)}
          onDrop={(e) => handleDrop(b.id, e)}
          className={`group rounded-md transition-smooth border border-transparent ${dropOver && dropOver.id === b.id && dropOver.zone === "before" ? "border-t-primary" : ""} ${dropOver && dropOver.id === b.id && dropOver.zone === "after" ? "border-b-primary" : ""}`}
        >
          <div className="flex items-start gap-2 group/row">
            <button
              className="opacity-0 group-hover/row:opacity-100 focus:opacity-100 mt-1 cursor-grab active:cursor-grabbing text-muted-foreground transition-opacity"
              draggable
              onDragStart={(e) => handleDragStart(b.id, e)}
              onMouseDown={(e) => e.stopPropagation()}
              aria-label="Arrastar bloco"
              style={{ userSelect: "none", WebkitUserSelect: "none" }}
            >
              <GripVertical className="h-4 w-4" />
            </button>
            <BlockRow
              id={b.id}
              html={b.content}
              onChange={onChangeContent}
              onKeyDown={(e) => handleKeyDown(b.id, e)}
              onSplit={async (id, before, after) => {
                const newId = await onSplit?.(id, before, after);
                if (newId) { setFocusId(newId); setFocusAtEnd(false); }
                return newId ?? null;
              }}
              onJoinPrev={async (id, html) => {
                const prevId = await (typeof onJoinPrev === 'function' ? onJoinPrev(id, html) : Promise.resolve(null));
                if (prevId) { setFocusId(prevId); setFocusAtEnd(true); }
                return prevId ?? null;
              }}
              onArrowNavigate={(dir, place) => {
                const idx = sorted.findIndex((x) => x.id === b.id);
                if (idx === -1) return;
                const target = dir === 'prev' ? sorted[idx - 1] : sorted[idx + 1];
                if (!target) return;
                setFocusId(target.id);
                setFocusAtEnd(place === 'end');
              }}
              autoFocus={focusId === b.id}
              autoFocusAtEnd={focusId === b.id ? focusAtEnd : false}
              onFocusDone={() => setFocusId(null)}
            />
          </div>
        </div>
      ))}
      {sorted.length === 0 && (
        <div className="text-sm text-muted-foreground">Sem linhas ainda.</div>
      )}
      {sorted.length > 0 && onCreateAfter && (
        <div className="pt-2">
          <button
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-smooth"
            onClick={() => onCreateAfter(sorted[sorted.length - 1].id)}
          >
            <Plus className="h-4 w-4" /> Nova linha
          </button>
        </div>
      )}
    </div>
  );
}
