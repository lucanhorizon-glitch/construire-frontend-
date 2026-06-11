"use client";

import { useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, HardHat, Hammer, Camera, X, ChevronDown, ChevronRight, User, Building2, AlertTriangle, Info, ShieldAlert, Lock, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import { toast } from "sonner";
import type { Project, OwnerType, PermitType } from "@/lib/types";
import Link from "next/link";
import { cn } from "@/lib/utils";

// ── Room-based renovation tasks ───────────────────────────────────────────────

const ROOM_TASKS: Record<string, string[]> = {
  "Cuisine": [
    "Dépose cuisine existante",
    "Démolition cloisons",
    "Plomberie alimentation et évacuation",
    "Électricité cuisine",
    "Carrelage sol",
    "Faïence murale / crédence",
    "Pose cuisine neuve",
    "Électroménager encastré",
    "Peinture et finitions",
  ],
  "Salle de bain principale": [
    "Dépose ancienne salle de bain",
    "Plomberie SDB",
    "Électricité SDB",
    "Carrelage sol",
    "Faïence murale",
    "Douche / baignoire",
    "Sanitaires (WC, lavabo)",
    "Radiateur sèche-serviettes",
    "Ventilation VMC",
    "Peinture et finitions",
  ],
  "Salle de bain secondaire": [
    "Dépose ancienne salle de bain",
    "Plomberie",
    "Électricité",
    "Carrelage sol",
    "Faïence murale",
    "Douche / baignoire",
    "Sanitaires",
    "Peinture et finitions",
  ],
  "Chambre principale": [
    "Démolition / dépose",
    "Électricité (prises, interrupteurs)",
    "Parquet / carrelage",
    "Peinture murs et plafond",
    "Menuiseries intérieures",
    "Placard / dressing",
  ],
  "Chambres secondaires": [
    "Démolition / dépose",
    "Électricité",
    "Revêtement de sol",
    "Peinture murs et plafond",
    "Menuiseries intérieures",
  ],
  "Salon / Séjour": [
    "Démolition cloisons",
    "Électricité (prises, éclairage)",
    "Parquet / carrelage",
    "Peinture murs et plafond",
    "Cheminée / insert",
  ],
  "Entrée / Couloir": [
    "Revêtement de sol",
    "Peinture murs",
    "Éclairage",
    "Rangements / vestiaire",
  ],
  "Cave / Sous-sol": [
    "Traitement humidité",
    "Isolation",
    "Revêtement de sol",
    "Électricité",
    "Cloisons",
  ],
  "Garage": [
    "Portail / porte de garage",
    "Revêtement de sol",
    "Électricité",
    "Isolation",
  ],
  "Toiture": [
    "Diagnostic toiture",
    "Dépose ancienne couverture",
    "Charpente (réparation / remplacement)",
    "Isolation combles",
    "Couverture neuve",
    "Gouttières",
    "Velux",
  ],
  "Façade / Isolation": [
    "Diagnostic façade",
    "Ravalement",
    "Isolation extérieure (ITE)",
    "Enduit / peinture façade",
  ],
  "Extérieurs": [
    "Terrassement",
    "Clôture / portail",
    "Terrasse",
    "Allées",
    "Jardin / plantations",
  ],
  "Parties communes": [
    "Diagnostic amiante / plomb",
    "Mise aux normes électriques",
    "Chauffage central",
    "Adoucisseur d'eau",
    "Tableau électrique",
  ],
};

const ALL_ROOMS = Object.keys(ROOM_TASKS);

// ── Helpers ───────────────────────────────────────────────────────────────────

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ── Wizard steps ──────────────────────────────────────────────────────────────

const CONSTRUCTION_STEPS = ["Profil", "Type", "Informations", "Budget & dates", "Modèle"];
const RENOVATION_STEPS   = ["Profil", "Type", "Informations", "Budget & dates", "Réglementation", "Pièces & tâches", "Récapitulatif"];

// ── RoomTaskPicker ────────────────────────────────────────────────────────────

interface TaskSelection {
  [room: string]: Set<string>;
}

function RoomTaskPicker({
  selection,
  onChange,
}: {
  selection: TaskSelection;
  onChange: (sel: TaskSelection) => void;
}) {
  const [openRooms, setOpenRooms] = useState<Set<string>>(new Set([ALL_ROOMS[0]]));

  const totalSelected = Object.values(selection).reduce((sum, s) => sum + s.size, 0);

  function toggleRoom(room: string) {
    setOpenRooms((prev) => {
      const next = new Set(prev);
      if (next.has(room)) next.delete(room);
      else next.add(room);
      return next;
    });
  }

  function isTaskSelected(room: string, task: string) {
    return selection[room]?.has(task) ?? false;
  }

  function toggleTask(room: string, task: string) {
    const next = { ...selection };
    if (!next[room]) next[room] = new Set();
    else next[room] = new Set(next[room]);
    if (next[room].has(task)) next[room].delete(task);
    else next[room].add(task);
    onChange(next);
  }

  function toggleAllRoom(room: string) {
    const tasks = ROOM_TASKS[room];
    const next = { ...selection };
    const current = next[room] ?? new Set();
    if (current.size === tasks.length) {
      next[room] = new Set();
    } else {
      next[room] = new Set(tasks);
    }
    onChange(next);
  }

  function selectAll() {
    const next: TaskSelection = {};
    ALL_ROOMS.forEach((r) => { next[r] = new Set(ROOM_TASKS[r]); });
    onChange(next);
  }

  function clearAll() {
    onChange({});
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {totalSelected} tâche{totalSelected !== 1 ? "s" : ""} sélectionnée{totalSelected !== 1 ? "s" : ""}
        </p>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={clearAll}>Effacer</Button>
          <Button variant="outline" size="sm" className="h-7 text-xs" onClick={selectAll}>Tout sélectionner</Button>
        </div>
      </div>

      <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
        {ALL_ROOMS.map((room) => {
          const tasks        = ROOM_TASKS[room];
          const roomSel      = selection[room] ?? new Set();
          const isOpen       = openRooms.has(room);
          const allChecked   = roomSel.size === tasks.length;
          const someChecked  = roomSel.size > 0 && !allChecked;

          return (
            <div key={room} className="border rounded-lg overflow-hidden">
              <div
                className="flex items-center gap-2 px-3 py-2 bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => toggleRoom(room)}
              >
                <Checkbox
                  checked={allChecked}
                  data-indeterminate={someChecked}
                  onCheckedChange={() => { toggleAllRoom(room); }}
                  onClick={(e) => e.stopPropagation()}
                  className={someChecked ? "opacity-60" : ""}
                />
                <span className="flex-1 text-sm font-medium">{room}</span>
                {roomSel.size > 0 && (
                  <Badge variant="secondary" className="text-xs py-0 h-5">
                    {roomSel.size}
                  </Badge>
                )}
                {isOpen ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
              </div>

              {isOpen && (
                <div className="divide-y">
                  {tasks.map((task) => (
                    <label
                      key={task}
                      className="flex items-center gap-3 px-4 py-2 hover:bg-muted/30 cursor-pointer text-sm"
                    >
                      <Checkbox
                        checked={isTaskSelected(room, task)}
                        onCheckedChange={() => toggleTask(room, task)}
                      />
                      {task}
                    </label>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Architect obligation preview ──────────────────────────────────────────────

function ArchitectWarningPreview({ ownerType, permitType }: { ownerType: OwnerType; permitType: PermitType }) {
  if (permitType !== "permis") return null;

  if (ownerType === "societe") {
    return (
      <div className="flex items-start gap-3 p-3 rounded-lg bg-red-50 border border-red-200 dark:bg-red-950/30 dark:border-red-800">
        <ShieldAlert className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
        <div className="text-xs text-red-700 dark:text-red-400">
          <p className="font-semibold">Architecte OBLIGATOIRE</p>
          <p className="mt-0.5">En tant que personne morale, le recours à un architecte est obligatoire sans seuil de surface (Art. L431-3 Code de l&apos;urbanisme). Une tâche sera ajoutée automatiquement.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-50 border border-amber-200 dark:bg-amber-950/30 dark:border-amber-800">
      <Info className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
      <div className="text-xs text-amber-700 dark:text-amber-400">
        <p className="font-semibold">Information architecte</p>
        <p className="mt-0.5">Si la surface totale après travaux dépasse 150 m², le recours à un architecte est obligatoire (Art. R431-2 Code de l&apos;urbanisme).</p>
      </div>
    </div>
  );
}

// ── Main wizard ───────────────────────────────────────────────────────────────

export default function NewProjectPage() {
  const router   = useRouter();
  const coverRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);

  const { data: projectsData, isLoading: projectsLoading } = useQuery({
    queryKey: ["projects"],
    queryFn: () => api.get<{ data: Project[] }>("/projects"),
  });

  const existingProjects  = projectsData?.data ?? [];
  const hasPremiumProject = existingProjects.some((p) => p.is_premium);
  const isFreeLimitReached = existingProjects.length >= 1 && !hasPremiumProject;

  // Step 0: owner type
  const [ownerType, setOwnerType] = useState<OwnerType | "">("");

  // Step 1: project type
  const [projectType, setProjectType] = useState<"construction" | "renovation" | "">("");
  const [step, setStep]               = useState(0);

  // Step 2: info
  const [form, setForm] = useState({
    name: "",
    address: "",
    description: "",
    budget_initial: "",
    date_start: "",
    date_end_target: "",
  });

  // Step 4 (reno): legal questions
  const [permitType, setPermitType]       = useState<PermitType | "">("");
  const [hasGrosOeuvre, setHasGrosOeuvre] = useState<boolean | null>(null);

  // Construction-specific
  const [useTemplate, setUseTemplate] = useState(true);

  // Renovation-specific
  const [taskSelection, setTaskSelection] = useState<TaskSelection>({});

  // Cover photo
  const [coverFile, setCoverFile]       = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);

  const steps = projectType === "renovation" ? RENOVATION_STEPS : CONSTRUCTION_STEPS;

  function setField(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function canAdvance() {
    if (step === 0) return ownerType !== "";
    if (step === 1) return projectType !== "";
    if (step === 2) return form.name.trim() !== "";
    if (step === 4 && projectType === "renovation") {
      return permitType !== "" && hasGrosOeuvre !== null;
    }
    return true;
  }

  function handleCoverChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type === "image/heic" || file.name.toLowerCase().endsWith(".heic")) {
      toast.error("Format HEIC non supporté — convertissez en JPG depuis Photos iOS");
      return;
    }
    setCoverFile(file);
    setCoverPreview(URL.createObjectURL(file));
    e.target.value = "";
  }

  function removeCover() {
    if (coverPreview) URL.revokeObjectURL(coverPreview);
    setCoverFile(null);
    setCoverPreview(null);
  }

  const totalSelectedTasks = Object.values(taskSelection).reduce(
    (sum, s) => sum + s.size,
    0
  );

  async function handleFinish() {
    if (!form.name.trim()) {
      toast.error("Le nom du projet est obligatoire");
      return;
    }
    setLoading(true);
    try {
      // ── Create project ────────────────────────────────────────────────────
      const payload: Record<string, unknown> = {
        name:       form.name,
        type:       projectType === "construction" ? "neuf" : "renovation",
        owner_type: ownerType || "particulier",
      };
      if (form.address)         payload.address          = form.address;
      if (form.description)     payload.description      = form.description;
      if (form.budget_initial)  payload.budget_initial   = parseFloat(form.budget_initial);
      if (form.date_start)      payload.date_start       = form.date_start;
      if (form.date_end_target) payload.date_end_target  = form.date_end_target;
      if (projectType === "renovation" && permitType)    payload.permit_type = permitType;
      if (projectType === "renovation" && hasGrosOeuvre !== null) payload.has_gros_oeuvre = hasGrosOeuvre;

      const res     = await api.post<{ data: Project }>("/projects", payload);
      const project = res.data;

      // ── Construction: clone template ──────────────────────────────────────
      if (projectType === "construction" && useTemplate) {
        try {
          await api.post(`/projects/${project.id}/clone-from-template`);
        } catch { /* continue */ }
      }

      // ── Apply legal tasks (always — at minimum adds CIL) ─────────────────
      // For construction: after template clone so "Conformité finale" phase exists
      // For renovation: before room tasks so legal phases come first
      const legalPayload: Record<string, unknown> = {};
      if (projectType === "renovation" && permitType)              legalPayload.permit_type    = permitType;
      if (projectType === "renovation" && hasGrosOeuvre !== null)  legalPayload.has_gros_oeuvre = hasGrosOeuvre;

      try {
        await api.post(`/projects/${project.id}/apply-legal-tasks`, legalPayload);
      } catch { /* non-blocking */ }

      // ── Renovation: create room tasks ─────────────────────────────────────
      if (projectType === "renovation" && totalSelectedTasks > 0) {
        const phaseRes = await api.post<{ data: { id: number } }>(
          `/projects/${project.id}/phases`,
          { title: "Travaux de rénovation", order: 5 }
        );
        const phaseId = phaseRes.data.id;

        const taskPromises: Promise<unknown>[] = [];
        let order = 0;
        for (const [room, taskSet] of Object.entries(taskSelection)) {
          for (const title of Array.from(taskSet)) {
            taskPromises.push(
              api.post(`/projects/${project.id}/tasks`, {
                phase_id: phaseId,
                type: "custom",
                title,
                room,
                status: "todo",
                order: order++,
              })
            );
          }
        }
        await Promise.all(taskPromises);
      }

      // ── Cover photo ───────────────────────────────────────────────────────
      if (coverFile) {
        try {
          const base64 = await fileToBase64(coverFile);
          await api.post(`/projects/${project.id}/cover-photo`, { cover_photo: base64 });
        } catch { /* non-blocking */ }
      }

      toast.success(
        projectType === "construction"
          ? useTemplate
            ? "Projet créé avec le modèle 90 étapes !"
            : "Projet créé !"
          : totalSelectedTasks > 0
          ? `Projet créé avec ${totalSelectedTasks} tâches de rénovation !`
          : "Projet créé !"
      );
      router.push(`/projects/${project.id}`);
    } catch (err: unknown) {
      const error = err as { message?: string };
      toast.error(error?.message ?? "Erreur lors de la création");
    } finally {
      setLoading(false);
    }
  }

  // ── Cover photo picker ───────────────────────────────────────────────────

  function CoverPhotoPicker() {
    return (
      <div className="space-y-2">
        <Label className="flex items-center gap-1.5 text-sm">
          <Camera className="h-4 w-4" />
          Photo du projet (optionnel)
        </Label>
        {coverPreview ? (
          <div className="relative w-full h-36 rounded-lg overflow-hidden">
            <img src={coverPreview} alt="Aperçu" className="w-full h-full object-cover" />
            <button
              className="absolute top-2 right-2 bg-black/50 text-white rounded-full p-1"
              onClick={removeCover}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => coverRef.current?.click()}
            className="w-full h-28 rounded-lg border-2 border-dashed border-muted-foreground/30 flex flex-col items-center justify-center gap-2 text-muted-foreground hover:border-primary/50 hover:text-foreground transition-colors"
          >
            <Camera className="h-6 w-6" />
            <span className="text-sm">Ajouter une photo</span>
          </button>
        )}
        <input
          ref={coverRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleCoverChange}
        />
      </div>
    );
  }

  if (!projectsLoading && isFreeLimitReached) {
    const firstProject = existingProjects[0];
    return (
      <div className="min-h-screen bg-muted/30 p-4 flex flex-col items-center justify-center">
        <div className="w-full max-w-sm space-y-6 text-center">
          <div className="flex flex-col items-center gap-3">
            <div className="h-16 w-16 rounded-full bg-amber-100 dark:bg-amber-950/50 flex items-center justify-center">
              <Lock className="h-8 w-8 text-amber-500" />
            </div>
            <h1 className="text-xl font-bold">Limite du plan gratuit</h1>
            <p className="text-sm text-muted-foreground">
              Vous avez atteint la limite d&apos;un projet en plan gratuit. Passez votre projet actuel en Premium pour créer d&apos;autres projets.
            </p>
          </div>

          <Card>
            <CardContent className="pt-5 space-y-3">
              <div className="text-center">
                <p className="text-2xl font-bold">14,99 €</p>
                <p className="text-xs text-muted-foreground">paiement unique par projet</p>
              </div>
              <ul className="space-y-1.5 text-sm text-left">
                {["Projets supplémentaires illimités", "Intervenants illimités", "Export PDF & Excel", "Documents illimités", "Planning complet"].map((f) => (
                  <li key={f} className="flex items-center gap-2">
                    <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <div className="space-y-2">
            {firstProject && (
              <Button className="w-full gap-2" asChild>
                <Link href={`/projects/${firstProject.id}`}>
                  <Zap className="h-4 w-4" />
                  Passer &laquo;{firstProject.name}&raquo; en Premium
                </Link>
              </Button>
            )}
            <Button variant="outline" className="w-full" onClick={() => router.back()}>
              Retour
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 p-4 flex flex-col items-center">
      <div className="w-full max-w-xl mt-8 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => (step > 0 ? setStep((s) => s - 1) : router.back())}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-xl font-bold">Nouveau projet</h1>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2">
          {steps.map((s, i) => (
            <div key={s} className="flex items-center gap-2 flex-1 last:flex-none">
              <div
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium border-2 transition-colors shrink-0",
                  i < step
                    ? "bg-primary border-primary text-primary-foreground"
                    : i === step
                    ? "border-primary text-primary"
                    : "border-muted-foreground/30 text-muted-foreground"
                )}
              >
                {i < step ? <Check className="h-4 w-4" /> : i + 1}
              </div>
              <span className={cn("text-sm hidden sm:block", i === step ? "font-medium" : "text-muted-foreground")}>
                {s}
              </span>
              {i < steps.length - 1 && (
                <div className={cn("flex-1 h-px", i < step ? "bg-primary" : "bg-muted-foreground/20")} />
              )}
            </div>
          ))}
        </div>

        <Card>
          {/* ── Step 0: Owner type ────────────────────────────────────────── */}
          {step === 0 && (
            <>
              <CardHeader>
                <CardTitle>Qui réalise ce projet ?</CardTitle>
                <CardDescription>Cette information détermine vos obligations légales (architecte, permis)</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => setOwnerType("particulier")}
                    className={cn(
                      "flex flex-col items-center gap-3 p-5 rounded-xl border-2 transition-all text-center",
                      ownerType === "particulier" ? "border-primary bg-primary/5" : "border-muted hover:border-primary/50"
                    )}
                  >
                    <User className={cn("h-10 w-10", ownerType === "particulier" ? "text-primary" : "text-muted-foreground")} />
                    <div>
                      <p className="font-semibold text-sm">Un particulier</p>
                      <p className="text-xs text-muted-foreground mt-1">Personne physique</p>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setOwnerType("societe")}
                    className={cn(
                      "flex flex-col items-center gap-3 p-5 rounded-xl border-2 transition-all text-center",
                      ownerType === "societe" ? "border-primary bg-primary/5" : "border-muted hover:border-primary/50"
                    )}
                  >
                    <Building2 className={cn("h-10 w-10", ownerType === "societe" ? "text-primary" : "text-muted-foreground")} />
                    <div>
                      <p className="font-semibold text-sm">Une société</p>
                      <p className="text-xs text-muted-foreground mt-1">SCI, SARL, SAS ou autre personne morale</p>
                    </div>
                  </button>
                </div>
                {ownerType === "societe" && (
                  <div className="flex items-start gap-2.5 p-3 rounded-lg bg-amber-50 border border-amber-200 dark:bg-amber-950/30 dark:border-amber-800 text-xs text-amber-700 dark:text-amber-400">
                    <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                    <p>En tant que personne morale, le recours à un architecte est obligatoire pour tout permis de construire, sans seuil de surface (Art. L431-3 Code de l&apos;urbanisme).</p>
                  </div>
                )}
              </CardContent>
            </>
          )}

          {/* ── Step 1: Project type ──────────────────────────────────────── */}
          {step === 1 && (
            <>
              <CardHeader>
                <CardTitle>Type de projet</CardTitle>
                <CardDescription>Choisissez le type pour charger les étapes adaptées</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => { setProjectType("construction"); setUseTemplate(true); }}
                    className={cn(
                      "flex flex-col items-center gap-3 p-5 rounded-xl border-2 transition-all text-center",
                      projectType === "construction" ? "border-primary bg-primary/5" : "border-muted hover:border-primary/50"
                    )}
                  >
                    <HardHat className={cn("h-10 w-10", projectType === "construction" ? "text-primary" : "text-muted-foreground")} />
                    <div>
                      <p className="font-semibold text-sm">Construction neuve</p>
                      <p className="text-xs text-muted-foreground mt-1">Modèle 90 étapes de l&apos;acquisition à la conformité</p>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setProjectType("renovation")}
                    className={cn(
                      "flex flex-col items-center gap-3 p-5 rounded-xl border-2 transition-all text-center",
                      projectType === "renovation" ? "border-primary bg-primary/5" : "border-muted hover:border-primary/50"
                    )}
                  >
                    <Hammer className={cn("h-10 w-10", projectType === "renovation" ? "text-primary" : "text-muted-foreground")} />
                    <div>
                      <p className="font-semibold text-sm">Rénovation</p>
                      <p className="text-xs text-muted-foreground mt-1">Sélectionnez les pièces et tâches à rénover</p>
                    </div>
                  </button>
                </div>
              </CardContent>
            </>
          )}

          {/* ── Step 2: General info ──────────────────────────────────────── */}
          {step === 2 && (
            <>
              <CardHeader>
                <CardTitle>Informations générales</CardTitle>
                <CardDescription>Décrivez votre projet</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nom du projet *</Label>
                  <Input
                    id="name"
                    placeholder={projectType === "renovation" ? "Rénovation maison Bordeaux" : "Ma maison à Bordeaux"}
                    value={form.name}
                    onChange={(e) => setField("name", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address">Adresse</Label>
                  <Input id="address" placeholder="12 rue des Lilas, 33000 Bordeaux" value={form.address} onChange={(e) => setField("address", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea id="description" value={form.description} onChange={(e) => setField("description", e.target.value)} />
                </div>
              </CardContent>
            </>
          )}

          {/* ── Step 3: Budget & dates ────────────────────────────────────── */}
          {step === 3 && (
            <>
              <CardHeader>
                <CardTitle>Budget & calendrier</CardTitle>
                <CardDescription>Modifiables à tout moment</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="budget">Budget initial (€)</Label>
                  <Input id="budget" type="number" placeholder="250000" value={form.budget_initial} onChange={(e) => setField("budget_initial", e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="date_start">Date de début</Label>
                    <Input id="date_start" type="date" value={form.date_start} onChange={(e) => setField("date_start", e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="date_end">Date cible livraison</Label>
                    <Input id="date_end" type="date" value={form.date_end_target} onChange={(e) => setField("date_end_target", e.target.value)} />
                  </div>
                </div>
              </CardContent>
            </>
          )}

          {/* ── Step 4 (renovation): Legal questions ─────────────────────── */}
          {step === 4 && projectType === "renovation" && (
            <>
              <CardHeader>
                <CardTitle>Réglementation</CardTitle>
                <CardDescription>Ces informations génèrent automatiquement les démarches obligatoires</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Permit question */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Avez-vous besoin d&apos;une autorisation d&apos;urbanisme ?</Label>
                  <div className="space-y-2">
                    {[
                      {
                        value: "permis" as PermitType,
                        label: "Permis de construire",
                        sub: "Extension >20 m², modification structure, surélévation",
                      },
                      {
                        value: "declaration" as PermitType,
                        label: "Déclaration préalable",
                        sub: "Modification extérieure, velux, fenêtre, façade",
                      },
                      {
                        value: "aucune" as PermitType,
                        label: "Aucune autorisation nécessaire",
                        sub: "Travaux intérieurs uniquement",
                      },
                    ].map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setPermitType(opt.value)}
                        className={cn(
                          "w-full text-left flex items-start gap-3 p-3 rounded-lg border-2 transition-all",
                          permitType === opt.value ? "border-primary bg-primary/5" : "border-muted hover:border-primary/40"
                        )}
                      >
                        <div className={cn(
                          "mt-0.5 h-4 w-4 rounded-full border-2 shrink-0 flex items-center justify-center",
                          permitType === opt.value ? "border-primary" : "border-muted-foreground/40"
                        )}>
                          {permitType === opt.value && <div className="h-2 w-2 rounded-full bg-primary" />}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{opt.label}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{opt.sub}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Architect warning (live preview) */}
                {permitType && ownerType && (
                  <ArchitectWarningPreview ownerType={ownerType as OwnerType} permitType={permitType} />
                )}

                {/* Gros oeuvre question */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium">
                    Vos travaux touchent-ils au gros œuvre ?
                  </Label>
                  <p className="text-xs text-muted-foreground -mt-1">
                    Fondations, murs porteurs, toiture, extension, surélévation
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setHasGrosOeuvre(true)}
                      className={cn(
                        "py-3 rounded-lg border-2 text-sm font-medium transition-all",
                        hasGrosOeuvre === true ? "border-primary bg-primary/5 text-primary" : "border-muted hover:border-primary/40"
                      )}
                    >
                      Oui
                    </button>
                    <button
                      type="button"
                      onClick={() => setHasGrosOeuvre(false)}
                      className={cn(
                        "py-3 rounded-lg border-2 text-sm font-medium transition-all",
                        hasGrosOeuvre === false ? "border-primary bg-primary/5 text-primary" : "border-muted hover:border-primary/40"
                      )}
                    >
                      Non
                    </button>
                  </div>
                  {hasGrosOeuvre === true && (
                    <div className="flex items-start gap-2.5 p-3 rounded-lg bg-blue-50 border border-blue-200 dark:bg-blue-950/30 dark:border-blue-800 text-xs text-blue-700 dark:text-blue-400">
                      <Info className="h-4 w-4 shrink-0 mt-0.5" />
                      <p>L&apos;assurance Dommage-Ouvrage est obligatoire avant tout commencement de chantier (loi Spinetta 1978, Art. L242-1 Code des assurances). Une tâche sera créée automatiquement.</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </>
          )}

          {/* ── Step 4 (construction): Template ──────────────────────────── */}
          {step === 4 && projectType === "construction" && (
            <>
              <CardHeader>
                <CardTitle>Modèle de construction</CardTitle>
                <CardDescription>Importez les 90 étapes standard pour démarrer rapidement</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-4 p-4 rounded-lg border bg-muted/30">
                  <HardHat className="h-10 w-10 text-primary shrink-0 mt-1" />
                  <div className="flex-1">
                    <p className="font-medium">Modèle construction — 90 étapes</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      8 phases de l&apos;acquisition du terrain à la conformité finale.
                    </p>
                    <div className="flex items-center gap-3 mt-3">
                      <Switch id="template" checked={useTemplate} onCheckedChange={setUseTemplate} />
                      <Label htmlFor="template" className="cursor-pointer">
                        {useTemplate ? "Utiliser le modèle" : "Partir de zéro"}
                      </Label>
                    </div>
                  </div>
                </div>
                <CoverPhotoPicker />
              </CardContent>
            </>
          )}

          {/* ── Step 5 (renovation): Room task picker ────────────────────── */}
          {step === 5 && projectType === "renovation" && (
            <>
              <CardHeader>
                <CardTitle>Pièces & tâches</CardTitle>
                <CardDescription>Cochez les tâches à inclure dans votre projet</CardDescription>
              </CardHeader>
              <CardContent>
                <RoomTaskPicker selection={taskSelection} onChange={setTaskSelection} />
              </CardContent>
            </>
          )}

          {/* ── Step 6 (renovation): Recap ───────────────────────────────── */}
          {step === 6 && projectType === "renovation" && (
            <>
              <CardHeader>
                <CardTitle>Récapitulatif</CardTitle>
                <CardDescription>Vérifiez votre sélection avant de créer le projet</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 rounded-lg border bg-muted/30 space-y-3">
                  <div className="flex items-center gap-3">
                    <Hammer className="h-8 w-8 text-primary shrink-0" />
                    <div>
                      <p className="font-medium">{form.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {totalSelectedTasks === 0
                          ? "Aucune tâche sélectionnée — projet vide"
                          : `${totalSelectedTasks} tâche${totalSelectedTasks > 1 ? "s" : ""} dans ${Object.values(taskSelection).filter((s) => s.size > 0).length} pièce${Object.values(taskSelection).filter((s) => s.size > 0).length > 1 ? "s" : ""}`}
                      </p>
                    </div>
                  </div>
                  {/* Legal summary */}
                  {permitType && permitType !== "aucune" && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground border-t pt-3 mt-2">
                      <ShieldAlert className="h-3.5 w-3.5" />
                      <span>
                        {permitType === "permis" ? "Permis de construire" : "Déclaration préalable"} — démarches légales ajoutées automatiquement
                      </span>
                    </div>
                  )}
                  {hasGrosOeuvre && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Info className="h-3.5 w-3.5" />
                      <span>Gros œuvre — assurance Dommage-Ouvrage ajoutée</span>
                    </div>
                  )}
                  <div className="flex flex-wrap gap-1.5">
                    {Object.entries(taskSelection)
                      .filter(([, tasks]) => tasks.size > 0)
                      .map(([room, tasks]) => (
                        <Badge key={room} variant="secondary" className="text-xs gap-1">
                          {room} <span className="text-muted-foreground">({tasks.size})</span>
                        </Badge>
                      ))}
                  </div>
                </div>
                <CoverPhotoPicker />
              </CardContent>
            </>
          )}
        </Card>

        {/* Navigation buttons */}
        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={() => (step > 0 ? setStep((s) => s - 1) : router.back())}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour
          </Button>
          {step < steps.length - 1 ? (
            <Button onClick={() => setStep((s) => s + 1)} disabled={!canAdvance()}>
              Suivant
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={handleFinish} disabled={loading}>
              {loading ? "Création…" : "Créer le projet"}
              {!loading && <Check className="ml-2 h-4 w-4" />}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
