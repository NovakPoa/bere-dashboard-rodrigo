import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Watch, Check, X, ExternalLink, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface TerraUser {
  user_id: string;
  provider: string;
  state: string;
  reference_id?: string;
  granted_scopes?: string;
  created_at: string;
}

export default function WearableButton() {
  const [isConnecting, setIsConnecting] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const queryClient = useQueryClient();

  // Handle Terra connection result from URL params
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const terraConnected = urlParams.get('terra_connected');
    const terraError = urlParams.get('terra_error');

    if (terraConnected === 'true') {
      toast.success('Garmin conectado com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['terra-user'] });
      // Clean URL
      window.history.replaceState({}, '', '/atividades');
    } else if (terraError === 'true') {
      toast.error('Erro ao conectar com o Garmin. Tente novamente.');
      // Clean URL
      window.history.replaceState({}, '', '/atividades');
    }
  }, [queryClient]);

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
      const { data: sessionData } = await supabase.auth.getSession();
      const access_token = sessionData.session?.access_token;

      const { data, error } = await supabase.functions.invoke("terra-connect", {
        body: { origin: window.location.origin, access_token },
      });

      if (error) {
        const errorMessage = data?.error || error.message || "Erro ao conectar com Terra API";
        const errorDetails = data?.details ? ` (${data.details})` : '';
        toast.error(errorMessage + errorDetails);
        return;
      }

      if (data?.message === 'Already connected') {
        toast.success('Você já está conectado ao Garmin.');
        await refetch();
        return;
      }

      if (data?.error) {
        toast.error(`Erro Terra: ${data.error}`);
        return;
      }

      if (data?.auth_url) {
        toast.success("Abrindo página de autorização do Garmin");
        const opened = window.open(data.auth_url, '_blank', 'noopener,noreferrer');
        if (!opened) {
          if (window.top) {
            try {
              window.top.location.assign(data.auth_url);
            } catch {
              window.location.assign(data.auth_url);
            }
          } else {
            window.location.assign(data.auth_url);
          }
        }
      } else {
        toast.error("Não foi possível obter a URL de autorização");
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
      setIsOpen(false);
    } catch (error) {
      toast.error("Erro ao desconectar");
      console.error("Disconnect error:", error);
    }
  };

  const isConnected = !!terraUser;

  // Button content based on state
  const getButtonContent = () => {
    if (isLoading) {
      return (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Verificando...
        </>
      );
    }

    if (isConnected) {
      return (
        <>
          <Check className="h-4 w-4" />
          Wearable Conectado
        </>
      );
    }

    return (
      <>
        <Watch className="h-4 w-4" />
        Conectar Wearable
      </>
    );
  };

  const getButtonVariant = () => {
    if (isConnected) return "default";
    return "outline";
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button 
          variant={getButtonVariant()}
          className="w-full lg:w-auto"
          disabled={isLoading}
        >
          {getButtonContent()}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Watch className="h-5 w-5" />
            Integração Wearable
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {isConnected ? (
            <div className="space-y-4">
              <div className="flex items-center justify-center">
                <Badge variant="default" className="text-sm">
                  <Check className="h-3 w-3 mr-1" />
                  Conectado ao Garmin
                </Badge>
              </div>
              
              <div className="text-center space-y-2">
                <p className="text-sm text-muted-foreground">
                  Suas atividades do Garmin serão sincronizadas automaticamente.
                </p>
                <p className="text-xs text-muted-foreground">
                  Conectado em: {new Date(terraUser.created_at).toLocaleDateString('pt-BR')}
                </p>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={handleDisconnect}
                  className="flex-1"
                >
                  Desconectar
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => setIsOpen(false)}
                  className="flex-1"
                >
                  Fechar
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-center space-y-2">
                <Badge variant="outline" className="text-sm">
                  <X className="h-3 w-3 mr-1" />
                  Desconectado
                </Badge>
                <p className="text-sm text-muted-foreground">
                  Conecte seu Garmin para sincronizar automaticamente suas atividades físicas e ter dados mais precisos.
                </p>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handleConnect}
                  disabled={isConnecting}
                  className="flex-1"
                >
                  {isConnecting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Conectando...
                    </>
                  ) : (
                    <>
                      Conectar Garmin
                      <ExternalLink className="h-4 w-4 ml-2" />
                    </>
                  )}
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => setIsOpen(false)}
                  className="flex-1"
                >
                  Cancelar
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}