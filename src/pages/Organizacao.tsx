import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Star, FilePlus2, ChevronRight, MoreVertical, Trash2 } from "lucide-react";
import { setPageSEO } from "@/lib/seo";
import { useToast } from "@/components/ui/use-toast";
import BlockListEditor from "@/components/organizacao/BlockListEditor";
import PageTree from "@/components/organizacao/PageTree";
// Types aligning to our org tables
type OrgPage = {
  id: string;
  parent_id: string | null;
  title: string;
  is_favorite: boolean;
  created_at: string;
  updated_at: string;
  // ordering
  sort_index?: number;
  favorite_order?: number;
};

type BlockType = "title" | "text" | "page";

type OrgBlock = {
  id: string;
  page_id: string;
  type: BlockType;
  content: string | null;
  bold: boolean;
  color: string; // notion names
  order_index: number;
  child_page_id: string | null;
  created_at: string;
  updated_at: string;
};


export default function Organizacao() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [pages, setPages] = useState<OrgPage[]>([]);
  const [currentPageId, setCurrentPageId] = useState<string | null>(id ?? null);
  const [blocks, setBlocks] = useState<OrgBlock[]>([]);
  const [loading, setLoading] = useState(false);
  const [creatingTitle, setCreatingTitle] = useState("");
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropOverId, setDropOverId] = useState<string | null>(null);

  useEffect(() => {
    setPageSEO("Organização | notas e páginas", "Organização minimalista com páginas, blocos e favoritos");
  }, []);

  useEffect(() => {
    // keep route in sync
    if (currentPageId) navigate(`/organizacao/${currentPageId}`, { replace: true });
    else navigate(`/organizacao`, { replace: true });
  }, [currentPageId, navigate]);

  useEffect(() => {
    const fetchPages = async () => {
      const { data, error } = await supabase.from("org_pages").select("*")
        .order("parent_id", { ascending: true, nullsFirst: true })
        .order("sort_index", { ascending: true })
        .order("created_at", { ascending: true });
      if (error) {
        toast({ title: "Erro", description: "Falha ao carregar páginas" });
        return;
      }
      setPages(data as OrgPage[]);
    };
    fetchPages();
  }, [toast]);

  useEffect(() => {
    const fetchBlocks = async () => {
      if (!currentPageId) { setBlocks([]); return; }
      setLoading(true);
      const { data, error } = await supabase
        .from("org_blocks")
        .select("*")
        .eq("page_id", currentPageId)
        .order("order_index", { ascending: true });
      setLoading(false);
      if (error) {
        toast({ title: "Erro", description: "Falha ao carregar blocos" });
        return;
      }
      setBlocks(data as OrgBlock[]);
    };
    fetchBlocks();
  }, [currentPageId, toast]);

  useEffect(() => {
    if (currentPageId && !loading && blocks.length === 0) {
      addBlock("text");
    }
  }, [currentPageId, loading, blocks.length]);

  const favorites = useMemo(() => pages.filter(p => p.is_favorite).sort((a,b)=> (a.favorite_order??0)-(b.favorite_order??0)), [pages]);
  const rootPages = useMemo(() => pages.filter(p => !p.parent_id), [pages]);
  const currentPage = useMemo(() => pages.find(p => p.id === currentPageId) || null, [pages, currentPageId]);

  const createPage = async (title: string, parentId?: string | null) => {
    const { data, error } = await supabase
      .from("org_pages")
      .insert({ title, parent_id: parentId ?? null, user_id: '' })  // user_id will be set by trigger
      .select("*")
      .single();
    if (error) { toast({ title: "Erro", description: "Não foi possível criar a página" }); return null; }
    const page = data as OrgPage;
    setPages(prev => [page, ...prev]);

    // do not create initial blocks; editor will auto-add
    return page;
  };

  const reloadBlocks = async (pageId: string) => {
    const { data } = await supabase
      .from("org_blocks")
      .select("*")
      .eq("page_id", pageId)
      .order("order_index", { ascending: true });
    setBlocks((data || []) as OrgBlock[]);
  };

  const toggleFavorite = async (page: OrgPage) => {
    const { data, error } = await supabase
      .from("org_pages")
      .update({ is_favorite: !page.is_favorite })
      .eq("id", page.id)
      .select("*")
      .single();
    if (error) { toast({ title: "Erro", description: "Falha ao favoritar" }); return; }
    setPages(prev => prev.map(p => (p.id === page.id ? (data as OrgPage) : p)));
  };

  const deletePage = async (pageId: string) => {
    // Check if this page has children
    const hasChildren = pages.some(p => p.parent_id === pageId);
    if (hasChildren) {
      toast({ title: "Erro", description: "Não é possível deletar uma página que tem páginas filhas" });
      return;
    }

    const { error } = await supabase.from("org_pages").delete().eq("id", pageId);
    if (error) { 
      toast({ title: "Erro", description: "Não foi possível deletar a página" }); 
      return; 
    }
    
    setPages(prev => prev.filter(p => p.id !== pageId));
    
    // If we're deleting the current page, navigate away
    if (currentPageId === pageId) {
      setCurrentPageId(null);
    }
    
    toast({ title: "Sucesso", description: "Página deletada" });
  };

  const addBlock = async (type: BlockType) => {
    if (!currentPageId) return;
    const nextIndex = blocks.length * 100;
    const { data, error } = await supabase
      .from("org_blocks")
      .insert({ page_id: currentPageId, type, order_index: nextIndex, content: type === "text" ? "" : null })
      .select("*")
      .single();
    if (error) { toast({ title: "Erro", description: "Não foi possível adicionar bloco" }); return; }
    setBlocks(prev => [...prev, data as OrgBlock]);
  };

  const updateBlock = async (id: string, patch: Partial<OrgBlock>) => {
    const { data, error } = await supabase
      .from("org_blocks")
      .update(patch)
      .eq("id", id)
      .select("*")
      .single();
    if (error) { toast({ title: "Erro", description: "Falha ao atualizar bloco" }); return; }
    setBlocks(prev => prev.map(b => (b.id === id ? (data as OrgBlock) : b)));
  };

  // Reorder blocks within the current page
  const reorderBlocks = async (sourceId: string, targetId: string, position: 'before' | 'after' = 'before') => {
    if (!currentPageId) return;
    const siblings = [...blocks]
      .filter(b => b.page_id === currentPageId)
      .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));

    const srcIdx = siblings.findIndex(b => b.id === sourceId);
    const tgtIdx = siblings.findIndex(b => b.id === targetId);
    if (srcIdx === -1 || tgtIdx === -1) return;

    const arr = siblings.filter(b => b.id !== sourceId);
    const insertAt = Math.max(0, arr.findIndex(b => b.id === targetId) + (position === 'after' ? 1 : 0));
    const [moved] = siblings.splice(srcIdx, 1);
    arr.splice(insertAt, 0, moved);

    const withOrder = arr.map((b, i) => ({ id: b.id, order_index: i * 100 }));

    // persist
    await Promise.all(
      withOrder.map(({ id, order_index }) =>
        supabase.from('org_blocks').update({ order_index }).eq('id', id)
      )
    );

    setBlocks(prev => prev.map(b => {
      const n = withOrder.find(x => x.id === b.id);
      return n ? { ...b, order_index: n.order_index } as any : b;
    }));
  };

  // Move a block to another page (append to end)
  const moveBlock = async (blockId: string, targetPageId: string) => {
    const block = blocks.find(b => b.id === blockId);
    if (!block) return;

    // Determine new order at the end of target page
    const { data: targetBlocks } = await supabase
      .from('org_blocks')
      .select('id, order_index')
      .eq('page_id', targetPageId)
      .order('order_index', { ascending: true });
    const nextOrder = ((targetBlocks || []).length) * 100;

    const { error, data } = await supabase
      .from('org_blocks')
      .update({ page_id: targetPageId, order_index: nextOrder })
      .eq('id', blockId)
      .select('*')
      .single();
    if (error) { toast({ title: 'Erro', description: 'Não foi possível mover o bloco' }); return; }

    // Update local state: remove from current page if moved away
    setBlocks(prev => prev.filter(b => b.id !== blockId || targetPageId === currentPageId).map(b => (b.id === blockId ? (data as any) : b)));
  };

  // Create a new empty block after a given one
  const createBlockAfter = async (afterId: string) => {
    if (!currentPageId) return;
    const siblings = [...blocks]
      .filter(b => b.page_id === currentPageId)
      .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));

    const idx = siblings.findIndex(b => b.id === afterId);
    const insertAt = idx === -1 ? siblings.length : idx + 1;

    const { data: inserted, error } = await supabase
      .from('org_blocks')
      .insert({ page_id: currentPageId, type: 'text', order_index: 0, content: '' })
      .select('*')
      .single();
    if (error || !inserted) { toast({ title: 'Erro', description: 'Não foi possível criar a linha' }); return; }

    const arr = [...siblings];
    arr.splice(insertAt, 0, inserted as any);
    const withOrder = arr.map((b, i) => ({ id: b.id, order_index: i * 100 }));

    await Promise.all(withOrder.map(({ id, order_index }) => supabase.from('org_blocks').update({ order_index }).eq('id', id)));

    // Update local
    setBlocks(prev => {
      // remove any existing instance and re-add ordered ones for current page
      const others = prev.filter(b => b.page_id !== currentPageId);
      const updatedSiblings = arr.map((b, i) => ({ ...b, order_index: i * 100 } as any));
      return [...others, ...updatedSiblings];
    });
  };

  // Split current block at caret: update current with beforeHtml and insert new block with afterHtml, then reorder
  const splitBlock = async (blockId: string, beforeHtml: string, afterHtml: string): Promise<string | null> => {
    if (!currentPageId) return null;
    // Update current block content
    await updateBlock(blockId, { content: beforeHtml });

    // Insert new block
    const { data: inserted, error: insertError } = await supabase
      .from('org_blocks')
      .insert({ page_id: currentPageId, type: 'text', order_index: 0, content: afterHtml })
      .select('*')
      .single();
    if (insertError || !inserted) { toast({ title: 'Erro', description: 'Não foi possível criar a nova linha' }); return null; }

    // Prepare new ordering placing the new block right after the original one
    const siblings = [...blocks]
      .filter(b => b.page_id === currentPageId)
      .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));

    const idx = siblings.findIndex(b => b.id === blockId);
    const arr = [...siblings];
    arr.splice(idx + 1, 0, inserted as any);
    const withOrder = arr.map((b, i) => ({ id: b.id, order_index: i * 100 }));

    await Promise.all(withOrder.map(({ id, order_index }) => supabase.from('org_blocks').update({ order_index }).eq('id', id)));

    // Update local state
    setBlocks(prev => {
      const others = prev.filter(b => b.page_id !== currentPageId);
      const updatedSiblings = arr.map((b, i) => ({ ...b, order_index: i * 100 } as any));
      return [...others, ...updatedSiblings];
    });

    return (inserted as any).id as string;
  };
  // Join current block with previous one and return previous id
  const joinWithPrevious = async (blockId: string, currentHtml: string): Promise<string | null> => {
    if (!currentPageId) return null;
    const siblings = [...blocks]
      .filter(b => b.page_id === currentPageId)
      .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
    const idx = siblings.findIndex(b => b.id === blockId);
    if (idx <= 0) return null;
    const prev = siblings[idx - 1];
    const combined = (prev.content || '') + (currentHtml || '');

    // Update previous content
    const { data: updatedPrev, error: updErr } = await supabase
      .from('org_blocks')
      .update({ content: combined })
      .eq('id', prev.id)
      .select('*')
      .single();
    if (updErr) { toast({ title: 'Erro', description: 'Não foi possível juntar com a linha anterior' }); return null; }

    // Delete current block
    await supabase.from('org_blocks').delete().eq('id', blockId);

    // Recompute order for remaining siblings
    const remaining = siblings.filter(b => b.id !== blockId).map((b, i) => ({ id: b.id, order_index: i * 100 }));
    await Promise.all(remaining.map(({ id, order_index }) => supabase.from('org_blocks').update({ order_index }).eq('id', id)));

    // Update local state
    setBlocks(prevState => {
      const next = prevState.filter(b => b.id !== blockId).map(b => (b.id === prev.id ? ({ ...(updatedPrev as any) }) : b));
      return next.map(b => {
        const n = remaining.find(r => r.id === b.id);
        return n ? ({ ...b, order_index: n.order_index } as any) : b;
      });
    });

    return prev.id;
  };
  // Move a page under a new parent (or to root when null)
  const movePage = async (sourceId: string, newParentId: string | null) => {
    const { data, error } = await supabase
      .from("org_pages")
      .update({ parent_id: newParentId })
      .eq("id", sourceId)
      .select("*")
      .single();
    if (error) { toast({ title: "Erro", description: "Não foi possível mover a página" }); return; }
    setPages(prev => prev.map(p => (p.id === sourceId ? (data as OrgPage) : p)));
    setDraggingId(null);
    setDropOverId(null);
  };

  // Reorder favorites list locally and persist favorite_order
  const reorderFavorites = async (sourceId: string, targetId: string) => {
    const favs = pages.filter(p => p.is_favorite).sort((a,b)=> (a.favorite_order??0)-(b.favorite_order??0));
    const srcIdx = favs.findIndex(p=>p.id===sourceId);
    const tgtIdx = favs.findIndex(p=>p.id===targetId);
    if (srcIdx === -1 || tgtIdx === -1) return;
    const [moved] = favs.splice(srcIdx,1);
    favs.splice(tgtIdx,0,moved);
    // assign local orders with gaps of 100
    const orderMap = new Map<string, number>();
    favs.forEach((p,i)=> orderMap.set(p.id, i*100));
    await Promise.all(favs.map((p)=> supabase.from('org_pages').update({ favorite_order: orderMap.get(p.id)! }).eq('id', p.id)));
    setPages(prev => prev.map(p => orderMap.has(p.id) ? { ...p, favorite_order: orderMap.get(p.id)! } as any : p));
  };

  const reorderSibling = async (sourceId: string, targetId: string, position: 'before'|'after'='before') => {
    const target = pages.find(p=>p.id===targetId);
    const source = pages.find(p=>p.id===sourceId);
    if (!target || !source) return;
    const parentId = target.parent_id ?? null;
    let siblings = pages
      .filter(p=> (p.parent_id ?? null) === parentId)
      .sort((a,b)=> (a.sort_index??0)-(b.sort_index??0));
    // remove source if present (it may come from another parent)
    siblings = siblings.filter(p=>p.id!==sourceId);
    const insertAt = Math.max(0, siblings.findIndex(p=>p.id===targetId) + (position==='after'?1:0));
    siblings.splice(insertAt, 0, { ...source, parent_id: parentId });

    // assign new local sort_index values so UI updates immediately
    const siblingsWithOrder = siblings.map((p, i) => ({ ...p, sort_index: i*100, parent_id: parentId }));

    // persist
    await Promise.all(
      siblingsWithOrder.map((p) =>
        supabase.from('org_pages').update({ sort_index: p.sort_index, parent_id: parentId }).eq('id', p.id)
      )
    );

    setPages(prev => prev.map(p => {
      const n = siblingsWithOrder.find(s => s.id === p.id);
      return n ? ({ ...p, sort_index: n.sort_index, parent_id: n.parent_id } as any) : p;
    }));
  };

  const openPage = (pageId: string) => setCurrentPageId(pageId);

  const createRootPage = async () => {
    if (!creatingTitle.trim()) return;
    const p = await createPage(creatingTitle.trim(), null);
    if (p) { setCreatingTitle(""); setCurrentPageId(p.id); }
  };
  return (
    <div className="container py-6">
      <header className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Organização</h1>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <aside className="lg:col-span-3 space-y-4 md:-ml-2 lg:-ml-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Favoritos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {favorites.map(p => (
                <div
                  key={p.id}
                  draggable
                  onDragStart={(e) => { e.dataTransfer.setData('text/plain', p.id); setDraggingId(p.id); }}
                  onDragEnd={() => { setDraggingId(null); setDropOverId(null); }}
                  onDragOver={(e) => { e.preventDefault(); setDropOverId(p.id); }}
                  onDragLeave={() => setDropOverId(prev => prev === p.id ? null : prev)}
                  onDrop={async (e) => {
                    e.preventDefault();
                    const raw = e.dataTransfer.getData('text/plain');
                    if (!raw) return;
                    const blockMatch = raw.match(/^block:(.+)$/);
                    if (blockMatch) {
                      await moveBlock(blockMatch[1], p.id);
                      return;
                    }
                    const pageId = raw.startsWith('page:') ? raw.slice(5) : raw;
                    if (pageId && pageId !== p.id) await reorderFavorites(pageId, p.id);
                  }}
                  className={`flex items-center justify-between w-full text-left px-2 py-1.5 rounded hover:bg-muted/60 transition-smooth ${currentPageId===p.id? 'bg-muted' : ''} ${dropOverId===p.id ? 'ring-2 ring-primary' : ''}`}
                >
                  <button 
                    onClick={() => openPage(p.id)}
                    className="flex items-center gap-2 flex-1 min-w-0"
                  >
                    <span className="truncate">{p.title}</span>
                  </button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-6 w-6 opacity-0 group-hover:opacity-100 flex-shrink-0"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreVertical className="h-3 w-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem 
                        onClick={() => deletePage(p.id)}
                        className="text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Deletar página
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Todas as páginas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
                <div className="flex gap-2">
                  <Input placeholder="Nome da nova página" value={creatingTitle} onChange={e => setCreatingTitle(e.target.value)} />
                  <Button onClick={createRootPage} variant="ghost" size="icon" aria-label="Criar página" className="org-text-green">
                    <FilePlus2 />
                  </Button>
                </div>
              <Separator />
              <div className="space-y-1 max-h-[360px] overflow-auto">
                <PageTree
                  pages={pages}
                  currentPageId={currentPageId}
                  openPage={openPage}
                  movePage={movePage}
                  reorderSibling={reorderSibling}
                  draggingId={draggingId}
                  setDraggingId={setDraggingId}
                  dropOverId={dropOverId}
                  setDropOverId={setDropOverId}
                  moveBlock={moveBlock}
                  deletePage={deletePage}
                />
              </div>
            </CardContent>
          </Card>
        </aside>

        <main className="lg:col-span-9">
          {!currentPage && (
            <Card>
              <CardContent className="py-10 text-center text-muted-foreground">Selecione ou crie uma página para começar.</CardContent>
            </Card>
          )}

          {currentPage && (
            <div className="space-y-4">
              <Card className="shadow-none border-0 bg-transparent">
                <CardContent className="pt-6 space-y-2">
                  <div className="flex items-center gap-2">
                    <Input
                      value={currentPage.title}
                      onChange={async (e) => {
                        const title = e.target.value;
                        setPages(prev => prev.map(p => p.id===currentPage.id ? { ...p, title } : p));
                        const { error } = await supabase.from("org_pages").update({ title }).eq("id", currentPage.id);
                        if (error) toast({ title: "Erro", description: "Não foi possível renomear a página" });
                      }}
                      className="text-3xl md:text-4xl font-semibold bg-transparent border-0 focus-visible:ring-0 px-0 flex-1"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={currentPage.is_favorite ? "Remover dos favoritos" : "Adicionar aos favoritos"}
                      aria-pressed={currentPage.is_favorite}
                      onClick={() => toggleFavorite(currentPage)}
                      className="org-text-green"
                      title={currentPage.is_favorite ? "Remover dos favoritos" : "Adicionar aos favoritos"}
                    >
                      <Star className="h-6 w-6" fill={currentPage.is_favorite ? "currentColor" : "none"} />
                    </Button>
                  </div>
                  <Separator />
                </CardContent>
              </Card>

              <div className="space-y-3 animate-fade-in">
                {loading && <p className="text-sm text-muted-foreground">Carregando…</p>}
                {blocks.length > 0 && (
                  <Card key={"blocks"} className="shadow-none border-0 bg-transparent">
                    <CardContent className="pt-4 px-0">
                      <BlockListEditor
                        blocks={blocks
                          .filter(b => b.page_id === currentPageId)
                          .map(b => ({ id: b.id, content: b.content, order_index: b.order_index }))}
                        onChangeContent={(id, html) => updateBlock(id, { content: html })}
                        onReorder={reorderBlocks}
                        onMoveToPage={moveBlock}
                        onCreateAfter={createBlockAfter}
                        onSplit={splitBlock}
                        onJoinPrev={joinWithPrevious}
                      />
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
