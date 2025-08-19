import React, { useEffect, useMemo, useRef, useState } from "react";
import { setPageSEO } from "@/lib/seo";

/**
 * Mini Notion-like editor with:
 * 1) Minimal left sidebar listing pages + nested subpages
 * 2) Pages can live inside other pages (tree)
 * 3) Right-click selected text → "Transformar em página" (creates subpage under current page)
 *    The selected text becomes a bold, clickable link to that subpage.
 *
 * Drop this component in your app (e.g., pages/index.jsx or a Lovable page) and render <MiniNotion />
 * Data is persisted in localStorage. No external libs.
 */

// === Utils & Types ===
const STORAGE_KEY = "mini_notion_pages_v1";
const STORAGE_CURRENT = "mini_notion_current_v1";

function uid() {
  return (
    Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
  ).toUpperCase();
}

function now() {
  return new Date().toISOString();
}

function escapeHtml(str: string) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// === Core Component ===
export default function Organizacao6() {
  const [pages, setPages] = useState(() => loadPages());
  const [currentId, setCurrentId] = useState(() => loadCurrentId());
  const editorRef = useRef<HTMLDivElement>(null);

  // Set page SEO
  useEffect(() => {
    setPageSEO("Organização 6 - Mini Notion", "Editor hierárquico de páginas com funcionalidades avançadas");
  }, []);

  // Ensure at least one root page exists
  useEffect(() => {
    if (!currentId || !pages[currentId]) {
      const firstRoot = Object.values(pages).find((p: any) => p.parentId === null);
      if (firstRoot) {
        setCurrentId((firstRoot as any).id);
      } else {
        const rootId = uid();
        const initial = {
          id: rootId,
          title: "Página Inicial",
          content:
            '<h1>Bem-vindo! 👋</h1><p>Texto livre aqui. Selecione um trecho, clique com o botão direito e transforme em uma <b>subpágina</b>.</p>',
          parentId: null,
          createdAt: now(),
          updatedAt: now(),
        };
        setPages({ [rootId]: initial });
        setCurrentId(rootId);
      }
    }
  }, []); // run once

  // Persist
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(pages));
    } catch {}
  }, [pages]);

  useEffect(() => {
    try {
      if (currentId) localStorage.setItem(STORAGE_CURRENT, currentId);
    } catch {}
  }, [currentId]);

  const currentPage = pages[currentId] || null;

  const tree = useMemo(() => buildTree(pages), [pages]);
  const breadcrumb = useMemo(() => buildBreadcrumb(currentPage, pages), [currentPage, pages]);

  function handleTitleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const title = e.target.value || "Sem título";
    setPages((prev) => ({
      ...prev,
      [currentId]: { ...prev[currentId], title, updatedAt: now() },
    }));
  }

  function handleContentInput() {
    const html = editorRef.current?.innerHTML ?? "";
    setPages((prev) => ({
      ...prev,
      [currentId]: { ...prev[currentId], content: html, updatedAt: now() },
    }));
  }

  function handlePaste(e: React.ClipboardEvent) {
    // paste as plain text to avoid messy HTML
    e.preventDefault();
    const text = (e.clipboardData || (window as any).clipboardData).getData("text");
    document.execCommand("insertText", false, text);
  }

  function navigateTo(id: string) {
    setCurrentId(id);
    // Focus editor after navigation
    setTimeout(() => editorRef.current?.focus(), 0);
  }

  function createRootPage() {
    const id = uid();
    const newPage = {
      id,
      title: "Nova página",
      content: "<p>Digite aqui…</p>",
      parentId: null,
      createdAt: now(),
      updatedAt: now(),
    };
    setPages((prev) => ({ ...prev, [id]: newPage }));
    setCurrentId(id);
  }

  function createSubpage(parentId: string, title = "Nova página") {
    const id = uid();
    const newPage = {
      id,
      title,
      content: "<p>Conteúdo da subpágina…</p>",
      parentId,
      createdAt: now(),
      updatedAt: now(),
    };
    setPages((prev) => ({ ...prev, [id]: newPage }));
    return id;
  }

  // === Right-click → Transform selection into page ===
  const [menu, setMenu] = useState<{ open: boolean; x: number; y: number; range: Range | null }>({ open: false, x: 0, y: 0, range: null });

  function onEditorContextMenu(e: React.MouseEvent) {
    // Only if selection is non-empty inside editor
    const sel = window.getSelection();
    if (!editorRef.current?.contains(e.target as Node)) return; // not editor
    if (!sel || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);
    if (sel.isCollapsed) return; // no selection

    e.preventDefault();
    setMenu({ open: true, x: e.clientX, y: e.clientY, range: range.cloneRange() });
  }

  function closeMenu() {
    setMenu((m) => ({ ...m, open: false, range: null }));
  }

  function onTransformSelectionToPage() {
    if (!menu.range || !currentPage) return;

    const selectedText = menu.range.toString().trim() || "Nova página";
    // Create the subpage
    const subId = createSubpage(currentPage.id, truncate(selectedText, 60));

    // Insert a bold, clickable link span at selection
    const span = document.createElement("span");
    span.setAttribute("data-page-id", subId);
    span.className = "page-link";
    span.contentEditable = "false";
    span.innerHTML = `<b>${escapeHtml(selectedText)}</b>`;

    // Add a trailing space so typing continues naturally
    const space = document.createTextNode(" ");

    menu.range.deleteContents();
    menu.range.insertNode(space);
    menu.range.insertNode(span);

    // Move caret after the inserted nodes
    const sel = window.getSelection();
    if (sel) {
      sel.removeAllRanges();
      const afterRange = document.createRange();
      afterRange.setStartAfter(space);
      afterRange.collapse(true);
      sel.addRange(afterRange);
    }

    // Persist editor HTML
    handleContentInput();
    closeMenu();
  }

  // Clicks on inline page links inside editor
  function onEditorClick(e: React.MouseEvent) {
    const link = (e.target as any).closest?.(".page-link");
    if (link && link.dataset.pageId) {
      e.preventDefault();
      navigateTo(link.dataset.pageId);
    }
  }

  function onEditorKeyDown(e: React.KeyboardEvent) {
    // Keyboard shortcut: Ctrl/Cmd + Shift + K
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "k") {
      e.preventDefault();
      if (window.getSelection()?.isCollapsed) return;
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0) {
        const range = sel.getRangeAt(0);
        setMenu({ open: true, x: getCaretClientRect().x, y: getCaretClientRect().y, range: range.cloneRange() });
      }
    }
  }

  // Close context menu on ESC or click elsewhere
  useEffect(() => {
    function onEsc(e: KeyboardEvent) { if (e.key === "Escape") closeMenu(); }
    function onDocClick(e: MouseEvent) {
      if (!(e.target as any).closest?.(".context-menu")) closeMenu();
    }
    document.addEventListener("keydown", onEsc);
    document.addEventListener("click", onDocClick);
    return () => {
      document.removeEventListener("keydown", onEsc);
      document.removeEventListener("click", onDocClick);
    };
  }, []);

  return (
    <div className="mini-notion-app-shell">
      <style>{styles}</style>

      <aside className="mini-notion-sidebar">
        <div className="mini-notion-sidebar-header">
          <button className="mini-notion-btn" onClick={createRootPage}>＋ Nova página</button>
        </div>
        <PageTree
          tree={tree}
          currentId={currentId}
          onNavigate={navigateTo}
        />
      </aside>

      <main className="mini-notion-editor">
        {currentPage && (
          <>
            <nav className="mini-notion-breadcrumb">
              {breadcrumb.map((p: any, i: number) => (
                <span key={p.id}>
                  <a href="#" onClick={(e) => { e.preventDefault(); navigateTo(p.id);}}>{p.title || "Sem título"}</a>
                  {i < breadcrumb.length - 1 && <span className="mini-notion-crumb-sep">/</span>}
                </span>
              ))}
            </nav>

            <input
              className="mini-notion-title-input"
              value={currentPage.title || "Sem título"}
              onChange={handleTitleChange}
              placeholder="Sem título"
            />

            <div
              ref={editorRef}
              className="mini-notion-content"
              contentEditable
              suppressContentEditableWarning
              onInput={handleContentInput}
              onPaste={handlePaste}
              onContextMenu={onEditorContextMenu}
              onClick={onEditorClick}
              onKeyDown={onEditorKeyDown}
              data-placeholder="Escreva aqui…"
              dangerouslySetInnerHTML={{ __html: currentPage.content || "" }}
            />

            {menu.open && (
              <div
                className="mini-notion-context-menu"
                style={{ left: menu.x, top: menu.y }}
              >
                <button className="mini-notion-ctx-item" onClick={onTransformSelectionToPage}>
                  Transformar seleção em página <span className="mini-notion-kbd">Ctrl/⌘ + Shift + K</span>
                </button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

// === Sidebar Tree ===
interface PageTreeProps {
  tree: any;
  currentId: string;
  onNavigate: (id: string) => void;
}

function PageTree({ tree, currentId, onNavigate }: PageTreeProps) {
  return (
    <div className="mini-notion-tree">
      {tree.roots.length === 0 && (
        <div className="mini-notion-empty">Sem páginas ainda.</div>
      )}
      {tree.roots.map((id: string) => (
        <TreeNode
          key={id}
          id={id}
          nodes={tree.nodes}
          currentId={currentId}
          level={0}
          onNavigate={onNavigate}
        />
      ))}
    </div>
  );
}

interface TreeNodeProps {
  id: string;
  nodes: any;
  currentId: string;
  level: number;
  onNavigate: (id: string) => void;
}

function TreeNode({ id, nodes, currentId, level, onNavigate }: TreeNodeProps) {
  const node = nodes[id];
  const isActive = id === currentId;
  const hasChildren = node.children.length > 0;

  return (
    <div className="mini-notion-tree-node">
      <a
        href="#"
        className={`mini-notion-tree-link ${isActive ? "mini-notion-active" : ""}`}
        style={{ paddingLeft: 12 + level * 14 }}
        onClick={(e) => { e.preventDefault(); onNavigate(id); }}
        title={node.title}
      >
        {hasChildren ? "▸" : "•"} <span className="mini-notion-node-title">{node.title || "Sem título"}</span>
      </a>
      {hasChildren && (
        <div className="mini-notion-children">
          {node.children.map((cid: string) => (
            <TreeNode
              key={cid}
              id={cid}
              nodes={nodes}
              currentId={currentId}
              level={level + 1}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// === Helpers to build tree/breadcrumb ===
function buildTree(pages: any) {
  const nodes: any = {};
  const roots: string[] = [];
  // Initialize
  Object.values(pages).forEach((p: any) => {
    nodes[p.id] = { id: p.id, title: p.title, parentId: p.parentId, children: [] };
  });
  // Link
  Object.values(pages).forEach((p: any) => {
    if (p.parentId && nodes[p.parentId]) {
      nodes[p.parentId].children.push(p.id);
    } else if (p.parentId === null) {
      roots.push(p.id);
    }
  });
  // Sort children by updatedAt desc (newer first)
  Object.values(pages).forEach((p: any) => {
    const n = nodes[p.id];
    n.children.sort((a: string, b: string) => ((pages[b] as any).updatedAt || "").localeCompare((pages[a] as any).updatedAt || ""));
  });
  // Sort roots as well
  roots.sort((a, b) => ((pages[b] as any).updatedAt || "").localeCompare((pages[a] as any).updatedAt || ""));
  return { nodes, roots };
}

function buildBreadcrumb(current: any, pages: any) {
  if (!current) return [];
  const path = [];
  let p = current;
  while (p) {
    path.push({ id: p.id, title: p.title || "Sem título" });
    p = p.parentId ? pages[p.parentId] : null;
  }
  return path.reverse();
}

function truncate(s: string, n: number) {
  if (!s) return s;
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}

function getCaretClientRect() {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return { x: 0, y: 0 };
  const range = sel.getRangeAt(0).cloneRange();
  range.collapse(true);
  const rect = range.getClientRects()[0];
  if (!rect) return { x: window.innerWidth / 2, y: window.innerHeight / 2 };
  return { x: rect.left, y: rect.bottom };
}

function loadPages() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return {};
}

function loadCurrentId() {
  try {
    const raw = localStorage.getItem(STORAGE_CURRENT);
    if (raw) return raw;
  } catch {}
  return null;
}

// === Styles (no Tailwind needed) ===
const styles = `
:root{
  --mn-bg: #0b0c0f; /* dark base */
  --mn-panel: #12141a;
  --mn-muted: #8b93a1;
  --mn-text: #e6e9ef;
  --mn-accent: #7aa2f7;
  --mn-border: #222635;
}
.mini-notion-app-shell { display: grid; grid-template-columns: 280px 1fr; height: calc(100vh - 120px); }

.mini-notion-sidebar { background: var(--mn-panel); border-right: 1px solid var(--mn-border); overflow: auto; }
.mini-notion-sidebar-header { display:flex; align-items:center; justify-content:center; padding: 12px; border-bottom: 1px solid var(--mn-border); }
.mini-notion-btn { background: #1a1f2b; color: var(--mn-text); border: 1px solid var(--mn-border); border-radius: 10px; padding: 8px 10px; cursor: pointer; transition: .2s ease; }
.mini-notion-btn:hover { background: #202638; }

.mini-notion-tree { padding: 8px; }
.mini-notion-tree-link { display:block; color: var(--mn-text); text-decoration: none; padding: 6px 8px; border-radius: 8px; margin: 2px 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.mini-notion-tree-link:hover { background: #161924; }
.mini-notion-tree-link.mini-notion-active { background: #1d2230; outline: 1px solid #2a3248; }
.mini-notion-node-title { margin-left: 6px; }
.mini-notion-children { margin-left: 0; }
.mini-notion-empty { color: var(--mn-muted); font-style: italic; padding: 8px; }

.mini-notion-editor { padding: 24px 28px 48px; overflow: auto; }
.mini-notion-breadcrumb { color: var(--mn-muted); font-size: 12px; margin-bottom: 6px; }
.mini-notion-breadcrumb a { color: var(--mn-muted); text-decoration: none; }
.mini-notion-breadcrumb a:hover { color: var(--mn-text); }
.mini-notion-crumb-sep { display: inline-block; padding: 0 6px; color: #5b6170; }

.mini-notion-title-input { width: 100%; background: transparent; border: none; outline: none; color: var(--mn-text); font-size: 28px; font-weight: 700; margin: 6px 0 10px; letter-spacing: .2px; }

.mini-notion-content { min-height: calc(100vh - 200px); outline: none; padding: 8px 0; }
.mini-notion-content:empty:before { content: attr(data-placeholder); color: var(--mn-muted); }
.mini-notion-content p { margin: 8px 0; }
.mini-notion-content h1, .mini-notion-content h2, .mini-notion-content h3 { margin: 14px 0 8px; }
.mini-notion-content a { color: var(--mn-accent); }
.page-link { cursor: pointer; border-radius: 4px; padding: 0 2px; }
.page-link:hover { background: #1e2433; }

.mini-notion-context-menu { position: fixed; z-index: 1000; background: #0f1220; border: 1px solid var(--mn-border); border-radius: 10px; box-shadow: 0 10px 30px rgba(0,0,0,.4); min-width: 260px; padding: 6px; }
.mini-notion-ctx-item { width: 100%; background: transparent; border: none; color: var(--mn-text); text-align: left; padding: 10px 12px; border-radius: 8px; cursor: pointer; }
.mini-notion-ctx-item:hover { background: #1a1f2b; }
.mini-notion-kbd { float: right; color: var(--mn-muted); font-size: 11px; }
`;