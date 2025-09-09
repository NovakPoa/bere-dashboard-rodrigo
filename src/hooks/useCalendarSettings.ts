import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

type CalendarSettings = {
  calendarId: string;
  timezone: string;
  defaultView: string;
};

const STORAGE_KEY = "calendar_settings_v2";

export const useCalendarSettings = () => {
  const [settings, setSettings] = useState<CalendarSettings>({ calendarId: "", timezone: "America/Sao_Paulo", defaultView: "WEEK" });
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Migrate localStorage data to Supabase
  const migrateLocalStorageData = async () => {
    try {
      const localData = localStorage.getItem(STORAGE_KEY);
      if (localData) {
        const parsed = JSON.parse(localData);
        if (parsed.calendarId && parsed.calendarId !== "rodrigohcribeiro@gmail.com") {
          await saveSettings(parsed.calendarId, parsed.timezone || "America/Sao_Paulo", parsed.defaultView || "WEEK");
          localStorage.removeItem(STORAGE_KEY);
        }
      }
    } catch (error) {
      console.error("Error migrating localStorage data:", error);
    }
  };

  // Load settings from Supabase
  const loadSettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("calendar_settings")
        .select("calendar_id, timezone, default_view")
        .eq("user_id", user.id)
        .single();

      if (error && error.code !== "PGRST116") {
        console.error("Error loading calendar settings:", error);
        setLoading(false);
        return;
      }

      if (data) {
        setSettings({
          calendarId: data.calendar_id,
          timezone: data.timezone,
          defaultView: data.default_view || "WEEK"
        });
      } else {
        // Try to migrate localStorage data
        await migrateLocalStorageData();
      }
    } catch (error) {
      console.error("Error loading calendar settings:", error);
    } finally {
      setLoading(false);
    }
  };

  // Save settings to Supabase
  const saveSettings = async (calendarId: string, timezone: string, defaultView: string = "WEEK") => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Erro",
          description: "Você precisa estar logado para salvar as configurações",
          variant: "destructive"
        });
        return false;
      }

      const { error } = await supabase
        .from("calendar_settings")
        .upsert({
          user_id: user.id,
          calendar_id: calendarId.trim(),
          timezone: timezone,
          default_view: defaultView
        });

      if (error) {
        console.error("Error saving calendar settings:", error);
        toast({
          title: "Erro",
          description: "Erro ao salvar configurações do calendário",
          variant: "destructive"
        });
        return false;
      }

      setSettings({ calendarId: calendarId.trim(), timezone, defaultView });
      toast({
        title: "Sucesso",
        description: "Configurações do calendário salvas com sucesso"
      });
      return true;
    } catch (error) {
      console.error("Error saving calendar settings:", error);
      toast({
        title: "Erro",
        description: "Erro ao salvar configurações do calendário",
        variant: "destructive"
      });
      return false;
    }
  };

  // Delete settings
  const deleteSettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const { error } = await supabase
        .from("calendar_settings")
        .delete()
        .eq("user_id", user.id);

      if (error) {
        console.error("Error deleting calendar settings:", error);
        return false;
      }

      setSettings({ calendarId: "", timezone: "America/Sao_Paulo", defaultView: "WEEK" });
      toast({
        title: "Sucesso",
        description: "Configurações do calendário removidas"
      });
      return true;
    } catch (error) {
      console.error("Error deleting calendar settings:", error);
      return false;
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  return {
    settings,
    loading,
    saveSettings,
    deleteSettings
  };
};