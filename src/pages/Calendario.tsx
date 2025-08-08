import { useEffect, useMemo, useState } from "react";
import { setPageSEO } from "@/lib/seo";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const STORAGE_KEY = "calendar_settings_v2";

type Settings = {
  calendarId: string; // e.g., seu_email@gmail.com ou ID público
  timezone: string;   // IANA tz
};

const loadSettings = (): Settings => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : { calendarId: "rodrigohcribeiro@gmail.com", timezone: "America/Sao_Paulo" };
  } catch {
    return { calendarId: "rodrigohcribeiro@gmail.com", timezone: "America/Sao_Paulo" };
  }
};

export default function Calendario() {
  const [settings, setSettings] = useState<Settings>(() => loadSettings());
  const [draftId, setDraftId] = useState(settings.calendarId);
  const [draftTz, setDraftTz] = useState(settings.timezone);

  useEffect(() => setPageSEO("Calendário | Berê", "Visualize seu Google Agenda"), []);
  useEffect(() => localStorage.setItem(STORAGE_KEY, JSON.stringify(settings)), [settings]);

  const embedUrl = useMemo(() => {
    if (!settings.calendarId) return "";
    const src = encodeURIComponent(settings.calendarId);
    const tz = encodeURIComponent(settings.timezone);
    return `https://calendar.google.com/calendar/embed?src=${src}&ctz=${tz}&mode=MONTH&showTitle=0&showPrint=0&showTabs=1&showTz=0`;
  }, [settings]);

  return (
    <div className="min-h-screen">
      <header className="bg-gradient-primary">
        <div className="container py-12">
          <h1 className="text-4xl md:text-5xl font-semibold text-primary-foreground">Calendário | Berê</h1>
        </div>
      </header>

      <main className="container py-8 space-y-8">
        <section aria-labelledby="config">
          <h2 id="config" className="sr-only">Configuração do Google Agenda</h2>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm text-muted-foreground">Conectar ao Google Agenda (calendário público)</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-3">
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
              <div className="md:col-span-3 flex justify-end gap-2">
                <Button variant="secondary" onClick={() => { setDraftId(settings.calendarId); setDraftTz(settings.timezone); }}>Cancelar</Button>
                <Button onClick={() => setSettings({ calendarId: draftId.trim(), timezone: draftTz })}>Salvar</Button>
                {settings.calendarId && (
                  <Button variant="outline" onClick={() => setSettings({ calendarId: "", timezone: settings.timezone })}>Desconectar</Button>
                )}
              </div>
              {!settings.calendarId && (
                <p className="md:col-span-3 text-sm text-muted-foreground">
                  Dica: torne seu calendário público em Configurações do Google Agenda e copie o ID público para visualizar aqui.
                </p>
              )}
            </CardContent>
          </Card>
        </section>

        <section aria-labelledby="agenda">
          <h2 id="agenda" className="sr-only">Agenda</h2>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm text-muted-foreground">Sua agenda</CardTitle>
            </CardHeader>
            <CardContent>
              {embedUrl ? (
                <div className="rounded-md overflow-hidden border">
                  <iframe title="Google Calendar" src={embedUrl} className="w-full" style={{ minHeight: 640 }} loading="lazy" />
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Conecte um calendário público para visualizar aqui.</p>
              )}
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  );
}
