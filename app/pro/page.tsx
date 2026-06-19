"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { Zap, Plus, AlertCircle, HardHat, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useEffect } from "react";

const PACKS = [
  { id: "pack5",  label: "Pack 5 projets",  credits: 5,  price: 71.20,  perUnit: 14.24, discount: "−5%" },
  { id: "pack10", label: "Pack 10 projets", credits: 10, price: 134.91, perUnit: 13.49, discount: "−10%" },
  { id: "pack50", label: "Pack 50 projets", credits: 50, price: 636.58, perUnit: 12.73, discount: "−15%" },
];

interface DashboardData {
  projects: {
    id: number; name: string; status: string; is_premium: boolean;
    tasks_total: number; tasks_done: number; completion: number;
    created_at: string;
    client?: { id: number; name: string; email: string };
  }[];
  remaining_credits: number;
  total_purchased: number;
  total_gifted: number;
  total_used: number;
}

interface CreateProjectForm {
  client_name: string;
  client_email: string;
  project_name: string;
  project_type: string;
  project_address: string;
}

export default function ProDashboardPage() {
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const [createOpen, setCreateOpen] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [form, setForm] = useState<CreateProjectForm>({
    client_name: "", client_email: "", project_name: "", project_type: "neuf", project_address: "",
  });

  useEffect(() => {
    if (searchParams.get("pack") === "success") toast.success("Pack acheté ! Vos crédits ont été ajoutés.");
  }, [searchParams]);

  const { data, isLoading } = useQuery({
    queryKey: ["pro-dashboard"],
    queryFn: () => api.get<DashboardData>("/pro/dashboard"),
  });

  const createProject = useMutation({
    mutationFn: () => api.post<{ project_id: number; client_is_new: boolean; temp_password?: string; remaining_credits: number }>("/pro/projects", form),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["pro-dashboard"] });
      toast.success(`Projet créé ! ${res.client_is_new ? `Mot de passe temporaire : ${res.temp_password}` : "Client existant."}`);
      setCreateOpen(false);
      setForm({ client_name: "", client_email: "", project_name: "", project_type: "neuf", project_address: "" });
    },
    onError: (e: { message?: string; upgrade_required?: boolean }) => {
      if (e.upgrade_required) { setCreateOpen(false); setUpgradeOpen(true); }
      else toast.error(e.message ?? "Erreur");
    },
  });

  const buyPack = useMutation({
    mutationFn: (packType: string) => api.post<{ url: string }>("/stripe/pack-checkout", { pack_type: packType }),
    onSuccess: (res) => { window.location.href = res.url; },
    onError: () => toast.error("Erreur lors de la redirection vers le paiement"),
  });

  const projects = data?.projects ?? [];
  const remaining = data?.remaining_credits ?? 0;

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <HardHat className="h-6 w-6 text-blue-600" />
            Tableau de bord pro
          </h1>
          <p className="text-sm text-muted-foreground">{projects.length} projets clients gérés</p>
        </div>
        <Button
          className="gap-2"
          onClick={() => remaining > 0 ? setCreateOpen(true) : setUpgradeOpen(true)}
        >
          <Plus className="h-4 w-4" />
          Créer un projet client
        </Button>
      </div>

      {/* Credit balance */}
      <div className="grid sm:grid-cols-4 gap-4">
        {[
          { label: "Crédits restants", value: remaining, highlight: remaining === 0 },
          { label: "Crédits achetés",  value: data?.total_purchased ?? 0, highlight: false },
          { label: "Crédits offerts",  value: data?.total_gifted    ?? 0, highlight: false },
          { label: "Projets créés",    value: data?.total_used      ?? 0, highlight: false },
        ].map((s) => (
          <Card key={s.label} className={s.highlight && s.value === 0 ? "border-destructive/50" : ""}>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground mb-1">{s.label}</p>
              <p className={`text-2xl font-bold ${s.highlight && s.value === 0 ? "text-destructive" : ""}`}>{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {remaining === 0 && (
        <div className="flex items-center gap-3 p-4 rounded-lg border border-destructive/30 bg-destructive/5">
          <AlertCircle className="h-5 w-5 text-destructive shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium">Crédits épuisés</p>
            <p className="text-xs text-muted-foreground">Achetez un pack pour créer de nouveaux projets clients.</p>
          </div>
          <Button size="sm" variant="destructive" onClick={() => setUpgradeOpen(true)}>
            <Zap className="h-3.5 w-3.5 mr-1.5" />
            Acheter un pack
          </Button>
        </div>
      )}

      {/* Projects list */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Projets clients</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-16" />)}</div>
          ) : projects.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">
              <HardHat className="h-10 w-10 mx-auto mb-3 opacity-30" />
              Aucun projet créé. Cliquez sur &quot;Créer un projet client&quot; pour commencer.
            </div>
          ) : (
            <div className="divide-y">
              {projects.map((p) => (
                <div key={p.id} className="flex items-center gap-4 py-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium truncate">{p.name}</p>
                      <Badge variant={p.status === "active" ? "success" : "secondary"} className="text-xs shrink-0">
                        {p.status === "active" ? "Actif" : "Archivé"}
                      </Badge>
                    </div>
                    {p.client && (
                      <p className="text-xs text-muted-foreground mt-0.5">{p.client.name} — {p.client.email}</p>
                    )}
                    <div className="flex items-center gap-2 mt-1.5">
                      <Progress value={p.completion} className="h-1.5 flex-1 max-w-[120px]" />
                      <span className="text-xs text-muted-foreground">{p.completion}%</span>
                    </div>
                  </div>
                  <div className="text-right text-xs text-muted-foreground shrink-0">
                    <p>{format(new Date(p.created_at), "d MMM yyyy", { locale: fr })}</p>
                    <a href={`/projects/${p.id}`} className="flex items-center gap-1 justify-end mt-1 hover:text-foreground">
                      <ExternalLink className="h-3 w-3" /> Ouvrir
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create project dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Créer un projet client</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">1 crédit sera consommé. Restants : <strong>{remaining}</strong></p>
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Client</p>
              <div className="space-y-1.5">
                <Label>Nom du client</Label>
                <Input value={form.client_name} onChange={e => setForm(f => ({ ...f, client_name: e.target.value }))} placeholder="Jean Dupont" />
              </div>
              <div className="space-y-1.5">
                <Label>Email du client</Label>
                <Input type="email" value={form.client_email} onChange={e => setForm(f => ({ ...f, client_email: e.target.value }))} placeholder="jean@example.com" />
              </div>
            </div>
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Projet</p>
              <div className="space-y-1.5">
                <Label>Nom du projet</Label>
                <Input value={form.project_name} onChange={e => setForm(f => ({ ...f, project_name: e.target.value }))} placeholder="Maison Dupont" />
              </div>
              <div className="space-y-1.5">
                <Label>Type</Label>
                <Select value={form.project_type} onValueChange={v => setForm(f => ({ ...f, project_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="neuf">Construction neuve</SelectItem>
                    <SelectItem value="renovation">Rénovation</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Adresse (optionnel)</Label>
                <Input value={form.project_address} onChange={e => setForm(f => ({ ...f, project_address: e.target.value }))} placeholder="12 rue des Lilas, 75001 Paris" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Annuler</Button>
            <Button
              onClick={() => createProject.mutate()}
              disabled={!form.client_name || !form.client_email || !form.project_name || createProject.isPending}
            >
              {createProject.isPending ? "Création…" : "Créer le projet"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Pack purchase dialog */}
      <Dialog open={upgradeOpen} onOpenChange={setUpgradeOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-amber-500" />
              Acheter un pack de crédits
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">Chaque crédit permet de créer un projet client (accès premium inclus).</p>
            {PACKS.map((pack) => (
              <div key={pack.id} className="flex items-center justify-between p-4 rounded-lg border hover:border-primary transition-colors">
                <div>
                  <p className="font-semibold">{pack.label}</p>
                  <p className="text-sm text-muted-foreground">{pack.credits} crédits · {pack.perUnit.toFixed(2)} €/projet</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="font-bold">{pack.price.toFixed(2)} €</p>
                    <Badge variant="secondary" className="text-xs">{pack.discount}</Badge>
                  </div>
                  <Button size="sm" onClick={() => buyPack.mutate(pack.id)} disabled={buyPack.isPending}>
                    Acheter
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
