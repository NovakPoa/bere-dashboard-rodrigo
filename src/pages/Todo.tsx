import { useEffect } from "react";
import { setPageSEO } from "@/lib/seo";

export default function Todo() {
  useEffect(() => setPageSEO("To‑do lists | Berê", "Organize suas tarefas"), []);
  return (
    <main>
      <h1 className="text-2xl font-semibold">To‑do lists</h1>
      <p className="text-muted-foreground mt-2">MVP em breve: backlog, iniciadas e concluídas.</p>
    </main>
  );
}
