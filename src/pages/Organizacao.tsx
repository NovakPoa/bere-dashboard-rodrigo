import React, { useState, useEffect, useRef, useMemo } from 'react';
import { setPageSEO } from '@/lib/seo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus } from 'lucide-react';
import { useOrgPages, type OrgPage } from '@/hooks/useOrgPages';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

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
  
  // Página ativa atual
  const page = useMemo(() => 
    pages.find(p => p.id === activePageId) || null, 
    [pages, activePageId]
  );

  // Referências para elementos DOM
  const editorRef = useRef<HTMLDivElement>(null);
  const savedRangeRef = useRef<Range | null>(null);

  // Estado do menu de contexto
  const [menu, setMenu] = useState({
    visible: false,
    x: 0,
    y: 0,
    selectedText: ''
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

  // Sincronizar o editor com o conteúdo da página ativa
  useEffect(() => {
    if (editorRef.current && page) {
      editorRef.current.innerHTML = page.content || '';
    }
  }, [page?.id]); // Só atualiza quando a página muda

  // Função para definir página ativa
  const setActivePage = (pageId: string | null) => {
    setActivePageId(pageId);
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
  const setContent = async (content: string) => {
    if (!page) return;
    await updatePage(page.id, { content });
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
    setContent(editor.innerHTML);
  }

  async function handleMakeSelectionPage() {
    const title = menu.selectedText.trim() || "Nova página";
    const newPage = await createPage(title, 'projetos'); // Default to projetos
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

  // Filtrar páginas por categoria
  const tarefas = pages.filter(p => p.category === 'tarefas');
  const projetos = pages.filter(p => p.category === 'projetos');

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
            <header className="border-b border-border p-4">
              <Input
                value={page.title}
                onChange={(e) => renamePage(page.id, e.target.value)}
                className="text-lg font-semibold border-none bg-transparent p-0 focus-visible:ring-0"
                placeholder="Título da página"
              />
            </header>

            {/* Editor de conteúdo */}
            <div className="flex-1 p-4">
              <div
                ref={editorRef}
                contentEditable
                onInput={(e) => setContent(e.currentTarget.innerHTML)}
                onContextMenu={handleContextMenu}
                onClick={handleEditorClick}
                className="w-full h-full min-h-[400px] p-4 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                style={{ whiteSpace: 'pre-wrap' }}
                data-placeholder="Comece a escrever..."
              />
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <h2 className="text-lg font-medium mb-2">Nenhuma página selecionada</h2>
              <p>Selecione uma página na barra lateral ou crie uma nova.</p>
            </div>
          </div>
        )}
      </main>

      {/* Menu de contexto */}
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
    </div>
  );
}