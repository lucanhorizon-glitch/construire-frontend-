import { Badge } from "@/components/ui/badge";
import type { TaskStatus } from "@/lib/types";

const config: Record<TaskStatus, { label: string; variant: "default" | "success" | "warning" | "destructive" | "secondary" | "outline" | "info" }> = {
  todo: { label: "À faire", variant: "secondary" },
  inprogress: { label: "En cours", variant: "info" },
  done: { label: "Terminé", variant: "success" },
  blocked: { label: "Bloqué", variant: "destructive" },
  na: { label: "N/A", variant: "outline" },
};

export default function TaskStatusBadge({ status }: { status: TaskStatus }) {
  const { label, variant } = config[status] ?? config.todo;
  return <Badge variant={variant}>{label}</Badge>;
}
