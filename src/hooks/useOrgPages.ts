import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Database } from '@/integrations/supabase/types';

type DbOrgPage = Database['public']['Tables']['org_pages']['Row'];

export interface OrgPage {
  id: string;
  title: string;
  content?: string;
  category: 'tarefas' | 'projetos';
  user_id?: string;
  created_at?: string;
  updated_at?: string;
  parent_id?: string;
}

export function useOrgPages() {
  const [pages, setPages] = useState<OrgPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [cache, setCache] = useState<Map<string, OrgPage>>(new Map());
  const { toast } = useToast();

  const fetchPages = async () => {
    try {
      const { data, error } = await supabase
        .from('org_pages')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) throw error;
      
      // Map database rows to our interface, ensuring category type safety
      const mappedPages: OrgPage[] = (data || []).map((page: DbOrgPage) => ({
        id: page.id,
        title: page.title,
        content: page.content || '',
        category: (page.category === 'tarefas' || page.category === 'projetos') ? page.category : 'projetos',
        user_id: page.user_id,
        created_at: page.created_at,
        updated_at: page.updated_at,
        parent_id: page.parent_id
      }));
      
      setPages(mappedPages);
      
      // Update cache
      const newCache = new Map();
      mappedPages.forEach(page => newCache.set(page.id, page));
      setCache(newCache);
    } catch (error) {
      console.error('Error fetching pages:', error);
      toast({
        title: "Erro ao carregar páginas",
        description: "Não foi possível carregar as páginas.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPages();
  }, []);

  const addPage = async (title: string, category: 'tarefas' | 'projetos' = 'projetos', parentId?: string) => {
    try {
      const { data, error } = await supabase
        .from('org_pages')
        .insert([{
          title,
          category,
          content: '',
          parent_id: parentId || null,
          user_id: (await supabase.auth.getUser()).data.user?.id
        }])
        .select()
        .single();

      if (error) throw error;
      
      const mappedPage: OrgPage = {
        id: data.id,
        title: data.title,
        content: data.content || '',
        category: (data.category === 'tarefas' || data.category === 'projetos') ? data.category : 'projetos',
        user_id: data.user_id,
        created_at: data.created_at,
        updated_at: data.updated_at,
        parent_id: data.parent_id
      };
      
      setPages(prev => [...prev, mappedPage]);
      setCache(prev => new Map(prev).set(mappedPage.id, mappedPage));
      return mappedPage;
    } catch (error) {
      console.error('Error adding page:', error);
      toast({
        title: "Erro ao criar página",
        description: "Não foi possível criar a página.",
        variant: "destructive",
      });
      return null;
    }
  };

  const updatePage = async (id: string, updates: Partial<OrgPage>) => {
    try {
      const { data, error } = await supabase
        .from('org_pages')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      
      const mappedPage: OrgPage = {
        id: data.id,
        title: data.title,
        content: data.content || '',
        category: (data.category === 'tarefas' || data.category === 'projetos') ? data.category : 'projetos',
        user_id: data.user_id,
        created_at: data.created_at,
        updated_at: data.updated_at,
        parent_id: data.parent_id
      };
      
      setPages(prev => prev.map(page => page.id === id ? mappedPage : page));
      setCache(prev => new Map(prev).set(id, mappedPage));
      return mappedPage;
    } catch (error) {
      console.error('Error updating page:', error);
      toast({
        title: "Erro ao atualizar página",
        description: "Não foi possível atualizar a página.",
        variant: "destructive",
      });
      return null;
    }
  };

  const deletePage = async (id: string) => {
    try {
      const { error } = await supabase
        .from('org_pages')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setPages(prev => prev.filter(page => page.id !== id));
      setCache(prev => {
        const newCache = new Map(prev);
        newCache.delete(id);
        return newCache;
      });
    } catch (error) {
      console.error('Error deleting page:', error);
      toast({
        title: "Erro ao deletar página",
        description: "Não foi possível deletar a página.",
        variant: "destructive",
      });
    }
  };

  return {
    pages,
    loading,
    addPage,
    updatePage,
    deletePage,
    refetch: fetchPages
  };
}