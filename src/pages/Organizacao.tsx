import React, { useState, useEffect, useRef, useMemo } from 'react';
import { setPageSEO } from '@/lib/seo';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { useOrgPages, type OrgPage } from '@/hooks/useOrgPages';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import RichNoteEditor from '@/components/organizacao/RichNoteEditor';

// Legacy migration function for localStorage data
const migrateLegacyData = async (legacyData: any) => {
  if (!legacyData || !legacyData.pages) return;
  
  const user = await supabase.auth.getUser();
  if (!user.data.user) return;

  // Check if pages already exist in Supabase to avoid duplicates
  const { data: existingPages } = await supabase
    .from('org_pages')
    .select('id')
    .limit(1);
    
  if (existingPages && existingPages.length > 0) {
    localStorage.removeItem('organizacao-state');
    localStorage.removeItem('lovable-notion-organizacao-v1');
    return;
  }

  try {
    for (const page of legacyData.pages) {
      await supabase.from('org_pages').insert({
        id: page.id,
        title: page.title,
        content: page.content || '',
        category: page.category || 'projetos',
        user_id: user.data.user.id
      });
    }
    
    // Clear localStorage after migration
    localStorage.removeItem('organizacao-state');
    localStorage.removeItem('lovable-notion-organizacao-v1');
  } catch (error) {
    console.error('Migration error:', error);
  }
};

