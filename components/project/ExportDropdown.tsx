"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Download, FileText, Table2, Calendar, Archive, Lock, Zap, Check } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { api } from "@/lib/api";
import { toast } from "sonner";

const PREMIUM_FEATURES = [
  "Export PDF complet du projet",
  "Export Excel de toutes les tâches",
  "Calendrier iCal partageable",
  "Archive ZIP complète",
];

interface ExportDropdownProps {
  projectId: number;
  isPremium?: boolean;
}

export default function ExportDropdown({ projectId, isPremium = false }: ExportDropdownProps) {
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  const stripeCheckout = useMutation({
    mutationFn: () => api.post<{ url: string }>("/stripe/checkout", { project_id: projectId }),
    onSuccess: (res) => {
      if (res?.url) window.location.href = res.url;
    },
    onError: () => toast.error("Erreur lors du paiement"),
  });

  function download(path: string, filename: string) {
    const token = (() => {
      try {
        const s = localStorage.getItem("auth-storage");
        return s ? JSON.parse(s)?.state?.token : null;
      } catch {
        return null;
      }
    })();

    fetch(`${api.baseUrl}${path}`, {
      headers: { Authorization: `Bearer ${token}`, Accept: "*/*" },
    })
      .then((r) => r.blob())
      .then((blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
      });
  }

  if (!isPremium) {
    return (
      <>
        <Button variant="outline" size="sm" className="gap-2" onClick={() => setUpgradeOpen(true)}>
          <Lock className="h-4 w-4" />
          Exporter
        </Button>

        <Dialog open={upgradeOpen} onOpenChange={setUpgradeOpen}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-amber-500" />
                Débloquer les exports
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="text-center">
                <p className="text-3xl font-bold">14,99 €</p>
                <p className="text-sm text-muted-foreground">paiement unique par projet</p>
              </div>
              <ul className="space-y-2 text-sm">
                {PREMIUM_FEATURES.map((item) => (
                  <li key={item} className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setUpgradeOpen(false)}>Plus tard</Button>
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
      </>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Download className="h-4 w-4" />
          Exporter
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Format d&apos;export</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => download(`/projects/${projectId}/export/pdf`, `projet-${projectId}.pdf`)}>
          <FileText className="mr-2 h-4 w-4 text-red-500" />
          PDF complet
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => download(`/projects/${projectId}/export/excel`, `projet-${projectId}.xlsx`)}>
          <Table2 className="mr-2 h-4 w-4 text-green-600" />
          Excel (tâches)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => download(`/projects/${projectId}/export/ical`, `agenda-${projectId}.ics`)}>
          <Calendar className="mr-2 h-4 w-4 text-blue-500" />
          iCal (agenda)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => download(`/projects/${projectId}/export/zip`, `projet-${projectId}.zip`)}>
          <Archive className="mr-2 h-4 w-4 text-amber-600" />
          ZIP (tout)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
