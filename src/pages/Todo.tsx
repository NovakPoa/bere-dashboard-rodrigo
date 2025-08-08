import { useEffect, useMemo, useState } from "react";
import { setPageSEO } from "@/lib/seo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";

type Status = "backlog" | "in_progress" | "done";

type Task = {
  id: string;
  title: string;
  notes?: string;
  status: Status;
  completedAt?: string; // ISO date (YYYY-MM-DD)
};

const STORAGE_KEY = "todo_tasks_v1";

const loadTasks = (): Task[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Task[]) : [];
  } catch {
    return [];
  }
};

const saveTasks = (tasks: Task[]) => localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));

export default function Todo() {
  const [tasks, setTasks] = useState<Task[]>(() => loadTasks());
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => setPageSEO("To‑do | Berê", "Organize tarefas por status e conclua"), []);
  useEffect(() => saveTasks(tasks), [tasks]);

  const addTask = () => {
    const t = title.trim();
    if (!t) {
      toast({ title: "Informe um título", variant: "destructive" });
      return;
    }
    const newTask: Task = { id: crypto.randomUUID(), title: t, notes: notes.trim() || undefined, status: "backlog" };
    setTasks((prev) => [newTask, ...prev]);
    setTitle("");
    setNotes("");
    toast({ title: "Tarefa adicionada" });
  };

  const updateTask = (id: string, patch: Partial<Task>) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  };

  const removeTask = (id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  };

  const lists = useMemo(() => ({
    backlog: tasks.filter((t) => t.status === "backlog"),
    in_progress: tasks.filter((t) => t.status === "in_progress"),
    done: tasks.filter((t) => t.status === "done"),
  }), [tasks]);

  const StatusSelect = ({ value, onChange }: { value: Status; onChange: (s: Status) => void }) => (
    <Select value={value} onValueChange={(v) => onChange(v as Status)}>
      <SelectTrigger className="w-full sm:w-56">
        <SelectValue placeholder="Status" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="backlog">Backlog</SelectItem>
        <SelectItem value="in_progress">Em desenvolvimento</SelectItem>
        <SelectItem value="done">Feitas</SelectItem>
      </SelectContent>
    </Select>
  );

  const TaskItem = ({ task }: { task: Task }) => (
    <article className="rounded-md border p-3 flex flex-col gap-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h4 className="font-medium leading-snug break-words">{task.title}</h4>
          {task.notes && <p className="text-sm text-muted-foreground mt-1 whitespace-pre-line break-words">{task.notes}</p>}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StatusSelect
            value={task.status}
            onChange={(s) => {
              if (s === "done") {
                const today = new Date();
                const iso = today.toISOString().slice(0, 10);
                updateTask(task.id, { status: s, completedAt: task.completedAt || iso });
              } else {
                updateTask(task.id, { status: s, completedAt: undefined });
              }
            }}
          />
          <Button variant="outline" size="sm" className="shrink-0" onClick={() => removeTask(task.id)}>Remover</Button>
        </div>
      </div>
      {task.status === "done" && (
        <div className="flex flex-wrap items-center gap-3">
          <label className="text-sm text-muted-foreground">Data de finalização</label>
          <Input
            type="date"
            className="w-full sm:w-auto"
            value={task.completedAt || ""}
            onChange={(e) => updateTask(task.id, { completedAt: e.target.value || undefined })}
          />
        </div>
      )}
    </article>
  );

  return (
    <div className="min-h-screen">
      <header className="bg-gradient-primary">
        <div className="container py-12">
          <h1 className="text-4xl md:text-5xl font-semibold text-primary-foreground">To‑do | Berê</h1>
        </div>
      </header>

      <main className="container py-8 space-y-8">
        <section aria-labelledby="add" className="grid gap-4 md:grid-cols-3">
          <h2 id="add" className="sr-only">Adicionar tarefa</h2>
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="text-sm text-muted-foreground">Nova tarefa</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3">
              <Input placeholder="Título" value={title} onChange={(e) => setTitle(e.target.value)} />
              <Textarea placeholder="Notas (opcional)" value={notes} onChange={(e) => setNotes(e.target.value)} />
              <div className="flex justify-end">
                <Button onClick={addTask}>Adicionar</Button>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm text-muted-foreground">Resumo</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-1">
              <p>Backlog: {lists.backlog.length}</p>
              <p>Em desenvolvimento: {lists.in_progress.length}</p>
              <p>Feitas: {lists.done.length}</p>
            </CardContent>
          </Card>
        </section>

        <section aria-labelledby="board" className="grid gap-6 grid-cols-1">
          <h2 id="board" className="sr-only">Quadro de tarefas</h2>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm text-muted-foreground">Backlog</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3">
              {lists.backlog.map((t) => (
                <TaskItem key={t.id} task={t} />
              ))}
              {lists.backlog.length === 0 && <p className="text-sm text-muted-foreground">Sem tarefas.</p>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm text-muted-foreground">Em desenvolvimento</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3">
              {lists.in_progress.map((t) => (
                <TaskItem key={t.id} task={t} />
              ))}
              {lists.in_progress.length === 0 && <p className="text-sm text-muted-foreground">Sem tarefas.</p>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm text-muted-foreground">Feitas</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3">
              {lists.done.map((t) => (
                <TaskItem key={t.id} task={t} />
              ))}
              {lists.done.length === 0 && <p className="text-sm text-muted-foreground">Sem tarefas.</p>}
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  );
}

