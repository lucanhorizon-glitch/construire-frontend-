"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Zap, Check, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { api } from "@/lib/api";
import { toast } from "sonner";

interface PremiumGateProps {
  isPremium: boolean;
  projectId: number | string;
  children: React.ReactNode;
  feature?: string;
}

const PREMIUM_FEATURES = [
  "Intervenants illimités",
  "Export PDF & Excel",
  "Calendrier iCal partageable",
  "Documents & photos illimités",
  "Planning complet",
];

export default function PremiumGate({
  isPremium,
  projectId,
  children,
  feature,
}: PremiumGateProps) {
  const [open, setOpen] = useState(false);

  const stripeCheckout = useMutation({
    mutationFn: () =>
      api.post<{ url: string }>("/stripe/checkout", {
        project_id: Number(projectId),
      }),
    onSuccess: (res) => {
      if (res?.url) window.location.href = res.url;
    },
    onError: () => toast.error("Erreur lors du paiement"),
  });

  if (isPremium) return <>{children}</>;

  return (
    <>
      <div className="relative">
        <div className="pointer-events-none select-none blur-sm opacity-50">
          {children}
        </div>
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-background/60 rounded-lg">
          <Lock className="h-6 w-6 text-muted-foreground" />
          {feature && (
            <p className="text-sm text-muted-foreground text-center px-4">{feature}</p>
          )}
          <Button size="sm" className="gap-2" onClick={() => setOpen(true)}>
            <Zap className="h-4 w-4" />
            Débloquer — 14,99 €
          </Button>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
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
              {PREMIUM_FEATURES.map((item) => (
                <li key={item} className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Plus tard
            </Button>
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
