import { useMemo, useState } from "react";
import { ChevronRight, Star } from "lucide-react";

export type OrgPageRef = {
  id: string;
  title: string;
  parent_id: string | null;
  is_favorite: boolean;
};

interface PageTreeProps {
  pages: OrgPageRef[];
  currentPageId: string | null;
  openPage: (id: string) => void;
  movePage: (sourceId: string, newParentId: string | null) => Promise<void> | void;
  draggingId: string | null;
  setDraggingId: (id: string | null) => void;
  dropOverId: string | null;
  setDropOverId: (id: string | null) => void;
}

export default function PageTree({
  pages,
  currentPageId,
  openPage,
  movePage,
  draggingId,
  setDraggingId,
  dropOverId,
  setDropOverId,
}: PageTreeProps) {
  const childrenMap = useMemo(() => {
    const m = new Map<string | null, OrgPageRef[]>();
    for (const p of pages) {
      const key = p.parent_id ?? null;
      if (!m.has(key)) m.set(key, []);
      m.get(key)!.push(p);
    }
    // Optional: sort alphabetically
    for (const [k, arr] of m) {
      arr.sort((a, b) => a.title.localeCompare(b.title));
      m.set(k, arr);
    }
    return m;
  }, [pages]);

  // Expand all by default for clarity
  const [expanded, setExpanded] = useState<Set<string>>(
    () => new Set(pages.map((p) => p.id))
  );

  const toggle = (id: string) => {
    setExpanded((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  };

  const renderNodes = (parentId: string | null, depth = 0) => {
    const nodes = childrenMap.get(parentId) || [];
    return nodes.map((p) => {
      const hasChildren = (childrenMap.get(p.id) || []).length > 0;
      const isExpanded = expanded.has(p.id);
      return (
        <div key={p.id} className="w-full">
          <button
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData("text/plain", p.id);
              setDraggingId(p.id);
            }}
            onDragEnd={() => {
              setDraggingId(null);
              setDropOverId(null);
            }}
            onDragOver={(e) => {
              e.preventDefault();
              setDropOverId(p.id);
            }}
            onDragLeave={() => { if (dropOverId === p.id) setDropOverId(null); }}
            onDrop={async (e) => {
              e.preventDefault();
              const sourceId = e.dataTransfer.getData("text/plain");
              if (sourceId && sourceId !== p.id) await movePage(sourceId, p.id);
            }}
            onClick={() => openPage(p.id)}
            className={`w-full text-left px-2 py-1.5 rounded hover:bg-muted/60 transition-smooth ${
              currentPageId === p.id ? "bg-muted" : ""
            } ${dropOverId === p.id ? "ring-2 ring-primary" : ""}`}
            style={{ paddingLeft: 8 + depth * 14 }}
          >
            <div className="flex items-center gap-2">
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  if (hasChildren) toggle(p.id);
                }}
                className={`inline-flex items-center justify-center h-4 w-4 shrink-0 ${
                  hasChildren ? "cursor-pointer text-muted-foreground" : "opacity-0"
                }`}
                aria-label={hasChildren ? (isExpanded ? "Recolher" : "Expandir") : undefined}
              >
                <ChevronRight className={`h-4 w-4 transition-transform ${isExpanded ? "rotate-90" : ""}`} />
              </span>
              <span className="truncate flex-1">{p.title}</span>
              {p.is_favorite && (
                <span title="Favorito" className="text-yellow-500"><Star className="h-3.5 w-3.5" /></span>
              )}
            </div>
          </button>
          {hasChildren && isExpanded && (
            <div className="space-y-1">{renderNodes(p.id, depth + 1)}</div>
          )}
        </div>
      );
    });
  };

  return <div className="space-y-1">{renderNodes(null, 0)}</div>;
}
