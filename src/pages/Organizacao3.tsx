import React, { useState, useMemo, useEffect } from 'react';
import { setPageSEO } from "@/lib/seo";

// Helpers
function uuid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

// Types for clarity
type Block = {
  id: string;
  content: string;
};
type Page = {
  id: string;
  parentId: string | null;
  title: string;
  blocks: Block[];
};
type DragData = {
  sourcePageId: string;
  blockIds: string[];
};

export default function Organizacao3() {
  // SEO
  useEffect(() => {
    setPageSEO("Organização 3 - Editor Avançado", "Editor de páginas hierárquicas com blocos de texto, similar ao Notion");
  }, []);

  // Load from localStorage or create a default root page
  const initialState = useMemo((): Page[] => {
    const saved = localStorage.getItem('notion-like-organizacao3-v1');
    if (saved) {
      try {
        return JSON.parse(saved) as Page[];
      } catch { }
    }
    const rootId = uuid();
    return [
      {
        id: rootId,
        parentId: null,
        title: 'Página sem título',
        blocks: [{ id: uuid(), content: '' }],
      },
    ];
  }, []);

  const [pages, setPages] = useState<Page[]>(initialState);
  const [activePageId, setActivePageId] = useState<string>(pages[0]?.id || '');
  // UI state for selection and focus
  const [focusedBlockId, setFocusedBlockId] = useState<string | null>(null);
  const [anchorBlockId, setAnchorBlockId] = useState<string | null>(null);
  const [selectedBlockIds, setSelectedBlockIds] = useState<string[]>([]);
  const [isSelecting, setIsSelecting] = useState<boolean>(false);
  const [selectionAdditive, setSelectionAdditive] = useState<boolean>(false);

  // Persist pages to localStorage on change
  useEffect(() => {
    localStorage.setItem('notion-like-organizacao3-v1', JSON.stringify(pages));
  }, [pages]);

  // Derived: active page object
  const activePage = pages.find((p) => p.id === activePageId);

  // Utility to get blocks from page
  const getBlockIndex = (blockId: string) => {
    if (!activePage) return -1;
    return activePage.blocks.findIndex((b) => b.id === blockId);
  };

  // Create new block below a given block
  function createBlockBelow(blockId: string) {
    if (!activePage) return;
    const newId = uuid();
    setPages((ps) =>
      ps.map((p) => {
        if (p.id !== activePageId) return p;
        const idx = p.blocks.findIndex((b) => b.id === blockId);
        const newBlocks = [...p.blocks];
        newBlocks.splice(idx + 1, 0, { id: newId, content: '' });
        return { ...p, blocks: newBlocks };
      }),
    );
    setSelectedBlockIds([]);
    setAnchorBlockId(newId);
    setFocusedBlockId(newId);
    return newId;
  }

  // Delete a block (and keep at least one)
  function deleteBlock(blockId: string) {
    if (!activePage) return;
    setPages((ps) =>
      ps.map((p) => {
        if (p.id !== activePageId) return p;
        let nextBlocks = p.blocks.filter((b) => b.id !== blockId);
        if (nextBlocks.length === 0) nextBlocks = [{ id: uuid(), content: '' }];
        return { ...p, blocks: nextBlocks };
      }),
    );
    setSelectedBlockIds((ids) => ids.filter((id) => id !== blockId));
  }

  // Update block content
  function updateBlockContent(blockId: string, text: string) {
    if (!activePage) return;
    setPages((ps) =>
      ps.map((p) => {
        if (p.id !== activePageId) return p;
        const updatedBlocks = p.blocks.map((b) => (b.id === blockId ? { ...b, content: text } : b));
        return { ...p, blocks: updatedBlocks };
      }),
    );
  }

  // Create new page (top level or as subpage)
  function createPage(parentId: string | null) {
    const newPageId = uuid();
    setPages((ps) => [
      ...ps,
      {
        id: newPageId,
        parentId,
        title: 'Nova página',
        blocks: [{ id: uuid(), content: '' }],
      },
    ]);
    setActivePageId(newPageId);
    setFocusedBlockId(null);
    setSelectedBlockIds([]);
  }

  // Move blocks from one page to another (append at end)
  function moveBlocks({ sourcePageId, blockIds }: DragData, destPageId: string) {
    if (sourcePageId === destPageId) return;
    setPages((ps) => {
      let sourceBlocks: Block[] = [];
      const updated = ps.map((p) => {
        if (p.id === sourcePageId) {
          const remaining = p.blocks.filter((b) => !blockIds.includes(b.id));
          const moved = p.blocks.filter((b) => blockIds.includes(b.id));
          sourceBlocks = moved;
          return { ...p, blocks: remaining.length > 0 ? remaining : [{ id: uuid(), content: '' }] };
        }
        return p;
      });
      return updated.map((p) => {
        if (p.id === destPageId) {
          return { ...p, blocks: [...p.blocks, ...sourceBlocks] };
        }
        return p;
      });
    });
    setSelectedBlockIds([]);
    setAnchorBlockId(null);
    setFocusedBlockId(null);
  }

  // Reorder blocks within the current page. If targetId is null, append to end.
  function reorderBlocks(blockIds: string[], targetId: string | null) {
    if (!activePage) return;
    // do nothing if dropping onto one of the dragged blocks
    if (targetId && blockIds.includes(targetId)) return;
    setPages((ps) =>
      ps.map((p) => {
        if (p.id !== activePageId) return p;
        // filter out dragged blocks
        const dragged = p.blocks.filter((b) => blockIds.includes(b.id));
        const remaining = p.blocks.filter((b) => !blockIds.includes(b.id));
        // determine insertion index
        let insertionIndex = remaining.length; // default to end
        if (targetId) {
          const idx = remaining.findIndex((b) => b.id === targetId);
          insertionIndex = idx === -1 ? remaining.length : idx;
        }
        const newBlocks = [...remaining];
        newBlocks.splice(insertionIndex, 0, ...dragged);
        return { ...p, blocks: newBlocks };
      }),
    );
    // update selection and focus to the first dragged block
    const firstId = blockIds[0];
    setSelectedBlockIds(blockIds);
    setFocusedBlockId(firstId);
    setAnchorBlockId(firstId);
  }

  // Selection helpers
  function selectSingle(blockId: string) {
    setSelectedBlockIds([blockId]);
    setAnchorBlockId(blockId);
    setFocusedBlockId(blockId);
  }
  function toggleSelection(blockId: string) {
    setSelectedBlockIds((ids) => {
      if (ids.includes(blockId)) return ids.filter((id) => id !== blockId);
      return [...ids, blockId];
    });
    setAnchorBlockId(blockId);
    setFocusedBlockId(blockId);
  }
  function selectRange(toBlockId: string) {
    if (!activePage || !anchorBlockId) return;
    const fromIndex = getBlockIndex(anchorBlockId);
    const toIndex = getBlockIndex(toBlockId);
    if (fromIndex === -1 || toIndex === -1) return;
    const [start, end] = fromIndex <= toIndex ? [fromIndex, toIndex] : [toIndex, fromIndex];
    const range = activePage.blocks.slice(start, end + 1).map((b) => b.id);
    setSelectedBlockIds(selectionAdditive ? Array.from(new Set([...selectedBlockIds, ...range])) : range);
    setFocusedBlockId(toBlockId);
  }

  // Render nested pages in sidebar
  function renderPageTree(parentId: string | null, depth: number = 0) {
    return pages
      .filter((p) => p.parentId === parentId)
      .map((p) => {
        const isActive = p.id === activePageId;
        const subPages = renderPageTree(p.id, depth + 1);
        return (
          <div key={p.id} className="mb-1 pl-2">
            <div
              draggable
              onDragOver={(e) => {
                // allow dropping blocks onto a page
                e.preventDefault();
              }}
              onDrop={(e) => {
                e.preventDefault();
                const data = e.dataTransfer.getData('application/json');
                if (data) {
                  try {
                    const parsed: DragData = JSON.parse(data);
                    moveBlocks(parsed, p.id);
                  } catch { }
                }
              }}
              className={`flex items-center justify-between rounded px-2 py-1 cursor-pointer transition-colors ${isActive ? 'bg-accent text-accent-foreground' : 'hover:bg-muted'
                }`}
              onClick={() => setActivePageId(p.id)}
            >
              <span className="flex-1 truncate">
                {depth > 0 && <span className="mr-1 text-muted-foreground">{Array(depth).fill('↳').join('')}</span>}
                {p.title || 'Sem título'}
              </span>
              <button
                className="ml-2 text-muted-foreground hover:text-foreground text-sm"
                onClick={(e) => {
                  e.stopPropagation();
                  createPage(p.id);
                }}
                title="Criar subpágina"
              >
                +
              </button>
            </div>
            {subPages && subPages.length > 0 && <div className="pl-2">{subPages}</div>}
          </div>
        );
      });
  }

  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border overflow-auto p-3 space-y-2 bg-card">
        <button
          className="w-full bg-primary text-primary-foreground rounded px-3 py-2 mb-3 hover:opacity-90 transition-opacity"
          onClick={() => createPage(null)}
        >
          Nova página
        </button>
        <div>{renderPageTree(null)}</div>
      </aside>

      {/* Editor area */}
      <main className="flex-1 flex flex-col overflow-hidden bg-background">
        {activePage ? (
          <>
            {/* Page Title */}
            <div className="border-b border-border p-4">
              <input
                className="w-full text-2xl font-semibold outline-none bg-transparent text-foreground placeholder:text-muted-foreground"
                value={activePage.title}
                placeholder="Sem título"
                onChange={(e) => {
                  const value = e.target.value;
                  setPages((ps) => ps.map((p) => (p.id === activePageId ? { ...p, title: value } : p)));
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    // focus first block
                    const first = activePage.blocks[0];
                    if (first) {
                      setFocusedBlockId(first.id);
                      setAnchorBlockId(first.id);
                      const el = document.querySelector<HTMLInputElement>(`[data-block-id="${first.id}"] input`);
                      el?.focus();
                    }
                  }
                }}
              />
            </div>

            {/* Blocks */}
            <div
              className="flex-1 overflow-auto p-4"
              onDragOver={(e) => {
                // Allow dropping blocks into empty space (append to end)
                e.preventDefault();
              }}
              onDrop={(e) => {
                e.preventDefault();
                const data = e.dataTransfer.getData('application/json');
                if (!data) return;
                try {
                  const parsed: DragData = JSON.parse(data);
                  if (parsed.sourcePageId === activePageId) {
                    // reorder to end of this page
                    reorderBlocks(parsed.blockIds, null);
                  } else {
                    moveBlocks(parsed, activePageId);
                  }
                } catch {
                  /* ignore */
                }
              }}
            >
              {activePage.blocks.map((block, idx) => {
                const isSelected = selectedBlockIds.includes(block.id);
                const isFocused = focusedBlockId === block.id;
                return (
                  <div
                    key={block.id}
                    data-block-id={block.id}
                    // When selecting with the cursor, disable dragging so it doesn't interfere.
                    draggable={!isSelecting}
                    onDragStart={(e) => {
                      if (isSelecting) return;
                      // set drag data: if selection includes this block, drag selected; else single
                      const dragIds = selectedBlockIds.includes(block.id) ? selectedBlockIds : [block.id];
                      const dragData: DragData = { sourcePageId: activePageId, blockIds: dragIds };
                      e.dataTransfer.setData('application/json', JSON.stringify(dragData));
                      e.dataTransfer.effectAllowed = 'move';
                    }}
                    onDragOver={(e) => {
                      // allow dropping blocks onto another block
                      e.preventDefault();
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      const data = e.dataTransfer.getData('application/json');
                      if (!data) return;
                      try {
                        const parsed: DragData = JSON.parse(data);
                        // If source page is current page, reorder within page; otherwise move blocks here
                        if (parsed.sourcePageId === activePageId) {
                          reorderBlocks(parsed.blockIds, block.id);
                        } else {
                          moveBlocks(parsed, activePageId);
                        }
                      } catch {
                        /* ignore */
                      }
                    }}
                    className={`flex items-center gap-2 px-2 py-1 rounded mb-1 border transition-colors ${isSelected ? 'bg-accent border-primary' : isFocused ? 'bg-muted border-border' : 'border-transparent hover:bg-muted'
                      }`}
                    onMouseDown={(e) => {
                      // start selection
                      if (e.button !== 0) return;
                      setIsSelecting(true);
                      setSelectionAdditive(e.ctrlKey || e.metaKey);
                      if (e.shiftKey && anchorBlockId) {
                        // extend range selection
                        selectRange(block.id);
                      } else if (e.ctrlKey || e.metaKey) {
                        toggleSelection(block.id);
                      } else {
                        selectSingle(block.id);
                      }
                    }}
                    onMouseEnter={() => {
                      if (isSelecting) {
                        selectRange(block.id);
                      }
                    }}
                    onMouseUp={() => {
                      setIsSelecting(false);
                      setSelectionAdditive(false);
                    }}
                  >
                    {/* Drag handle / selection handle */}
                    <span className="cursor-pointer select-none px-1 text-muted-foreground hover:text-foreground" title="Arraste ou selecione">⋮⋮</span>
                    <input
                      className="flex-1 bg-transparent outline-none text-foreground placeholder:text-muted-foreground"
                      value={block.content}
                      placeholder={idx === 0 && !block.content ? 'Escreva uma linha…' : ''}
                      onChange={(e) => updateBlockContent(block.id, e.target.value)}
                      onFocus={() => {
                        setFocusedBlockId(block.id);
                        setAnchorBlockId(block.id);
                        if (!selectedBlockIds.includes(block.id)) {
                          setSelectedBlockIds([]);
                        }
                      }}
                      onKeyDown={(e) => {
                        const inputEl = e.currentTarget as HTMLInputElement;
                        const caretAtStart = inputEl.selectionStart === 0 && inputEl.selectionEnd === 0;
                        const caretAtEnd = inputEl.selectionStart === inputEl.value.length;

                        if (e.shiftKey && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
                          e.preventDefault();
                          // shift + arrow extends selection
                          const dir = e.key === 'ArrowDown' ? 'down' : 'up';
                          const currentIdx = getBlockIndex(block.id);
                          const nextIdx = dir === 'down' ? currentIdx + 1 : currentIdx - 1;
                          const nextBlock = activePage.blocks[nextIdx];
                          if (nextBlock) {
                            selectRange(nextBlock.id);
                          }
                          return;
                        }

                        // Arrow navigation between blocks
                        if (!e.shiftKey && e.key === 'ArrowDown' && caretAtEnd) {
                          e.preventDefault();
                          const nextBlock = activePage.blocks[idx + 1];
                          if (nextBlock) {
                            setSelectedBlockIds([]);
                            setAnchorBlockId(nextBlock.id);
                            setFocusedBlockId(nextBlock.id);
                            const el = document.querySelector<HTMLInputElement>(`[data-block-id="${nextBlock.id}"] input`);
                            el?.focus();
                          }
                          return;
                        }
                        if (!e.shiftKey && e.key === 'ArrowUp' && caretAtStart) {
                          e.preventDefault();
                          const prevBlock = activePage.blocks[idx - 1];
                          if (prevBlock) {
                            setSelectedBlockIds([]);
                            setAnchorBlockId(prevBlock.id);
                            setFocusedBlockId(prevBlock.id);
                            const el = document.querySelector<HTMLInputElement>(`[data-block-id="${prevBlock.id}"] input`);
                            el?.focus();
                          }
                          return;
                        }
                        // Enter to create new block
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          const newId = createBlockBelow(block.id);
                          // Focus will be set in createBlockBelow via state
                          setTimeout(() => {
                            const el = document.querySelector<HTMLInputElement>(`[data-block-id="${newId}"] input`);
                            el?.focus();
                          }, 0);
                          return;
                        }
                        // Backspace to delete empty block
                        if (e.key === 'Backspace' && caretAtStart && block.content === '') {
                          e.preventDefault();
                          deleteBlock(block.id);
                          // focus previous block
                          const prev = activePage.blocks[idx - 1];
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
          <div className="p-4 text-muted-foreground">Selecione uma página</div>
        )}
      </main>
    </div>
  );
}
