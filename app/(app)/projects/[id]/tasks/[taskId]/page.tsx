"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useSearchParams } from "next/navigation";
import { FileText, Image as ImageIcon, Receipt, FolderOpen, Star, Trash2, ExternalLink, Edit2, Scale } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import TaskStatusBadge from "@/components/project/TaskStatusBadge";
import DocumentUploader from "@/components/shared/DocumentUploader";
import { api } from "@/lib/api";
import { toast } from "sonner";
import type { Task, Document } from "@/lib/types";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const paymentLabels: Record<string, string> = {
  none: "Aucun", pending: "En attente", deposit: "Acompte versé", paid: "Payé",
};

// Legal basis lookup — matched against task title
const LEGAL_BASIS: { pattern: RegExp; basis: string }[] = [
  { pattern: /Ouverture de Chantier|DOC\b/i,                     basis: "Art. R424-16 Code de l'urbanisme" },
  { pattern: /Achèvement et Conformité|DAACT/i,                  basis: "Art. R462-1 Code de l'urbanisme" },
  { pattern: /Dommage.Ouvrage/i,                                 basis: "Art. L242-1 Code des assurances — Loi Spinetta 1978" },
  { pattern: /CONSUEL/i,                                         basis: "Décret 72-1120 du 14 déc. 1972" },
  { pattern: /infiltrométrie|perméabilité à l'air/i,             basis: "Arrêté RE2020 du 4 août 2021" },
  { pattern: /Carnet d.Information du Logement|CIL\b/i,          basis: "Loi Climat et Résilience — Art. 167 — Décret 2022-1607" },
  { pattern: /Déclaration H1|Formulaire H1|déclaration fiscale/i, basis: "Art. 1406 CGI — délai 90 jours" },
  { pattern: /Mandater un architecte|architecte.*Ordre/i,        basis: "Art. L431-3 Code de l'urbanisme" },
  { pattern: /architecte.*150 m²/i,                              basis: "Art. R431-2 Code de l'urbanisme" },
  { pattern: /déclaration préalable/i,                           basis: "Art. R421-11 Code de l'urbanisme" },
  { pattern: /permis de construire/i,                            basis: "Art. R421-1 Code de l'urbanisme" },
];

function getLegalBasis(title: string): string | null {
  const match = LEGAL_BASIS.find((l) => l.pattern.test(title));
  return match?.basis ?? null;
}

const docTabs = [
  { value: "photo",   label: "Photos",   icon: ImageIcon,  types: ["photo"] },
  { value: "quote",   label: "Devis",    icon: FileText,   types: ["quote"] },
  { value: "invoice", label: "Factures", icon: Receipt,    types: ["invoice"] },
  { value: "other",   label: "Autres",   icon: FolderOpen, types: ["certificate", "other"] },
] as const;

function formatEur(n?: number | null) {
  if (n == null) return "—";
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);
}

