"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { Plus, Clock, Bell, Trash2, CalendarDays, Target, Download, RefreshCw, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { api } from "@/lib/api";
import { toast } from "sonner";
import type { Event, Phase, Task } from "@/lib/types";
import { format, isToday, isTomorrow, isPast } from "date-fns";
import { fr } from "date-fns/locale";

interface EventForm {
  title: string;
  description: string;
  date_start: string;
  date_end: string;
  reminder_days: string;
}

const emptyForm: EventForm = {
  title: "", description: "", date_start: "", date_end: "", reminder_days: "",
};

type AgendaItem =
  | { kind: "event"; date: Date; event: Event }
  | { kind: "task"; date: Date; task: Task };

function dateLabel(d: Date) {
  if (isToday(d)) return "Aujourd'hui";
  if (isTomorrow(d)) return "Demain";
  return format(d, "EEEE d MMMM", { locale: fr });
}

function taskCardStyle(task: Task, date: Date): { container: string; icon: string; badge: string; badgeLabel: string } {
  const isOverdue   = isPast(date) && task.status !== "done" && task.status !== "na";
  const isConfirmed = task.status === "done" || !!task.date_real;

  if (isOverdue) {
    return {
      container: "border-orange-200 bg-orange-50/50 dark:border-orange-800 dark:bg-orange-950/20",
      icon:      "text-orange-500",
      badge:     "border-orange-300 text-orange-600",
      badgeLabel: "Retard",
    };
  }
  if (isConfirmed) {
    return {
      container: "border-emerald-200 bg-emerald-50/50 dark:border-emerald-800 dark:bg-emerald-950/20",
      icon:      "text-emerald-500",
      badge:     "border-emerald-300 text-emerald-600",
      badgeLabel: "Confirmé",
    };
  }
  return {
    container: "border-blue-200 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-950/20",
    icon:      "text-blue-500",
    badge:     "border-blue-300 text-blue-600",
    badgeLabel: "Théorique",
  };
}

