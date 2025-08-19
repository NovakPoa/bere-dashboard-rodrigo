import { useState, useEffect, useCallback, useRef } from 'react';
import { Plus, GripVertical, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

// Types
interface Block {
  id: string;
  type: 'text';
  content: string;
}

interface Page {
  id: string;
  title: string;
  blocks: Block[];
}

interface AppState {
  pages: Page[];
  ui: {
    activePageId: string | null;
    selectedBlockIds: string[];
    focusedBlockId: string | null;
    anchorBlockId: string | null;
    isDragSelecting: boolean;
    dragAnchorId: string | null;
  };
}

// Utils
const generateId = () => crypto.randomUUID();

const STORAGE_KEY = 'lovable-notion-lite-v1';

const saveToStorage = (state: AppState) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
};

const loadFromStorage = (): AppState => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Ensure new UI fields exist
      if (parsed.ui) {
        parsed.ui.focusedBlockId = parsed.ui.focusedBlockId || null;
        parsed.ui.anchorBlockId = parsed.ui.anchorBlockId || null;
        parsed.ui.isDragSelecting = parsed.ui.isDragSelecting || false;
        parsed.ui.dragAnchorId = parsed.ui.dragAnchorId || null;
      }
      return parsed;
    }
  } catch (e) {
    console.warn('Error loading from storage:', e);
  }
  
  // Default state with one empty page
  const firstPage: Page = {
    id: generateId(),
    title: 'Página sem título',
    blocks: [{ id: generateId(), type: 'text', content: '' }]
  };
  
  return {
    pages: [firstPage],
    ui: {
      activePageId: firstPage.id,
      selectedBlockIds: [],
      focusedBlockId: null,
      anchorBlockId: null,
      isDragSelecting: false,
      dragAnchorId: null
    }
  };
};

// Utility functions
const getBlockIndex = (page: Page, blockId: string): number => {
  return page.blocks.findIndex(b => b.id === blockId);
};

const focusBlockById = (blockId: string, atEnd = false) => {
  requestAnimationFrame(() => {
    const el = document.querySelector(`[data-block-id="${blockId}"] textarea`);
    if (el && el instanceof HTMLTextAreaElement) {
      el.focus({ preventScroll: true });
      el.scrollIntoView?.({ block: 'nearest' });
      if (atEnd) {
        el.setSelectionRange(el.value.length, el.value.length);
      } else {
        el.setSelectionRange(0, 0);
      }
    }
  });
};

const isCaretAtStart = (inputEl: HTMLTextAreaElement): boolean => {
  return inputEl.selectionStart === 0;
};

const isCaretAtEnd = (inputEl: HTMLTextAreaElement): boolean => {
  return inputEl.selectionStart === inputEl.value.length;
};

// Block Component
interface BlockEditorProps {
  block: Block;
  isSelected: boolean;
  isFocused: boolean;
  onContentChange: (id: string, content: string) => void;
  onEnter: (id: string) => void;
  onBackspace: (id: string) => void;
  onArrowUp: (id: string) => void;
  onArrowDown: (id: string) => void;
  onSelect: (id: string, additive: boolean, shift?: boolean) => void;
  onDragStart: (id: string, e: React.DragEvent) => void;
  onFocus: (id: string, ref: HTMLTextAreaElement) => void;
  onHandlePointerDown: (id: string, e: React.PointerEvent) => void;
  onHandlePointerEnter: (id: string, e: React.PointerEvent) => void;
}

