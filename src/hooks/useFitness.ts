import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { FitnessEntry } from "@/lib/fitness";

interface DbActivityRow {
  id: number;
  tipo: string;
  modalidade?: string;
  duracao_min?: number;
  distancia_km?: number;
  calorias?: number;
  data: string;
  user_id?: string;
  created_at: string;
  texto?: string;
  origem?: string;
  wa_id?: string;
  ts?: string;
}

// Convert Supabase record to FitnessEntry type
const convertToFitnessEntry = (record: DbActivityRow): FitnessEntry => {
  return {
    tipo: record.tipo || '',
    minutos: record.duracao_min || 0,
    distanciaKm: record.distancia_km || 0,
    calorias: record.calorias || undefined,
    data: record.data,
    nota: record.texto || '',
  };
};

// Convert FitnessEntry to Supabase record format
const convertFromFitnessEntry = (entry: Omit<FitnessEntry, 'data'> & { data?: string }) => ({
  tipo: entry.tipo,
  modalidade: entry.tipo, // use tipo as modalidade
  duracao_min: entry.minutos,
  distancia_km: entry.distanciaKm,
  calorias: entry.calorias || null,
  data: entry.data || new Date().toISOString().slice(0, 10),
  texto: entry.nota || null,
  origem: 'manual',
  user_id: null, // Will be set by RLS automatically when inserting
});

export function useUpdateActivity() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<FitnessEntry> }) => {
      const updateData: any = {};
      
      if (updates.tipo !== undefined) {
        updateData.tipo = updates.tipo;
        updateData.modalidade = updates.tipo; // use tipo as modalidade
      }
      if (updates.minutos !== undefined) updateData.duracao_min = updates.minutos;
      if (updates.distanciaKm !== undefined) updateData.distancia_km = updates.distanciaKm;
      if (updates.calorias !== undefined) updateData.calorias = updates.calorias;
      if (updates.data !== undefined) updateData.data = updates.data;
      if (updates.nota !== undefined) updateData.texto = updates.nota;

      const { data, error } = await supabase
        .from("atividade_fisica")
        .update(updateData)
        .eq("id", parseInt(id))
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["activities"] });
      toast({
        title: "Atividade atualizada",
        description: "Atividade foi atualizada com sucesso!",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: `Falha ao atualizar atividade: ${error.message}`,
        variant: "destructive",
      });
    },
  });
}

export function useRemoveActivity() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("atividade_fisica")
        .delete()
        .eq("id", parseInt(id));

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["activities"] });
      toast({
        title: "Atividade removida",
        description: "Atividade foi removida com sucesso!",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: `Falha ao remover atividade: ${error.message}`,
        variant: "destructive",
      });
    },
  });
}