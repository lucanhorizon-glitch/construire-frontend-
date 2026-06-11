"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import type { Phase, Task } from "@/lib/types";
import { format, differenceInDays, addDays, startOfDay } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";

const statusColors: Record<string, string> = {
  done: "bg-emerald-500",
  inprogress: "bg-blue-500",
  blocked: "bg-red-500",
  todo: "bg-slate-300 dark:bg-slate-600",
  na: "bg-amber-300",
};

function TaskBar({
  task,
  minDate,
  totalDays,
}: {
  task: Task;
  minDate: Date;
  totalDays: number;
}) {
  if (!task.date_target) return null;

  const target = startOfDay(new Date(task.date_target));
  const start = task.date_real
    ? startOfDay(new Date(task.date_real))
    : task.duration_days
    ? addDays(target, -(task.duration_days - 1))
    : target;

  const startOffset = Math.max(0, differenceInDays(start, minDate));
  const duration    = Math.max(1, differenceInDays(target, start) + 1);

  const left  = (startOffset / totalDays) * 100;
  const width = (duration / totalDays) * 100;

  if (left > 100) return null;

  const clampedWidth = Math.min(width, 100 - left);
  const dateLabel = format(target, "dd/MM");

  return (
    <div className="relative h-6 my-1 flex items-center">
      <div
        className={cn(
          "absolute h-full rounded-sm flex items-center px-1.5 overflow-hidden",
          statusColors[task.status]
        )}
        style={{ left: `${left}%`, width: `${clampedWidth}%`, minWidth: "2px" }}
        title={`${task.title} — ${format(target, "d MMM yyyy", { locale: fr })}`}
      >
        <span className="text-white text-xs truncate leading-none">{task.title}</span>
      </div>
      <span
        className="absolute text-xs text-muted-foreground whitespace-nowrap pl-1"
        style={{ left: `${Math.min(left + clampedWidth, 99)}%` }}
      >
        {dateLabel}
      </span>
    </div>
  );
}

export default function PlanningPage() {
  const { id } = useParams<{ id: string }>();

  const { data, isLoading } = useQuery({
    queryKey: ["project-tasks", id],
    queryFn: () => api.get<{ data: Phase[] }>(`/projects/${id}/tasks`),
  });

  const phases = data?.data ?? [];

  const allDates = phases
    .flatMap((p) => p.tasks ?? [])
    .filter((t) => t.date_target)
    .map((t) => new Date(t.date_target!));

  const minDate =
    allDates.length > 0
      ? startOfDay(new Date(Math.min(...allDates.map((d) => d.getTime()))))
      : startOfDay(new Date());

  const maxDate =
    allDates.length > 0
      ? startOfDay(new Date(Math.max(...allDates.map((d) => d.getTime()))))
      : addDays(minDate, 90);

  const totalDays = Math.max(differenceInDays(maxDate, minDate) + 1, 30);

  const monthMarkers: { label: string; left: number }[] = [];
  let cursor = new Date(minDate.getFullYear(), minDate.getMonth(), 1);
  while (cursor <= maxDate) {
    const offset = differenceInDays(cursor, minDate);
    if (offset >= 0) {
      monthMarkers.push({
        label: format(cursor, "MMM yy", { locale: fr }),
        left: (offset / totalDays) * 100,
      });
    }
    cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
  }

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>
    );
  }

  if (allDates.length === 0) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[300px]">
        <div className="text-center text-muted-foreground">
          <p className="text-lg font-medium">Aucune date cible renseignée</p>
          <p className="text-sm mt-1">
            Ajoutez des dates cibles sur les tâches pour voir le planning
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-6 overflow-x-auto">
      <h2 className="text-2xl font-bold">Planning</h2>

      <div className="min-w-[600px]">
        <div className="relative h-6 border-b mb-4">
          {monthMarkers.map((m) => (
            <span
              key={m.label}
              className="absolute text-xs text-muted-foreground"
              style={{ left: `${m.left}%` }}
            >
              {m.label}
            </span>
          ))}
        </div>

        {phases.map((phase) => {
          const tasks = (phase.tasks ?? []).filter((t) => t.date_target);
          if (tasks.length === 0) return null;
          return (
            <div key={phase.id} className="mb-6">
              <div className="flex items-center gap-2 mb-2">
                <p className="text-sm font-medium">{phase.title}</p>
                <Badge variant="outline" className="text-xs">
                  {tasks.filter((t) => t.status === "done").length}/{tasks.length}
                </Badge>
              </div>
              <div className="border rounded-lg p-3 bg-card">
                {tasks.map((task) => (
                  <TaskBar
                    key={task.id}
                    task={task}
                    minDate={minDate}
                    totalDays={totalDays}
                  />
                ))}
              </div>
            </div>
          );
        })}

        <div className="flex flex-wrap gap-3 mt-4 text-xs">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-emerald-500 inline-block" />
            Terminé
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-blue-500 inline-block" />
            En cours
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-red-500 inline-block" />
            Bloqué
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-slate-300 dark:bg-slate-600 inline-block" />
            À faire
          </span>
        </div>
      </div>
    </div>
  );
}