function DocList({
  docs, types, taskId, projectId, defaultType, onDelete, onUploaded,
}: {
  docs: Document[];
  types: readonly string[];
  taskId: string;
  projectId: string;
  defaultType: string;
  onDelete: (id: number) => void;
  onUploaded: () => void;
}) {
  const filtered = docs.filter((d) => (types as readonly string[]).includes(d.type ?? ""));

  return (
    <div className="space-y-3 pt-3">
      {filtered.map((doc) => (
        <div key={doc.id} className="flex items-center gap-3 p-3 border rounded-lg">
          {doc.type === "photo" ? (
            <ImageIcon className="h-5 w-5 text-blue-500 shrink-0" />
          ) : (
            <FileText className="h-5 w-5 text-slate-500 shrink-0" />
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{doc.name}</p>
            <Badge variant="secondary" className="text-xs mt-0.5">{doc.type}</Badge>
          </div>
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
              <a href={doc.url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4" />
              </a>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive"
              onClick={() => onDelete(doc.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ))}
      {filtered.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4">Aucun document</p>
      )}
      <DocumentUploader
        taskId={Number(taskId)}
        defaultType={defaultType}
        onUploaded={onUploaded}
      />
    </div>
  );
}

export default function TaskDetailPage() {
  const { id: projectId, taskId } = useParams<{ id: string; taskId: string }>();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const initialTab = searchParams.get("tab") ?? "photo";

  const { data, isLoading } = useQuery({
    queryKey: ["task", taskId],
    queryFn: () => api.get<{ data: Task }>(`/tasks/${taskId}`),
  });

  const task = data?.data;

  const updateTask = useMutation({
    mutationFn: (body: Partial<Task>) => api.put(`/tasks/${taskId}`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["task", taskId] });
      queryClient.invalidateQueries({ queryKey: ["project-tasks", projectId] });
      setEditing(false);
      toast.success("Tâche mise à jour");
    },
    onError: () => toast.error("Erreur lors de la mise à jour"),
  });

  const deleteDoc = useMutation({
    mutationFn: (docId: number) => api.delete(`/documents/${docId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["task", taskId] });
      toast.success("Document supprimé");
    },
  });

  const [form, setForm] = useState<Partial<Task>>({});
  function startEdit() {
    if (!task) return;
    setForm({
      title: task.title,
      description: task.description,
      notes: task.notes,
      date_target: task.date_target,
      date_real: task.date_real,
      amount_quote: task.amount_quote,
      amount_invoice: task.amount_invoice,
      payment_status: task.payment_status,
    });
    setEditing(true);
  }

  if (isLoading) {
    return (
      <div className="p-6 lg:p-8 space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid lg:grid-cols-[3fr_2fr] gap-8">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  if (!task) return <p className="p-6 text-muted-foreground">Tâche introuvable</p>;

  const docCount = task.documents?.length ?? 0;

  return (
    <div className="p-6 lg:p-8 max-w-6xl">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 mb-8">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2.5 mb-1.5">
            {task.is_required && <Star className="h-5 w-5 text-amber-500 fill-amber-500 shrink-0" />}
            {task.room && (
              <Badge variant="secondary" className="text-xs shrink-0">{task.room}</Badge>
            )}
          </div>
          <h1 className="text-2xl font-bold leading-tight">{task.title}</h1>
          {task.description && (
            <p className="text-muted-foreground mt-1.5">{task.description}</p>
          )}
          {getLegalBasis(task.title) && (
            <div className="flex items-center gap-1.5 mt-2">
              <Scale className="h-3.5 w-3.5 text-blue-500 shrink-0" />
              <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                Base légale : {getLegalBasis(task.title)}
              </span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <TaskStatusBadge status={task.status} />
          {!editing && (
            <Button variant="outline" size="sm" className="gap-1.5" onClick={startEdit}>
              <Edit2 className="h-3.5 w-3.5" />
              Modifier
            </Button>
          )}
        </div>
      </div>

      {/* ── Edit form (full width when open) ───────────────────────────────── */}
      {editing && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-lg">Modifier la tâche</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Titre</Label>
              <Input
                value={form.title ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={form.description ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Date cible</Label>
                <Input
                  type="date"
                  value={form.date_target ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, date_target: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Date réelle</Label>
                <Input
                  type="date"
                  value={form.date_real ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, date_real: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Devis (€)</Label>
                <Input
                  type="number"
                  value={form.amount_quote ?? ""}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, amount_quote: parseFloat(e.target.value) || undefined }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Facture (€)</Label>
                <Input
                  type="number"
                  value={form.amount_invoice ?? ""}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, amount_invoice: parseFloat(e.target.value) || undefined }))
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Statut paiement</Label>
              <Select
                value={form.payment_status ?? "none"}
                onValueChange={(v) => setForm((f) => ({ ...f, payment_status: v as Task["payment_status"] }))}
              >
                <SelectTrigger className="max-w-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(paymentLabels).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={form.notes ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                rows={3}
              />
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <Button variant="outline" onClick={() => setEditing(false)}>Annuler</Button>
              <Button onClick={() => updateTask.mutate(form)} disabled={updateTask.isPending}>
                {updateTask.isPending ? "Enregistrement…" : "Enregistrer"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Two-column desktop layout ──────────────────────────────────────── */}
      {!editing && (
        <div className="grid lg:grid-cols-[3fr_2fr] gap-6 lg:gap-8 items-start">
          {/* Left column — info, status, financials, notes */}
          <div className="space-y-6">
            {/* Key info */}
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-lg">Détails</CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="grid grid-cols-2 gap-x-6 gap-y-4">
                  <div>
                    <dt className="text-sm text-muted-foreground">Date cible</dt>
                    <dd className="font-medium mt-0.5">
                      {task.date_target
                        ? format(new Date(task.date_target), "d MMMM yyyy", { locale: fr })
                        : "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm text-muted-foreground">Date réelle</dt>
                    <dd className="font-medium mt-0.5">
                      {task.date_real
                        ? format(new Date(task.date_real), "d MMMM yyyy", { locale: fr })
                        : "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm text-muted-foreground">Durée estimée</dt>
                    <dd className="font-medium mt-0.5">
                      {task.duration_days ? `${task.duration_days} jour${task.duration_days !== 1 ? "s" : ""}` : "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm text-muted-foreground">Statut paiement</dt>
                    <dd className="font-medium mt-0.5">
                      {paymentLabels[task.payment_status] ?? task.payment_status}
                    </dd>
                  </div>
                </dl>
              </CardContent>
            </Card>

            {/* Financials */}
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-lg">Financier</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-lg bg-muted/50 p-4">
                    <p className="text-sm text-muted-foreground">Devis HT</p>
                    <p className="text-2xl font-bold mt-1">{formatEur(task.amount_quote)}</p>
                  </div>
                  <div className="rounded-lg bg-muted/50 p-4">
                    <p className="text-sm text-muted-foreground">Facture HT</p>
                    <p className="text-2xl font-bold mt-1">{formatEur(task.amount_invoice)}</p>
                  </div>
                </div>
                {task.amount_quote != null && task.amount_invoice != null && (
                  <div className="mt-3 text-sm text-muted-foreground">
                    Écart :{" "}
                    <span className={task.amount_invoice > task.amount_quote ? "text-red-600 font-medium" : "text-emerald-600 font-medium"}>
                      {formatEur(Math.abs(task.amount_invoice - task.amount_quote))}
                      {" "}
                      {task.amount_invoice > task.amount_quote ? "dépassement" : "économie"}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Notes */}
            {task.notes && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                    {task.notes}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right column — documents */}
          <div className="lg:sticky lg:top-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">
                  Documents {docCount > 0 && <span className="text-muted-foreground font-normal text-base">({docCount})</span>}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue={initialTab}>
                  <TabsList className="w-full">
                    {docTabs.map((tab) => {
                      const count = (task.documents ?? []).filter((d) =>
                        (tab.types as readonly string[]).includes(d.type ?? "")
                      ).length;
                      return (
                        <TabsTrigger key={tab.value} value={tab.value} className="flex-1 gap-1">
                          <tab.icon className="h-3.5 w-3.5" />
                          <span className="hidden sm:inline">{tab.label}</span>
                          {count > 0 && (
                            <Badge variant="secondary" className="ml-0.5 text-xs px-1.5 py-0 h-4">
                              {count}
                            </Badge>
                          )}
                        </TabsTrigger>
                      );
                    })}
                  </TabsList>
                  {docTabs.map((tab) => (
                    <TabsContent key={tab.value} value={tab.value}>
                      <DocList
                        docs={task.documents ?? []}
                        types={tab.types}
                        taskId={taskId}
                        projectId={projectId}
                        defaultType={tab.value}
                        onDelete={(id) => deleteDoc.mutate(id)}
                        onUploaded={() =>
                          queryClient.invalidateQueries({ queryKey: ["task", taskId] })
                        }
                      />
                    </TabsContent>
                  ))}
                </Tabs>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
