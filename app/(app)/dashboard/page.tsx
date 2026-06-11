"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { Plus, HardHat, TrendingUp, GripVertical } from "lucide-react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import NotificationPermission from "@/components/shared/NotificationPermission";
import type { Project } from "@/lib/types";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

function formatEur(n?: number) {
  if (n == null) return "—";
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(n);
}

function ProjectAvatar({ project }: { project: Project }) {
  const [failed, setFailed] = useState(false);
  const initials = project.name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  if (project.cover_photo_url && !failed) {
    return (
      <div className="h-12 w-12 rounded-full overflow-hidden shrink-0">
        <img
          src={project.cover_photo_url}
          alt={project.name}
          className="h-full w-full object-cover"
          onError={() => setFailed(true)}
        />
      </div>
    );
  }

  return (
    <Avatar className="h-12 w-12 shrink-0">
      <AvatarFallback className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white font-bold text-sm">
        {initials}
      </AvatarFallback>
    </Avatar>
  );
}

function SortableProjectCard({ project }: { project: Project }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: project.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const pct   = project.stats?.completion_percent ?? project.completion_percent ?? 0;
  const done  = project.stats?.tasks_done   ?? project.tasks_done   ?? 0;
  const total = project.stats?.tasks_total  ?? project.tasks_total  ?? 0;
  const quote = project.stats?.budget_quote ?? project.budget_quote;
  const inv   = project.stats?.budget_invoice ?? project.budget_invoice;

  return (
    <div ref={setNodeRef} style={style} className="group">
      <Link href={`/projects/${project.id}`}>
        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <CardHeader className="pb-3">
            <div className="flex items-start gap-3">
              <div
                {...attributes}
                {...listeners}
                className="cursor-grab active:cursor-grabbing text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity touch-none mt-0.5"
                onClick={(e) => e.preventDefault()}
              >
                <GripVertical className="h-4 w-4" />
              </div>
              <ProjectAvatar project={project} />
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-sm leading-tight">{project.name}</CardTitle>
                  <div className="flex gap-1 shrink-0">
                    {project.is_premium && (
                      <Badge variant="default" className="text-xs">Premium</Badge>
                    )}
                    <Badge
                      variant={project.status === "active" ? "success" : "secondary"}
                      className="text-xs"
                    >
                      {project.status === "active" ? "Actif" : "Archivé"}
                    </Badge>
                  </div>
                </div>
                {project.address && (
                  <p className="text-xs text-muted-foreground truncate mt-0.5">{project.address}</p>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-muted-foreground">Avancement</span>
                <span className="font-medium">{pct}%</span>
              </div>
              <Progress value={pct} className="h-2" />
              <p className="text-xs text-muted-foreground mt-1">
                {done} / {total} tâches terminées
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-muted-foreground text-xs">Budget devis</p>
                <p className="font-medium">{formatEur(quote)}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Facturé</p>
                <p className="font-medium">{formatEur(inv)}</p>
              </div>
            </div>

            {project.date_end_target && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <TrendingUp className="h-3 w-3" />
                Cible :{" "}
                {format(new Date(project.date_end_target), "MMMM yyyy", { locale: fr })}
              </div>
            )}
          </CardContent>
        </Card>
      </Link>
    </div>
  );
}

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  const [orderedIds, setOrderedIds] = useState<number[] | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } })
  );

  const { data, isLoading } = useQuery({
    queryKey: ["projects"],
    queryFn: () => api.get<{ data: Project[] }>("/projects"),
  });

  const reorder = useMutation({
    mutationFn: (ids: number[]) => api.put("/projects/reorder", { ids }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["projects"] }),
  });

  const rawProjects = data?.data ?? [];

  const projects =
    orderedIds !== null
      ? [...rawProjects].sort(
          (a, b) => orderedIds.indexOf(a.id) - orderedIds.indexOf(b.id)
        )
      : rawProjects;

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const ids = projects.map((p) => p.id);
    const oldIdx = ids.indexOf(active.id as number);
    const newIdx = ids.indexOf(over.id as number);
    const newIds = arrayMove(ids, oldIdx, newIdx);
    setOrderedIds(newIds);
    reorder.mutate(newIds);
  }

  // Global stats
  const totalDone  = projects.reduce((sum, p) => sum + (p.stats?.tasks_done ?? p.tasks_done ?? 0), 0);
  const totalTasks = projects.reduce((sum, p) => sum + (p.stats?.tasks_total ?? p.tasks_total ?? 0), 0);
  const totalBudget = projects.reduce((sum, p) => sum + (p.stats?.budget_quote ?? p.budget_quote ?? 0), 0);

  return (
    <div className="px-4 py-6 lg:px-8 lg:py-8 space-y-6 max-w-6xl">
      <NotificationPermission />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold">
            Bonjour, {user?.name?.split(" ")[0]} 👋
          </h1>
          <p className="text-sm text-muted-foreground">Voici l&apos;état de vos projets</p>
        </div>
        <Button asChild>
          <Link href="/projects/new" className="gap-2">
            <Plus className="h-4 w-4" />
            Nouveau projet
          </Link>
        </Button>
      </div>

      {!isLoading && projects.length > 0 && (
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-xl border bg-card p-3 lg:p-4">
            <p className="text-2xl lg:text-3xl font-bold">{projects.length}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Projet{projects.length !== 1 ? "s" : ""}</p>
          </div>
          <div className="rounded-xl border bg-card p-3 lg:p-4">
            <p className="text-2xl lg:text-3xl font-bold">{totalDone}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Tâches faites</p>
          </div>
          <div className="rounded-xl border bg-card p-3 lg:p-4">
            <p className="text-2xl lg:text-3xl font-bold">
              {totalBudget > 0
                ? new Intl.NumberFormat("fr-FR", {
                    notation: "compact",
                    maximumFractionDigits: 0,
                  }).format(totalBudget) + " €"
                : "—"}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">Budget devis</p>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-48 rounded-lg" />
          ))}
        </div>
      ) : projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <HardHat className="h-16 w-16 text-muted-foreground/40 mb-4" />
          <h2 className="text-xl font-semibold mb-2">
            Aucun projet pour l&apos;instant
          </h2>
          <p className="text-muted-foreground mb-6">
            Créez votre premier projet et importez le modèle de construction en 90 étapes.
          </p>
          <Button asChild>
            <Link href="/projects/new">Créer mon premier projet</Link>
          </Button>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={projects.map((p) => p.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4 w-full">
              {projects.map((project) => (
                <SortableProjectCard key={project.id} project={project} />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}
