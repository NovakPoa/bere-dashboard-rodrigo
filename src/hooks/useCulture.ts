import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export type Domain = "videos" | "books";
export type VideoSubtype = "movie" | "series";
export type Status = "backlog" | "doing" | "done";

export interface Item {
  id: string;
  domain: Domain;
  title: string;
  status: Status;
  genre?: string;
  year?: number;
  subtype?: VideoSubtype;
  rating?: number;
}

interface CultureRecord {
  id: number;
  titulo: string;
  status: string;
  tipo_item: string;
  tipo: string;
  nota: number;
  data: string;
  origem: string;
  user_id?: string;
}

const convertToCultureItem = (record: CultureRecord): Item => ({
  id: record.id.toString(),
  title: record.titulo,
  status: record.status as Status,
  domain: record.tipo_item as Domain,
  subtype: record.tipo as VideoSubtype,
  rating: record.nota || undefined,
  year: record.data ? new Date(record.data).getFullYear() : undefined,
});

const convertFromCultureItem = (item: Omit<Item, "id">) => ({
  titulo: item.title,
  status: item.status,
  tipo_item: item.domain,
  tipo: item.subtype || null,
  nota: item.rating || null,
  data: item.year ? `${item.year}-01-01` : new Date().toISOString().split('T')[0],
  origem: "manual",
});

export function useCultureItems() {
  return useQuery({
    queryKey: ["culture-items"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cultura")
        .select("*")
        .order("data", { ascending: false });

      if (error) throw error;
      
      return data.map(convertToCultureItem);
    },
  });
}

export function useAddCultureItem() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (item: Omit<Item, "id">) => {
      const record = convertFromCultureItem(item);

      const { data, error } = await supabase
        .from("cultura")
        .insert([record])
        .select()
        .single();

      if (error) throw error;
      
      return convertToCultureItem(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["culture-items"] });
      toast({
        title: "Item adicionado",
        description: "Item cultural foi salvo com sucesso!",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: `Falha ao salvar item: ${error.message}`,
        variant: "destructive",
      });
    },
  });
}

export function useUpdateCultureItem() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Item> }) => {
      const record = convertFromCultureItem(updates as Omit<Item, "id">);

      const { data, error } = await supabase
        .from("cultura")
        .update(record)
        .eq("id", parseInt(id))
        .select()
        .single();

      if (error) throw error;
      
      return convertToCultureItem(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["culture-items"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: `Falha ao atualizar item: ${error.message}`,
        variant: "destructive",
      });
    },
  });
}

export function useRemoveCultureItem() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("cultura")
        .delete()
        .eq("id", parseInt(id));

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["culture-items"] });
      toast({
        title: "Item removido",
        description: "Item foi removido com sucesso!",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: `Falha ao remover item: ${error.message}`,
        variant: "destructive",
      });
    },
  });
}