const BlockEditor = ({ 
  block, 
  isSelected,
  isFocused,
  onContentChange, 
  onEnter, 
  onBackspace, 
  onArrowUp, 
  onArrowDown, 
  onSelect,
  onDragStart,
  onFocus,
  onHandlePointerDown,
  onHandlePointerEnter
}: BlockEditorProps) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  // Auto focus when marked as focused
  useEffect(() => {
    if (isFocused && textareaRef.current) {
      focusBlockById(block.id);
    }
  }, [isFocused, block.id]);
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    
    const isAtStart = isCaretAtStart(textarea);
    const isAtEnd = isCaretAtEnd(textarea);
    
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onEnter(block.id);
    } else if (e.key === 'Backspace' && isAtStart) {
      if (block.content === '') {
        e.preventDefault();
        onBackspace(block.id);
      }
    } else if (e.key === 'ArrowUp' && isAtStart) {
      if (e.shiftKey) {
        e.preventDefault();
        onSelect(block.id, false, true);
      } else {
        e.preventDefault();
        onArrowUp(block.id);
      }
    } else if (e.key === 'ArrowDown' && isAtEnd) {
      if (e.shiftKey) {
        e.preventDefault();
        onSelect(block.id, false, true);
      } else {
        e.preventDefault();
        onArrowDown(block.id);
      }
    }
  };
  
  const handleClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget || (e.target as Element).closest('.block-handle')) {
      onSelect(block.id, e.ctrlKey || e.metaKey, e.shiftKey);
    }
  };
  
  return (
    <div 
      data-block-id={block.id}
      className={cn(
        'group flex items-start gap-2 py-1 px-2 rounded-md transition-colors',
        isSelected && 'bg-primary/10 ring-2 ring-primary/20'
      )}
      onClick={handleClick}
      role="listitem"
      aria-selected={isSelected}
    >
      <div
        className="block-handle opacity-0 group-hover:opacity-100 mt-1 cursor-grab active:cursor-grabbing text-muted-foreground transition-opacity"
        draggable
        onDragStart={(e) => onDragStart(block.id, e)}
        onPointerDown={(e) => onHandlePointerDown(block.id, e)}
        onPointerEnter={(e) => onHandlePointerEnter(block.id, e)}
        aria-label="Arrastar bloco"
        style={{ userSelect: 'none', WebkitUserSelect: 'none' }}
      >
        <GripVertical className="h-4 w-4" />
      </div>
      
      <Textarea
        ref={textareaRef}
        value={block.content}
        onChange={(e) => onContentChange(block.id, e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => {
          if (textareaRef.current) {
            onFocus(block.id, textareaRef.current);
          }
        }}
        placeholder="Escreva uma linha…"
        className="min-h-[2rem] resize-none border-none shadow-none focus-visible:ring-0 px-0 py-1"
        rows={1}
      />
    </div>
  );
};

// Sidebar Component
interface SidebarProps {
  pages: Page[];
  activePageId: string | null;
  onPageSelect: (id: string) => void;
  onPageCreate: () => void;
  onPageDelete: (id: string) => void;
  onBlocksDrop: (sourcePageId: string, blockIds: string[], destPageId: string) => void;
}

