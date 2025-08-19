import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import AppLayout from "./layouts/AppLayout";
import Home from "./pages/Home";
import Landing from "./pages/Landing";
import Atividades from "./pages/Atividades";
import Alimentacao from "./pages/Alimentacao";


import Cultura from "./pages/Cultura";
import Calendario from "./pages/Calendario";

import Habitos from "./pages/Habitos";
import Organizacao from "./pages/Organizacao";
import Organizacao2 from "./pages/Organizacao2";
import Auth from "./pages/Auth";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
const queryClient = new QueryClient();

const RequireAuth = () => {
  const [ready, setReady] = useState(false);
  const [hasSession, setHasSession] = useState<boolean | null>(null);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setHasSession(!!session);
      setReady(true);
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      setHasSession(!!session);
      setReady(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  if (!ready) return <div className="flex items-center justify-center h-screen text-muted-foreground">Carregando…</div>;
  return hasSession ? <Outlet /> : <Navigate to="/auth" replace />;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/auth" element={<Auth />} />
          <Route path="/" element={<Landing />} />
          <Route element={<AppLayout />}>
            <Route path="/app" element={<Home />} />
            <Route path="/financeira" element={<Index />} />
            <Route path="/atividades" element={<Atividades />} />
            <Route path="/alimentacao" element={<Alimentacao />} />
            <Route path="/cultura" element={<Cultura />} />
            <Route path="/calendario" element={<Calendario />} />
            <Route path="/organizacao" element={<Organizacao />} />
            <Route path="/organizacao/:id" element={<Organizacao />} />
            <Route path="/organizacao2" element={<Organizacao2 />} />
            <Route path="/habitos" element={<Habitos />} />
          </Route>
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
      <ReactQueryDevtools initialIsOpen={true} />
    </TooltipProvider>
  </QueryClientProvider>
);
import React, { useEffect, useMemo, useRef, useState } from "react";

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

/* ========= Editor embutido no App.tsx (sem export) ========= */
function NotionLiteEditor() {
  const initial = useMemo<AppState>(() => {
    const saved = localStorage.getItem("lovable-notion-lite-v1");
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
    localStorage.setItem("lovable-notion-lite-v1", JSON.stringify(state));
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
    <div className="flex h-screen w-full text-sm">
      {/* Sidebar */}
      <aside className="w-64 border-r p-3 space-y-2 overflow-auto">
        <div className="flex gap-2">
          <button className="px-3 py-1 rounded-xl border" onClick={() => createPage()}>
            Nova página
          </button>
        </div>
        <ul className="space-y-1 mt-2">
          {state.pages.map((p) => (
            <li
              key={p.id}
              className={`flex items-center gap-2 px-2 py-1 rounded cursor-pointer ${
                p.id === page.id ? "bg-gray-100" : "hover:bg-gray-50"
              }`}
              onClick={() => setActivePage(p.id)}
            >
              <span className="truncate">{p.title || "Sem título"}</span>
            </li>
          ))}
        </ul>
      </aside>

      {/* Editor */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Título */}
        <div className="p-6 border-b">
          <input
            className="w-full text-2xl font-semibold outline-none"
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

        {/* Blocos */}
        <div ref={containerRef} className="flex-1 overflow-auto p-6">
          <div role="list" className="max-w-3xl mx-auto">
            {page.blocks.map((b, idx) => {
              const selected = state.ui.selectedBlockIds.includes(b.id);
              const focused = state.ui.focusedBlockId === b.id;
              return (
                <div
                  key={b.id}
                  role="listitem"
                  data-block-id={b.id}
                  className={`group flex items-center gap-2 px-3 py-2 rounded-2xl mb-1 border ${
                    selected ? "border-blue-500 bg-blue-50" : focused ? "border-gray-300 bg-gray-50" : "border-transparent hover:bg-gray-50"
                  }`}
                >
                  {/* handle para drag-select */}
                  <div
                    className="shrink-0 w-4 self-stretch cursor-pointer flex items-center justify-center text-gray-400 hover:text-gray-600"
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
                    title="Arraste para selecionar"
                  >
                    ⋮⋮
                  </div>

                  {/* input do bloco */}
                  <input
                    className="w-full bg-transparent outline-none"
                    value={b.content}
                    onChange={(e) => updateBlockContent(b.id, e.target.value)}
                    onFocus={() =>
                      setState((s) => ({ ...s, ui: { ...s.ui, focusedBlockId: b.id, anchorBlockId: b.id } }))
                    }
                    onKeyDown={(e) => {
                      const input = e.currentTarget;

                      // Multi-seleção por teclado
                      if (e.shiftKey && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
                        e.preventDefault();
                        extendSelectionByKeyboard(b.id, e.key === "ArrowDown" ? "down" : "up");
                        return;
                      }

                      // Navegação ↑/↓ quando no início/fim
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

                      // Enter → cria bloco abaixo e foca
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

/* ========= ÚNICO export default ========= */
export default function App() {
  return <NotionLiteEditor />;
}
