// Advanced Notion‑like editor with nested pages, drag‑and‑drop and true multi‑selection
//
// This React component provides a minimal Notion clone with the ability to:
//  - Create pages and nested sub‑pages (pages inside pages) via a sidebar
//  - Edit each page title and a list of text blocks (one line per block)
//  - Select multiple blocks using Shift+Click/Arrow, Ctrl/Cmd+Click or by dragging
//    a selection rectangle across the rows. A selection can span contiguous rows
//    and supports additive selection when holding Ctrl/Cmd during a drag.
//  - Reorder blocks within a page via drag‑and‑drop. Selected blocks move together.
//  - Move selected blocks to another page by dragging onto the page item in the sidebar.
//  - Persist data locally in localStorage so your pages are restored on reload.
//
// The multi‑selection logic is inspired by desktop UIs: when dragging the mouse
// over rows, the component tracks the block currently under the pointer and
// computes the selection range between the anchor and hovered row. A global
// pointermove/up listener is used so selection continues even when the pointer
// leaves the row. When Ctrl/Cmd is held at drag start, the selected range is
// added to any existing selection.

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { setPageSEO } from '@/lib/seo';

// Generate a roughly unique id (sufficient for this example)
function uuid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

// Data structures
type Block = { id: string; content: string };
type Page = { id: string; parentId: string | null; title: string; blocks: Block[] };
type DragData = { sourcePageId: string; blockIds: string[] };

type UIState = {
  activePageId: string;
  // Which blocks are currently selected
  selectedBlockIds: string[];
  // The block that currently has the caret/focus
  focusedBlockId: string | null;
  // The anchor block for range selection (shift)
  anchorBlockId: string | null;
  // Drag selection state: are we currently dragging to select rows?
  isDragSelecting: boolean;
  // The block where the current drag selection started
  dragAnchorId: string | null;
  // Whether Ctrl/Cmd was held at drag start (additive selection)
  dragAdditive: boolean;
};

