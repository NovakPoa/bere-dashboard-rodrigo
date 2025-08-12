import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Star, StarOff, FilePlus2, ChevronRight } from "lucide-react";
import { setPageSEO } from "@/lib/seo";
import { useToast } from "@/components/ui/use-toast";
import RichNoteEditor from "@/components/organizacao/RichNoteEditor";
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
        .order("parent_id", { ascending: true, nullsFirst: true as any })
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

  // Auto-create a single text block for freeform editor
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
      .insert({ title, parent_id: parentId ?? null })
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

  const addBlock = async (type: BlockType) => {
    if (!currentPageId) return;
    const nextIndex = blocks.length;
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
    let siblings = pages.filter(p=> (p.parent_id ?? null) === parentId)
      .sort((a,b)=> (a.sort_index??0)-(b.sort_index??0));
    // remove source if present
    siblings = siblings.filter(p=>p.id!==sourceId);
    const insertAt = Math.max(0, siblings.findIndex(p=>p.id===targetId) + (position==='after'?1:0));
    siblings.splice(insertAt,0,{...source, parent_id: parentId});
    await Promise.all(siblings.map((p,i)=> supabase.from('org_pages').update({ sort_index: i*100, parent_id: parentId }).eq('id', p.id)));
    setPages(prev => prev.map(p=>{
      const n = siblings.find(s=>s.id===p.id);
      return n ? { ...p, sort_index: n.sort_index, parent_id: n.parent_id } as any : p;
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
        {currentPage && (
          <Button variant="secondary" onClick={() => toggleFavorite(currentPage)}>
            {currentPage.is_favorite ? <Star className="h-4 w-4 mr-2" /> : <StarOff className="h-4 w-4 mr-2" />} Favorito
          </Button>
        )}
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <aside className="lg:col-span-3 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Favoritos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {favorites.map(p => (
                <button
                  key={p.id}
                  draggable
                  onDragStart={(e) => { e.dataTransfer.setData('text/plain', p.id); setDraggingId(p.id); }}
                  onDragEnd={() => { setDraggingId(null); setDropOverId(null); }}
                  onDragOver={(e) => { e.preventDefault(); setDropOverId(p.id); }}
                  onDragLeave={() => setDropOverId(prev => prev === p.id ? null : prev)}
                  onDrop={async (e) => {
                    e.preventDefault();
                    const sourceId = e.dataTransfer.getData('text/plain');
                    if (sourceId && sourceId !== p.id) await reorderFavorites(sourceId, p.id);
                  }}
                  onClick={() => openPage(p.id)}
                  className={`w-full text-left px-2 py-1.5 rounded hover:bg-muted/60 transition-smooth ${currentPageId===p.id? 'bg-muted' : ''} ${dropOverId===p.id ? 'ring-2 ring-primary' : ''}`}
                >
                  <div className="flex items-center gap-2">
                    <Star className="h-4 w-4 text-yellow-500" />
                    <span className="truncate">{p.title}</span>
                  </div>
                </button>
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
                <Button onClick={createRootPage}><FilePlus2 className="h-4 w-4 mr-2"/>Criar</Button>
              </div>
              <Separator />
              <div
                className={`text-xs text-muted-foreground rounded-md border border-dashed p-2 hover-scale ${dropOverId==="__root__" ? 'ring-2 ring-primary' : ''}`}
                onDragOver={(e) => { e.preventDefault(); setDropOverId("__root__"); }}
                onDragLeave={() => setDropOverId(prev => prev === "__root__" ? null : prev)}
                onDrop={async (e) => {
                  e.preventDefault();
                  const sourceId = e.dataTransfer.getData('text/plain');
                  if (sourceId) await movePage(sourceId, null);
                }}
              >
                Soltar aqui para mover para a raiz (arraste para a metade inferior de uma página para aninhar; metade superior para reordenar)
              </div>
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
                  <Input
                    value={currentPage.title}
                    onChange={async (e) => {
                      const title = e.target.value;
                      setPages(prev => prev.map(p => p.id===currentPage.id ? { ...p, title } : p));
                      const { error } = await supabase.from("org_pages").update({ title }).eq("id", currentPage.id);
                      if (error) toast({ title: "Erro", description: "Não foi possível renomear a página" });
                    }}
                    className="text-2xl font-semibold bg-transparent border-0 focus-visible:ring-0 px-0"
                  />
                  <Separator />
                </CardContent>
              </Card>

              <div className="space-y-3 animate-fade-in">
                {loading && <p className="text-sm text-muted-foreground">Carregando…</p>}
                {blocks[0] && (
                  <Card key={blocks[0].id} className="shadow-none border-0 bg-transparent">
                    <CardContent className="pt-4 px-0">
                      <RichNoteEditor
                        html={blocks[0].content ?? ""}
                        onChange={(html) => updateBlock(blocks[0].id, { content: html })}
                        onConvertToPage={async (title) => {
                          const newPage = await createPage(title, currentPageId);
                          return newPage?.id || null;
                        }}
                        onOpenPage={(pageId) => openPage(pageId)}
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
