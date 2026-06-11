"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Save, Eye, EyeOff, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { api } from "@/lib/api";
import { toast } from "sonner";

interface Settings {
  app_name: string;
  stripe_price: string;
  support_email: string;
  maintenance_mode: boolean | string;
  vapid_public: string;
  vapid_private: string;
}

export default function AdminSettingsPage() {
  const queryClient = useQueryClient();
  const [showVapid, setShowVapid] = useState(false);
  const [form, setForm] = useState<Partial<Settings>>({});

  const { data, isLoading } = useQuery({
    queryKey: ["admin-settings"],
    queryFn: () => api.get<Settings>("/admin/settings"),
  });

  useEffect(() => {
    if (data) setForm(data as Settings);
  }, [data]);

  const save = useMutation({
    mutationFn: () =>
      api.put("/admin/settings", {
        app_name:         form.app_name,
        stripe_price:     form.stripe_price,
        support_email:    form.support_email,
        maintenance_mode: form.maintenance_mode === true || form.maintenance_mode === "true",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-settings"] });
      toast.success("Paramètres mis à jour");
    },
    onError: () => toast.error("Erreur lors de la mise à jour"),
  });

  function set<K extends keyof Settings>(key: K, value: Settings[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  const isMaintenanceOn = form.maintenance_mode === true || form.maintenance_mode === "true";

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">Paramètres</h1>
        <p className="text-sm text-muted-foreground">Configuration globale de l'application</p>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20" />)}
        </div>
      ) : (
        <div className="space-y-5">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Application</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label>Nom de l'application</Label>
                <Input
                  value={form.app_name ?? ""}
                  onChange={(e) => set("app_name", e.target.value)}
                  placeholder="Maison Tracker"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Email de support</Label>
                <Input
                  type="email"
                  value={form.support_email ?? ""}
                  onChange={(e) => set("support_email", e.target.value)}
                  placeholder="support@maisontracker.fr"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Stripe</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label>Prix Premium (€)</Label>
                <Input
                  value={form.stripe_price ?? ""}
                  onChange={(e) => set("stripe_price", e.target.value)}
                  placeholder="14.99"
                />
                <p className="text-xs text-muted-foreground">
                  Affiché dans l'interface — le prix réel est configuré dans Stripe.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Push notifications (VAPID)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1.5">
                <Label className="flex items-center justify-between">
                  Clé publique VAPID
                  <button
                    type="button"
                    className="text-muted-foreground hover:text-foreground"
                    onClick={() => setShowVapid((v) => !v)}
                  >
                    {showVapid ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </Label>
                <Input
                  readOnly
                  value={showVapid ? (form.vapid_public ?? "") : "•".repeat(24)}
                  className="font-mono text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Clé privée VAPID</Label>
                <Input
                  readOnly
                  value="*** (cachée pour des raisons de sécurité)"
                  className="font-mono text-xs text-muted-foreground"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Les clés VAPID sont définies dans les variables d'environnement du serveur.
              </p>
            </CardContent>
          </Card>

          <Card className={isMaintenanceOn ? "border-amber-500" : ""}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                {isMaintenanceOn && <AlertTriangle className="h-4 w-4 text-amber-500" />}
                Mode maintenance
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">
                    {isMaintenanceOn ? "Maintenance activée" : "Application en ligne"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {isMaintenanceOn
                      ? "L'application affiche un message de maintenance aux utilisateurs."
                      : "L'application est accessible normalement."}
                  </p>
                </div>
                <Switch
                  checked={isMaintenanceOn}
                  onCheckedChange={(v) => set("maintenance_mode", v)}
                />
              </div>
              {isMaintenanceOn && (
                <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-3 text-xs text-amber-800 dark:text-amber-300">
                  Attention : les utilisateurs ne peuvent plus accéder à l'application en mode maintenance.
                </div>
              )}
            </CardContent>
          </Card>

          <Separator />

          <Button className="gap-2" onClick={() => save.mutate()} disabled={save.isPending}>
            <Save className="h-4 w-4" />
            {save.isPending ? "Enregistrement…" : "Enregistrer les paramètres"}
          </Button>
        </div>
      )}
    </div>
  );
}
