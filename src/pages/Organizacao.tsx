import React, { useEffect, useMemo, useRef, useState } from "react";
import { setPageSEO } from "@/lib/seo";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

/* ========= Tipos ========= */
type Block = { id: string; type: "text"; content: string };
type Page = { id: string; title: string; blocks: Block[] };

type UIState = {
  activePageId: string | null;
  focusedBlockId: string | null;
  anchorBlockId: string | null;       // início lógico da seleção
  selectedBlockIds: string[];
  isDragSelecting: boolean;
  dragAnchorId: string | null;
  dragAdditive: boolean;               // Ctrl/Cmd ao iniciar arrasto
};

type AppState = {
  pages: Page[];
  ui: UIState;
};

/* ========= Utils ========= */
const uuid = () =>
  (typeof crypto !== "undefined" && (crypto as any).randomUUID?.()) ||
  Math.random().toString(36).slice(2);

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

const isInputCaretAtStart = (input: HTMLInputElement) =>
  input.selectionStart === 0 && input.selectionEnd === 0;

const isInputCaretAtEnd = (input: HTMLInputElement) => {
  const len = input.value?.length ?? 0;
  return input.selectionStart === len && input.selectionEnd === len;
};

const getBlockIndex = (page: Page, blockId: string) =>
  page.blocks.findIndex((b) => b.id === blockId);

const idsInRange = (page: Page, fromId: string, toId: string) => {
  const a = getBlockIndex(page, fromId);
  const b = getBlockIndex(page, toId);
  if (a === -1 || b === -1) return [] as string[];
  const [i, j] = a <= b ? [a, b] : [b, a];
  return page.blocks.slice(i, j + 1).map((b) => b.id);
};

const uniq = (arr: string[]) => Array.from(new Set(arr));

const focusBlockById = (blockId: string) => {
  requestAnimationFrame(() => {
    const el = document.querySelector<HTMLInputElement>(
      `[data-block-id="${blockId}"] input`
    );
    if (el) {
      el.focus({ preventScroll: true });
      const len = el.value.length;
      el.setSelectionRange(len, len);
      el.scrollIntoView?.({ block: "nearest" });
    }
  });
};

const elementBlockIdFromPoint = (x: number, y: number) => {
  const el = document.elementFromPoint(x, y) as HTMLElement | null;
  const block = el?.closest?.("[data-block-id]") as HTMLElement | null;
  return block?.dataset?.blockId ?? null;
};

