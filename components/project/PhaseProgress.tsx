import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import type { Phase } from "@/lib/types";

interface PhaseProgressProps {
  phase: Phase;
  className?: string;
}

export default function PhaseProgress({ phase, className }: PhaseProgressProps) {
  const allTasks = phase.tasks ?? [];
  const done  = phase.tasks_done  ?? allTasks.filter((t) => t.status === "done").length;
  // Exclude 'na' tasks from the denominator
  const total = phase.tasks_total ?? allTasks.filter((t) => t.status !== "na").length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  return (
    <div className={cn("space-y-1", className)}>
      <div className="flex justify-between text-sm">
        <span className="font-medium truncate">{phase.title}</span>
        <span className="text-muted-foreground ml-2 shrink-0">{done}/{total}</span>
      </div>
      <Progress value={pct} className="h-2" />
    </div>
  );
}
