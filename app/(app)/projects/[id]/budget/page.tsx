"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { TrendingDown, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import ExportDropdown from "@/components/project/ExportDropdown";
import { api } from "@/lib/api";
import type { Phase, Project } from "@/lib/types";

function eur(n?: number | null) {
  if (n == null) return "—";
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);
}

export default function BudgetPage() {
  const { id } = useParams<{ id: string }>();

  const { data: projectData, isLoading: loadingProject } = useQuery({
    queryKey: ["project", id],
    queryFn: () => api.get<{ data: Project }>(`/projects/${id}`),
  });

  const { data: tasksData, isLoading: loadingTasks } = useQuery({
    queryKey: ["project-tasks", id],
    queryFn: () => api.get<{ data: Phase[] }>(`/projects/${id}/tasks`),
  });

  const project = projectData?.data;
  const phases = tasksData?.data ?? [];
  const isLoading = loadingProject || loadingTasks;

  if (isLoading) {
    return (
      <div className="p-6 lg:p-8 max-w-6xl space-y-4">
        {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-28" />)}
      </div>
    );
  }

  const totalQuote = phases.reduce((sum, p) =>
    sum + (p.tasks ?? []).reduce((s, t) => s + (t.amount_quote ?? 0), 0), 0);
  const totalInvoice = phases.reduce((sum, p) =>
    sum + (p.tasks ?? []).reduce((s, t) => s + (t.amount_invoice ?? 0), 0), 0);
  const budget = project?.budget_initial ?? 0;
  const gap = budget - totalInvoice;
  const quoteVsBudget = budget > 0 ? Math.min((totalQuote / budget) * 100, 100) : 0;
  const invoiceVsBudget = budget > 0 ? Math.min((totalInvoice / budget) * 100, 100) : 0;

  return (
    <div className="p-6 lg:p-8 max-w-6xl space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Budget</h2>
        {project && <ExportDropdown projectId={project.id} />}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Budget initial</p>
            <p className="text-3xl font-bold mt-1">{eur(budget)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Total devis HT</p>
            <p className="text-3xl font-bold mt-1">{eur(totalQuote)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Total facturé HT</p>
            <p className="text-3xl font-bold mt-1">{eur(totalInvoice)}</p>
          </CardContent>
        </Card>
        <Card className={gap < 0 ? "border-destructive" : ""}>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Écart budget</p>
                <p className={`text-3xl font-bold mt-1 ${gap < 0 ? "text-destructive" : "text-emerald-600"}`}>
                  {gap < 0 ? "-" : "+"}{eur(Math.abs(gap))}
                </p>
                <p className="text-xs text-muted-foreground">{gap >= 0 ? "sous budget" : "dépassement"}</p>
              </div>
              {gap < 0
                ? <AlertTriangle className="h-5 w-5 text-destructive" />
                : <TrendingDown className="h-5 w-5 text-emerald-600" />
              }
            </div>
          </CardContent>
        </Card>
      </div>

      {budget > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Consommation du budget</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Devis engagés</span>
                <span>{Math.round(quoteVsBudget)}% du budget</span>
              </div>
              <Progress value={quoteVsBudget} className="h-3" />
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Factures réglées</span>
                <span>{Math.round(invoiceVsBudget)}% du budget</span>
              </div>
              <Progress value={invoiceVsBudget} className="h-3 [&>div]:bg-emerald-500" />
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Détail par phase</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {phases.map((phase, i) => {
              const tasks = phase.tasks ?? [];
              const phaseQuote = tasks.reduce((s, t) => s + (t.amount_quote ?? 0), 0);
              const phaseInvoice = tasks.reduce((s, t) => s + (t.amount_invoice ?? 0), 0);
              if (phaseQuote === 0 && phaseInvoice === 0) return null;
              return (
                <div key={phase.id}>
                  {i > 0 && <Separator className="mb-4" />}
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <p className="font-medium text-sm flex-1">{phase.title}</p>
                    <div className="flex gap-6 text-sm">
                      <div>
                        <p className="text-xs text-muted-foreground">Devis</p>
                        <p className="font-medium">{eur(phaseQuote)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Facturé</p>
                        <p className="font-medium">{eur(phaseInvoice)}</p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
