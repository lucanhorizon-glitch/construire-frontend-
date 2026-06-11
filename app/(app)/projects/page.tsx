"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Plus, HardHat, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { api } from "@/lib/api";
import type { Project } from "@/lib/types";

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

export default function ProjectsPage() {
  const [search, setSearch]   = useState("");
  const [status, setStatus]   = useState<"all" | "active" | "archived">("all");

  const { data, isLoading } = useQuery({
    queryKey: ["projects"],
    queryFn: () => api.get<{ data: Project[] }>("/projects"),
  });

  const allProjects = data?.data ?? [];

  const projects = allProjects.filter((p) => {
    const matchStatus = status === "all" || p.status === status;
    const matchSearch =
      search === "" ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.address?.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h1 className="text-xl font-bold">Mes projets</h1>
        <Button asChild size="sm" className="gap-2">
          <Link href="/projects/new">
            <Plus className="h-4 w-4" />
            Nouveau projet
          </Link>
        </Button>
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Rechercher un projet…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
          <SelectTrigger className="w-36 h-10">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous</SelectItem>
            <SelectItem value="active">Actifs</SelectItem>
            <SelectItem value="archived">Archivés</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 rounded-lg" />
          ))}
        </div>
      ) : projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <HardHat className="h-16 w-16 text-muted-foreground/40 mb-4" />
          <h2 className="text-lg font-semibold mb-2">
            {search || status !== "all"
              ? "Aucun projet trouvé"
              : "Aucun projet pour l'instant"}
          </h2>
          {!search && status === "all" && (
            <Button asChild className="mt-4">
              <Link href="/projects/new">Créer mon premier projet</Link>
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {projects.map((project) => {
            const pct   = project.stats?.completion_percent ?? project.completion_percent ?? 0;
            const done  = project.stats?.tasks_done ?? project.tasks_done ?? 0;
            const total = project.stats?.tasks_total ?? project.tasks_total ?? 0;
            const quote = project.stats?.budget_quote ?? project.budget_quote;
            return (
              <Link key={project.id} href={`/projects/${project.id}`}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="py-4">
                    <div className="flex items-center gap-4">
                      <ProjectAvatar project={project} />
                      <div className="flex-1 min-w-0 space-y-1.5">
                        <div className="flex items-start justify-between gap-2">
                          <CardTitle className="text-sm leading-tight truncate">
                            {project.name}
                          </CardTitle>
                          <div className="flex gap-1 shrink-0">
                            {project.is_premium && (
                              <Badge variant="default" className="text-xs py-0">Premium</Badge>
                            )}
                            <Badge
                              variant={project.status === "active" ? "success" : "secondary"}
                              className="text-xs py-0"
                            >
                              {project.status === "active" ? "Actif" : "Archivé"}
                            </Badge>
                          </div>
                        </div>
                        {project.address && (
                          <p className="text-xs text-muted-foreground truncate">{project.address}</p>
                        )}
                        <div className="flex items-center gap-3">
                          <Progress value={pct} className="h-1.5 flex-1" />
                          <span className="text-xs text-muted-foreground shrink-0 w-24">
                            {done}/{total} • {pct}%
                          </span>
                          {quote != null && (
                            <span className="text-xs font-medium shrink-0">{formatEur(quote)}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
