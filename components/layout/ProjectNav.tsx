"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutGrid, ListTodo, CalendarDays, PiggyBank, Users, Calendar, FolderOpen, Share2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

const tabs = [
  { href: "", icon: LayoutGrid, label: "Vue d'ensemble" },
  { href: "/tasks", icon: ListTodo, label: "Tâches" },
  { href: "/planning", icon: CalendarDays, label: "Planning" },
  { href: "/budget", icon: PiggyBank, label: "Budget" },
  { href: "/contacts", icon: Users, label: "Intervenants" },
  { href: "/agenda", icon: Calendar, label: "Agenda" },
  { href: "/documents", icon: FolderOpen, label: "Documents" },
  { href: "/partage", icon: Share2, label: "Partage" },
];

interface ProjectNavProps {
  projectId: string;
}

export default function ProjectNav({ projectId }: ProjectNavProps) {
  const pathname = usePathname();
  const base = `/projects/${projectId}`;

  return (
    <div className="border-b bg-background sticky top-0 z-30">
      <ScrollArea className="w-full whitespace-nowrap">
        <div className="flex px-4">
          {tabs.map((tab) => {
            const href = `${base}${tab.href}`;
            const active =
              tab.href === ""
                ? pathname === base
                : pathname.startsWith(href);
            return (
              <Link
                key={tab.href}
                href={href}
                className={cn(
                  "flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap",
                  active
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground"
                )}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </Link>
            );
          })}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
}
