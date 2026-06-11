"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import ProjectNav from "@/components/layout/ProjectNav";
import ExportDropdown from "@/components/project/ExportDropdown";
import { api } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import type { Project } from "@/lib/types";

export default function ProjectLayout({ children }: { children: React.ReactNode }) {
  const { id } = useParams<{ id: string }>();

  const { data, isLoading } = useQuery({
    queryKey: ["project", id],
    queryFn: () => api.get<{ data: Project }>(`/projects/${id}`),
  });

  const project = data?.data;

  return (
    <div className="flex flex-col min-h-full">
      <div className="border-b bg-card px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <Button variant="ghost" size="icon" asChild className="shrink-0">
              <Link href="/dashboard"><ArrowLeft className="h-4 w-4" /></Link>
            </Button>
            {isLoading ? (
              <Skeleton className="h-6 w-48" />
            ) : (
              <div className="min-w-0">
                <h1 className="font-semibold truncate">{project?.name}</h1>
                {project?.address && (
                  <p className="text-xs text-muted-foreground truncate">{project.address}</p>
                )}
              </div>
            )}
          </div>
          {project && <ExportDropdown projectId={project.id} isPremium={project.is_premium} />}
        </div>
      </div>

      <ProjectNav projectId={id} />

      <div className="flex-1">
        {children}
      </div>
    </div>
  );
}
