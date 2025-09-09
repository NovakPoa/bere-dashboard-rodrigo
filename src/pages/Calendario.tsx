import { useEffect, useMemo, useState } from "react";
import { setPageSEO } from "@/lib/seo";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";
import { Plus, Settings } from "lucide-react";
import { useCalendarSettings } from "@/hooks/useCalendarSettings";

export default function Calendario() {
  const { settings, loading, saveSettings, deleteSettings } = useCalendarSettings();
  const [draftId, setDraftId] = useState("");
  const [draftTz, setDraftTz] = useState("America/Sao_Paulo");
  const [draftView, setDraftView] = useState("WEEK");
  const [showConnectionForm, setShowConnectionForm] = useState(false);
  const [showPrint, setShowPrint] = useState(false);
  const [showTabs, setShowTabs] = useState(false);
  const [showCalendars, setShowCalendars] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => setPageSEO("Calendário", "Visualize seu Google Agenda"), []);
  
  // Update draft values when settings change
  useEffect(() => {
    setDraftId(settings.calendarId);
    setDraftTz(settings.timezone);
    setDraftView(settings.defaultView);
  }, [settings]);

  const embedUrl = useMemo(() => {
    if (!settings.calendarId) return "";
    const src = encodeURIComponent(settings.calendarId);
    const tz = encodeURIComponent(settings.timezone);
    const mode = encodeURIComponent(settings.defaultView);
    
    // Modern URL parameters for cleaner appearance
    const params = new URLSearchParams({
      src: settings.calendarId,
      ctz: settings.timezone,
      mode: settings.defaultView,
      showPrint: showPrint ? "1" : "0",
      showTabs: showTabs ? "1" : "0", 
      showCalendars: showCalendars ? "1" : "0",
      showTz: "0",
      bgcolor: "%23ffffff"
    });
    
    return `https://calendar.google.com/calendar/embed?${params.toString()}`;
  }, [settings, showPrint, showTabs, showCalendars]);

  const handleSaveSettings = async () => {
    const success = await saveSettings(draftId, draftTz, draftView);
    if (success) {
      setShowConnectionForm(false);
    }
  };

  const handleDisconnect = async () => {
    const success = await deleteSettings();
    if (success) {
      setShowConnectionForm(false);
    }
  };

  return (
    <div className="min-h-screen">
      <header className="container py-6 flex justify-between items-center">
        <h1 className="text-3xl md:text-4xl font-semibold text-foreground">Calendário</h1>
        <Drawer open={showConnectionForm} onOpenChange={setShowConnectionForm}>
          <DrawerTrigger asChild>
            <Button size="icon" variant="outline">
              <Plus className="h-4 w-4" />
            </Button>
          </DrawerTrigger>
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle>Conectar ao Google Agenda</DrawerTitle>
            </DrawerHeader>
            <div className="px-4 pb-4 space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="md:col-span-2 grid gap-2">
                  <label className="text-sm text-muted-foreground">ID do Calendário (público)</label>
                  <Input placeholder="ex.: seu_email@gmail.com ou ID público" value={draftId} onChange={(e) => setDraftId(e.target.value)} />
                </div>
                <div className="grid gap-2">
                  <label className="text-sm text-muted-foreground">Fuso horário</label>
                  <Select value={draftTz} onValueChange={(v) => setDraftTz(v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="America/Sao_Paulo">America/Sao_Paulo</SelectItem>
                      <SelectItem value="America/Bahia">America/Bahia</SelectItem>
                      <SelectItem value="America/Manaus">America/Manaus</SelectItem>
                      <SelectItem value="UTC">UTC</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <label className="text-sm text-muted-foreground">Visualização padrão</label>
                  <Select value={draftView} onValueChange={(v) => setDraftView(v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="WEEK">Semanal</SelectItem>
                      <SelectItem value="MONTH">Mensal</SelectItem>
                      <SelectItem value="AGENDA">Agenda</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="md:col-span-3 flex flex-col sm:flex-row justify-end gap-2">
                  <Button variant="secondary" onClick={() => { setDraftId(settings.calendarId); setDraftTz(settings.timezone); setDraftView(settings.defaultView); setShowConnectionForm(false); }}>Cancelar</Button>
                  <Button onClick={handleSaveSettings}>Salvar</Button>
                  {settings.calendarId && (
                    <Button variant="outline" onClick={handleDisconnect}>Desconectar</Button>
                  )}
                </div>
                {!settings.calendarId && (
                  <p className="md:col-span-3 text-sm text-muted-foreground">
                    Dica: torne seu calendário público em Configurações do Google Agenda e copie o ID público para visualizar aqui.
                  </p>
                )}
              </div>
            </div>
          </DrawerContent>
        </Drawer>
      </header>

      <main className="container py-8 space-y-6">
        {embedUrl && (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm text-muted-foreground">Personalização</CardTitle>
                <Settings className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center space-x-2">
                <Switch checked={showPrint} onCheckedChange={setShowPrint} />
                <label className="text-sm">Mostrar botão imprimir</label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch checked={showTabs} onCheckedChange={setShowTabs} />
                <label className="text-sm">Mostrar abas</label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch checked={showCalendars} onCheckedChange={setShowCalendars} />
                <label className="text-sm">Mostrar lista de calendários</label>
              </div>
            </CardContent>
          </Card>
        )}

        <section aria-labelledby="agenda">
          <h2 id="agenda" className="sr-only">Agenda</h2>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm text-muted-foreground">Sua agenda</CardTitle>
            </CardHeader>
            <CardContent>
              {embedUrl ? (
                <div className="relative">
                  {isLoading && (
                    <div className="absolute inset-0 bg-background/50 flex items-center justify-center rounded-lg">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                  )}
                  <div className="rounded-lg overflow-hidden border bg-card shadow-sm">
                    <iframe 
                      title="Google Calendar" 
                      src={embedUrl} 
                      className="w-full transition-opacity duration-300" 
                      style={{ 
                        minHeight: 640,
                        aspectRatio: "16/10",
                        opacity: isLoading ? 0.5 : 1 
                      }} 
                      loading="lazy"
                      onLoad={() => setIsLoading(false)}
                      onError={() => setIsLoading(false)}
                    />
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                    <Plus className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">Nenhum calendário conectado</p>
                  <p className="text-xs text-muted-foreground">Conecte um calendário público clicando no botão "+" acima para visualizar sua agenda aqui.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  );
}
