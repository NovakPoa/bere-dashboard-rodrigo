import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Activity, CheckCircle, XCircle, Clock, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function GarminSyncStatus() {
  // Verificar se existe conexão Terra/Garmin
  const { data: terraUser, isLoading: terraLoading } = useQuery({
    queryKey: ["terra-user-status"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("terra_users")
        .select("*")
        .eq("provider", "GARMIN")
        .maybeSingle();
      
      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        throw error;
      }
      
      return data;
    },
  });

  // Verificar último payload recebido
  const { data: lastPayload, isLoading: payloadLoading } = useQuery({
    queryKey: ["last-terra-payload"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("terra_data_payloads")
        .select("created_at, data_type")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (error && error.code !== 'PGRST116') {
        throw error;
      }
      
      return data;
    },
  });

  // Verificar última atividade sincronizada
  const { data: lastActivity, isLoading: activityLoading } = useQuery({
    queryKey: ["last-garmin-activity"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("atividade_fisica")
        .select("created_at, modalidade, duracao_min")
        .or("origem.eq.garmin,modalidade.ilike.terra-%")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (error && error.code !== 'PGRST116') {
        throw error;
      }
      
      return data;
    },
  });

  const isLoading = terraLoading || payloadLoading || activityLoading;

  const getConnectionStatus = () => {
    if (!terraUser) {
      return {
        status: "disconnected",
        label: "Desconectado",
        description: "Conecte seu dispositivo Garmin para sincronizar atividades",
        variant: "destructive" as const,
        icon: <XCircle className="h-4 w-4" />
      };
    }

    if (terraUser.state === "AUTHENTICATED" || terraUser.state === "auth_success") {
      return {
        status: "connected",
        label: "Conectado",
        description: "Dispositivo Garmin conectado e autenticado",
        variant: "default" as const,
        icon: <CheckCircle className="h-4 w-4" />
      };
    }

    return {
      status: "pending",
      label: "Pendente",
      description: "Aguardando autenticação do dispositivo",
      variant: "secondary" as const,
      icon: <Clock className="h-4 w-4" />
    };
  };

  const connectionStatus = getConnectionStatus();

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Activity className="h-4 w-4 animate-pulse" />
            <span>Verificando status da sincronização...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Activity className="h-5 w-5" />
          Status da Sincronização
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Badge variant={connectionStatus.variant} className="gap-1">
              {connectionStatus.icon}
              {connectionStatus.label}
            </Badge>
            <span className="text-sm text-muted-foreground">
              {connectionStatus.description}
            </span>
          </div>
          
          {!terraUser && (
            <Button variant="outline" size="sm" asChild>
              <a href="/atividades" className="gap-1">
                <ExternalLink className="h-3 w-3" />
                Conectar
              </a>
            </Button>
          )}
        </div>

        {terraUser && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t">
            <div>
              <div className="text-sm font-medium">Último Payload</div>
              <div className="text-xs text-muted-foreground">
                {lastPayload ? (
                  <>
                    {formatDistanceToNow(new Date(lastPayload.created_at), { 
                      addSuffix: true, 
                      locale: ptBR 
                    })}
                    <span className="ml-1">({lastPayload.data_type})</span>
                  </>
                ) : (
                  "Nenhum payload recebido"
                )}
              </div>
            </div>
            
            <div>
              <div className="text-sm font-medium">Última Atividade</div>
              <div className="text-xs text-muted-foreground">
                {lastActivity ? (
                  <>
                    {formatDistanceToNow(new Date(lastActivity.created_at), { 
                      addSuffix: true, 
                      locale: ptBR 
                    })}
                    <span className="ml-1">
                      ({lastActivity.modalidade || 'Atividade'})
                    </span>
                  </>
                ) : (
                  "Nenhuma atividade sincronizada"
                )}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}