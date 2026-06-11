"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { ChevronRight, Filter } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { api } from "@/lib/api";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface AdminProject {
  id: number;
  name: string;
  type: string;
  status: string;
  is_premium: boolean;
  tasks_total: number;
  tasks_done: number;
  completion: number;
  budget?: number;
  created_at: string;
  user?: { id: number; name: string; email: string };
}

function formatEur(n?: number) {
  if (n == null || n === 0) return "—";
  return new Intl.NumberFormat("fr-FR", {
    style: "currency", currency: "EUR", maximumFractionDigits: 0,
  }).format(n);
}

export default function AdminProjectsPage() {
  const [filterType, setFilterType] = useState("all");
  const [filterPlan, setFilterPlan] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  const params = new URLSearchParams();
  if (filterType !== "all") params.set("type", filterType);
  if (filterPlan !== "all") params.set("plan", filterPlan);
  if (filterStatus !== "all") params.set("status", filterStatus);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-projects", filterType, filterPlan, filterStatus],
    queryFn: () =>
      api.get<{ data: AdminProject[]; meta: { total: number } }>(
        `/admin/projects?${params.toString()}`
      ),
  });

  const projects = data?.data ?? [];
  const total = data?.meta?.total ?? 0;

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Projets</h1>
        <p className="text-sm text-muted-foreground">{total} au total</p>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Filtres :</span>
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="h-8 w-36 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous types</SelectItem>
            <SelectItem value="neuf">Neuf</SelectItem>
            <SelectItem value="renovation">Rénovation</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterPlan} onValueChange={setFilterPlan}>
          <SelectTrigger className="h-8 w-36 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous plans</SelectItem>
            <SelectItem value="premium">Premium</SelectItem>
            <SelectItem value="free">Gratuit</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="h-8 w-36 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous statuts</SelectItem>
            <SelectItem value="active">Actif</SelectItem>
            <SelectItem value="archived">Archivé</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-lg border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground w-12">ID</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Nom</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Utilisateur</th>
                <th className="text-center px-4 py-3 font-medium text-muted-foreground">Type</th>
                <th className="text-center px-4 py-3 font-medium text-muted-foreground">Plan</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">Avancement</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">Budget</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden xl:table-cell">Créé le</th>
                <th className="w-8" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {isLoading
                ? [...Array(8)].map((_, i) => (
                    <tr key={i}>
                      {[...Array(7)].map((_, j) => (
                        <td key={j} className="px-4 py-3"><Skeleton className="h-4 w-full" /></td>
                      ))}
                    </tr>
                  ))
                : projects.map((p) => (
                    <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{p.id}</td>
                      <td className="px-4 py-3">
                        <p className="font-medium">{p.name}</p>
                        <Badge
                          variant={p.status === "active" ? "success" : "secondary"}
                          className="text-xs mt-0.5"
                        >
                          {p.status === "active" ? "Actif" : "Archivé"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <p className="text-muted-foreground">{p.user?.name ?? "—"}</p>
                        <p className="text-xs text-muted-foreground/60">{p.user?.email}</p>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge variant="outline" className="text-xs capitalize">{p.type}</Badge>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {p.is_premium
                          ? <Badge className="text-xs bg-amber-500 text-white border-0">Premium</Badge>
                          : <Badge variant="secondary" className="text-xs">Gratuit</Badge>
                        }
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <div className="flex items-center gap-2">
                          <Progress value={p.completion} className="h-1.5 w-20" />
                          <span className="text-xs text-muted-foreground">{p.completion}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right hidden lg:table-cell text-muted-foreground">
                        {formatEur(p.budget)}
                      </td>
                      <td className="px-4 py-3 hidden xl:table-cell text-muted-foreground text-xs">
                        {format(new Date(p.created_at), "d MMM yyyy", { locale: fr })}
                      </td>
                      <td className="px-4 py-3">
                        <Link href={`/admin/projects/${p.id}`}>
                          <ChevronRight className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                        </Link>
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
          {!isLoading && projects.length === 0 && (
            <div className="text-center py-12 text-muted-foreground text-sm">Aucun projet</div>
          )}
        </div>
      </div>
    </div>
  );
}