export default function Organizacao5() {
  // SEO Configuration
  useEffect(() => {
    setPageSEO(
      "Organização 5 - Editor Avançado Notion-like",
      "Editor avançado com seleção múltipla aprimorada, páginas aninhadas e drag-and-drop completo, estilo Notion."
    );
  }, []);

  // Initialise pages from localStorage or with a single root page
  const initialPages = useMemo<Page[]>(() => {
    const saved = localStorage.getItem('notion-like-organizacao5-v1');
    if (saved) {
      try {
        return JSON.parse(saved) as Page[];
      } catch {
        // ignore
      }
    }
    const rootId = uuid();
    return [
      {
        id: rootId,
        parentId: null,
        title: 'Página sem título',
        blocks: [ { id: uuid(), content: '' } ],
      },
    ];
  }, []);

  const [pages, setPages] = useState<Page[]>(initialPages);
  const [ui, setUI] = useState<UIState>(() => ({
    activePageId: initialPages[0]?.id || '',
    selectedBlockIds: [],
    focusedBlockId: null,
    anchorBlockId: null,
    isDragSelecting: false,
    dragAnchorId: null,
    dragAdditive: false,
  }));

  // Persist pages to localStorage when they change
  useEffect(() => {
    localStorage.setItem('notion-like-organizacao5-v1', JSON.stringify(pages));
  }, [pages]);

  // Utility: get active page object
  const activePage = pages.find((p) => p.id === ui.activePageId);

  // Utility: index of a block within active page
  function getBlockIndex(blockId: string) {
    if (!activePage) return -1;
    return activePage.blocks.findIndex((b) => b.id === blockId);
  }

  // Create a new block below a given block id, return new id
  function createBlockBelow(blockId: string) {
    if (!activePage) return;
    const newId = uuid();
    setPages((ps) =>
      ps.map((p) => {
        if (p.id !== ui.activePageId) return p;
        const idx = p.blocks.findIndex((b) => b.id === blockId);
        const next = [...p.blocks];
        next.splice(idx + 1, 0, { id: newId, content: '' });
        return { ...p, blocks: next };
      }),
    );
    // select new block
    setUI((u) => ({
      ...u,
      selectedBlockIds: [newId],
      focusedBlockId: newId,
      anchorBlockId: newId,
    }));
    return newId;
  }

  // Delete a block (ensures at least one exists)
  function deleteBlock(blockId: string) {
    if (!activePage) return;
    setPages((ps) =>
      ps.map((p) => {
        if (p.id !== ui.activePageId) return p;
        const filtered = p.blocks.filter((b) => b.id !== blockId);
        return { ...p, blocks: filtered.length ? filtered : [ { id: uuid(), content: '' } ] };
      }),
    );
    setUI((u) => ({
      ...u,
      selectedBlockIds: u.selectedBlockIds.filter((id) => id !== blockId),
    }));
  }

  // Update block content
  function updateBlockContent(blockId: string, content: string) {
    if (!activePage) return;
    setPages((ps) =>
      ps.map((p) => {
        if (p.id !== ui.activePageId) return p;
        const blocks = p.blocks.map((b) => (b.id === blockId ? { ...b, content } : b));
        return { ...p, blocks };
      }),
    );
  }

  // Page creation (top level or subpage)
  function createPage(parentId: string | null) {
    const newId = uuid();
    setPages((ps) => [
      ...ps,
      { id: newId, parentId, title: 'Nova página', blocks: [ { id: uuid(), content: '' } ] },
    ]);
    // activate new page
    setUI((u) => ({
      ...u,
      activePageId: newId,
      selectedBlockIds: [],
      focusedBlockId: null,
      anchorBlockId: null,
    }));
  }

  // Move blocks to another page; append at end
  function moveBlocks(data: DragData, destPageId: string) {
    if (data.sourcePageId === destPageId) return;
    setPages((ps) => {
      let moved: Block[] = [];
      const updated = ps.map((p) => {
        if (p.id === data.sourcePageId) {
          const remaining = p.blocks.filter((b) => !data.blockIds.includes(b.id));
          moved = p.blocks.filter((b) => data.blockIds.includes(b.id));
          return { ...p, blocks: remaining.length ? remaining : [ { id: uuid(), content: '' } ] };
        }
        return p;
      });
      return updated.map((p) => {
        if (p.id === destPageId) {
          return { ...p, blocks: [...p.blocks, ...moved] };
        }
        return p;
      });
    });
    setUI((u) => ({ ...u, selectedBlockIds: [], focusedBlockId: null, anchorBlockId: null }));
  }

  // Reorder blocks within the current page. If targetId is null, append at end.
  function reorderBlocks(blockIds: string[], targetId: string | null) {
    if (!activePage) return;
    if (targetId && blockIds.includes(targetId)) return; // don't reorder onto self
    setPages((ps) =>
      ps.map((p) => {
        if (p.id !== ui.activePageId) return p;
        // separate dragged blocks
        const dragged = p.blocks.filter((b) => blockIds.includes(b.id));
        const remaining = p.blocks.filter((b) => !blockIds.includes(b.id));
        let index = remaining.length; // default to end
        if (targetId) {
          const idx = remaining.findIndex((b) => b.id === targetId);
          index = idx === -1 ? remaining.length : idx;
        }
        const next = [...remaining];
        next.splice(index, 0, ...dragged);
        return { ...p, blocks: next };
      }),
    );
    // update selection/focus to the first dragged block
    const first = blockIds[0];
    setUI((u) => ({ ...u, selectedBlockIds: blockIds, focusedBlockId: first, anchorBlockId: first }));
  }

  // Get page hierarchy in a tree for sidebar rendering
  function renderPageTree(parentId: string | null, depth = 0): JSX.Element[] {
    return pages
      .filter((p) => p.parentId === parentId)
      .map((p) => {
        const active = p.id === ui.activePageId;
        const children = renderPageTree(p.id, depth + 1);
        return (
          <div key={p.id} className="mb-1 pl-2">
            <div
              draggable
              onDragOver={(e) => {
                e.preventDefault();
              }}
              onDrop={(e) => {
                e.preventDefault();
                const data = e.dataTransfer.getData('application/json');
                if (!data) return;
                try {
                  const parsed: DragData = JSON.parse(data);
                  moveBlocks(parsed, p.id);
                } catch {
                  /* ignore */
                }
              }}
              className={`flex items-center justify-between rounded px-2 py-1 cursor-pointer ${
                active ? 'bg-gray-200' : 'hover:bg-gray-100'
              }`}
              onClick={() => setUI((u) => ({ ...u, activePageId: p.id, selectedBlockIds: [], focusedBlockId: null, anchorBlockId: null }))}
            >
              <span className="flex-1 truncate">
                {depth > 0 && <span className="mr-1">{Array(depth).fill('↳').join('')}</span>}
                {p.title || 'Sem título'}
              </span>
              <button
                className="ml-2 text-gray-500 hover:text-gray-700"
                onClick={(e) => {
                  e.stopPropagation();
                  createPage(p.id);
                }}
                title="Criar subpágina"
              >
                +
              </button>
            </div>
            {children.length > 0 && <div className="pl-2">{children}</div>}
          </div>
        );
      });
  }

  // Refs to track selection drag across the list
  const containerRef = useRef<HTMLDivElement | null>(null);
  const selectionSnapshot = useRef<string[]>([]);

  // Global pointer listeners for drag selection
  useEffect(() => {
    function onPointerMove(e: PointerEvent) {
      if (!ui.isDragSelecting || !ui.dragAnchorId) return;
      // Determine which block is under the pointer
      const id = getBlockIdFromPoint(e.clientX, e.clientY);
      if (!id) return;
      // Compute range from dragAnchorId to hovered id
      const p = activePage;
      if (!p) return;
      const fromIdx = p.blocks.findIndex((b) => b.id === ui.dragAnchorId);
      const toIdx = p.blocks.findIndex((b) => b.id === id);
      if (fromIdx === -1 || toIdx === -1) return;
      const [start, end] = fromIdx <= toIdx ? [fromIdx, toIdx] : [toIdx, fromIdx];
      const range = p.blocks.slice(start, end + 1).map((b) => b.id);
      // combine with previous selection if additive
      const base = ui.dragAdditive ? selectionSnapshot.current : [];
      const combined = Array.from(new Set([...base, ...range]));
      setUI((u) => ({ ...u, selectedBlockIds: combined, focusedBlockId: id }));
    }
    function onPointerUp() {
      if (ui.isDragSelecting) {
        setUI((u) => ({ ...u, isDragSelecting: false, dragAnchorId: null, dragAdditive: false }));
      }
    }
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };
  }, [ui.isDragSelecting, ui.dragAnchorId, ui.dragAdditive, pages]);

  // Helper to map cursor position to a block id
  function getBlockIdFromPoint(x: number, y: number): string | null {
    const el = document.elementFromPoint(x, y) as HTMLElement | null;
    const blockEl = el?.closest('[data-block-id]') as HTMLElement | null;
    return blockEl?.dataset.blockId || null;
  }

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <aside className="w-64 border-r overflow-auto p-3 space-y-2">
        <button
          className="w-full bg-blue-500 text-white rounded px-3 py-2 mb-3"
          onClick={() => createPage(null)}
        >
          Nova página
        </button>
        <div>{renderPageTree(null)}</div>
      </aside>

      {/* Editor area */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {activePage ? (
          <>
            {/* Page title */}
            <div className="border-b p-4">
              <input
                className="w-full text-2xl font-semibold outline-none"
                value={activePage.title}
                placeholder="Sem título"
                onChange={(e) => {
                  const value = e.target.value;
                  setPages((ps) => ps.map((p) => (p.id === ui.activePageId ? { ...p, title: value } : p)));
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    // focus first block
                    const first = activePage.blocks[0];
                    if (first) {
                      setUI((u) => ({ ...u, selectedBlockIds: [first.id], focusedBlockId: first.id, anchorBlockId: first.id }));
                      const el = document.querySelector<HTMLInputElement>(`[data-block-id="${first.id}"] input`);
                      el?.focus();
                    }
                  }
                }}
              />
            </div>
            {/* Blocks list */}
            <div
              ref={containerRef}
              className="flex-1 overflow-auto p-4"
              onDragOver={(e) => {
                e.preventDefault();
              }}
              onDrop={(e) => {
                e.preventDefault();
                const data = e.dataTransfer.getData('application/json');
                if (!data) return;
                try {
                  const parsed: DragData = JSON.parse(data);
                  if (parsed.sourcePageId === ui.activePageId) {
                    // reorder to end
                    reorderBlocks(parsed.blockIds, null);
                  } else {
                    moveBlocks(parsed, ui.activePageId);
                  }
                } catch {
                  /* ignore */
                }
              }}
              style={{ userSelect: ui.isDragSelecting ? 'none' : undefined }}
            >
              {activePage.blocks.map((block, idx) => {
                const isSel = ui.selectedBlockIds.includes(block.id);
                const isFocused = ui.focusedBlockId === block.id;
                return (
                  <div
                    key={block.id}
                    data-block-id={block.id}
                    draggable={!ui.isDragSelecting}
                    onDragStart={(e) => {
                      if (ui.isDragSelecting) return;
                      // Determine which blocks to drag: selected or just this one
                      const dragIds = ui.selectedBlockIds.includes(block.id) ? ui.selectedBlockIds : [block.id];
                      const data: DragData = { sourcePageId: ui.activePageId, blockIds: dragIds };
                      e.dataTransfer.setData('application/json', JSON.stringify(data));
                      e.dataTransfer.effectAllowed = 'move';
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      const data = e.dataTransfer.getData('application/json');
                      if (!data) return;
                      try {
                        const parsed: DragData = JSON.parse(data);
                        if (parsed.sourcePageId === ui.activePageId) {
                          reorderBlocks(parsed.blockIds, block.id);
                        } else {
                          moveBlocks(parsed, ui.activePageId);
                        }
                      } catch {
                        /* ignore */
                      }
                    }}
                    className={`group flex items-center gap-2 px-2 py-1 mb-1 rounded border ${
                      isSel
                        ? 'bg-blue-50 border-blue-400'
                        : isFocused
                        ? 'bg-gray-50 border-gray-300'
                        : 'border-transparent hover:bg-gray-50'
                    }`}
                    onPointerDown={(e) => {
                      // Start a drag selection if left button
                      if (e.button !== 0) return;
                      // If shift key: extend range from anchor
                      if (e.shiftKey && ui.anchorBlockId) {
                        const anchor = ui.anchorBlockId;
                        const currentIdx = getBlockIndex(block.id);
                        const anchorIdx = getBlockIndex(anchor);
                        if (anchorIdx !== -1 && currentIdx !== -1) {
                          const [start, end] = anchorIdx <= currentIdx ? [anchorIdx, currentIdx] : [currentIdx, anchorIdx];
                          const range = activePage?.blocks.slice(start, end + 1).map((b) => b.id) || [];
                          setUI((u) => ({ ...u, selectedBlockIds: range, focusedBlockId: block.id }));
                        }
                        return;
                      }
                      // If Ctrl/Cmd: toggle selection without clearing
                      if (e.ctrlKey || e.metaKey) {
                        setUI((u) => {
                          const already = u.selectedBlockIds.includes(block.id);
                          const nextSel = already
                            ? u.selectedBlockIds.filter((id) => id !== block.id)
                            : [...u.selectedBlockIds, block.id];
                          return {
                            ...u,
                            selectedBlockIds: nextSel,
                            focusedBlockId: block.id,
                            anchorBlockId: block.id,
                          };
                        });
                        return;
                      }
                      // Otherwise: start new selection (dragSelect) or single selection
                      selectionSnapshot.current = ui.selectedBlockIds;
                      setUI((u) => ({
                        ...u,
                        isDragSelecting: true,
                        dragAnchorId: block.id,
                        dragAdditive: e.ctrlKey || e.metaKey,
                        anchorBlockId: block.id,
                        focusedBlockId: block.id,
                        selectedBlockIds: e.ctrlKey || e.metaKey ? Array.from(new Set([...u.selectedBlockIds, block.id])) : [block.id],
                      }));
                      e.preventDefault();
                    }}
                    onPointerEnter={() => {
                      // When dragging, update range selection as we enter new blocks
                      if (!ui.isDragSelecting || !ui.dragAnchorId) return;
                      const anchor = ui.dragAnchorId;
                      const currentId = block.id;
                      const p = activePage;
                      if (!p) return;
                      const aIdx = p.blocks.findIndex((b) => b.id === anchor);
                      const cIdx = p.blocks.findIndex((b) => b.id === currentId);
                      if (aIdx === -1 || cIdx === -1) return;
                      const [start, end] = aIdx <= cIdx ? [aIdx, cIdx] : [cIdx, aIdx];
                      const range = p.blocks.slice(start, end + 1).map((b) => b.id);
                      const base = ui.dragAdditive ? selectionSnapshot.current : [];
                      const combined = Array.from(new Set([...base, ...range]));
                      setUI((u) => ({ ...u, selectedBlockIds: combined, focusedBlockId: currentId }));
                    }}
                    onPointerUp={() => {
                      // End drag select on release
                      if (ui.isDragSelecting) {
                        setUI((u) => ({ ...u, isDragSelecting: false, dragAnchorId: null, dragAdditive: false }));
                      }
                    }}
                  >
                    {/* drag handle / selection handle */}
                    <span className="cursor-pointer select-none px-1" title="Arraste ou selecione">⋮⋮</span>
                    {/* input for editing */}
                    <input
                      className="flex-1 bg-transparent outline-none"
                      value={block.content}
                      placeholder={idx === 0 && !block.content ? 'Escreva uma linha…' : ''}
                      onChange={(e) => updateBlockContent(block.id, e.target.value)}
                      onFocus={() => {
                        // update focus and anchor when focusing input
                        setUI((u) => ({
                          ...u,
                          focusedBlockId: block.id,
                          anchorBlockId: block.id,
                          // if block isn't selected, clear selection
                          selectedBlockIds: u.selectedBlockIds.includes(block.id) ? u.selectedBlockIds : [],
                        }));
                      }}
                      onKeyDown={(e) => {
                        const input = e.currentTarget as HTMLInputElement;
                        const atStart = input.selectionStart === 0 && input.selectionEnd === 0;
                        const atEnd = input.selectionStart === input.value.length;
                        // Shift+arrow extends selection via keyboard
                        if (e.shiftKey && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
                          e.preventDefault();
                          const dir = e.key === 'ArrowDown' ? 1 : -1;
                          const currentIdx = getBlockIndex(block.id);
                          const nextIdx = currentIdx + dir;
                          const nextBlock = activePage?.blocks[nextIdx];
                          if (nextBlock) {
                            // compute range with anchor
                            const anchor = ui.anchorBlockId || block.id;
                            const anchorIdx = getBlockIndex(anchor);
                            const [start, end] = anchorIdx <= nextIdx ? [anchorIdx, nextIdx] : [nextIdx, anchorIdx];
                            const range = activePage?.blocks.slice(start, end + 1).map((b) => b.id) || [];
                            setUI((u) => ({ ...u, selectedBlockIds: range, focusedBlockId: nextBlock.id }));
                            // focus next input
                            const el = document.querySelector<HTMLInputElement>(`[data-block-id="${nextBlock.id}"] input`);
                            el?.focus();
                          }
                          return;
                        }
                        // Arrow down/up without shift moves focus when caret at end/start
                        if (!e.shiftKey && e.key === 'ArrowDown' && atEnd) {
                          e.preventDefault();
                          const next = activePage?.blocks[idx + 1];
                          if (next) {
                            setUI((u) => ({ ...u, selectedBlockIds: [], focusedBlockId: next.id, anchorBlockId: next.id }));
                            const el = document.querySelector<HTMLInputElement>(`[data-block-id="${next.id}"] input`);
                            el?.focus();
                          }
                          return;
                        }
                        if (!e.shiftKey && e.key === 'ArrowUp' && atStart) {
                          e.preventDefault();
                          const prev = activePage?.blocks[idx - 1];
                          if (prev) {
                            setUI((u) => ({ ...u, selectedBlockIds: [], focusedBlockId: prev.id, anchorBlockId: prev.id }));
                            const el = document.querySelector<HTMLInputElement>(`[data-block-id="${prev.id}"] input`);
                            el?.focus();
                          }
                          return;
                        }
                        // Enter to create new block
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          const newId = createBlockBelow(block.id);
                          setTimeout(() => {
                            const el = document.querySelector<HTMLInputElement>(`[data-block-id="${newId}"] input`);
                            el?.focus();
                          }, 0);
                          return;
                        }
                        // Backspace at start of empty block deletes it
                        if (e.key === 'Backspace' && atStart && block.content === '') {
                          e.preventDefault();
                          const prev = activePage?.blocks[idx - 1];
                          deleteBlock(block.id);
                          if (prev) {
                            setTimeout(() => {
                              const el = document.querySelector<HTMLInputElement>(`[data-block-id="${prev.id}"] input`);
                              el?.focus();
                            }, 0);
                          }
                          return;
                        }
                      }}
                    />
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <div className="p-4">Selecione uma página</div>
        )}
      </main>
    </div>
  );
}