export default function Organizacao() {
  // SEO
  useEffect(() => {
    setPageSEO(
      "Organização - Editor de Notas",
      "Editor de notas estilo Notion com multi-seleção, drag & drop e navegação por teclado"
    );
  }, []);

  const initial = useMemo<AppState>(() => {
    const saved = localStorage.getItem("lovable-notion-organizacao-v1");
    if (saved) {
      try {
        return JSON.parse(saved) as AppState;
      } catch {}
    }
    const firstPageId = uuid();
    return {
      pages: [
        { id: firstPageId, title: "Página sem título", blocks: [{ id: uuid(), type: "text", content: "" }] },
      ],
      ui: {
        activePageId: firstPageId,
        focusedBlockId: null,
        anchorBlockId: null,
        selectedBlockIds: [],
        isDragSelecting: false,
        dragAnchorId: null,
        dragAdditive: false,
      },
    };
  }, []);

  const [state, setState] = useState<AppState>(initial);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const selectionSnapshotAtDragStart = useRef<string[]>([]);

  // persistência
  useEffect(() => {
    localStorage.setItem("lovable-notion-organizacao-v1", JSON.stringify(state));
  }, [state]);

  const page = useMemo(
    () => state.pages.find((p) => p.id === state.ui.activePageId)!,
    [state.pages, state.ui.activePageId]
  );

  /* ===== Ações ===== */
  function createPage(title = "Nova página") {
    const id = uuid();
    const firstBlockId = uuid();
    setState((s) => ({
      ...s,
      pages: [{ id, title, blocks: [{ id: firstBlockId, type: "text", content: "" }] }, ...s.pages],
      ui: { ...s.ui, activePageId: id, focusedBlockId: firstBlockId, anchorBlockId: firstBlockId, selectedBlockIds: [] },
    }));
    requestAnimationFrame(() => focusBlockById(firstBlockId));
  }

  function renamePage(id: string, newTitle: string) {
    setState((s) => ({
      ...s,
      pages: s.pages.map((p) => (p.id === id ? { ...p, title: newTitle } : p)),
    }));
  }

  function setActivePage(id: string) {
    setState((s) => ({ ...s, ui: { ...s.ui, activePageId: id, focusedBlockId: null, anchorBlockId: null, selectedBlockIds: [] } }));
  }

  function updateBlockContent(blockId: string, text: string) {
    setState((s) => ({
      ...s,
      pages: s.pages.map((p) =>
        p.id !== page.id ? p : { ...p, blocks: p.blocks.map((b) => (b.id === blockId ? { ...b, content: text } : b)) }
      ),
    }));
  }

  function createBlockBelow(afterId: string) {
    const newId = uuid();
    setState((s) => ({
      ...s,
      pages: s.pages.map((p) => {
        if (p.id !== page.id) return p;
        const i = getBlockIndex(p, afterId);
        const nextBlocks = [...p.blocks];
        nextBlocks.splice(i + 1, 0, { id: newId, type: "text", content: "" });
        return { ...p, blocks: nextBlocks };
      }),
      ui: { ...s.ui, focusedBlockId: newId, anchorBlockId: newId, selectedBlockIds: [] },
    }));
    return newId;
  }

  function deleteBlock(blockId: string) {
    setState((s) => ({
      ...s,
      pages: s.pages.map((p) => {
        if (p.id !== page.id) return p;
        const nextBlocks = p.blocks.filter((b) => b.id !== blockId);
        return { ...p, blocks: nextBlocks.length ? nextBlocks : [{ id: uuid(), type: "text", content: "" }] };
      }),
      ui: { ...s.ui, selectedBlockIds: s.ui.selectedBlockIds.filter((id) => id !== blockId) },
    }));
  }

  function moveFocusToNeighbor(currentId: string, dir: "up" | "down") {
    const i = getBlockIndex(page, currentId);
    const next = dir === "down" ? page.blocks[i + 1] : page.blocks[i - 1];
    if (next) {
      setState((s) => ({ ...s, ui: { ...s.ui, focusedBlockId: next.id, anchorBlockId: next.id, selectedBlockIds: [] } }));
      focusBlockById(next.id);
    }
  }

  function extendSelectionByKeyboard(currentId: string, dir: "up" | "down") {
    setState((s) => {
      const p = s.pages.find((pp) => pp.id === s.ui.activePageId)!;
      const anchor = s.ui.anchorBlockId || currentId;
      const i = getBlockIndex(p, currentId);
      const neighbor =
        dir === "down" ? p.blocks[clamp(i + 1, 0, p.blocks.length - 1)] : p.blocks[clamp(i - 1, 0, p.blocks.length - 1)];
      if (!neighbor || neighbor.id === currentId) return s;
      const range = idsInRange(p, anchor, neighbor.id);
      return { ...s, ui: { ...s.ui, focusedBlockId: neighbor.id, anchorBlockId: anchor, selectedBlockIds: range } };
    });
  }

  /* ===== Drag-select global ===== */
  useEffect(() => {
    function onMove(e: PointerEvent) {
      if (!state.ui.isDragSelecting || !state.ui.dragAnchorId) return;
      const hoveredId = elementBlockIdFromPoint(e.clientX, e.clientY);
      if (!hoveredId) return;
      setState((s) => {
        const p = s.pages.find((pp) => pp.id === s.ui.activePageId)!;
        const range = idsInRange(p, s.ui.dragAnchorId!, hoveredId);
        const base = s.ui.dragAdditive ? selectionSnapshotAtDragStart.current : [];
        const sel = uniq([...base, ...range]);
        return { ...s, ui: { ...s.ui, selectedBlockIds: sel, focusedBlockId: hoveredId } };
      });

      // auto-scroll leve do container
      const c = containerRef.current;
      if (c) {
        const rect = c.getBoundingClientRect();
        const threshold = 48;
        if (e.clientY < rect.top + threshold) c.scrollBy({ top: -12 });
        else if (e.clientY > rect.bottom - threshold) c.scrollBy({ top: 12 });
      }
    }

    function onUp() {
      if (!state.ui.isDragSelecting) return;
      setState((s) => ({ ...s, ui: { ...s.ui, isDragSelecting: false, dragAnchorId: null, dragAdditive: false } }));
    }

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [state.ui.isDragSelecting, state.ui.dragAnchorId, state.ui.activePageId]);

  /* ===== Render ===== */
  return (
    <div className="flex h-full w-full text-sm">
      {/* Sidebar lateral para páginas */}
      <aside className="w-64 border-r border-border bg-muted/30 p-4 space-y-3 overflow-auto">
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => createPage()}
            className="w-full justify-start"
          >
            <Plus className="h-4 w-4 mr-2" />
            Nova página
          </Button>
        </div>
        <div className="space-y-1">
          {state.pages.map((p) => (
            <button
              key={p.id}
              className={`w-full text-left px-3 py-2 rounded-md transition-smooth text-sm ${
                p.id === page.id 
                  ? "bg-accent text-accent-foreground border border-border" 
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
              onClick={() => setActivePage(p.id)}
            >
              <span className="truncate block">{p.title || "Sem título"}</span>
            </button>
          ))}
        </div>
      </aside>

      {/* Editor principal */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Título da página */}
        <div className="p-6 pb-4 border-b border-border bg-background">
          <input
            className="w-full text-2xl font-semibold outline-none bg-transparent text-foreground placeholder:text-muted-foreground"
            placeholder="Sem título"
            value={page.title}
            onChange={(e) => renamePage(page.id, e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                const first = page.blocks[0];
                if (first) {
                  setState((s) => ({ ...s, ui: { ...s.ui, focusedBlockId: first.id, anchorBlockId: first.id } }));
                  focusBlockById(first.id);
                }
              }
            }}
          />
        </div>

        {/* Blocos de conteúdo */}
        <div ref={containerRef} className="flex-1 overflow-auto p-6 bg-background">
          <div role="list" className="max-w-4xl mx-auto space-y-1">
            {page.blocks.map((b, idx) => {
              const selected = state.ui.selectedBlockIds.includes(b.id);
              const focused = state.ui.focusedBlockId === b.id;
              return (
                <div
                  key={b.id}
                  role="listitem"
                  data-block-id={b.id}
                  className={`group flex items-center gap-3 px-4 py-2.5 rounded-lg transition-smooth border ${
                    selected 
                      ? "border-primary bg-primary/5 shadow-sm" 
                      : focused 
                        ? "border-border bg-muted/40" 
                        : "border-transparent hover:bg-muted/30"
                  }`}
                >
                  {/* Handle para drag-select */}
                  <div
                    className="shrink-0 w-5 self-stretch cursor-pointer flex items-center justify-center text-muted-foreground hover:text-foreground transition-smooth opacity-0 group-hover:opacity-100 focus:opacity-100"
                    onPointerDown={(e) => {
                      (e.target as HTMLElement).setPointerCapture?.((e as any).pointerId);
                      selectionSnapshotAtDragStart.current = state.ui.selectedBlockIds;
                      const additive = e.ctrlKey || e.metaKey;
                      setState((s) => ({
                        ...s,
                        ui: {
                          ...s.ui,
                          isDragSelecting: true,
                          dragAnchorId: b.id,
                          dragAdditive: additive,
                          anchorBlockId: b.id,
                          focusedBlockId: b.id,
                          selectedBlockIds: additive ? uniq([...s.ui.selectedBlockIds, b.id]) : [b.id],
                        },
                      }));
                      e.preventDefault();
                    }}
                    title="Arrastar para selecionar múltiplos blocos"
                  >
                    <svg className="w-3 h-4" viewBox="0 0 12 16" fill="currentColor">
                      <circle cx="2" cy="2" r="1"/>
                      <circle cx="2" cy="6" r="1"/>
                      <circle cx="2" cy="10" r="1"/>
                      <circle cx="2" cy="14" r="1"/>
                      <circle cx="6" cy="2" r="1"/>
                      <circle cx="6" cy="6" r="1"/>
                      <circle cx="6" cy="10" r="1"/>
                      <circle cx="6" cy="14" r="1"/>
                    </svg>
                  </div>

                  {/* Input do bloco */}
                  <input
                    className="w-full bg-transparent outline-none text-foreground placeholder:text-muted-foreground"
                    value={b.content}
                    onChange={(e) => updateBlockContent(b.id, e.target.value)}
                    onFocus={() =>
                      setState((s) => ({ ...s, ui: { ...s.ui, focusedBlockId: b.id, anchorBlockId: b.id } }))
                    }
                    onKeyDown={(e) => {
                      const input = e.currentTarget;

                      // Multi-seleção por teclado (Shift + ↑/↓)
                      if (e.shiftKey && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
                        e.preventDefault();
                        extendSelectionByKeyboard(b.id, e.key === "ArrowDown" ? "down" : "up");
                        return;
                      }

                      // Navegação ↑/↓ quando cursor no início/fim
                      if (!e.shiftKey && e.key === "ArrowDown" && isInputCaretAtEnd(input)) {
                        e.preventDefault();
                        moveFocusToNeighbor(b.id, "down");
                        return;
                      }
                      if (!e.shiftKey && e.key === "ArrowUp" && isInputCaretAtStart(input)) {
                        e.preventDefault();
                        moveFocusToNeighbor(b.id, "up");
                        return;
                      }

                      // Enter → criar bloco abaixo e focar
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        const newId = createBlockBelow(b.id);
                        focusBlockById(newId);
                        return;
                      }

                      // Backspace no início de bloco vazio → deletar e focar anterior
                      if (e.key === "Backspace" && isInputCaretAtStart(input) && b.content === "") {
                        e.preventDefault();
                        const i = getBlockIndex(page, b.id);
                        const prev = page.blocks[i - 1];
                        deleteBlock(b.id);
                        if (prev) focusBlockById(prev.id);
                        return;
                      }
                    }}
                    placeholder={idx === 0 && !b.content ? "Escreva algo aqui..." : ""}
                  />
                </div>
              );
            })}
            
            {page.blocks.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <p>Nenhum bloco ainda. Comece digitando no título acima.</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}