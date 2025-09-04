import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface Profile {
  id: string;
  phone_number?: string;
  full_name?: string;
  email?: string;
  created_at: string;
  updated_at: string;
  height?: number;
  weight?: number;
  age?: number;
  gender?: 'masculino' | 'feminino';
  activity_level?: 'sedentario' | 'levemente_ativo' | 'moderadamente_ativo' | 'muito_ativo' | 'super_ativo';
}

export interface MetabolicRates {
  bmr: number; // Basal Metabolic Rate
  tdee: number; // Total Daily Energy Expenditure
}

export function calculateBMR(profile: Profile): MetabolicRates | null {
  if (!profile.height || !profile.weight || !profile.age || !profile.gender || !profile.activity_level) {
    return null;
  }

  let bmr: number;
  
  // Harris-Benedict Formula (revised)
  if (profile.gender === 'masculino') {
    bmr = 88.362 + (13.397 * profile.weight) + (4.799 * profile.height) - (5.677 * profile.age);
  } else {
    bmr = 447.593 + (9.247 * profile.weight) + (3.098 * profile.height) - (4.330 * profile.age);
  }

  // Activity multipliers
  const activityMultipliers = {
    sedentario: 1.2,
    levemente_ativo: 1.375,
    moderadamente_ativo: 1.55,
    muito_ativo: 1.725,
    super_ativo: 1.9
  };

  const tdee = bmr * activityMultipliers[profile.activity_level];

  return { bmr: Math.round(bmr), tdee: Math.round(tdee) };
}

export function useProfile() {
  return useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      // Try to get existing profile
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      if (error) throw error;

      // If no profile exists, create one
      if (!data) {
        const { data: newProfile, error: insertError } = await supabase
          .from("profiles")
          .insert({
            id: user.id,
            full_name: user.email
          })
          .select()
          .single();

        if (insertError) throw insertError;
        
        return {
          ...newProfile,
          email: user.email
        } as Profile;
      }

      return {
        ...data,
        email: user.email
      } as Profile;
    },
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (updates: Partial<Profile>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      // Try to update existing profile, create if doesn't exist
      const { data, error } = await supabase
        .from("profiles")
        .upsert({
          id: user.id,
          ...updates
        })
        .select()
        .single();

      if (error) throw error;
      return data as Profile;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      toast({
        title: "Perfil atualizado",
        description: "Suas informações foram salvas com sucesso!",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: `Falha ao atualizar perfil: ${error.message}`,
        variant: "destructive",
      });
    },
  });
}

export function useLinkHistoricalData() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (phoneNumber: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const { data, error } = await supabase.rpc(
        "link_historical_whatsapp_data",
        {
          target_user_id: user.id,
          user_phone: phoneNumber,
        }
      );

      if (error) throw error;
      return data as number;
    },
    onSuccess: (linkedCount) => {
      if (linkedCount > 0) {
        toast({
          title: "Dados vinculados",
          description: `${linkedCount} registros do WhatsApp foram vinculados ao seu perfil!`,
        });
      } else {
        toast({
          title: "Nenhum dado encontrado",
          description: "Não foram encontrados registros do WhatsApp para vincular.",
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: `Falha ao vincular dados: ${error.message}`,
        variant: "destructive",
      });
    },
  });
}