import React, { useEffect, useMemo, useRef, useState } from "react";
import { setPageSEO } from "@/lib/seo";

// --- Types ---
type Block = { id: string; type: "text"; content: string };
type Page = { id: string; title: string; blocks: Block[] };

type UIState = {
  activePageId: string | null;
  focusedBlockId: string | null;
  anchorBlockId: string | null; // início lógico da seleção
  selectedBlockIds: string[];
  isDragSelecting: boolean;
  dragAnchorId: string | null;
  dragAdditive: boolean; // Ctrl/Cmd ao iniciar o arrasto
  isDraggingBlocks: boolean; // arrastar blocos para mover
  draggedBlockIds: string[]; // blocos sendo arrastados
  dropTargetPageId: string | null; // página de destino do drop
};

type AppState = {
  pages: Page[];
  ui: UIState;
};

// --- Utils ---
const uuid = () => crypto?.randomUUID?.() || Math.random().toString(36).slice(2);

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function isInputCaretAtStart(input: HTMLInputElement) {
  return input.selectionStart === 0 && input.selectionEnd === 0;
}
function isInputCaretAtEnd(input: HTMLInputElement) {
  const len = input.value?.length ?? 0;
  return input.selectionStart === len && input.selectionEnd === len;
}

function getBlockIndex(page: Page, blockId: string) {
  return page.blocks.findIndex((b) => b.id === blockId);
}

function idsInRange(page: Page, fromId: string, toId: string) {
  const a = getBlockIndex(page, fromId);
  const b = getBlockIndex(page, toId);
  if (a === -1 || b === -1) return [] as string[];
  const [i, j] = a <= b ? [a, b] : [b, a];
  return page.blocks.slice(i, j + 1).map((b) => b.id);
}

function uniq(arr: string[]) {
  return Array.from(new Set(arr));
}

function focusBlockById(blockId: string) {
  requestAnimationFrame(() => {
    const el = document.querySelector<HTMLInputElement>(`[data-block-id="${blockId}"] input`);
    if (el) {
      el.focus({ preventScroll: true });
      const len = el.value.length;
      el.setSelectionRange(len, len);
      el.scrollIntoView?.({ block: "nearest" });
    }
  });
}

function elementBlockIdFromPoint(x: number, y: number): string | null {
  const el = document.elementFromPoint(x, y) as HTMLElement | null;
  const block = el?.closest?.("[data-block-id]") as HTMLElement | null;
  return block?.dataset?.blockId ?? null;
}

