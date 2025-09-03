import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Smartphone, ExternalLink, Check, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

interface TerraUser {
  user_id: string;
  provider: string;
  state: string;
  reference_id?: string;
  granted_scopes?: string;
  created_at: string;
}

export default function TerraApiIntegration() {
  const [isConnecting, setIsConnecting] = useState(false);

  // Check if user is already connected to Terra API
  const { data: terraUser, isLoading, refetch } = useQuery({
    queryKey: ["terra-user"],
    queryFn: async () => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return null;

      const { data, error } = await supabase
        .from("terra_users")
        .select("*")
        .eq("reference_id", user.user.id)
        .single();

      if (error && error.code !== "PGRST116") {
        console.error("Error fetching Terra user:", error);
      }
      
      return data as TerraUser | null;
    },
  });

  const handleConnect = async () => {
    setIsConnecting(true);
    try {
      console.log('🔗 Iniciando conexão Terra API...');
      
      // Ensure we pass an access token for the Edge Function to identify the user
      const { data: sessionData } = await supabase.auth.getSession();
      const access_token = sessionData.session?.access_token;

      // Call Terra API integration endpoint with origin and access token
      const { data, error } = await supabase.functions.invoke("terra-connect", {
        body: { origin: window.location.origin, access_token },
      });

      console.log('📡 Terra connect response:', { data, error });

      if (error) {
        toast.error(error.message || "Erro ao conectar com Terra API");
        console.error("Terra connect error:", error);
        return;
      }

      if (data?.error) {
        const status = data.status ? ` (status ${data.status})` : "";
        const details = data.details
          ? typeof data.details === "string"
            ? ` - ${data.details}`
            : ` - ${JSON.stringify(data.details)}`
          : "";
        toast.error(`Erro Terra: ${data.error}${status}${details}`);
        console.error("Terra connect response error:", data);
        return;
      }

      if (data?.auth_url) {
        console.log('✅ URL de autorização recebida, redirecionando...');
        toast.success("Redirecionando para autorizar a conexão");
        window.location.href = data.auth_url;
      } else {
        toast.error("Não foi possível obter a URL de autorização");
        console.error("Terra connect: missing auth_url", data);
      }
    } catch (error) {
      toast.error("Erro ao iniciar conexão");
      console.error("Connect error:", error);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      if (!terraUser) return;

      const { error } = await supabase.functions.invoke("terra-disconnect", {
        body: { user_id: terraUser.user_id },
      });

      if (error) {
        toast.error("Erro ao desconectar");
        return;
      }

      await refetch();
      toast.success("Desconectado do Garmin");
    } catch (error) {
      toast.error("Erro ao desconectar");
      console.error("Disconnect error:", error);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            Integração Garmin
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse bg-muted h-4 w-32 rounded"></div>
        </CardContent>
      </Card>
    );
  }

  const isConnected = !!terraUser;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Smartphone className="h-5 w-5" />
          Integração Garmin
          {isConnected ? (
            <Badge variant="default" className="ml-auto">
              <Check className="h-3 w-3 mr-1" />
              Conectado
            </Badge>
          ) : (
            <Badge variant="outline" className="ml-auto">
              <X className="h-3 w-3 mr-1" />
              Desconectado
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isConnected ? (
          <div className="space-y-3">
            <div className="text-sm text-muted-foreground">
              <p>Conectado via {terraUser.provider}</p>
              {terraUser.granted_scopes && (
                <p className="text-xs mt-1">
                  Permissões: {terraUser.granted_scopes}
                </p>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDisconnect}
              className="w-full"
            >
              Desconectar
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Conecte seu Garmin para sincronizar automaticamente suas atividades físicas.
            </p>
            <Button
              onClick={handleConnect}
              disabled={isConnecting}
              className="w-full"
            >
              {isConnecting ? (
                "Conectando..."
              ) : (
                <>
                  Conectar Garmin
                  <ExternalLink className="h-4 w-4 ml-2" />
                </>
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}