import { useMemo, useState } from "react";
import { ChevronRight, MoreVertical, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export type OrgPageRef = {
  id: string;
  title: string;
  parent_id: string | null;
  is_favorite: boolean;
  sort_index?: number;
};

interface PageTreeProps {
  pages: OrgPageRef[];
  currentPageId: string | null;
  openPage: (id: string) => void;
  movePage: (sourceId: string, newParentId: string | null) => Promise<void> | void;
  reorderSibling: (sourceId: string, targetId: string, position?: 'before'|'after') => Promise<void> | void;
  draggingId: string | null;
  setDraggingId: (id: string | null) => void;
  dropOverId: string | null;
  setDropOverId: (id: string | null) => void;
  moveBlock?: (blockId: string, targetPageId: string) => Promise<void> | void;
  deletePage?: (pageId: string) => Promise<void> | void;
}

export default function PageTree({
  pages,
  currentPageId,
  openPage,
  movePage,
  reorderSibling,
  draggingId,
  setDraggingId,
  dropOverId,
  setDropOverId,
  moveBlock,
  deletePage,
}: PageTreeProps) {
  const childrenMap = useMemo(() => {
    const m = new Map<string | null, OrgPageRef[]>();
    for (const p of pages) {
      const key = p.parent_id ?? null;
      if (!m.has(key)) m.set(key, []);
      m.get(key)!.push(p);
    }
    // sort each group by sort_index if provided, then title
    for (const [key, arr] of m) {
      arr.sort((a, b) => (a.sort_index ?? 0) - (b.sort_index ?? 0) || a.title.localeCompare(b.title));
      m.set(key, arr);
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
        <div key={p.id} className="w-full group">
          <div
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData("text/plain", `page:${p.id}`);
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
              const raw = e.dataTransfer.getData("text/plain");
              if (!raw) return;

              // Support both page and block drags
              const blockMatch = raw.match(/^block:(.+)$/);
              const pageMatch = raw.match(/^page:(.+)$/);
              const sourcePageId = pageMatch ? pageMatch[1] : (!blockMatch ? raw : null);

              const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
              const y = e.clientY - rect.top;
              const h = rect.height;
              const topZone = h * 0.33;
              const bottomZone = h * 0.66;

              if (blockMatch) {
                // Dropping a block: middle nests block into this page
                if (y >= topZone && y <= bottomZone) {
                  await moveBlock?.(blockMatch[1], p.id);
                }
                // Ignore top/bottom for blocks to avoid ambiguity
                return;
              }

              if (!sourcePageId || sourcePageId === p.id) return;

              if (y < topZone) {
                await reorderSibling(sourcePageId, p.id, 'before');
              } else if (y > bottomZone) {
                await reorderSibling(sourcePageId, p.id, 'after');
              } else {
                await movePage(sourcePageId, p.id); // nest under target page
              }
            }}
            className={`flex items-center justify-between w-full text-left px-2 py-1.5 rounded hover:bg-muted/60 transition-smooth ${
              currentPageId === p.id ? "bg-muted" : ""
            } ${dropOverId === p.id ? "ring-2 ring-primary" : ""}`}
            style={{ paddingLeft: 8 + depth * 14 }}
          >
            <button 
              onClick={() => openPage(p.id)}
              className="flex items-center gap-2 flex-1 min-w-0 text-left"
            >
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
            </button>
            {deletePage && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-6 w-6 opacity-0 group-hover:opacity-100 flex-shrink-0"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MoreVertical className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem 
                    onClick={() => deletePage(p.id)}
                    className="text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Deletar página
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
          {hasChildren && isExpanded && (
            <div className="space-y-1">{renderNodes(p.id, depth + 1)}</div>
          )}
        </div>
      );
    });
  };

  return <div className="space-y-1">{renderNodes(null, 0)}</div>;
}