// --- Component ---
export default function Organizacao() {
  // SEO configuration
  useEffect(() => {
    setPageSEO("Organização - Editor de Notas", "Editor colaborativo tipo Notion para organizar suas ideias e projetos");
  }, []);

  const initial = useMemo<AppState>(() => {
  const saved = localStorage.getItem("lovable-notion-organizacao-v1");
  if (saved) {
    try { 
      const parsed = JSON.parse(saved) as AppState;
      const uiDefaults = {
        isDragSelecting: false,
        dragAnchorId: null as string | null,
        dragAdditive: false,
        isDraggingBlocks: false,
        draggedBlockIds: [] as string[],
        dropTargetPageId: null as string | null,
        focusedBlockId: null as string | null,
        anchorBlockId: null as string | null,
        selectedBlockIds: [] as string[],
        activePageId: parsed.ui?.activePageId ?? parsed.pages?.[0]?.id ?? null,
      };
      return { 
        ...parsed, 
        ui: { ...uiDefaults, ...parsed.ui, draggedBlockIds: parsed.ui?.draggedBlockIds ?? [] } 
      } as AppState;
    } catch {}
  }
    const firstPageId = uuid();
    return {
      pages: [{ id: firstPageId, title: "Página sem título", blocks: [{ id: uuid(), type: "text", content: "" }] }],
      ui: {
        activePageId: firstPageId,
        focusedBlockId: null,
        anchorBlockId: null,
        selectedBlockIds: [],
        isDragSelecting: false,
        dragAnchorId: null,
        dragAdditive: false,
        isDraggingBlocks: false,
        draggedBlockIds: [],
        dropTargetPageId: null,
      },
    };
  }, []);

  const [state, setState] = useState<AppState>(initial);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const selectionSnapshotAtDragStart = useRef<string[]>([]);

  // persist
  useEffect(() => {
    localStorage.setItem("lovable-notion-organizacao-v1", JSON.stringify(state));
  }, [state]);

  const page = useMemo(() => state.pages.find((p) => p.id === state.ui.activePageId)!, [state]);

  // --- Actions ---
  function createPage(title = "Nova página") {
    setState((s) => {
      const id = uuid();
      const newPage: Page = { id, title, blocks: [{ id: uuid(), type: "text", content: "" }] };
      return {
        ...s,
        pages: [newPage, ...s.pages],
        ui: { ...s.ui, activePageId: id, focusedBlockId: newPage.blocks[0].id, anchorBlockId: newPage.blocks[0].id, selectedBlockIds: [] },
      };
    });
    requestAnimationFrame(() => focusBlockById(page?.blocks?.[0]?.id || ""));
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
      pages: s.pages.map((p) => (p.id !== page.id ? p : { ...p, blocks: p.blocks.map((b) => (b.id === blockId ? { ...b, content: text } : b)) })),
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
      const neighbor = dir === "down" ? p.blocks[clamp(i + 1, 0, p.blocks.length - 1)] : p.blocks[clamp(i - 1, 0, p.blocks.length - 1)];
      if (!neighbor || neighbor.id === currentId) return s;
      const range = idsInRange(p, anchor, neighbor.id);
      return { ...s, ui: { ...s.ui, focusedBlockId: neighbor.id, anchorBlockId: anchor, selectedBlockIds: range } };
    });
  }

  function moveBlocksToPage(blockIds: string[], targetPageId: string) {
    setState((s) => {
      const sourcePage = s.pages.find((p) => p.id === s.ui.activePageId)!;
      const blocksToMove = sourcePage.blocks.filter((b) => blockIds.includes(b.id));
      
      return {
        ...s,
        pages: s.pages.map((p) => {
          if (p.id === sourcePage.id) {
            // Remove blocos da página origem
            const remainingBlocks = p.blocks.filter((b) => !blockIds.includes(b.id));
            return { 
              ...p, 
              blocks: remainingBlocks.length ? remainingBlocks : [{ id: uuid(), type: "text", content: "" }] 
            };
          }
          if (p.id === targetPageId) {
            // Adiciona blocos à página destino
            return { ...p, blocks: [...p.blocks, ...blocksToMove] };
          }
          return p;
        }),
        ui: { ...s.ui, selectedBlockIds: [], isDraggingBlocks: false, draggedBlockIds: [], dropTargetPageId: null }
      };
    });
  }

  function reorderBlocksInPage(blockIds: string[], targetBlockId: string | null, position: 'before' | 'after' = 'before') {
    setState((s) => {
      const sourcePage = s.pages.find((p) => p.id === s.ui.activePageId)!;
      const blocksToMove = sourcePage.blocks.filter((b) => blockIds.includes(b.id));
      const remainingBlocks = sourcePage.blocks.filter((b) => !blockIds.includes(b.id));
      
      let insertIndex = remainingBlocks.length;
      if (targetBlockId) {
        const targetIndex = remainingBlocks.findIndex((b) => b.id === targetBlockId);
        insertIndex = targetIndex >= 0 ? (position === 'after' ? targetIndex + 1 : targetIndex) : remainingBlocks.length;
      }
      
      const newBlocks = [...remainingBlocks];
      newBlocks.splice(insertIndex, 0, ...blocksToMove);
      
      return {
        ...s,
        pages: s.pages.map((p) => 
          p.id === sourcePage.id ? { ...p, blocks: newBlocks } : p
        ),
        ui: { ...s.ui, selectedBlockIds: blockIds, isDraggingBlocks: false, draggedBlockIds: [] }
      };
    });
  }

  // --- Global pointer listeners for drag-select ---
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

      // auto-scroll container
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

  // --- Render ---
  return (
    <div className="flex h-full w-full text-sm">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border p-3 space-y-2 overflow-auto bg-background">
        <div className="flex gap-2">
          <button className="px-3 py-1 rounded-xl border border-border hover:bg-accent transition-colors" onClick={() => createPage()}>
            Nova página
          </button>
        </div>
        <ul className="space-y-1 mt-2">
          {state.pages.map((p) => (
            <li 
              key={p.id}
              onDragOver={(e) => {
                if (state.ui.isDraggingBlocks && (state.ui.draggedBlockIds?.length ?? 0) > 0) {
                  e.preventDefault();
                  setState((s) => ({ ...s, ui: { ...s.ui, dropTargetPageId: p.id } }));
                }
              }}
              onDragLeave={(e) => {
                if (state.ui.dropTargetPageId === p.id) {
                  setState((s) => ({ ...s, ui: { ...s.ui, dropTargetPageId: null } }));
                }
              }}
              onDrop={(e) => {
                e.preventDefault();
                if (state.ui.isDraggingBlocks && (state.ui.draggedBlockIds?.length ?? 0) > 0) {
                  moveBlocksToPage(state.ui.draggedBlockIds!, p.id);
                }
              }}
              className={`flex items-center gap-2 px-2 py-1 rounded cursor-pointer transition-colors ${
                p.id === page.id ? "bg-accent" : "hover:bg-accent/50"
              } ${
                state.ui.dropTargetPageId === p.id ? "bg-primary/20 border border-primary" : ""
              }`} 
              onClick={() => setActivePage(p.id)}
            >
              <span className="truncate text-foreground">{p.title || "Sem título"}</span>
            </li>
          ))}
        </ul>
      </aside>

      {/* Editor */}
      <main className="flex-1 flex flex-col overflow-hidden bg-background">
        {/* Title */}
        <div className="p-6 border-b border-border">
          <input
            className="w-full text-2xl font-semibold outline-none bg-transparent text-foreground placeholder:text-muted-foreground"
            placeholder="Sem título"
            value={page.title}
            onChange={(e) => renamePage(page.id, e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                // focus first block
                const first = page.blocks[0];
                if (first) {
                  setState((s) => ({ ...s, ui: { ...s.ui, focusedBlockId: first.id, anchorBlockId: first.id } }));
                  focusBlockById(first.id);
                }
              }
            }}
          />
        </div>

        {/* Blocks list */}
        <div 
          ref={containerRef} 
          className="flex-1 overflow-auto p-6"
          onDragOver={(e) => {
            if (state.ui.isDraggingBlocks) {
              e.preventDefault();
            }
          }}
          onDrop={(e) => {
            e.preventDefault();
            if (state.ui.isDraggingBlocks && (state.ui.draggedBlockIds?.length ?? 0) > 0) {
              // Drop no final da lista se não houver target específico
              reorderBlocksInPage(state.ui.draggedBlockIds!, null);
            }
          }}
        >
          <div role="list" className="max-w-3xl mx-auto">
            {page.blocks.map((b, idx) => {
              const selected = state.ui.selectedBlockIds.includes(b.id);
              const focused = state.ui.focusedBlockId === b.id;
              const isDragging = state.ui.draggedBlockIds?.includes(b.id) ?? false;
              return (
                <div
                  key={b.id}
                  role="listitem"
                  data-block-id={b.id}
                  draggable={selected || focused}
                  onDragStart={(e) => {
                    const blocksToMove = state.ui.selectedBlockIds.length > 0 && selected 
                      ? state.ui.selectedBlockIds 
                      : [b.id];
                    
                    setState((s) => ({ 
                      ...s, 
                      ui: { 
                        ...s.ui, 
                        isDraggingBlocks: true, 
                        draggedBlockIds: blocksToMove 
                      } 
                    }));
                    
                    e.dataTransfer.effectAllowed = 'move';
                    e.dataTransfer.setData('text/plain', JSON.stringify(blocksToMove));
                  }}
                  onDragEnd={() => {
                    setState((s) => ({ 
                      ...s, 
                      ui: { 
                        ...s.ui, 
                        isDraggingBlocks: false, 
                        draggedBlockIds: [],
                        dropTargetPageId: null 
                      } 
                    }));
                  }}
                  onDragOver={(e) => {
                    if (state.ui.isDraggingBlocks && !(state.ui.draggedBlockIds?.includes(b.id) ?? false)) {
                      e.preventDefault();
                    }
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (state.ui.isDraggingBlocks && !(state.ui.draggedBlockIds?.includes(b.id) ?? false)) {
                      // Determinar posição baseada na coordenada Y do mouse
                      const rect = e.currentTarget.getBoundingClientRect();
                      const y = e.clientY - rect.top;
                      const position = y < rect.height / 2 ? 'before' : 'after';
                      
                      reorderBlocksInPage(state.ui.draggedBlockIds!, b.id, position);
                    }
                  }}
                  className={`group flex items-center gap-2 px-3 py-2 rounded-2xl mb-1 border transition-colors ${
                    selected 
                      ? "border-primary bg-primary/10" 
                      : focused 
                        ? "border-border bg-accent/50" 
                        : "border-transparent hover:bg-accent/30"
                  } ${
                    isDragging ? "opacity-50" : ""
                  }`}
                >
                  {/* handle */}
                  <div
                    className="shrink-0 w-4 self-stretch cursor-pointer flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                    onPointerDown={(e) => {
                      (e.target as HTMLElement).setPointerCapture?.((e as any).pointerId);
                      selectionSnapshotAtDragStart.current = state.ui.selectedBlockIds;
                      const additive = (e.ctrlKey || e.metaKey);
                      setState((s) => ({
                        ...s,
                        ui: {
                          ...s.ui,
                          isDragSelecting: true,
                          dragAnchorId: b.id,
                          dragAdditive: additive,
                          anchorBlockId: b.id,
                          focusedBlockId: b.id,
                          selectedBlockIds: additive
                            ? uniq([...s.ui.selectedBlockIds, b.id])
                            : [b.id],
                        },
                      }));
                      e.preventDefault();
                    }}
                    title="Arraste para selecionar"
                  >
                    ⋮⋮
                  </div>

                  {/* input */}
                  <input
                    className="w-full bg-transparent outline-none text-foreground placeholder:text-muted-foreground"
                    value={b.content}
                    onChange={(e) => updateBlockContent(b.id, e.target.value)}
                    onFocus={() => setState((s) => ({ ...s, ui: { ...s.ui, focusedBlockId: b.id, anchorBlockId: b.id } }))}
                    onKeyDown={(e) => {
                      const input = e.currentTarget;

                      // Multi-seleção por teclado
                      if (e.shiftKey && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
                        e.preventDefault();
                        extendSelectionByKeyboard(b.id, e.key === "ArrowDown" ? "down" : "up");
                        return;
                      }

                      // Navegação simples ↑/↓ quando no início/fim
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

                      // Enter -> cria bloco abaixo e foca
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        const newId = createBlockBelow(b.id);
                        focusBlockById(newId);
                        return;
                      }

                      // Backspace no início de bloco vazio -> deleta e foca anterior
                      if (e.key === "Backspace" && isInputCaretAtStart(input) && b.content === "") {
                        e.preventDefault();
                        const i = getBlockIndex(page, b.id);
                        const prev = page.blocks[i - 1];
                        deleteBlock(b.id);
                        if (prev) focusBlockById(prev.id);
                        return;
                      }
                    }}
                    placeholder={idx === 0 && !b.content ? "Escreva uma linha…" : ""}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}