const Sidebar = ({ 
  pages, 
  activePageId, 
  onPageSelect, 
  onPageCreate, 
  onPageDelete,
  onBlocksDrop 
}: SidebarProps) => {
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };
  
  const handleDrop = (e: React.DragEvent, pageId: string) => {
    e.preventDefault();
    const data = e.dataTransfer.getData('text/plain');
    if (data.startsWith('blocks:')) {
      const blockIds = data.substring(7).split(',');
      const sourcePageId = e.dataTransfer.getData('source-page-id') || '';
      onBlocksDrop(sourcePageId, blockIds, pageId);
    }
  };
  
  return (
    <div className="w-64 bg-muted/30 border-r p-4 flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold">Páginas</h2>
        <Button size="sm" variant="ghost" onClick={onPageCreate}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      
      <div className="space-y-1 flex-1">
        {pages.map((page) => (
          <div
            key={page.id}
            className={cn(
              'group flex items-center justify-between p-2 rounded cursor-pointer hover:bg-muted/50',
              activePageId === page.id && 'bg-primary/10 text-primary'
            )}
            onClick={() => onPageSelect(page.id)}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, page.id)}
          >
            <span className="truncate flex-1">
              {page.title || 'Sem título'}
            </span>
            <Button
              size="sm"
              variant="ghost"
              className="opacity-0 group-hover:opacity-100 h-6 w-6 p-0"
              onClick={(e) => {
                e.stopPropagation();
                onPageDelete(page.id);
              }}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
};

// Main Component
export default function Organizacao2() {
  const [state, setState] = useState<AppState>(loadFromStorage);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const blockRefs = useRef<{ [key: string]: HTMLTextAreaElement }>({});
  
  // Save to localStorage whenever state changes
  useEffect(() => {
    saveToStorage(state);
  }, [state]);

  // Drag selection handlers
  const handlePointerDown = useCallback((blockId: string, e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    setState(prev => ({
      ...prev,
      ui: {
        ...prev.ui,
        isDragSelecting: true,
        dragAnchorId: blockId,
        anchorBlockId: blockId,
        focusedBlockId: blockId,
        selectedBlockIds: [blockId]
      }
    }));
    
    // Capture pointer for drag events
    const target = e.currentTarget as Element;
    target.setPointerCapture?.(e.pointerId);
  }, []);

  const handlePointerEnter = useCallback((blockId: string, e: React.PointerEvent) => {
    setState(prev => {
      if (!prev.ui.isDragSelecting || !prev.ui.dragAnchorId || !prev.ui.activePageId) return prev;
      
      const page = prev.pages.find(p => p.id === prev.ui.activePageId);
      if (!page) return prev;
      
      // Compute range from anchor to current block
      const anchorIndex = getBlockIndex(page, prev.ui.dragAnchorId);
      const currentIndex = getBlockIndex(page, blockId);
      
      if (anchorIndex !== -1 && currentIndex !== -1) {
        const startIndex = Math.min(anchorIndex, currentIndex);
        const endIndex = Math.max(anchorIndex, currentIndex);
        const rangeIds = page.blocks.slice(startIndex, endIndex + 1).map(b => b.id);
        
        return {
          ...prev,
          ui: {
            ...prev.ui,
            selectedBlockIds: rangeIds,
            focusedBlockId: blockId
          }
        };
      }
      
      return prev;
    });
  }, []);

  // Global pointer up handler
  useEffect(() => {
    const handlePointerUp = () => {
      setState(prev => ({
        ...prev,
        ui: {
          ...prev.ui,
          isDragSelecting: false,
          dragAnchorId: null
        }
      }));
    };

    if (state.ui.isDragSelecting) {
      document.addEventListener('pointerup', handlePointerUp);
      return () => document.removeEventListener('pointerup', handlePointerUp);
    }
  }, [state.ui.isDragSelecting]);

  // SEO setup
  useEffect(() => {
    document.title = "Organização 2 - Editor Minimalista | Vida Inteligente";
    
    // Update meta description
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', 'Editor de páginas e blocos inspirado no Notion. Organize suas ideias com interface limpa e funcional. Crie, edite e organize conteúdo facilmente.');
    }
  }, []);
  
  const activePage = state.pages.find(p => p.id === state.ui.activePageId);
  
  // Page actions
  const createPage = useCallback((title = 'Página sem título') => {
    const newPage: Page = {
      id: generateId(),
      title,
      blocks: [{ id: generateId(), type: 'text', content: '' }]
    };
    
    setState(prev => ({
      ...prev,
      pages: [newPage, ...prev.pages],
      ui: {
        ...prev.ui,
        activePageId: newPage.id,
        selectedBlockIds: []
      }
    }));
  }, []);
  
  const deletePage = useCallback((pageId: string) => {
    if (!confirm('Tem certeza que deseja deletar esta página?')) return;
    
    setState(prev => {
      const newPages = prev.pages.filter(p => p.id !== pageId);
      const newActivePageId = prev.ui.activePageId === pageId 
        ? (newPages[0]?.id || null) 
        : prev.ui.activePageId;
      
      return {
        ...prev,
        pages: newPages,
        ui: {
          ...prev.ui,
          activePageId: newActivePageId,
          selectedBlockIds: []
        }
      };
    });
  }, []);
  
  const updatePageTitle = useCallback((pageId: string, newTitle: string) => {
    setState(prev => ({
      ...prev,
      pages: prev.pages.map(p => 
        p.id === pageId ? { ...p, title: newTitle } : p
      )
    }));
  }, []);
  
  // Block actions
  const createBlockBelow = useCallback((pageId: string, afterBlockId: string): string => {
    const newBlock: Block = {
      id: generateId(),
      type: 'text',
      content: ''
    };
    
    setState(prev => ({
      ...prev,
      pages: prev.pages.map(page => {
        if (page.id !== pageId) return page;
        
        const blockIndex = page.blocks.findIndex(b => b.id === afterBlockId);
        const newBlocks = [...page.blocks];
        newBlocks.splice(blockIndex + 1, 0, newBlock);
        
        return { ...page, blocks: newBlocks };
      }),
      ui: {
        ...prev.ui,
        selectedBlockIds: [],
        focusedBlockId: newBlock.id,
        anchorBlockId: newBlock.id
      }
    }));
    
    return newBlock.id;
  }, []);
  
  const deleteBlock = useCallback((pageId: string, blockId: string) => {
    setState(prev => ({
      ...prev,
      pages: prev.pages.map(page => {
        if (page.id !== pageId) return page;
        
        const blockIndex = page.blocks.findIndex(b => b.id === blockId);
        const newBlocks = page.blocks.filter(b => b.id !== blockId);
        
        // If we removed the last block, add an empty one
        if (newBlocks.length === 0) {
          newBlocks.push({ id: generateId(), type: 'text', content: '' });
        }
        
        // Focus previous block if exists
        setTimeout(() => {
          const prevBlock = page.blocks[blockIndex - 1];
          if (prevBlock) {
            const textarea = blockRefs.current[prevBlock.id];
            if (textarea) {
              textarea.focus();
              textarea.setSelectionRange(textarea.value.length, textarea.value.length);
            }
          }
        }, 0);
        
        return { ...page, blocks: newBlocks };
      }),
      ui: {
        ...prev.ui,
        selectedBlockIds: prev.ui.selectedBlockIds.filter(id => id !== blockId)
      }
    }));
  }, []);
  
  const updateBlockContent = useCallback((pageId: string, blockId: string, newContent: string) => {
    setState(prev => ({
      ...prev,
      pages: prev.pages.map(page => {
        if (page.id !== pageId) return page;
        return {
          ...page,
          blocks: page.blocks.map(block => 
            block.id === blockId ? { ...block, content: newContent } : block
          )
        };
      })
    }));
  }, []);
  
  // Paste handling
  const handlePaste = useCallback((e: React.ClipboardEvent, pageId: string, afterBlockId: string) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text');
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    if (lines.length <= 1) return;
    
    setState(prev => ({
      ...prev,
      pages: prev.pages.map(page => {
        if (page.id !== pageId) return page;
        
        const blockIndex = page.blocks.findIndex(b => b.id === afterBlockId);
        const newBlocks = [...page.blocks];
        
        const blocksToAdd = lines.map(line => ({
          id: generateId(),
          type: 'text' as const,
          content: line
        }));
        
        newBlocks.splice(blockIndex + 1, 0, ...blocksToAdd);
        
        return { ...page, blocks: newBlocks };
      })
    }));
  }, []);
  
  // Selection utilities
  const selectRangeByIds = useCallback((pageId: string, fromId: string, toId: string) => {
    const page = state.pages.find(p => p.id === pageId);
    if (!page) return;
    
    const fromIndex = getBlockIndex(page, fromId);
    const toIndex = getBlockIndex(page, toId);
    
    if (fromIndex === -1 || toIndex === -1) return;
    
    const startIndex = Math.min(fromIndex, toIndex);
    const endIndex = Math.max(fromIndex, toIndex);
    
    const rangeIds = page.blocks
      .slice(startIndex, endIndex + 1)
      .map(b => b.id);
    
    setState(prev => ({
      ...prev,
      ui: {
        ...prev.ui,
        selectedBlockIds: rangeIds,
        focusedBlockId: toId
      }
    }));
  }, [state.pages]);

  // Selection
  const selectBlock = useCallback((blockId: string, additive: boolean, shift = false) => {
    setState(prev => {
      const pageId = prev.ui.activePageId;
      if (!pageId) return prev;
      
      if (shift && prev.ui.anchorBlockId) {
        // Shift+click: select range
        const page = prev.pages.find(p => p.id === pageId);
        if (page) {
          const fromIndex = getBlockIndex(page, prev.ui.anchorBlockId);
          const toIndex = getBlockIndex(page, blockId);
          
          if (fromIndex !== -1 && toIndex !== -1) {
            const startIndex = Math.min(fromIndex, toIndex);
            const endIndex = Math.max(fromIndex, toIndex);
            const rangeIds = page.blocks.slice(startIndex, endIndex + 1).map(b => b.id);
            
            return {
              ...prev,
              ui: {
                ...prev.ui,
                selectedBlockIds: rangeIds,
                focusedBlockId: blockId
              }
            };
          }
        }
      } else if (additive) {
        // Ctrl+click: toggle selection
        const isSelected = prev.ui.selectedBlockIds.includes(blockId);
        return {
          ...prev,
          ui: {
            ...prev.ui,
            selectedBlockIds: isSelected 
              ? prev.ui.selectedBlockIds.filter(id => id !== blockId)
              : [...prev.ui.selectedBlockIds, blockId],
            focusedBlockId: blockId,
            anchorBlockId: blockId
          }
        };
      } else {
        // Normal click: single selection
        return {
          ...prev,
          ui: {
            ...prev.ui,
            selectedBlockIds: [blockId],
            focusedBlockId: blockId,
            anchorBlockId: blockId
          }
        };
      }
      
      return prev;
    });
  }, []);
  
  // Navigation
  const navigateBlock = useCallback((pageId: string, blockId: string, direction: 'up' | 'down') => {
    setState(prev => {
      const page = prev.pages.find(p => p.id === pageId);
      if (!page) return prev;
      
      const blockIndex = getBlockIndex(page, blockId);
      const targetIndex = direction === 'up' ? blockIndex - 1 : blockIndex + 1;
      const targetBlock = page.blocks[targetIndex];
      
      if (targetBlock) {
        return {
          ...prev,
          ui: {
            ...prev.ui,
            focusedBlockId: targetBlock.id,
            anchorBlockId: targetBlock.id,
            selectedBlockIds: []
          }
        };
      } else if (direction === 'up' && blockIndex === 0) {
        // Focus title if at first block
        setTimeout(() => {
          if (titleInputRef.current) {
            titleInputRef.current.focus();
          }
        }, 0);
      }
      
      return prev;
    });
  }, []);
  
  // Drag and drop
  const handleDragStart = useCallback((blockId: string, e: React.DragEvent) => {
    const selectedIds = state.ui.selectedBlockIds.includes(blockId) 
      ? state.ui.selectedBlockIds 
      : [blockId];
    
    e.dataTransfer.setData('text/plain', `blocks:${selectedIds.join(',')}`);
    e.dataTransfer.setData('source-page-id', state.ui.activePageId || '');
    e.dataTransfer.effectAllowed = 'move';
  }, [state.ui.selectedBlockIds, state.ui.activePageId]);
  
  const moveBlocksToPage = useCallback((sourcePageId: string, blockIds: string[], destPageId: string) => {
    if (sourcePageId === destPageId) return;
    
    setState(prev => {
      const sourcePage = prev.pages.find(p => p.id === sourcePageId);
      const destPage = prev.pages.find(p => p.id === destPageId);
      
      if (!sourcePage || !destPage) return prev;
      
      const blocksToMove = sourcePage.blocks.filter(b => blockIds.includes(b.id));
      const sourceBlocks = sourcePage.blocks.filter(b => !blockIds.includes(b.id));
      
      // If source page becomes empty, add an empty block
      if (sourceBlocks.length === 0) {
        sourceBlocks.push({ id: generateId(), type: 'text', content: '' });
      }
      
      return {
        ...prev,
        pages: prev.pages.map(page => {
          if (page.id === sourcePageId) {
            return { ...page, blocks: sourceBlocks };
          } else if (page.id === destPageId) {
            return { ...page, blocks: [...page.blocks, ...blocksToMove] };
          }
          return page;
        }),
        ui: {
          ...prev.ui,
          selectedBlockIds: []
        }
      };
    });
  }, []);
  
  const handleTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && activePage) {
      e.preventDefault();
      const firstBlock = activePage.blocks[0];
      if (firstBlock) {
        const textarea = blockRefs.current[firstBlock.id];
        if (textarea) {
          textarea.focus();
        }
      }
    }
  };
  
  if (!activePage) {
    return (
      <div className="h-full flex">
        <Sidebar
          pages={state.pages}
          activePageId={state.ui.activePageId}
          onPageSelect={(id) => setState(prev => ({ 
            ...prev, 
            ui: { ...prev.ui, activePageId: id, selectedBlockIds: [] } 
          }))}
          onPageCreate={createPage}
          onPageDelete={deletePage}
          onBlocksDrop={moveBlocksToPage}
        />
        <div className="flex-1 flex items-center justify-center text-muted-foreground">
          Selecione uma página
        </div>
      </div>
    );
  }
  
  return (
    <div className="h-full flex">
      <Sidebar
        pages={state.pages}
        activePageId={state.ui.activePageId}
        onPageSelect={(id) => setState(prev => ({ 
          ...prev, 
          ui: { ...prev.ui, activePageId: id, selectedBlockIds: [] } 
        }))}
        onPageCreate={createPage}
        onPageDelete={deletePage}
        onBlocksDrop={(sourcePageId, blockIds, destPageId) => {
          moveBlocksToPage(sourcePageId, blockIds, destPageId);
        }}
      />
      
      <div className="flex-1 p-8 overflow-auto">
        <div className="max-w-2xl mx-auto">
          {/* Title */}
          <Input
            ref={titleInputRef}
            value={activePage.title}
            onChange={(e) => updatePageTitle(activePage.id, e.target.value)}
            onKeyDown={handleTitleKeyDown}
            placeholder="Sem título"
            className="text-2xl font-bold border-none shadow-none focus-visible:ring-0 px-0 mb-6"
          />
          
          {/* Blocks */}
          <div className="space-y-1" role="list">
            {activePage.blocks.map((block) => (
              <div key={block.id} role="listitem">
                <BlockEditor
                  block={block}
                  isSelected={state.ui.selectedBlockIds.includes(block.id)}
                  isFocused={state.ui.focusedBlockId === block.id}
                  onContentChange={(id, content) => updateBlockContent(activePage.id, id, content)}
                  onEnter={(id) => {
                    const newId = createBlockBelow(activePage.id, id);
                    // Focus will be handled by the focusedBlockId state
                  }}
                  onBackspace={(id) => deleteBlock(activePage.id, id)}
                  onArrowUp={(id) => navigateBlock(activePage.id, id, 'up')}
                  onArrowDown={(id) => navigateBlock(activePage.id, id, 'down')}
                  onSelect={selectBlock}
                  onDragStart={handleDragStart}
                  onFocus={(id, ref) => {
                    // Store ref for focusing and update focus state
                    blockRefs.current[id] = ref;
                    setState(prev => ({
                      ...prev,
                      ui: {
                        ...prev.ui,
                        focusedBlockId: id,
                        anchorBlockId: id
                      }
                    }));
                  }}
                  onHandlePointerDown={handlePointerDown}
                  onHandlePointerEnter={handlePointerEnter}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}