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
  author?: string;
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
  genero?: string;
  autor?: string;
}

const convertToCultureItem = (record: CultureRecord): Item => {
  // Map Portuguese WhatsApp values to English frontend values
  const mapStatus = (status: string): Status => {
    switch (status?.toLowerCase()) {
      case 'quero ler':
      case 'quero assistir':
      case 'backlog':
        return 'backlog';
      case 'lendo':
      case 'assistindo':
      case 'fazendo':
      case 'doing':
        return 'doing';
      case 'lido':
      case 'assistido':
      case 'feito':
      case 'done':
        return 'done';
      default:
        return 'backlog';
    }
  };

  const mapDomain = (tipo_item: string): Domain => {
    switch (tipo_item?.toLowerCase()) {
      case 'livro':
      case 'books':
        return 'books';
      case 'filme':
      case 'serie':
      case 'videos':
        return 'videos';
      default:
        return 'books';
    }
  };

  const mapSubtype = (tipo: string, domain: Domain): VideoSubtype | undefined => {
    if (domain === 'books') return undefined;
    
    switch (tipo?.toLowerCase()) {
      case 'filme':
      case 'movie':
        return 'movie';
      case 'serie':
      case 'series':
        return 'series';
      default:
        return 'movie';
    }
  };

  const domain = mapDomain(record.tipo_item);
  
  return {
    id: record.id.toString(),
    title: record.titulo,
    status: mapStatus(record.status),
    domain,
    subtype: mapSubtype(record.tipo, domain),
    rating: record.nota || undefined,
    year: record.data ? parseInt(record.data.split('-')[0]) : undefined,
    genre: record.genero || undefined,
    author: record.autor || undefined,
  };
};

const convertFromCultureItem = (item: Omit<Item, "id">) => {
  // Map English frontend values back to Portuguese for database
  const mapStatusToPortuguese = (status: Status): string => {
    switch (status) {
      case 'backlog':
        return item.domain === 'books' ? 'quero ler' : 'quero assistir';
      case 'doing':
        return item.domain === 'books' ? 'lendo' : 'assistindo';
      case 'done':
        return item.domain === 'books' ? 'lido' : 'assistido';
      default:
        return 'quero ler';
    }
  };

  const mapDomainToPortuguese = (domain: Domain): string => {
    switch (domain) {
      case 'books':
        return 'livro';
      case 'videos':
        // For videos, we'll use subtype to determine tipo_item
        return item.subtype === 'series' ? 'serie' : 'filme';
      default:
        return 'livro';
    }
  };

  const mapSubtypeToPortuguese = (subtype?: VideoSubtype): string | null => {
    if (!subtype) return null;
    
    switch (subtype) {
      case 'movie':
        return 'filme';
      case 'series':
        return 'serie';
      default:
        return 'filme';
    }
  };

  return {
    titulo: item.title,
    status: mapStatusToPortuguese(item.status),
    tipo_item: mapDomainToPortuguese(item.domain),
    tipo: mapSubtypeToPortuguese(item.subtype),
    nota: item.rating || null,
    data: item.year ? `${item.year}-01-01` : new Date().toISOString().split('T')[0],
    origem: "manual",
    genero: item.genre || null,
    autor: item.author || null,
  };
};

export function useCultureItems() {
  return useQuery({
    queryKey: ["culture-items"],
    queryFn: async () => {
      // Get current user to filter explicitly  
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.log('🚫 No authenticated user for cultura items');
        return [];
      }

      console.log('🔍 Fetching cultura items for user:', user.id);

      const { data, error } = await supabase
        .from("cultura")
        .select("*")
        .eq("user_id", user.id) // Explicit filter by user_id
        .order("data", { ascending: false });

      if (error) throw error;
      
      console.log('📚 Found cultura items:', data?.length || 0);
      
      return data.map(convertToCultureItem);
    },
  });
}

export function useAddCultureItem() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (item: Omit<Item, "id">) => {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      const record = convertFromCultureItem(item);
      
      // Explicitly set user_id to ensure RLS policies pass
      const recordWithUser = {
        ...record,
        user_id: user.id,
      };

      console.log('📝 Inserting cultura record:', recordWithUser);

      const { data, error } = await supabase
        .from("cultura")
        .insert([recordWithUser])
        .select()
        .single();

      if (error) {
        console.error('❌ Insert failed:', error);
        throw error;
      }
      
      console.log('✅ Insert successful:', data);
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

// Helper function to convert partial updates correctly
const convertPatchToRecord = (patch: Partial<Item>) => {
  const record: Partial<CultureRecord> = {};
  
  if (patch.title !== undefined) record.titulo = patch.title;
  if (patch.status !== undefined) {
    // Map status to Portuguese based on domain
    const mapStatusToPortuguese = (status: Status, domain?: Domain): string => {
      switch (status) {
        case 'backlog':
          return domain === 'books' ? 'quero ler' : 'quero assistir';
        case 'doing':
          return domain === 'books' ? 'lendo' : 'assistindo';
        case 'done':
          return domain === 'books' ? 'lido' : 'assistido';
        default:
          return 'quero ler';
      }
    };
    record.status = mapStatusToPortuguese(patch.status, patch.domain);
  }
  if (patch.domain !== undefined) {
    record.tipo_item = patch.domain === 'books' ? 'livro' : 'filme';
  }
  if (patch.subtype !== undefined) {
    record.tipo = patch.subtype === 'series' ? 'serie' : 'filme';
  }
  if (patch.rating !== undefined) record.nota = patch.rating;
  if (patch.year !== undefined) {
    record.data = patch.year ? `${patch.year}-01-01` : null;
  }
  if (patch.genre !== undefined) {
    record.genero = patch.genre;
  }
  if (patch.author !== undefined) {
    record.autor = patch.author;
  }
  
  return record;
};

export function useUpdateCultureItem() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Item> }) => {
      // Only convert the fields that are actually being updated
      const record = convertPatchToRecord(updates);

      console.log('📝 Updating cultura record:', record);

      const { data, error } = await supabase
        .from("cultura")
        .update(record)
        .eq("id", parseInt(id))
        .select()
        .single();

      if (error) {
        console.error('❌ Update failed:', error);
        throw error;
      }
      
      console.log('✅ Update successful:', data);
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