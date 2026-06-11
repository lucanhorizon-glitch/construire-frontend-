"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import {
  DndContext,
  closestCenter,
  DragEndEvent,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, ChevronDown, ChevronRight, Star, Euro, Paperclip, Plus, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import TaskStatusBadge from "@/components/project/TaskStatusBadge";
import PremiumGate from "@/components/project/PremiumGate";
import { api } from "@/lib/api";
import { toast } from "sonner";
import type { Phase, Project, Task, TaskStatus } from "@/lib/types";
import Link from "next/link";

const statusOptions: { value: TaskStatus | "all"; label: string }[] = [
  { value: "all", label: "Tous les statuts" },
  { value: "todo", label: "À faire" },
  { value: "inprogress", label: "En cours" },
  { value: "done", label: "Terminé" },
  { value: "blocked", label: "Bloqué" },
  { value: "na", label: "N/A" },
];

interface TaskRowProps {
  task: Task;
  projectId: string;
  sortable?: boolean;
}

function TaskRow({ task, projectId, sortable }: TaskRowProps) {
  const queryClient = useQueryClient();

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id, disabled: !sortable });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const updateStatus = useMutation({
    mutationFn: (status: TaskStatus) =>
      api.put(`/tasks/${task.id}/status`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-tasks", projectId] });
      queryClient.invalidateQueries({ queryKey: ["project", projectId] });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
    onError: () => toast.error("Erreur lors de la mise à jour"),
  });

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 p-3 bg-background rounded-lg border hover:shadow-sm transition-shadow group"
    >
      {sortable && (
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity touch-none"
        >
          <GripVertical className="h-4 w-4" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-start gap-2">
          {task.is_required && (
            <Star className="h-3 w-3 text-amber-500 fill-amber-500 shrink-0 mt-0.5" />
          )}
          <Link
            href={`/projects/${projectId}/tasks/${task.id}`}
            className="text-base font-medium break-words hover:underline"
          >
            {task.title}
          </Link>
        </div>
        <div className="flex items-center gap-1.5 mt-0.5">
          {task.room && (
            <Badge variant="secondary" className="text-xs py-0 h-4 px-1.5">
              {task.room}
            </Badge>
          )}
          {task.date_target && (
            <p className="text-xs text-muted-foreground">
              Cible : {new Date(task.date_target).toLocaleDateString("fr-FR")}
            </p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {task.documents && task.documents.length > 0 && (
          <Link
            href={`/projects/${projectId}/tasks/${task.id}?tab=photo`}
            className="text-muted-foreground hover:text-foreground transition-colors"
            title="Documents attachés"
            onClick={(e) => e.stopPropagation()}
          >
            <Paperclip className="h-3.5 w-3.5" />
          </Link>
        )}
        {task.amount_invoice != null && (
          <Link
            href={`/projects/${projectId}/tasks/${task.id}?tab=invoice`}
            className="text-emerald-600 hover:text-emerald-700 transition-colors"
            title={`Facture : ${new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(task.amount_invoice)}`}
            onClick={(e) => e.stopPropagation()}
          >
            <Euro className="h-3.5 w-3.5" />
          </Link>
        )}
        {task.amount_quote != null && task.amount_invoice == null && (
          <Link
            href={`/projects/${projectId}/tasks/${task.id}?tab=quote`}
            className="text-orange-500 hover:text-orange-600 transition-colors"
            title={`Devis : ${new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(task.amount_quote)}`}
            onClick={(e) => e.stopPropagation()}
          >
            <Euro className="h-3.5 w-3.5" />
          </Link>
        )}
        {task.amount_quote != null && (
          <span className="text-xs text-muted-foreground hidden sm:block">
            {new Intl.NumberFormat("fr-FR", {
              style: "currency",
              currency: "EUR",
              maximumFractionDigits: 0,
            }).format(task.amount_quote)}
          </span>
        )}
        <Select
          value={task.status}
          onValueChange={(v) => updateStatus.mutate(v as TaskStatus)}
        >
          <SelectTrigger className="h-8 w-auto min-w-[100px] text-xs border-0 shadow-none bg-transparent focus:ring-0 p-1">
            <TaskStatusBadge status={task.status} />
          </SelectTrigger>
          <SelectContent>
            {statusOptions
              .filter((o) => o.value !== "all")
              .map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  <TaskStatusBadge status={o.value as TaskStatus} />
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

const RENOVATION_ROOMS = [
  "Cuisine",
  "Salle de bain principale",
  "Salle de bain secondaire",
  "Chambre principale",
  "Chambres secondaires",
  "Salon / Séjour",
  "Entrée / Couloir",
  "Cave / Sous-sol",
  "Garage",
  "Toiture",
  "Façade / Isolation",
  "Extérieurs",
  "Parties communes",
];

interface NewTaskForm {
  title: string;
  description: string;
  status: TaskStatus;
  date_target: string;
  is_required: boolean;
  room: string;
}

function makeEmptyForm(phaseTitle: string): NewTaskForm {
  return {
    title: "",
    description: "",
    status: "todo",
    date_target: "",
    is_required: false,
    room: phaseTitle,
  };
}

interface PhaseGroupProps {
  phase: Phase;
  projectId: string;
  filterStatus: TaskStatus | "all";
  isOpen: boolean;
  onToggle: () => void;
}

function PhaseGroup({ phase, projectId, filterStatus, isOpen, onToggle }: PhaseGroupProps) {
  const queryClient = useQueryClient();
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [newTaskForm, setNewTaskForm] = useState<NewTaskForm>(() => makeEmptyForm(phase.title));

  const tasks = phase.tasks ?? [];
  const filtered =
    filterStatus === "all"
      ? tasks
      : tasks.filter((t) => t.status === filterStatus);
  const done      = tasks.filter((t) => t.status === "done").length;
  const countable = tasks.filter((t) => t.status !== "na").length;

  const addTask = useMutation({
    mutationFn: () =>
      api.post(`/projects/${projectId}/tasks`, {
        phase_id: phase.id,
        type: "custom",
        title: newTaskForm.title,
        ...(newTaskForm.description ? { description: newTaskForm.description } : {}),
        status: newTaskForm.status,
        ...(newTaskForm.date_target ? { date_target: newTaskForm.date_target } : {}),
        is_required: newTaskForm.is_required,
        ...(newTaskForm.room ? { room: newTaskForm.room } : {}),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-tasks", projectId] });
      setIsAddingTask(false);
      setNewTaskForm(makeEmptyForm(phase.title));
      toast.success("Tâche ajoutée");
    },
    onError: () => toast.error("Erreur lors de l'ajout"),
  });

  function setField<K extends keyof NewTaskForm>(key: K, value: NewTaskForm[K]) {
    setNewTaskForm((f) => ({ ...f, [key]: value }));
  }

  return (
    <div className="space-y-2">
      <button
        className="w-full flex items-center gap-3 text-left"
        onClick={onToggle}
      >
        <div className="flex-1 flex items-center gap-2">
          <span className="font-semibold text-base">{phase.title}</span>
          <Badge variant="outline" className="text-xs">
            {done}/{countable}
          </Badge>
        </div>
        {isOpen ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        )}
      </button>

      {isOpen && (
        <>
          <SortableContext
            items={filtered.map((t) => t.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-1.5 pl-2">
              {filtered.map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  projectId={projectId}
                  sortable={filterStatus === "all"}
                />
              ))}
              {filtered.length === 0 && (
                <p className="text-sm text-muted-foreground py-3 text-center">
                  Aucune tâche
                </p>
              )}
            </div>
          </SortableContext>

          {filterStatus === "all" && (
            <div className="pl-2">
              {isAddingTask ? (
                <div className="mt-1 space-y-2.5 p-3 border rounded-lg bg-muted/30">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium">Nouvelle tâche</span>
                    <button onClick={() => { setIsAddingTask(false); setNewTaskForm(makeEmptyForm(phase.title)); }}>
                      <X className="h-4 w-4 text-muted-foreground" />
                    </button>
                  </div>
                  <div className="space-y-1">
                    <Input
                      placeholder="Titre *"
                      className="h-8 text-sm"
                      value={newTaskForm.title}
                      onChange={(e) => setField("title", e.target.value)}
                      autoFocus
                    />
                  </div>
                  <div className="space-y-1">
                    <Textarea
                      placeholder="Description (optionnel)"
                      className="text-sm min-h-[60px] resize-none"
                      value={newTaskForm.description}
                      onChange={(e) => setField("description", e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Pièce *</Label>
                    <Select
                      value={newTaskForm.room}
                      onValueChange={(v) => setField("room", v)}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Sélectionner une pièce" />
                      </SelectTrigger>
                      <SelectContent>
                        {RENOVATION_ROOMS.map((r) => (
                          <SelectItem key={r} value={r} className="text-xs">
                            {r}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Statut</Label>
                      <Select
                        value={newTaskForm.status}
                        onValueChange={(v) => setField("status", v as TaskStatus)}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {statusOptions
                            .filter((o) => o.value !== "all")
                            .map((o) => (
                              <SelectItem key={o.value} value={o.value} className="text-xs">
                                {o.label}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Date cible</Label>
                      <Input
                        type="date"
                        className="h-8 text-xs"
                        value={newTaskForm.date_target}
                        onChange={(e) => setField("date_target", e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      id={`required-${phase.id}`}
                      checked={newTaskForm.is_required}
                      onCheckedChange={(v) => setField("is_required", v)}
                    />
                    <Label htmlFor={`required-${phase.id}`} className="text-xs cursor-pointer">
                      Tâche obligatoire
                    </Label>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => { setIsAddingTask(false); setNewTaskForm(makeEmptyForm(phase.title)); }}
                    >
                      Annuler
                    </Button>
                    <Button
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => addTask.mutate()}
                      disabled={!newTaskForm.title.trim() || !newTaskForm.room.trim() || addTask.isPending}
                    >
                      {addTask.isPending ? "Ajout…" : "Ajouter"}
                    </Button>
                  </div>
                </div>
              ) : (
                <button
                  className="mt-1 w-full py-2 text-xs text-muted-foreground hover:text-foreground flex items-center justify-center gap-1 rounded-lg hover:bg-muted/50 transition-colors"
                  onClick={() => setIsAddingTask(true)}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Ajouter une tâche
                </button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function TasksPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [filterStatus, setFilterStatus] = useState<TaskStatus | "all">("all");
  const [openPhaseId, setOpenPhaseId] = useState<number | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 250, tolerance: 5 },
    })
  );

  const { data, isLoading } = useQuery({
    queryKey: ["project-tasks", id],
    queryFn: () => api.get<{ data: Phase[] }>(`/projects/${id}/tasks`),
  });

  const { data: projectData } = useQuery({
    queryKey: ["project", id],
    queryFn: () => api.get<{ data: Project }>(`/projects/${id}`),
  });

  const phases    = data?.data ?? [];
  const isPremium = projectData?.data?.is_premium ?? false;

  const effectiveOpenId =
    openPhaseId !== null
      ? openPhaseId
      : phases.length > 0
      ? phases[0].id
      : null;

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    queryClient.setQueryData(
      ["project-tasks", id],
      (old: { data: Phase[] } | undefined) => {
        if (!old) return old;

        const updatedPhases = old.data.map((p) => ({
          ...p,
          tasks: [...(p.tasks ?? [])],
        }));

        const srcPhase = updatedPhases.find((p) =>
          p.tasks?.some((t) => t.id === active.id)
        );
        const dstPhase = updatedPhases.find((p) =>
          p.tasks?.some((t) => t.id === over.id)
        );

        if (!srcPhase?.tasks || !dstPhase?.tasks) return old;

        if (srcPhase.id === dstPhase.id) {
          const oldIdx = srcPhase.tasks.findIndex((t) => t.id === active.id);
          const newIdx = srcPhase.tasks.findIndex((t) => t.id === over.id);
          srcPhase.tasks = arrayMove(srcPhase.tasks, oldIdx, newIdx);
        } else {
          const [moved] = srcPhase.tasks.splice(
            srcPhase.tasks.findIndex((t) => t.id === active.id),
            1
          );
          const insertAt = dstPhase.tasks.findIndex((t) => t.id === over.id);
          dstPhase.tasks.splice(insertAt, 0, moved);
        }

        return { ...old, data: updatedPhases };
      }
    );
  }

  function togglePhase(phaseId: number) {
    setOpenPhaseId((prev) => (prev === phaseId ? null : phaseId));
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

  return (
    <div className="p-6 lg:p-8 pb-52 max-w-6xl space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h2 className="text-2xl font-bold">Tâches</h2>
        <div className="flex items-center gap-2">
          <Select
            value={filterStatus}
            onValueChange={(v) => setFilterStatus(v as TaskStatus | "all")}
          >
            <SelectTrigger className="w-44 h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {statusOptions.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <div className="space-y-6">
          {phases.slice(0, 3).map((phase) => (
            <PhaseGroup
              key={phase.id}
              phase={phase}
              projectId={id}
              filterStatus={filterStatus}
              isOpen={effectiveOpenId === phase.id}
              onToggle={() => togglePhase(phase.id)}
            />
          ))}
          {phases.length > 3 && (
            <PremiumGate
              isPremium={isPremium}
              projectId={Number(id)}
              feature="Phases avancées — débloquez l'intégralité du planning"
            >
              <div className="space-y-6">
                {phases.slice(3).map((phase) => (
                  <PhaseGroup
                    key={phase.id}
                    phase={phase}
                    projectId={id}
                    filterStatus={filterStatus}
                    isOpen={false}
                    onToggle={() => {}}
                  />
                ))}
              </div>
            </PremiumGate>
          )}
        </div>
      </DndContext>
    </div>
  );
}
