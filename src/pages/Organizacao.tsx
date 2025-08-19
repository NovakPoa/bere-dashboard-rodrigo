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
      return { 
        ...parsed, 
        ui: {
          focusedBlockId: null,
          anchorBlockId: null,
          selectedBlockIds: [],
          activePageId: parsed.ui?.activePageId ?? parsed.pages?.[0]?.id ?? null,
        }
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
      },
    };
  }, []);

  const [state, setState] = useState<AppState>(initial);
  const containerRef = useRef<HTMLDivElement | null>(null);

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
        ui: { ...s.ui, selectedBlockIds: [] }
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
        ui: { ...s.ui, selectedBlockIds: blockIds }
      };
    });
  }

  function clearSelectedBlocks() {
    setState((s) => {
      return {
        ...s,
        pages: s.pages.map((p) => 
          p.id === page.id 
            ? { 
                ...p, 
                blocks: p.blocks.map((b) => 
                  s.ui.selectedBlockIds.includes(b.id) ? { ...b, content: "" } : b
                )
              }
            : p
        ),
        ui: { ...s.ui, selectedBlockIds: [] }
      };
    });
  }

  function deleteSelectedBlocks() {
    setState((s) => {
      return {
        ...s,
        pages: s.pages.map((p) => {
          if (p.id !== page.id) return p;
          const remainingBlocks = p.blocks.filter((b) => !s.ui.selectedBlockIds.includes(b.id));
          return { 
            ...p, 
            blocks: remainingBlocks.length ? remainingBlocks : [{ id: uuid(), type: "text", content: "" }] 
          };
        }),
        ui: { ...s.ui, selectedBlockIds: [], focusedBlockId: null, anchorBlockId: null }
      };
    });
  }

  function selectAllBlocks() {
    setState((s) => {
      const p = s.pages.find((pp) => pp.id === s.ui.activePageId)!;
      const allIds = p.blocks.map((b) => b.id);
      return {
        ...s,
        ui: { ...s.ui, selectedBlockIds: allIds, anchorBlockId: allIds[0] || null }
      };
    });
  }

  function clearSelection() {
    setState((s) => ({ 
      ...s, 
      ui: { ...s.ui, selectedBlockIds: [], anchorBlockId: null, focusedBlockId: null } 
    }));
  }

  // --- Simple click-based selection ---
  function handleBlockClick(blockId: string, e: React.MouseEvent) {
    if (e.shiftKey || e.ctrlKey || e.metaKey) {
      // Multi-selection
      e.preventDefault();
      setState((s) => {
        const isSelected = s.ui.selectedBlockIds.includes(blockId);
        let newSelection: string[];
        
        if (e.shiftKey && s.ui.anchorBlockId) {
          // Range selection from anchor to clicked block
          const range = idsInRange(page, s.ui.anchorBlockId, blockId);
          newSelection = uniq([...s.ui.selectedBlockIds, ...range]);
        } else {
          // Toggle selection
          newSelection = isSelected 
            ? s.ui.selectedBlockIds.filter(id => id !== blockId)
            : [...s.ui.selectedBlockIds, blockId];
        }
        
        return {
          ...s,
          ui: {
            ...s.ui,
            selectedBlockIds: newSelection,
            anchorBlockId: newSelection.length > 0 ? (s.ui.anchorBlockId || blockId) : null,
            focusedBlockId: blockId,
          }
        };
      });
    } else {
      // Single selection
      setState((s) => ({
        ...s,
        ui: {
          ...s.ui,
          selectedBlockIds: [blockId],
          anchorBlockId: blockId,
          focusedBlockId: blockId,
        }
      }));
    }
  }

  // --- Global keyboard shortcuts ---
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const hasSelection = state.ui.selectedBlockIds.length > 1;
      
      // Ctrl/Cmd+A - Selecionar todos os blocos
      if ((e.ctrlKey || e.metaKey) && e.key === "a") {
        e.preventDefault();
        selectAllBlocks();
        return;
      }
      
      // Escape - Limpar seleção
      if (e.key === "Escape") {
        e.preventDefault();
        clearSelection();
        return;
      }
      
      // Delete/Backspace em seleção múltipla - Limpar conteúdo
      if (hasSelection && (e.key === "Delete" || e.key === "Backspace")) {
        e.preventDefault();
        if (e.shiftKey) {
          // Shift+Delete - Deletar blocos completamente
          deleteSelectedBlocks();
        } else {
          // Delete simples - Limpar conteúdo apenas
          clearSelectedBlocks();
        }
        return;
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [state.ui.selectedBlockIds.length]);


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
              className={`flex items-center gap-2 px-2 py-1 rounded cursor-pointer transition-colors ${
                p.id === page.id ? "bg-accent" : "hover:bg-accent/50"
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
        >
          <div role="list" className="max-w-3xl mx-auto">
            {page.blocks.map((b, idx) => {
              const selected = state.ui.selectedBlockIds.includes(b.id);
              const focused = state.ui.focusedBlockId === b.id;
              return (
                <div
                  key={b.id}
                  role="listitem"
                  data-block-id={b.id}
                  onClick={(e) => handleBlockClick(b.id, e)}
                  className={`group flex items-center gap-2 px-3 py-1 rounded-lg transition-colors ${
                    selected 
                      ? "bg-muted/20" 
                      : focused 
                        ? "bg-muted/10" 
                        : "hover:bg-muted/10"
                  }`}
                >
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
          
                  {/* Selection feedback */}
          {state.ui.selectedBlockIds.length > 1 && (
            <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-background border border-border rounded-lg px-4 py-2 shadow-lg z-50">
              <div className="flex items-center gap-3 text-sm text-foreground">
                <span className="font-medium">
                  {state.ui.selectedBlockIds.length} blocos selecionados
                </span>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>Delete: limpar</span>
                  <span>•</span>
                  <span>Shift+Delete: excluir</span>
                  <span>•</span>
                  <span>Esc: cancelar</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}