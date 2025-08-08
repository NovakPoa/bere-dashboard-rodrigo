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
  const [newTask, setNewTask] = useState<{ status: Status; title: string; notes: string } | null>(null);

  useEffect(() => setPageSEO("To‑do | Berê", "Organize tarefas por status e conclua"), []);
  useEffect(() => saveTasks(tasks), [tasks]);

  const toggleAdd = (status: Status) => {
    setNewTask((prev) => (prev?.status === status ? null : { status, title: "", notes: "" }));
  };

  const addInlineTask = (status: Status) => {
    if (!newTask?.title.trim()) {
      toast({ title: "Informe um título", variant: "destructive" });
      return;
    }
    const t: Task = {
      id: crypto.randomUUID(),
      title: newTask.title.trim(),
      notes: newTask.notes.trim() || undefined,
      status,
    };
    setTasks((prev) => [t, ...prev]);
    setNewTask(null);
    toast({ title: "Tarefa adicionada" });
  };

  const updateTask = (id: string, patch: Partial<Task>) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  };

  const removeTask = (id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  };

  const onDropTo = (status: Status) => (e: any) => {
    e.preventDefault();
    const id = e.dataTransfer?.getData("text/plain");
    if (!id) return;
    setTasks((prev) => {
      const t = prev.find((x) => x.id === id);
      if (!t || t.status === status) return prev;
      const completedPatch = status === "done"
        ? { completedAt: t.completedAt || new Date().toISOString().slice(0, 10) }
        : { completedAt: undefined };
      return prev.map((x) => (x.id === id ? { ...x, status, ...completedPatch } : x));
    });
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
    <article className="rounded-md border p-3 flex flex-col gap-3" draggable onDragStart={(e) => { e.dataTransfer.setData("text/plain", task.id); e.dataTransfer.effectAllowed = "move"; }}>
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
      <div className="flex flex-wrap items-center gap-3">
        <label className="text-sm text-muted-foreground">Data de finalização</label>
        <Input
          type="date"
          className="w-full sm:w-auto"
          value={task.completedAt || ""}
          onChange={(e) => updateTask(task.id, { completedAt: e.target.value || undefined })}
        />
      </div>
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
        <section aria-labelledby="summary">
          <h2 id="summary" className="sr-only">Resumo</h2>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm text-muted-foreground">Resumo</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-muted-foreground">Backlog</p>
                <div className="text-4xl font-semibold text-foreground">{lists.backlog.length}</div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Em desenvolvimento</p>
                <div className="text-4xl font-semibold text-foreground">{lists.in_progress.length}</div>
              </div>
            </CardContent>
          </Card>
        </section>

        <section aria-labelledby="board" className="grid gap-6 grid-cols-1">
          <h2 id="board" className="sr-only">Quadro de tarefas</h2>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-sm text-muted-foreground">Backlog</CardTitle>
              <Button variant="outline" size="sm" onClick={() => toggleAdd("backlog")}>+</Button>
            </CardHeader>
            <CardContent className="grid gap-3" onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }} onDrop={onDropTo("backlog")}>
              {newTask?.status === "backlog" && (
                <div className="rounded-md border p-3 grid gap-2">
                  <Input placeholder="Título" value={newTask.title} onChange={(e) => setNewTask({ ...newTask, title: e.target.value })} />
                  <Textarea placeholder="Notas (opcional)" value={newTask.notes} onChange={(e) => setNewTask({ ...newTask, notes: e.target.value })} />
                  <div className="flex justify-end gap-2">
                    <Button variant="secondary" onClick={() => setNewTask(null)}>Cancelar</Button>
                    <Button onClick={() => addInlineTask("backlog")}>Adicionar</Button>
                  </div>
                </div>
              )}
              {lists.backlog.map((t) => (
                <TaskItem key={t.id} task={t} />
              ))}
              {lists.backlog.length === 0 && <p className="text-sm text-muted-foreground">Sem tarefas.</p>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-sm text-muted-foreground">Em desenvolvimento</CardTitle>
              <Button variant="outline" size="sm" onClick={() => toggleAdd("in_progress")}>+</Button>
            </CardHeader>
            <CardContent className="grid gap-3" onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }} onDrop={onDropTo("in_progress")}>
              {newTask?.status === "in_progress" && (
                <div className="rounded-md border p-3 grid gap-2">
                  <Input placeholder="Título" value={newTask.title} onChange={(e) => setNewTask({ ...newTask, title: e.target.value })} />
                  <Textarea placeholder="Notas (opcional)" value={newTask.notes} onChange={(e) => setNewTask({ ...newTask, notes: e.target.value })} />
                  <div className="flex justify-end gap-2">
                    <Button variant="secondary" onClick={() => setNewTask(null)}>Cancelar</Button>
                    <Button onClick={() => addInlineTask("in_progress")}>Adicionar</Button>
                  </div>
                </div>
              )}
              {lists.in_progress.map((t) => (
                <TaskItem key={t.id} task={t} />
              ))}
              {lists.in_progress.length === 0 && <p className="text-sm text-muted-foreground">Sem tarefas.</p>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-sm text-muted-foreground">Feitas</CardTitle>
              <Button variant="outline" size="sm" onClick={() => toggleAdd("done")}>+</Button>
            </CardHeader>
            <CardContent className="grid gap-3" onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }} onDrop={onDropTo("done")}>
              {newTask?.status === "done" && (
                <div className="rounded-md border p-3 grid gap-2">
                  <Input placeholder="Título" value={newTask.title} onChange={(e) => setNewTask({ ...newTask, title: e.target.value })} />
                  <Textarea placeholder="Notas (opcional)" value={newTask.notes} onChange={(e) => setNewTask({ ...newTask, notes: e.target.value })} />
                  <div className="flex justify-end gap-2">
                    <Button variant="secondary" onClick={() => setNewTask(null)}>Cancelar</Button>
                    <Button onClick={() => addInlineTask("done")}>Adicionar</Button>
                  </div>
                </div>
              )}
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

