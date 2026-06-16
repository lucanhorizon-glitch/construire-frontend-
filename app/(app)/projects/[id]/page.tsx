"use client";

import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { Euro, TrendingDown, TrendingUp, Edit2, Check, Zap, ShieldAlert, Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { api } from "@/lib/api";
import type { Project } from "@/lib/types";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import PhaseProgress from "@/components/project/PhaseProgress";
import Link from "next/link";
import { toast } from "sonner";

function StatCard({ title, value, sub, icon: Icon }: { title: string; value: string; sub?: string; icon: React.ElementType }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-3xl font-bold mt-1">{value}</p>
            {sub && <p className="text-sm text-muted-foreground mt-0.5">{sub}</p>}
          </div>
          <Icon className="h-5 w-5 text-muted-foreground" />
        </div>
      </CardContent>
    </Card>
  );
}

function formatEur(n?: number) {
  if (n == null) return "—";
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);
}

interface EditForm {
  name: string;
  address: string;
  budget_initial: string;
  date_start: string;
  date_end_target: string;
}

export default function ProjectOverviewPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [coverFailed, setCoverFailed] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [premiumOpen, setPremiumOpen] = useState(false);
  const [editForm, setEditForm] = useState<EditForm>({
    name: "",
    address: "",
    budget_initial: "",
    date_start: "",
    date_end_target: "",
  });

  const { data, isLoading } = useQuery({
    queryKey: ["project", id],
    queryFn: () => api.get<{ data: Project }>(`/projects/${id}`),
  });

  const updateProject = useMutation({
    mutationFn: (body: Record<string, unknown>) => api.put(`/projects/${id}`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project", id] });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      setEditOpen(false);
      toast.success("Projet mis à jour");
    },
    onError: () => toast.error("Erreur lors de la mise à jour"),
  });

  const stripeCheckout = useMutation({
    mutationFn: () => api.post<{ url: string }>("/stripe/checkout", { project_id: Number(id) }),
    onSuccess: (res) => {
      if (res?.url) window.location.href = res.url;
    },
    onError: () => toast.error("Erreur lors du paiement"),
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const payment = params.get("payment");
    if (!payment) return;
    params.delete("payment");
    const clean = window.location.pathname + (params.toString() ? "?" + params.toString() : "");
    window.history.replaceState({}, "", clean);
    if (payment === "success") {
      queryClient.invalidateQueries({ queryKey: ["project", id] });
      toast.success("Projet débloqué ! Toutes les fonctionnalités sont actives.");
    } else if (payment === "cancelled") {
      toast("Paiement annulé — votre projet reste en version gratuite.");
    }
  }, [id, queryClient]);

  const project = data?.data;

  function computeRealisticDate(proj: Project): Date | null {
    if (!proj.date_end_target || !proj.date_start) return null;
    const start = new Date(proj.date_start);
    const end = new Date(proj.date_end_target);
    const totalDays = Math.max(0, (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    const bufferDays = Math.ceil(totalDays * 0.15);
    const startM = start.getMonth() + 1;
    const endM = end.getMonth() + 1;
    const spansSummer = startM <= 8 && endM >= 7;
    const summerBuffer = spansSummer ? 14 : 0;
    return new Date(end.getTime() + (bufferDays + summerBuffer) * 24 * 60 * 60 * 1000);
  }

  if (isLoading) {
    return (
      <div className="p-6 lg:p-8 max-w-6xl space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-28" />)}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!project) return null;

  const stats = project.stats;
  const budgetQuote   = stats?.budget_quote   ?? (project.budget_quote   ?? 0);
  const budgetInvoice = stats?.budget_invoice ?? (project.budget_invoice ?? 0);
  const tasksDone     = stats?.tasks_done     ?? (project.tasks_done     ?? 0);
  const tasksTotal    = stats?.tasks_total    ?? (project.tasks_total    ?? 0);
  const completion    = stats?.completion_percent ?? (project.completion_percent ?? 0);
  const budgetGap     = (project.budget_initial ?? 0) - budgetInvoice;

  function openEdit() {
    if (!project) return;
    setEditForm({
      name: project.name ?? "",
      address: project.address ?? "",
      budget_initial: project.budget_initial != null ? String(project.budget_initial) : "",
      date_start: project.date_start ?? "",
      date_end_target: project.date_end_target ?? "",
    });
    setEditOpen(true);
  }

  function handleSave() {
    const payload: Record<string, unknown> = { name: editForm.name };
    payload.address         = editForm.address || null;
    payload.budget_initial  = editForm.budget_initial ? parseFloat(editForm.budget_initial) : null;
    payload.date_start      = editForm.date_start || null;
    payload.date_end_target = editForm.date_end_target || null;
    updateProject.mutate(payload);
  }

  return (
    <div className="p-6 lg:p-8 max-w-6xl space-y-6">
      <div className="relative w-full h-48 rounded-xl overflow-hidden">
        {project.cover_photo_url && !coverFailed ? (
          <img
            src={project.cover_photo_url}
            alt={project.name}
            className="w-full h-full object-cover"
            onError={() => setCoverFailed(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-600 to-indigo-800">
            <span className="text-white text-5xl font-bold tracking-widest select-none opacity-80">
              {project.name.split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 3)}
            </span>
          </div>
        )}
      </div>

      {/* Architect obligation banner */}
      {project.permit_type === "permis" && project.owner_type === "societe" && (
        <div className="flex items-start gap-3 p-4 rounded-xl border border-red-300 bg-red-50 dark:bg-red-950/30 dark:border-red-800">
          <ShieldAlert className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-red-700 dark:text-red-400">
              ⚠️ Architecte OBLIGATOIRE
            </p>
            <p className="text-xs text-red-600 dark:text-red-500 mt-1">
              En tant que personne morale (SCI, SARL, SAS…), le recours à un architecte est obligatoire pour tout projet soumis à permis de construire, sans seuil de surface (Art. L431-3 du Code de l&apos;urbanisme).
            </p>
          </div>
        </div>
      )}
      {project.permit_type === "permis" && project.owner_type === "particulier" && (
        <div className="flex items-start gap-3 p-4 rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800">
          <Info className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">
              ℹ️ Information architecte
            </p>
            <p className="text-xs text-amber-600 dark:text-amber-500 mt-1">
              Si la surface totale après travaux dépasse 150 m², le recours à un architecte est obligatoire (Art. R431-2 du Code de l&apos;urbanisme).
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Avancement"
          value={`${completion}%`}
          sub={`${tasksDone} / ${tasksTotal} tâches`}
          icon={Check}
        />
        <StatCard title="Budget initial" value={formatEur(project.budget_initial)} icon={Euro} />
        <StatCard title="Total devis" value={formatEur(budgetQuote)} icon={TrendingUp} />
        <StatCard
          title="Écart budget"
          value={formatEur(Math.abs(budgetGap))}
          sub={budgetGap >= 0 ? "sous budget" : "dépassement"}
          icon={budgetGap >= 0 ? TrendingDown : TrendingUp}
        />
      </div>

      {project.phases && project.phases.length > 0 && (
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Phases du projet</CardTitle>
              <Button variant="outline" size="sm" asChild>
                <Link href={`/projects/${id}/tasks`}>Voir les tâches</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {project.phases.map((phase, i) => (
              <div key={phase.id}>
                {i > 0 && <Separator className="mb-4" />}
                <PhaseProgress phase={phase} />
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Informations du projet</CardTitle>
            <Button variant="ghost" size="sm" className="gap-1.5" onClick={openEdit}>
              <Edit2 className="h-3.5 w-3.5" />
              Modifier
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-4 text-sm">
            {project.address && (
              <div className="col-span-2">
                <dt className="text-muted-foreground">Adresse</dt>
                <dd className="font-medium mt-0.5">{project.address}</dd>
              </div>
            )}
            {project.date_start && (
              <div>
                <dt className="text-muted-foreground">Début</dt>
                <dd className="font-medium mt-0.5">
                  {format(new Date(project.date_start), "d MMMM yyyy", { locale: fr })}
                </dd>
              </div>
            )}
            {project.date_end_target && (
              <div>
                <dt className="text-muted-foreground">Fin estimée (optimiste)</dt>
                <dd className="font-medium mt-0.5">
                  {format(new Date(project.date_end_target), "d MMMM yyyy", { locale: fr })}
                </dd>
              </div>
            )}
            {project.date_end_target && project.date_start && (() => {
              const realistic = computeRealisticDate(project);
              if (!realistic) return null;
              return (
                <div>
                  <dt className="text-muted-foreground flex items-center gap-1">
                    Fin estimée (réaliste)
                    <span
                      title="La date réaliste intègre les aléas classiques d'un chantier : congés artisans, intempéries, délais de livraison."
                      className="cursor-help"
                    >
                      <Info className="h-3 w-3 text-muted-foreground/70" />
                    </span>
                  </dt>
                  <dd className="font-medium mt-0.5">
                    {format(realistic, "d MMMM yyyy", { locale: fr })}
                  </dd>
                </div>
              );
            })()}
            <div>
              <dt className="text-muted-foreground">Statut</dt>
              <dd className="mt-0.5">
                <Badge variant={project.status === "active" ? "success" : "secondary"}>
                  {project.status === "active" ? "Actif" : "Archivé"}
                </Badge>
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Plan</dt>
              <dd className="mt-0.5">
                {project.is_premium ? (
                  <Badge variant="default">Premium</Badge>
                ) : (
                  <button onClick={() => setPremiumOpen(true)}>
                    <Badge
                      variant="outline"
                      className="cursor-pointer hover:bg-primary/10 transition-colors gap-1"
                    >
                      <Zap className="h-3 w-3 text-amber-500" />
                      Passer Premium
                    </Badge>
                  </button>
                )}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      {/* ── Edit dialog ──────────────────────────────────────────────────── */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Modifier le projet</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>Nom du projet *</Label>
              <Input
                value={editForm.name}
                onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Adresse</Label>
              <Input
                value={editForm.address}
                onChange={(e) => setEditForm((f) => ({ ...f, address: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Budget initial (€)</Label>
              <Input
                type="number"
                placeholder="250000"
                value={editForm.budget_initial}
                onChange={(e) => setEditForm((f) => ({ ...f, budget_initial: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Date de début</Label>
                <Input
                  type="date"
                  value={editForm.date_start}
                  onChange={(e) => setEditForm((f) => ({ ...f, date_start: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Livraison cible</Label>
                <Input
                  type="date"
                  value={editForm.date_end_target}
                  onChange={(e) => setEditForm((f) => ({ ...f, date_end_target: e.target.value }))}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Annuler</Button>
            <Button
              onClick={handleSave}
              disabled={!editForm.name.trim() || updateProject.isPending}
            >
              {updateProject.isPending ? "Enregistrement…" : "Enregistrer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Premium upgrade dialog ───────────────────────────────────────── */}
      <Dialog open={premiumOpen} onOpenChange={setPremiumOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-amber-500" />
              Passer ce projet en Premium
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="text-center">
              <p className="text-3xl font-bold">14,99 €</p>
              <p className="text-sm text-muted-foreground">paiement unique par projet</p>
            </div>
            <ul className="space-y-2 text-sm">
              {[
                "Intervenants illimités",
                "Export PDF & Excel",
                "Calendrier iCal partageable",
                "Documents & photos illimités",
              ].map((item) => (
                <li key={item} className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPremiumOpen(false)}>Plus tard</Button>
            <Button
              onClick={() => stripeCheckout.mutate()}
              disabled={stripeCheckout.isPending}
              className="gap-2"
            >
              <Zap className="h-4 w-4" />
              {stripeCheckout.isPending ? "Redirection…" : "Passer Premium"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