export default function Organizacao() {
  setPageSEO(
    "Organização - Sistema de Gestão Pessoal",
    "Organize suas tarefas e projetos de forma livre e flexível com nosso sistema de páginas hierárquicas."
  );

  const { pages, loading, addPage, updatePage, deletePage } = useOrgPages();
  const { toast } = useToast();
  const [activePageId, setActivePageId] = useState<string | null>(null);
  const [pageVersion, setPageVersion] = useState(0);
  const [isChangingPage, setIsChangingPage] = useState(false);
  
  // Página ativa atual
  const page = useMemo(() => 
    pages.find(p => p.id === activePageId) || null, 
    [pages, activePageId]
  );

  // Referências para elementos DOM
  const editorRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLDivElement>(null);
  const savedRangeRef = useRef<Range | null>(null);

  // Estado do menu de contexto
  const [menu, setMenu] = useState({
    visible: false,
    x: 0,
    y: 0,
    selectedText: ''
  });

  // Estado do menu de contexto da sidebar
  const [sidebarMenu, setSidebarMenu] = useState({
    visible: false,
    x: 0,
    y: 0,
    pageId: ''
  });

  // Migrate legacy data on first load
  useEffect(() => {
    const legacyKeys = ['organizacao-state', 'lovable-notion-organizacao-v1'];
    for (const key of legacyKeys) {
      const legacyData = localStorage.getItem(key);
      if (legacyData) {
        try {
          const parsed = JSON.parse(legacyData);
          migrateLegacyData(parsed).then(() => {
            toast({
              title: "Dados migrados",
              description: "Seus dados foram migrados para o Supabase com sucesso!",
            });
          });
        } catch (error) {
          console.error('Error parsing legacy data:', error);
          localStorage.removeItem(key);
        }
        break; // Only migrate from the first found key
      }
    }
  }, [toast]);

  // Set first page as active when pages load
  useEffect(() => {
    if (!loading && pages.length > 0 && !activePageId) {
      setActivePageId(pages[0].id);
    }
  }, [loading, pages, activePageId]);

  // Referência para controlar se está editando ativamente
  const isActivelyEditingRef = useRef(false);
  const isActivelyEditingTitleRef = useRef(false);

  // Sincronizar o título com a página ativa (apenas quando necessário)
  useEffect(() => {
    if (titleRef.current && page && !isActivelyEditingTitleRef.current) {
      titleRef.current.textContent = page.title;
    }
  }, [page?.id]); // Apenas quando a página muda

  // Função para definir página ativa com validação e loading
  const setActivePage = (pageId: string | null) => {
    if (pageId && !pages.find(p => p.id === pageId)) {
      console.warn('Tentativa de navegar para página inexistente:', pageId);
      return;
    }
    
    setIsChangingPage(true);
    setActivePageId(pageId);
    setPageVersion(prev => prev + 1); // Force re-render
    
    // Scroll to top when changing pages
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    setTimeout(() => {
      setIsChangingPage(false);
    }, 200);
  };

  // Função para criar nova página
  const createPage = async (title: string, category: 'tarefas' | 'projetos' = 'projetos') => {
    const newPage = await addPage(title, category);
    if (newPage) {
      setActivePageId(newPage.id);
    }
    return newPage;
  };

  // Função para renomear página
  const renamePage = async (id: string, newTitle: string) => {
    await updatePage(id, { title: newTitle });
  };

  // Função para atualizar conteúdo da página
  const setContent = async (pageId: string, content: string) => {
    await updatePage(pageId, { content });
  };

  // Função para converter texto em página (usada pelo RichNoteEditor)
  const handleConvertToPage = async (title: string): Promise<string | null> => {
    const newPage = await addPage(title, 'projetos', page?.id);
    return newPage?.id || null;
  };

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
    if (page) {
      setContent(page.id, editor.innerHTML);
    }
  }

  async function handleMakeSelectionPage() {
    const title = menu.selectedText.trim() || "Nova página";
    const newPage = await addPage(title, 'projetos', page?.id); // Create as child page
    if (newPage) {
      insertLinkForSavedRange(newPage.id, title);
    }
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

  // Context menu na sidebar para deletar páginas
  function handleSidebarContextMenu(e: React.MouseEvent, pageId: string) {
    e.preventDefault();
    setSidebarMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      pageId
    });
  }

  // Função para deletar página com confirmação
  async function handleDeletePage() {
    if (!sidebarMenu.pageId) return;
    
    const confirmed = window.confirm('Tem certeza que deseja excluir esta página? Esta ação não pode ser desfeita.');
    if (confirmed) {
      await deletePage(sidebarMenu.pageId);
      if (activePageId === sidebarMenu.pageId) {
        setActivePageId(null);
      }
    }
    setSidebarMenu({ visible: false, x: 0, y: 0, pageId: '' });
  }

  // Handle title changes
  const handleTitleChange = () => {
    isActivelyEditingTitleRef.current = false;
    if (titleRef.current && page) {
      const newTitle = titleRef.current.textContent || '';
      if (newTitle !== page.title) {
        renamePage(page.id, newTitle);
      }
    }
  };

  const handleTitleFocus = () => {
    isActivelyEditingTitleRef.current = true;
  };

  // Fechar menus ao clicar fora
  useEffect(() => {
    function handleClickOutside() {
      setMenu((m) => ({ ...m, visible: false }));
      setSidebarMenu((m) => ({ ...m, visible: false }));
    }
    
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  // Filtrar páginas por categoria (apenas páginas raiz - sem parent_id)
  const tarefas = pages.filter(p => p.category === 'tarefas' && !p.parent_id);
  const projetos = pages.filter(p => p.category === 'projetos' && !p.parent_id);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <h2 className="text-lg font-medium mb-2">Carregando...</h2>
          <p className="text-muted-foreground">Sincronizando suas páginas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border bg-card p-4 overflow-y-auto">
        {/* Seção Tarefas */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Tarefas
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                const title = prompt('Nome da tarefa:');
                if (title) createPage(title, 'tarefas');
              }}
              className="h-6 w-6 p-0"
            >
              <Plus className="h-3 w-3" />
            </Button>
          </div>
          
          <div className="space-y-1">
            {tarefas.map(p => (
              <button
                key={p.id}
                onClick={() => setActivePage(p.id)}
                onContextMenu={(e) => handleSidebarContextMenu(e, p.id)}
                className={`w-full text-left px-2 py-1 text-sm rounded hover:bg-accent transition-colors ${
                  page?.id === p.id ? 'bg-accent text-accent-foreground' : 'text-foreground'
                }`}
              >
                {p.title}
              </button>
            ))}
          </div>
        </div>

        {/* Seção Projetos */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Projetos
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                const title = prompt('Nome do projeto:');
                if (title) createPage(title, 'projetos');
              }}
              className="h-6 w-6 p-0"
            >
              <Plus className="h-3 w-3" />
            </Button>
          </div>
          
          <div className="space-y-1">
            {projetos.map(p => (
              <button
                key={p.id}
                onClick={() => setActivePage(p.id)}
                onContextMenu={(e) => handleSidebarContextMenu(e, p.id)}
                className={`w-full text-left px-2 py-1 text-sm rounded hover:bg-accent transition-colors ${
                  page?.id === p.id ? 'bg-accent text-accent-foreground' : 'text-foreground'
                }`}
              >
                {p.title}
              </button>
            ))}
          </div>
        </div>
      </aside>

      {/* Área principal */}
      <main className="flex-1 flex flex-col">
        {page ? (
          <>
            {/* Header com título da página */}
            <header className="p-4">
              <div
                ref={titleRef}
                contentEditable
                suppressContentEditableWarning
                onFocus={handleTitleFocus}
                onBlur={handleTitleChange}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    (e.target as HTMLElement).blur();
                  }
                }}
                className="text-5xl font-bold bg-transparent outline-none leading-tight min-h-[1.2em] empty:before:content-['Título_da_página'] empty:before:text-muted-foreground"
                style={{ minHeight: '1.2em' }}
              />
            </header>

            {/* Editor de conteúdo */}
            <div className="flex-1 p-6">
              {isChangingPage ? (
                <div className="flex items-center justify-center h-32">
                  <div className="text-muted-foreground">Carregando página...</div>
                </div>
              ) : (
                <RichNoteEditor
                  key={`${activePageId}-${pageVersion}`} // Force re-render on page change
                  html={page.content || ""}
                  onChange={(content) => setContent(page.id, content)}
                  onConvertToPage={handleConvertToPage}
                  onOpenPage={setActivePage}
                />
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <h2 className="text-lg font-medium mb-2">Nenhuma página selecionada</h2>
              <p>Selecione uma página na barra lateral ou crie uma nova.</p>
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={() => {
                  if (pages.length > 0) {
                    setActivePage(pages[0].id);
                  }
                }}
              >
                Recarregar primeira página
              </Button>
            </div>
          </div>
        )}
      </main>

      {/* Menu de contexto do editor */}
      {menu.visible && (
        <div
          className="fixed bg-popover border border-border rounded-md shadow-md p-1 z-50"
          style={{ left: menu.x, top: menu.y }}
        >
          <button
            onClick={handleMakeSelectionPage}
            className="block w-full text-left px-3 py-1 text-sm hover:bg-accent rounded"
          >
            Transformar em página
          </button>
        </div>
      )}

      {/* Menu de contexto da sidebar */}
      {sidebarMenu.visible && (
        <div
          className="fixed bg-popover border border-border rounded-md shadow-md p-1 z-50"
          style={{ left: sidebarMenu.x, top: sidebarMenu.y }}
        >
          <button
            onClick={handleDeletePage}
            className="block w-full text-left px-3 py-1 text-sm hover:bg-destructive hover:text-destructive-foreground rounded"
          >
            Excluir página
          </button>
        </div>
      )}
    </div>
  );
}
