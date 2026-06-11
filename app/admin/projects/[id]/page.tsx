"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { api } from "@/lib/api";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import type { Project, Phase, Task } from "@/lib/types";

function TaskStatusDot({ status }: { status: Task["status"] }) {
  const colors: Record<string, string> = {
    todo: "bg-slate-400",
    inprogress: "bg-blue-500",
    done: "bg-emerald-500",
    blocked: "bg-red-500",
    na: "bg-slate-300",
  };
  return <span className={`inline-block h-2 w-2 rounded-full shrink-0 ${colors[status] ?? "bg-slate-400"}`} />;
}

function PhaseBlock({ phase }: { phase: Phase }) {
  const [open, setOpen] = useState(false);
  const tasks = phase.tasks ?? [];
  const done = tasks.filter((t) => t.status === "done").length;
  const countable = tasks.filter((t) => t.status !== "na").length;

  return (
    <div className="border rounded-lg overflow-hidden">
      <button
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/30 transition-colors"
        onClick={() => setOpen((v) => !v)}
      >
        {open ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />}
        <span className="flex-1 font-medium text-sm">{phase.title}</span>
        <Badge variant="outline" className="text-xs">{done}/{countable}</Badge>
      </button>
      {open && tasks.length > 0 && (
        <div className="border-t divide-y">
          {tasks.map((task) => (
            <div key={task.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
              <TaskStatusDot status={task.status} />
              <span className="flex-1 truncate">{task.title}</span>
              {task.room && (
                <Badge variant="secondary" className="text-xs shrink-0">{task.room}</Badge>
              )}
              {task.date_target && (
                <span className="text-xs text-muted-foreground shrink-0">
                  {format(new Date(task.date_target), "d MMM", { locale: fr })}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AdminProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const { data, isLoading } = useQuery({
    queryKey: ["admin-project", id],
    queryFn: () => api.get<{ data: Project & { user?: { id: number; name: string; email: string } } }>(`/admin/projects/${id}`),
  });

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  const project = (data as { data: Project & { user?: { id: number; name: string; email: string }; type?: string } })?.data;
  if (!project) return null;

  const phases = project.phases ?? [];
  const tasksTotal = project.stats?.tasks_total ?? project.tasks_total ?? 0;
  const tasksDone = project.stats?.tasks_done ?? project.tasks_done ?? 0;
  const completion = project.stats?.completion_percent ?? project.completion_percent ?? 0;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold truncate">{project.name}</h1>
          <p className="text-sm text-muted-foreground">{project.address ?? "Adresse non renseignée"}</p>
        </div>
        <div className="flex gap-1 shrink-0">
          <Badge variant="outline" className="capitalize">{(project as { type?: string }).type ?? "neuf"}</Badge>
          <Badge variant={project.status === "active" ? "success" : "secondary"}>
            {project.status === "active" ? "Actif" : "Archivé"}
          </Badge>
          {project.is_premium && (
            <Badge className="bg-amber-500 text-white border-0">Premium</Badge>
          )}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Informations</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            {(project as { user?: { id: number; name: string; email: string } }).user && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Propriétaire</span>
                <a
                  href={`/admin/users/${(project as { user?: { id: number } }).user?.id}`}
                  className="font-medium hover:underline"
                >
                  {(project as { user?: { name: string } }).user?.name}
                </a>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">Budget initial</span>
              <span>{project.budget_initial ? `${project.budget_initial.toLocaleString("fr-FR")} €` : "—"}</span>
            </div>
            {project.date_start && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Début</span>
                <span>{format(new Date(project.date_start), "d MMM yyyy", { locale: fr })}</span>
              </div>
            )}
            {project.date_end_target && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Livraison cible</span>
                <span>{format(new Date(project.date_end_target), "d MMM yyyy", { locale: fr })}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">Créé le</span>
              <span>{format(new Date(project.created_at), "d MMM yyyy", { locale: fr })}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Avancement</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-muted-foreground">Progression globale</span>
                <span className="font-bold">{completion}%</span>
              </div>
              <Progress value={completion} className="h-2" />
              <p className="text-xs text-muted-foreground mt-1">{tasksDone} / {tasksTotal} tâches terminées</p>
            </div>
            <Separator />
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-muted-foreground text-xs">Phases</p>
                <p className="font-medium">{phases.length}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Tâches totales</p>
                <p className="font-medium">{tasksTotal}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Phases */}
      {phases.length > 0 && (
        <div>
          <h2 className="font-semibold text-base mb-3">Phases & tâches</h2>
          <div className="space-y-2">
            {phases.map((phase) => (
              <PhaseBlock key={phase.id} phase={phase} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