export default function AgendaPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<EventForm>(emptyForm);
  const [editingTaskDate, setEditingTaskDate] = useState<{ taskId: number; current: string } | null>(null);
  const [newDate, setNewDate] = useState("");
  const [calendarUrl, setCalendarUrl] = useState<{ url: string; webcal_url: string } | null>(null);
  const [loadingCalUrl, setLoadingCalUrl] = useState(false);
  const [showTheoretical, setShowTheoretical] = useState(true);

  const { data: eventsData, isLoading: eventsLoading } = useQuery({
    queryKey: ["project-events", id],
    queryFn: () => api.get<{ data: Event[] }>(`/projects/${id}/events`),
  });

  const { data: tasksData, isLoading: tasksLoading } = useQuery({
    queryKey: ["project-tasks", id],
    queryFn: () => api.get<{ data: Phase[] }>(`/projects/${id}/tasks`),
  });

  const isLoading = eventsLoading || tasksLoading;

  const create = useMutation({
    mutationFn: (body: Partial<EventForm>) =>
      api.post(`/projects/${id}/events`, {
        ...body,
        reminder_days: body.reminder_days ? parseInt(body.reminder_days) : undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-events", id] });
      setOpen(false);
      setForm(emptyForm);
      toast.success("Événement créé");
    },
    onError: () => toast.error("Erreur lors de la création"),
  });

  const remove = useMutation({
    mutationFn: (eventId: number) => api.delete(`/projects/${id}/events/${eventId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-events", id] });
      toast.success("Événement supprimé");
    },
  });

  const updateTaskDate = useMutation({
    mutationFn: ({ taskId, date_target }: { taskId: number; date_target: string }) =>
      api.put(`/tasks/${taskId}`, { date_target }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-tasks", id] });
      setEditingTaskDate(null);
      toast.success("Date cible mise à jour");
    },
    onError: () => toast.error("Erreur lors de la mise à jour"),
  });

  const events = eventsData?.data ?? [];
  const allTasks: Task[] = (tasksData?.data ?? []).flatMap((p) => p.tasks ?? []);

  // Theoretical mode: tasks with date_target; confirmed mode: tasks with date_real
  const taskDeadlines = allTasks.filter((t) =>
    showTheoretical ? !!t.date_target : !!t.date_real
  );

  const items: AgendaItem[] = [
    ...events.map((e) => ({ kind: "event" as const, date: new Date(e.date_start), event: e })),
    ...taskDeadlines.map((t) => ({
      kind: "task" as const,
      date: new Date(showTheoretical ? t.date_target! : t.date_real!),
      task: t,
    })),
  ].sort((a, b) => a.date.getTime() - b.date.getTime());

  const upcoming = items.filter((i) => !isPast(i.date));
  const past     = items.filter((i) => isPast(i.date));

  // Timeline summary from all date_target values
  const allDateTargets = allTasks
    .filter((t) => t.date_target)
    .map((t) => new Date(t.date_target!).getTime());
  const firstTarget    = allDateTargets.length ? new Date(Math.min(...allDateTargets)) : null;
  const lastTarget     = allDateTargets.length ? new Date(Math.max(...allDateTargets)) : null;
  const durationMonths = firstTarget && lastTarget
    ? Math.ceil((lastTarget.getTime() - firstTarget.getTime()) / (1000 * 60 * 60 * 24 * 30))
    : null;

  async function loadCalendarUrl() {
    setLoadingCalUrl(true);
    try {
      const res = await api.get<{ data: { url: string; webcal_url: string } }>(
        `/projects/${id}/export/calendar-url`
      );
      setCalendarUrl(res.data);
    } catch {
      toast.error("Erreur lors de la récupération du lien calendrier");
    } finally {
      setLoadingCalUrl(false);
    }
  }

  function set(field: keyof EventForm, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function renderItems(list: AgendaItem[]) {
    return list.map((item) => {
      if (item.kind === "event") {
        const { event } = item;
        return (
          <Card key={`e-${event.id}`} className={isPast(item.date) ? "opacity-60" : ""}>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-start gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-medium text-sm">{event.title}</p>
                    {isToday(item.date) && (
                      <Badge variant="destructive" className="text-xs">{"Aujourd'hui"}</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <CalendarDays className="h-3 w-3" />
                    {dateLabel(item.date)}
                    {event.date_end && event.date_end !== event.date_start && (
                      <> → {format(new Date(event.date_end), "d MMM", { locale: fr })}</>
                    )}
                  </div>
                  {event.reminder_days && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                      <Bell className="h-3 w-3" />
                      Rappel {event.reminder_days}j avant
                    </div>
                  )}
                  {event.description && (
                    <p className="text-xs text-muted-foreground mt-1">{event.description}</p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
                  onClick={() => remove.mutate(event.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      }

      const { task } = item;
      const style     = taskCardStyle(task, item.date);
      const isEditing = editingTaskDate?.taskId === task.id;

      return (
        <Card key={`t-${task.id}`} className={`${style.container} ${isPast(item.date) && task.status !== "done" ? "opacity-80" : ""}`}>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-start gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  {task.status === "done"
                    ? <CheckCircle2 className={`h-3.5 w-3.5 ${style.icon} shrink-0`} />
                    : <Target className={`h-3.5 w-3.5 ${style.icon} shrink-0`} />
                  }
                  <p className="font-medium text-sm">{task.title}</p>
                  <Badge variant="outline" className={`text-xs ${style.badge}`}>
                    {style.badgeLabel}
                  </Badge>
                  {isToday(item.date) && (
                    <Badge variant="destructive" className="text-xs">{"Aujourd'hui"}</Badge>
                  )}
                </div>
                {isEditing ? (
                  <div className="flex items-center gap-2 mt-2">
                    <Input
                      type="date"
                      className="h-8 w-40 text-xs"
                      defaultValue={editingTaskDate?.current}
                      onChange={(e) => setNewDate(e.target.value)}
                    />
                    <Button
                      size="sm"
                      className="h-8 text-xs"
                      disabled={updateTaskDate.isPending}
                      onClick={() => {
                        if (newDate) {
                          updateTaskDate.mutate({ taskId: task.id, date_target: newDate });
                        }
                      }}
                    >
                      Valider
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 text-xs"
                      onClick={() => setEditingTaskDate(null)}
                    >
                      Annuler
                    </Button>
                  </div>
                ) : (
                  <button
                    className={`flex items-center gap-1.5 text-xs hover:underline mt-0.5 ${style.icon}`}
                    onClick={() => {
                      setEditingTaskDate({ taskId: task.id, current: task.date_target ?? "" });
                      setNewDate(task.date_target ?? "");
                    }}
                  >
                    <CalendarDays className="h-3 w-3" />
                    {dateLabel(item.date)} — cliquer pour modifier
                  </button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      );
    });
  }

  return (
    <div className="p-6 lg:p-8 max-w-5xl space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h2 className="text-2xl font-bold">Agenda</h2>
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            size="sm"
            variant={showTheoretical ? "default" : "outline"}
            className="gap-2"
            onClick={() => setShowTheoretical((v) => !v)}
          >
            <Target className="h-4 w-4" />
            Planning théorique
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="gap-2"
            asChild
          >
            <a href={`${process.env.NEXT_PUBLIC_API_URL?.replace(/\/api$/, "")}/api/projects/${id}/export/ical`} download>
              <Download className="h-4 w-4" />
              Exporter .ics
            </a>
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="gap-2"
            onClick={loadCalendarUrl}
            disabled={loadingCalUrl}
          >
            <RefreshCw className={`h-4 w-4 ${loadingCalUrl ? "animate-spin" : ""}`} />
            Abonner au calendrier
          </Button>
          <Button size="sm" onClick={() => setOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Ajouter un événement
          </Button>
        </div>
      </div>

      {/* Timeline summary */}
      {showTheoretical && firstTarget && lastTarget && durationMonths !== null && (
        <div className="p-3 rounded-lg border border-blue-200 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-950/20">
          <div className="flex items-center gap-2 text-sm text-blue-700 dark:text-blue-300">
            <Target className="h-4 w-4 shrink-0" />
            <span>
              Début prévu : <strong>{format(firstTarget, "d MMM yyyy", { locale: fr })}</strong>
              {" → "}
              Fin prévue : <strong>{format(lastTarget, "d MMM yyyy", { locale: fr })}</strong>
              {" — "}
              Durée totale : <strong>{durationMonths} mois</strong>
            </span>
          </div>
        </div>
      )}

      {calendarUrl && (
        <div className="p-3 rounded-lg border bg-muted/50 space-y-2">
          <p className="text-xs font-medium text-muted-foreground">
            Lien d&apos;abonnement calendrier (webcal://). Copiez-le dans votre app calendrier.
          </p>
          <div className="flex items-center gap-2">
            <input
              readOnly
              value={calendarUrl.webcal_url}
              className="flex-1 text-xs bg-background border rounded px-2 py-1.5 font-mono"
              onClick={(e) => (e.target as HTMLInputElement).select()}
            />
            <Button
              size="sm"
              variant="secondary"
              className="text-xs shrink-0"
              onClick={() => {
                navigator.clipboard.writeText(calendarUrl.webcal_url);
                toast.success("Lien copié !");
              }}
            >
              Copier
            </Button>
          </div>
          <a
            href={calendarUrl.webcal_url}
            className="text-xs text-primary hover:underline block"
          >
            Ouvrir dans l&apos;app calendrier →
          </a>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20" />)}
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Clock className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>
            {showTheoretical
              ? "Aucune date théorique calculée — ajoutez une date de début dans les paramètres du projet"
              : "Aucune date confirmée"}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {upcoming.length > 0 && (
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-3">
                À venir ({upcoming.length})
              </p>
              <div className="space-y-3">{renderItems(upcoming)}</div>
            </div>
          )}
          {past.length > 0 && (
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-3">
                Passés ({past.length})
              </p>
              <div className="space-y-3">{renderItems(past)}</div>
            </div>
          )}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nouvel événement</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>Titre *</Label>
              <Input
                placeholder="Réunion de chantier"
                value={form.title}
                onChange={(e) => set("title", e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Début *</Label>
                <Input
                  type="datetime-local"
                  value={form.date_start}
                  onChange={(e) => set("date_start", e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Fin</Label>
                <Input
                  type="datetime-local"
                  value={form.date_end}
                  onChange={(e) => set("date_end", e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Rappel (jours avant)</Label>
              <Input
                type="number"
                placeholder="1"
                min="0"
                value={form.reminder_days}
                onChange={(e) => set("reminder_days", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea
                rows={2}
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button
              onClick={() => create.mutate(form)}
              disabled={!form.title.trim() || !form.date_start || create.isPending}
            >
              {create.isPending ? "Création…" : "Créer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
