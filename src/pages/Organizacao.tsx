import React, { useEffect, useMemo, useRef, useState } from "react";
import { setPageSEO } from "@/lib/seo";

// Tipos simples: páginas com conteúdo livre em HTML
type Page = { id: string; title: string; content: string };

type AppState = {
  pages: Page[];
  ui: { activePageId: string | null };
};

const STORAGE_KEY = "lovable-notion-organizacao-v1"; // reutiliza a chave antiga com migração

const uuid = () => crypto?.randomUUID?.() || Math.random().toString(36).slice(2);

// Migração: se existir schema antigo com blocks, converte para conteúdo livre
function migrateIfNeeded(raw: any): AppState | null {
  try {
    const parsed = raw as any;
    if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.pages)) return null;

    // Detecta se já está no novo formato (content string)
    const isNew = parsed.pages.every((p: any) => typeof p.content === "string");
    if (isNew) {
      const activeId = parsed.ui?.activePageId ?? parsed.pages?.[0]?.id ?? null;
      return {
        pages: parsed.pages as Page[],
        ui: { activePageId: activeId },
      } as AppState;
    }

    // Antigo: pages[].blocks[] -> junta em linhas
    const migratedPages: Page[] = parsed.pages.map((p: any) => {
      if (Array.isArray(p.blocks)) {
        const text = p.blocks.map((b: any) => (typeof b?.content === "string" ? b.content : "")).join("\n");
        return { id: p.id ?? uuid(), title: p.title ?? "Página", content: text };
      }
      return { id: p.id ?? uuid(), title: p.title ?? "Página", content: p.content ?? "" } as Page;
    });
    const activeId = parsed.ui?.activePageId ?? migratedPages?.[0]?.id ?? null;
    return { pages: migratedPages, ui: { activePageId: activeId } } as AppState;
  } catch {
    return null;
  }
}

export default function Organizacao() {
  // SEO
  useEffect(() => {
    setPageSEO(
      "Organização - Texto Livre",
      "Escreva livremente e transforme trechos em páginas com um clique."
    );
  }, []);

  const initial = useMemo<AppState>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const migrated = migrateIfNeeded(JSON.parse(saved));
      if (migrated) return migrated;
    }
    const firstId = uuid();
    return {
      pages: [{ id: firstId, title: "Página sem título", content: "" }],
      ui: { activePageId: firstId },
    } as AppState;
  }, []);

  const [state, setState] = useState<AppState>(initial);
  const page = useMemo(
    () => state.pages.find((p) => p.id === state.ui.activePageId)!,
    [state]
  );

  // Persistência
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  // Refs do editor e menu de contexto
  const editorRef = useRef<HTMLDivElement | null>(null);
  const savedRangeRef = useRef<Range | null>(null);
  const [menu, setMenu] = useState<{ visible: boolean; x: number; y: number; selectedText: string }>(
    { visible: false, x: 0, y: 0, selectedText: "" }
  );

  // Sincroniza conteúdo atual no DOM do contentEditable quando troca de página
  useEffect(() => {
    if (editorRef.current && page) {
      editorRef.current.innerHTML = page.content || "";
    }
  }, [page?.id]);

  // Ações básicas
  function setActivePage(id: string) {
    setState((s) => ({ ...s, ui: { activePageId: id } }));
  }

  function createPage(title = "Nova página", content = ""): string {
    const id = uuid();
    setState((s) => ({
      ...s,
      pages: [...s.pages, { id, title, content }],
      ui: { activePageId: id },
    }));
    return id;
  }

  function renamePage(id: string, title: string) {
    setState((s) => ({
      ...s,
      pages: s.pages.map((p) => (p.id === id ? { ...p, title } : p)),
    }));
  }

  function setContent(html: string) {
    setState((s) => ({
      ...s,
      pages: s.pages.map((p) => (p.id === page.id ? { ...p, content: html } : p)),
    }));
  }

  // Context menu no editor
  function handleContextMenu(e: React.MouseEvent) {
    e.preventDefault();
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || sel.isCollapsed) {
      setMenu((m) => ({ ...m, visible: false }));
      return;
    }
    const range = sel.getRangeAt(0);
    savedRangeRef.current = range.cloneRange();

    // Posição do menu
    const rect = range.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.bottom + 8;

    setMenu({ visible: true, x, y, selectedText: sel.toString() });
  }

  function insertLinkForSavedRange(pageId: string, label: string) {
    const editor = editorRef.current;
    const range = savedRangeRef.current;
    if (!editor || !range) return;

    // Cria o link
    const a = document.createElement("a");
    a.href = "#";
    a.dataset.pageId = pageId;
    a.textContent = label || "Página";
    a.setAttribute("class", "underline decoration-dotted text-foreground");

    // Substitui a seleção pelo link
    range.deleteContents();
    range.insertNode(a);
    // Move o cursor após o link
    const newRange = document.createRange();
    newRange.setStartAfter(a);
    newRange.collapse(true);
    const sel = window.getSelection();
    if (sel) {
      sel.removeAllRanges();
      sel.addRange(newRange);
    }

    // Atualiza estado com o HTML atual
    setContent(editor.innerHTML);
  }

  function handleMakeSelectionPage() {
    const title = menu.selectedText.trim() || "Nova página";
    const newId = createPage(title, "");
    insertLinkForSavedRange(newId, title);
    setMenu({ visible: false, x: 0, y: 0, selectedText: "" });
  }

  // Clicar em links dentro do editor deve navegar para a página
  function handleEditorClick(e: React.MouseEvent) {
    const target = e.target as HTMLElement;
    const link = target.closest("a[data-page-id]") as HTMLAnchorElement | null;
    if (link && link.dataset.pageId) {
      e.preventDefault();
      setActivePage(link.dataset.pageId);
      setMenu((m) => ({ ...m, visible: false }));
    }
  }

  return (
    <div className="flex h-full w-full text-sm">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border p-3 space-y-2 overflow-auto bg-background">
        <div className="flex gap-2">
          <button
            className="px-3 py-1 rounded-xl border border-border hover:bg-accent transition-colors"
            onClick={() => createPage()}
          >
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
        {/* Título */}
        <div className="p-6 border-b border-border">
          <input
            className="w-full text-2xl font-semibold outline-none bg-transparent text-foreground placeholder:text-muted-foreground"
            placeholder="Sem título"
            value={page.title}
            onChange={(e) => renamePage(page.id, e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                editorRef.current?.focus();
              }
            }}
          />
        </div>

        {/* Área de texto livre */}
        <div className="flex-1 overflow-auto p-6">
          <div
            ref={editorRef}
            contentEditable
            suppressContentEditableWarning
            className="max-w-3xl mx-auto min-h-[40vh] outline-none whitespace-pre-wrap break-words leading-relaxed text-foreground"
            onInput={(e) => setContent((e.currentTarget as HTMLDivElement).innerHTML)}
            onContextMenu={handleContextMenu}
            onClick={handleEditorClick}
            aria-label="Editor de texto"
          />
        </div>
      </main>

      {/* Menu de contexto simples */}
      {menu.visible && (
        <div
          className="fixed z-50 border border-border bg-background rounded-md shadow-lg px-3 py-2 text-sm"
          style={{ left: menu.x, top: menu.y }}
          onMouseDown={(e) => e.preventDefault()}
        >
          <button
            className="hover:bg-accent px-2 py-1 rounded"
            onClick={handleMakeSelectionPage}
          >
            Transformar seleção em página
          </button>
        </div>
      )}
    </div>
  );
}
